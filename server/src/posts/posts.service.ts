import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ReelsService } from '../reels/reels.service';
import { ShareReelDto } from '../reels/dto/share-reel.dto';
import { RedisService } from '../common/redis/redis.service';

const POST_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
} as const;

const REEL_PREVIEW_INCLUDE = {
  user: {
    select: POST_USER_SELECT,
  },
  sharedFrom: {
    include: {
      user: {
        select: POST_USER_SELECT,
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true,
        },
      },
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
      shares: true,
    },
  },
} as const;

type PostWithRelations = Prisma.PostGetPayload<{
  include: {
    user: { select: typeof POST_USER_SELECT };
    sharedPost: {
      include: {
        user: { select: typeof POST_USER_SELECT };
        sharedReel: { include: typeof REEL_PREVIEW_INCLUDE };
      };
    };
    sharedReel: { include: typeof REEL_PREVIEW_INCLUDE };
    _count: {
      select: {
        comments: true;
        shares: true;
      };
    };
  };
}>;

type PostWithDetails = Prisma.PostGetPayload<{
  include: {
    user: { select: typeof POST_USER_SELECT };
    sharedPost: {
      include: {
        user: { select: typeof POST_USER_SELECT };
        sharedReel: { include: typeof REEL_PREVIEW_INCLUDE };
      };
    };
    sharedReel: { include: typeof REEL_PREVIEW_INCLUDE };
    comments: {
      include: {
        user: { select: typeof POST_USER_SELECT };
      };
      orderBy: { createdAt: 'desc' };
    };
    likes: {
      include: {
        user: { select: typeof POST_USER_SELECT };
      };
    };
    _count: {
      select: {
        comments: true;
        shares: true;
      };
    };
  };
}>;

type SavedPostWithRelations = Prisma.SavedPostGetPayload<{
  include: {
    post: {
      include: {
        user: { select: typeof POST_USER_SELECT };
        sharedPost: {
          include: {
            user: { select: typeof POST_USER_SELECT };
            sharedReel: { include: typeof REEL_PREVIEW_INCLUDE };
          };
        };
        sharedReel: { include: typeof REEL_PREVIEW_INCLUDE };
        _count: {
          select: {
            comments: true;
            shares: true;
          };
        };
      };
    };
  };
}>;

type PostShareSummary = {
  id: string;
  userId: string;
  sharedPostId: string | null;
  sharedReelId: string | null;
};

