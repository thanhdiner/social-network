import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ReelsService } from '../reels/reels.service';
import { ShareReelDto } from '../reels/dto/share-reel.dto';

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
  ) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    const newPost = await this.prisma.post.create({
      data: {
        content: createPostDto.content,
        imageUrl: createPostDto.imageUrl,
        videoUrl: createPostDto.videoUrl,
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
    return {
      ...newPost,
      _count: {
        ...newPost._count,
        likes: 0,
      },
    };
  }

  async findAll(page = 1, limit = 10, userId?: string) {
    const skip = (page - 1) * limit;

    // Build where clause: posts from user or people they follow
    let whereClause: Prisma.PostWhereInput = {};
    if (userId) {
      // Get list of users that current user is following
      const following = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });

      const followingIds = following.map((f) => f.followingId);

      // Include posts from user and people they follow
      whereClause = {
        userId: {
          in: [userId, ...followingIds],
        },
      };
    }

    const posts = (await this.prisma.post.findMany({
      where: whereClause,
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

    const total = await this.prisma.post.count({ where: whereClause });

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

    return this.prisma.post.delete({
      where: { id },
    });
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

    return {
      ...updatedPost,
      _count: {
        ...updatedPost._count,
        likes: postLikesCount,
      },
    };
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