type OriginalPostShareSummary = {
  id: string;
  userId: string;
  sharedReelId: string | null;
};

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatGateway: ChatGateway,
    private reelsService: ReelsService,
    private redisService: RedisService,
  ) {}

  // Invalidate all feed cache pages for a given user (and their followers)
  private async invalidateFeedCache(userId: string): Promise<void> {
    try {
      // Delete cached pages for this user
      const userKeys = await this.redisService.keys(`feed:v2:${userId}:*`);
      for (const key of userKeys) await this.redisService.del(key);

      // Also invalidate followers' feeds since their feed contains this user's posts
      const followers = await this.prisma.follow.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      });
      for (const { followerId } of followers) {
        const followerKeys = await this.redisService.keys(`feed:v2:${followerId}:*`);
        for (const key of followerKeys) await this.redisService.del(key);
      }
    } catch {
      // Non-critical — cache invalidation failure shouldn't break the operation
    }
  }

  async create(userId: string, createPostDto: CreatePostDto) {
    const newPost = await this.prisma.post.create({
      data: {
        content: createPostDto.content,
        imageUrl: createPostDto.imageUrl,
        videoUrl: createPostDto.videoUrl,
        visibility: createPostDto.visibility ?? 'public',
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // New post has 0 likes initially
    const result = {
      ...newPost,
      _count: {
        ...newPost._count,
        likes: 0,
      },
    };

    // Bust feed cache for author + their followers
    void this.invalidateFeedCache(userId);

    return result;
  }

  // ─── Feed Ranking Algorithm ───────────────────────────────────────────────
  // Inspired by Facebook EdgeRank / News Feed ranking:
  //
  // ─── Feed Ranking Algorithm v2 ──────────────────────────────────────────
  //
  //  finalScore = (baseEngagement + relationshipBoost + contentBoost + freshnessBoost)
  //               / pow(hoursAgo + 2, 1.2)
  //
  //  • baseEngagement   = likes×2 + comments×4 + shares×5
  //  • relationshipBoost= 12 (own) | 8+affinity (follow) | 0 (stranger)
  //  • contentBoost     = video 4 | image 2   (just tie-breaker)
  //  • freshnessBoost   = max(0, 15 - hoursAgo×0.5)  (linear, lasts ~30h)
  //  • time decay       = (hoursAgo+2)^1.2             (softer than ^1.5)
  //  • affinity         = recent likes×2 + recent comments×4 (capped at 20)
  //
  //  Feed is then split into 70% deterministic (top-ranked) +
  //  30% exploration (weighted-random from next tier) — interleaved every 3rd slot.
  // ──────────────────────────────────────────────────────────────────────────
  private computeScore(
    post: {
      createdAt: Date;
      userId: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      _count: { likes: number; comments: number; shares: number };
    },
    viewerUserId?: string,  
    followingIds: string[] = [],
    authorAffinity: Record<string, number> = {},
  ): number {
    const nowMs    = Date.now();
    const hoursAgo = (nowMs - new Date(post.createdAt).getTime()) / 3_600_000;

    // ── Base engagement (slower multipliers, shares weighted highest) ──────
    const baseEngagement =
      post._count.likes    * 2 +
      post._count.comments * 4 +
      post._count.shares   * 5;

    // ── Softer time decay — good content survives longer ──────────────────
    const decay = Math.pow(hoursAgo + 2, 1.2);

    // ── Linear freshness bonus — decays over ~30h ─────────────────────────
    const freshnessBoost = Math.max(0, 15 - hoursAgo * 0.5);

    // ── Dynamic relationship score ────────────────────────────────────────
    let relationshipBoost = 0;
    if (viewerUserId) {
      if (post.userId === viewerUserId) {
        // Own posts: reduced from 40 → 12 so they don't dominate
        relationshipBoost = 12;
      } else if (followingIds.includes(post.userId)) {
        // Follow base + personal affinity (capped at 20 each)
        const affinityScore = Math.min(authorAffinity[post.userId] ?? 0, 20);
        relationshipBoost = 8 + affinityScore;
      }
    }

    // ── Content type — only as tie-breaker (reduced weights) ─────────────
    const contentBoost = post.videoUrl ? 4 : post.imageUrl ? 2 : 0;

    return (baseEngagement + relationshipBoost + contentBoost + freshnessBoost) / decay;
  }

  async findAll(page = 1, limit = 10, userId?: string) {
    const CACHE_TTL_SECONDS = 90;  // Shorter → fresher / more varied on reload
    const CANDIDATE_POOL    = 250; // Much wider than old 4×limit = 40
    const EXPLORE_RATIO     = 0.3; // 30% exploration slots per page

    // ── Visibility-aware where clause ────────────────────────────────────────
    let followingIds: string[] = [];
    let whereClause: Prisma.PostWhereInput = {};

    if (userId) {
      const following = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      followingIds = following.map((f) => f.followingId);

      whereClause = {
        OR: [
          { userId },
          {
            userId: { in: followingIds },
            visibility: { in: ['public', 'friends'] },
          },
        ],
      };
    } else {
      whereClause = { visibility: 'public' };
    }

    // ── Redis cache (v3 key — old v2 entries expire naturally) ───────────────
    const cacheKey = `feed:v3:${userId ?? 'anon'}:p${page}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch { /* Redis miss — continue */ }

    // ── Dynamic author affinity (last 30 days) ───────────────────────────────
    // Replaces the fixed follow boost (+15) with personal interaction history.
    const authorAffinity: Record<string, number> = {};
    if (userId) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [recentLikes, recentComments] = await Promise.all([
        this.prisma.like.findMany({
          where: { userId, createdAt: { gte: thirtyDaysAgo }, imageIndex: null },
          select: { post: { select: { userId: true } } },
          take: 300,
        }),
        this.prisma.comment.findMany({
          where: { userId, createdAt: { gte: thirtyDaysAgo } },
          select: { post: { select: { userId: true } } },
          take: 300,
        }),
      ]);

      for (const { post } of recentLikes) {
        authorAffinity[post.userId] = (authorAffinity[post.userId] ?? 0) + 2;
      }
      for (const { post } of recentComments) {
        authorAffinity[post.userId] = (authorAffinity[post.userId] ?? 0) + 4;
      }
    }

    // ── Fetch large candidate pool ────────────────────────────────────────────
    // Window grows gently with page depth (avoid resurfacing very old content early)
    const windowDays  = Math.min(7 + page, 30);
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const [candidates, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { ...whereClause, createdAt: { gte: windowStart } },
        take: CANDIDATE_POOL,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: POST_USER_SELECT },
          sharedPost: {
            include: {
              user: { select: POST_USER_SELECT },
              sharedReel: { include: REEL_PREVIEW_INCLUDE },
            },
          },
          sharedReel: { include: REEL_PREVIEW_INCLUDE },
          _count: { select: { comments: true, shares: true } },
        },
      }) as unknown as PostWithRelations[],
      this.prisma.post.count({ where: whereClause }),
    ]);

    // ── Batch like counts — single groupBy query replaces N+1 loop ───────────
    const likeGroups = await this.prisma.like.groupBy({
      by: ['postId'],
      where: {
        postId:     { in: candidates.map((p) => p.id) },
        imageIndex: null,
      },
      _count: { postId: true },
    });
    const likeMap: Record<string, number> = {};
    for (const g of likeGroups) likeMap[g.postId] = g._count.postId;

    const postsWithLikes = candidates.map((post) => ({
      ...post,
      _count: {
        comments: post._count.comments,
        shares:   post._count.shares,
        likes:    likeMap[post.id] ?? 0,
      },
    }));

    // ── Score & rank ──────────────────────────────────────────────────────────
    const scored = postsWithLikes
      .map((post) => ({
        post,
        score: this.computeScore(post, userId, followingIds, authorAffinity),
      }))
      .sort((a, b) => b.score - a.score);

    // ── Top-K exploration: 70% deterministic + 30% weighted-random ───────────
    const skip             = (page - 1) * limit;
    const exploreCount     = Math.round(limit * EXPLORE_RATIO);  // 3 slots
    const deterministicCnt = limit - exploreCount;               // 7 slots

    // Deterministic slice: top-ranked posts for this page
    const deterministicSlice = scored.slice(skip, skip + deterministicCnt);

    // Exploration pool: next tier right after the deterministic slice
    const explorePoolStart = skip + deterministicCnt;
    const explorePool      = scored.slice(explorePoolStart, explorePoolStart + exploreCount * 4);

    // Weighted random without replacement
    const chosenExplore: typeof scored = [];
    const usedIdx     = new Set<number>();
    const totalWeight = explorePool.reduce((s, e) => s + Math.max(e.score, 0.01), 0);

    for (let i = 0; i < exploreCount; i++) {
      if (chosenExplore.length >= explorePool.length) break;
      let rand = Math.random() * totalWeight;
      for (let j = 0; j < explorePool.length; j++) {
        if (usedIdx.has(j)) continue;
        rand -= Math.max(explorePool[j].score, 0.01);
        if (rand <= 0) {
          chosenExplore.push(explorePool[j]);
          usedIdx.add(j);
          break;
        }
      }
    }

    // Interleave: positions 2, 5, 8 (1-indexed) → exploration slots
    const finalPosts: PostWithRelations[] = [];
    let di = 0;
    let ei = 0;
    for (let i = 0; i < limit; i++) {
      const isExploreSlot = (i + 1) % 3 === 0;
      if (isExploreSlot && ei < chosenExplore.length) {
        finalPosts.push(chosenExplore[ei++].post);
      } else if (di < deterministicSlice.length) {
        finalPosts.push(deterministicSlice[di++].post);
      } else if (ei < chosenExplore.length) {
        finalPosts.push(chosenExplore[ei++].post);
      }
    }

    const result = {
      posts: finalPosts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    // ── Cache ─────────────────────────────────────────────────────────────────
    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);
    } catch { /* non-critical */ }

    return result;
  }

  async findByUserId(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const posts = (await this.prisma.post.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: POST_USER_SELECT,
        },
        sharedPost: {
          include: {
            user: {
              select: POST_USER_SELECT,
            },
            sharedReel: {
              include: REEL_PREVIEW_INCLUDE,
            },
          },
        },
        sharedReel: {
          include: REEL_PREVIEW_INCLUDE,
        },
        _count: {
          select: {
            comments: true,
            shares: true,
          },
        },
      },
    })) as PostWithRelations[];

    const total = await this.prisma.post.count({ where: { userId } });

    // Count likes with imageIndex = null for each post
    const postsWithLikes = await Promise.all(
      posts.map(async (post: PostWithRelations) => {
        const postLikesCount = await this.prisma.like.count({
          where: {
            postId: post.id,
            imageIndex: null,
          },
        });

        return {
          ...post,
          _count: {
            comments: post._count.comments,
            shares: post._count.shares,
            likes: postLikesCount,
          },
        };
      }),
    );

    return {
      posts: postsWithLikes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const post = (await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: POST_USER_SELECT,
        },
        sharedPost: {
          include: {
            user: {
              select: POST_USER_SELECT,
            },
            sharedReel: {
              include: REEL_PREVIEW_INCLUDE,
            },
          },
        },
        sharedReel: {
          include: REEL_PREVIEW_INCLUDE,
        },
        comments: {
          include: {
            user: {
              select: POST_USER_SELECT,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        likes: {
          include: {
            user: {
              select: POST_USER_SELECT,
            },
          },
        },
        _count: {
          select: {
            comments: true,
            shares: true,
          },
        },
      },
    })) as PostWithDetails | null;

    if (!post) {
      return null;
    }

    // Count likes with imageIndex = null
    const postLikesCount = await this.prisma.like.count({
      where: {
        postId: post.id,
        imageIndex: null,
      },
    });

    return {
      ...post,
      _count: {
        comments: post._count.comments,
        shares: post._count.shares,
        likes: postLikesCount,
      },
    };
  }

  async checkIfUserLiked(
    postId: string,
    userId: string,
    imageIndex?: number,
  ): Promise<{ liked: boolean; type: string | null }> {
    // Build where clause based on whether imageIndex is provided
    const whereClause: Prisma.LikeWhereInput = {
      postId,
      userId,
      imageIndex:
        imageIndex !== undefined && imageIndex !== null ? imageIndex : null,
    };

    const like = await this.prisma.like.findFirst({
      where: whereClause,
    });

    return {
      liked: !!like,
      type: (like?.type as string) || null,
    };
  }

  async getImageLikes(postId: string, userId: string, imageCount: number) {
    const likes: Record<
      number,
      { isLiked: boolean; reactionType: string | null; count: number }
    > = {};

    for (let i = 0; i < imageCount; i++) {
      // Get user's like for this image
      const userLike = await this.prisma.like.findUnique({
        where: {
          postId_userId_imageIndex: {
            postId,
            userId,
            imageIndex: i,
          },
        },
      });

      // Count total likes for this image
      const count = await this.prisma.like.count({
        where: {
          postId,
          imageIndex: i,
        },
      });

      likes[i] = {
        isLiked: !!userLike,
        reactionType: userLike?.type || null,
        count,
      };
    }

    return likes;
  }

  async getLikeList(postId: string, imageIndex?: number) {
    const whereClause: Prisma.LikeWhereInput = {
      postId,
      imageIndex:
        imageIndex !== undefined && imageIndex !== null ? imageIndex : null,
    };

    const likes = await this.prisma.like.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return likes.map((like) => ({
      id: like.user.id,
      name: like.user.name,
      username: like.user.username,
      avatar: like.user.avatar,
      type: like.type,
    }));
  }

  async toggleLike(
    postId: string,
    userId: string,
    type: string = 'like',
    imageIndex?: number,
  ) {
    // Build where clause for findFirst (supports null in composite key)
    const whereClause: Prisma.LikeWhereInput = {
      postId,
      userId,
      imageIndex:
        imageIndex !== undefined && imageIndex !== null ? imageIndex : null,
    };

    const existingLike = await this.prisma.like.findFirst({
      where: whereClause,
    });

    if (existingLike) {
      // If same reaction type, unlike
      if (existingLike.type === type) {
        await this.prisma.like.delete({
          where: { id: existingLike.id },
        });
        return {
          liked: false,
          type: null as string | null,
          message: 'Unliked',
        };
      } else {
        // Update to new reaction type
        const updated = await this.prisma.like.update({
          where: { id: existingLike.id },
          data: {
            type,
          },
        });
        return {
          liked: true,
          type: updated.type,
          message: 'Reaction updated',
        };
      }
    } else {
      // Create new reaction
      const created = await this.prisma.like.create({
        data: {
          postId,
          userId,
          type,
          imageIndex:
            imageIndex !== undefined && imageIndex !== null ? imageIndex : null,
        },
      });

      // Lấy thông tin post và user để tạo notification
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          avatar: true,
        },
      });

      // Tạo thông báo cho chủ post (nếu không phải chính mình like)
      if (post && post.user.id !== userId && user) {
        const notification = await this.notificationsService.create({
          type: 'like',
          content: `reacted to your post`,
          userId: post.user.id,
          actorId: userId,
          actorName: user.name,
          actorAvatar: user.avatar || undefined,
          relatedId: postId,
        });

        // Emit realtime notification
        this.chatGateway.notifyUser(post.user.id, notification);
      }

      return {
        liked: true,
        type: created.type,
        message: 'Post liked',
      };
    }
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const deleted = await this.prisma.post.delete({
      where: { id },
    });

    // Bust feed cache for author + their followers
    void this.invalidateFeedCache(userId);

    return deleted;
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== userId) {
      throw new Error('Unauthorized');
    }

    console.log('=== UPDATE POST BACKEND DEBUG ===');
    console.log('Post ID:', id);
    console.log('Received updatePostDto:', updatePostDto);
    console.log('content:', updatePostDto.content);
    console.log('imageUrl:', updatePostDto.imageUrl);
    console.log('videoUrl:', updatePostDto.videoUrl);
    console.log('================================');

    // Prepare update data
    const updateData: {
      content?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      visibility?: string;
    } = {};

    if (updatePostDto.content !== undefined) {
      updateData.content = updatePostDto.content;
    }

    if (updatePostDto.imageUrl !== undefined) {
      updateData.imageUrl = updatePostDto.imageUrl || null;
    }

    if (updatePostDto.videoUrl !== undefined) {
      updateData.videoUrl = updatePostDto.videoUrl || null;
    }

    if (updatePostDto.visibility !== undefined) {
      updateData.visibility = updatePostDto.visibility;
    }

    console.log('Final updateData:', updateData);
    console.log('================================');

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Count likes with imageIndex = null
    const postLikesCount = await this.prisma.like.count({
      where: {
        postId: updatedPost.id,
        imageIndex: null,
      },
    });

    const result = {
      ...updatedPost,
      _count: {
        ...updatedPost._count,
        likes: postLikesCount,
      },
    };

    // Bust feed cache since post content/visibility changed
    void this.invalidateFeedCache(userId);

    return result;
  }

  async getUserPhotos(userId: string, page = 1, limit = 9) {
    const skip = (page - 1) * limit;

    // Lấy posts có ảnh của user
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        imageUrl: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    // Extract tất cả ảnh từ posts và thêm index để track thứ tự trong post
    const allPhotos: Array<{
      imageUrl: string;
      postId: string;
      createdAt: Date;
      imageIndex: number;
    }> = [];

    posts.forEach((post) => {
      if (post.imageUrl) {
        const urls = post.imageUrl.split(',');
        urls.forEach((url, index) => {
          allPhotos.push({
            imageUrl: url.trim(),
            postId: post.id,
            createdAt: post.createdAt,
            imageIndex: index,
          });
        });
      }
    });

    // Sort by createdAt desc (mới nhất lên đầu)
    allPhotos.sort((a, b) => {
      const dateCompare = b.createdAt.getTime() - a.createdAt.getTime();
      // Nếu cùng post, sắp xếp theo thứ tự ảnh
      if (dateCompare === 0) {
        return a.imageIndex - b.imageIndex;
      }
      return dateCompare;
    });

    // Pagination
    const total = allPhotos.length;
    const paginatedPhotos = allPhotos.slice(skip, skip + limit);

    return {
      photos: paginatedPhotos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sharePost(postId: string, userId: string, content?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        userId: true,
        sharedPostId: true,
        sharedReelId: true,
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }
    const postSummary = post as PostShareSummary;
    const originalPostId = postSummary.sharedPostId || postId;

    const originalPost = await this.prisma.post.findUnique({
      where: { id: originalPostId },
      select: {
        id: true,
        userId: true,
        sharedReelId: true,
      },
    });

    if (!originalPost) {
      throw new Error('Original post not found');
    }

    const originalPostSummary = originalPost as OriginalPostShareSummary;

    if (
      typeof originalPostSummary.sharedReelId === 'string' &&
      originalPostSummary.sharedReelId
    ) {
      const reelId = originalPostSummary.sharedReelId;

      const sharePayload: ShareReelDto = {};
      const trimmedContent = content?.trim();
      if (trimmedContent) {
        sharePayload.content = trimmedContent;
      }

      const { post: reelSharePost } = await this.reelsService.share(
        reelId,
        userId,
        sharePayload,
      );

      return reelSharePost;
    }

    const createdSharedPost = await this.prisma.post.create({
      data: {
        content: content || '',
        userId,
        sharedPostId: originalPostId,
      },
      include: {
        user: {
          select: POST_USER_SELECT,
        },
        sharedPost: {
          include: {
            user: {
              select: POST_USER_SELECT,
            },
            sharedReel: {
              include: REEL_PREVIEW_INCLUDE,
            },
          },
        },
        sharedReel: {
          include: REEL_PREVIEW_INCLUDE,
        },
        _count: {
          select: {
            comments: true,
            shares: true,
          },
        },
      },
    });

    const postLikesCount = await this.prisma.like.count({
      where: {
        postId: createdSharedPost.id,
        imageIndex: null,
      },
    });

    const sharedPostRecord = createdSharedPost as PostWithRelations;
    const createdSharedPostWithLikes = {
      ...sharedPostRecord,
      _count: {
        comments: sharedPostRecord._count.comments,
        shares: sharedPostRecord._count.shares,
        likes: postLikesCount,
      },
    };

    await this.prisma.share.create({
      data: {
        postId: originalPostId,
        userId,
      },
    });

    if (originalPostSummary.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          avatar: true,
        },
      });

      if (user) {
        const notification = await this.notificationsService.create({
          type: 'share',
          content: `shared your post`,
          userId: originalPostSummary.userId,
          actorId: userId,
          actorName: user.name,
          actorAvatar: user.avatar || undefined,
          relatedId: originalPostId,
        });

        this.chatGateway.notifyUser(originalPostSummary.userId, notification);
      }
    }

    return createdSharedPostWithLikes;
  }

  async toggleSavePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    const existingSave = await this.prisma.savedPost.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingSave) {
      await this.prisma.savedPost.delete({
        where: { id: existingSave.id },
      });

      return { saved: false, message: 'Post unsaved' };
    }

    await this.prisma.savedPost.create({
      data: {
        postId,
        userId,
      },
    });

    return { saved: true, message: 'Post saved' };
  }

  async getSavedPosts(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const savedPosts = (await this.prisma.savedPost.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        post: {
          include: {
            user: {
              select: POST_USER_SELECT,
            },
            sharedPost: {
              include: {
                user: {
                  select: POST_USER_SELECT,
                },
                sharedReel: {
                  include: REEL_PREVIEW_INCLUDE,
                },
              },
            },
            sharedReel: {
              include: REEL_PREVIEW_INCLUDE,
            },
            _count: {
              select: {
                comments: true,
                shares: true,
              },
            },
          },
        },
      },
    })) as SavedPostWithRelations[];

    const total = await this.prisma.savedPost.count({ where: { userId } });

    // Extract posts from savedPosts and check if user liked/saved them, count post likes
    const posts = await Promise.all(
      savedPosts.map(async (savedPost: SavedPostWithRelations) => {
        const [reactionInfo, postLikesCount] = await Promise.all([
          this.checkIfUserLiked(savedPost.post.id, userId),
          this.prisma.like.count({
            where: {
              postId: savedPost.post.id,
              imageIndex: null,
            },
          }),
        ]);

        return {
          ...savedPost.post,
          isLiked: reactionInfo.liked,
          reactionType: reactionInfo.type,
          isSaved: true, // Always true for saved posts
          _count: {
            comments: savedPost.post._count.comments,
            shares: savedPost.post._count.shares,
            likes: postLikesCount,
          },
        };
      }),
    );

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async checkIfPostSaved(postId: string, userId: string): Promise<boolean> {
    const savedPost = await this.prisma.savedPost.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });
    return !!savedPost;
  }
}
