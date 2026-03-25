import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateReelDto } from './dto/create-reel.dto';
import { UpdateReelDto } from './dto/update-reel.dto';
import { CreateReelCommentDto } from './dto/create-reel-comment.dto';
import { ShareReelDto } from './dto/share-reel.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
} as const;

const COUNT_SELECT = {
  likes: true,
  comments: true,
  shares: true,
} as const;

const SHARED_FROM_INCLUDE = {
  user: {
    select: USER_SELECT,
  },
  _count: {
    select: COUNT_SELECT,
  },
} as const;

const REEL_INCLUDE = {
  user: {
    select: USER_SELECT,
  },
  sharedFrom: {
    include: SHARED_FROM_INCLUDE,
  },
  _count: {
    select: COUNT_SELECT,
  },
} as const;

const POST_COUNT_SELECT = {
  comments: true,
  shares: true,
} as const;

type SharedFromPayload = Prisma.ReelGetPayload<{
  include: typeof SHARED_FROM_INCLUDE;
}>;
type ReelWithRelations = Prisma.ReelGetPayload<{
  include: typeof REEL_INCLUDE;
}>;

type SharedReelPostPayload = Prisma.PostGetPayload<{
  include: {
    user: { select: typeof USER_SELECT };
    sharedReel: { include: typeof REEL_INCLUDE };
    _count: { select: typeof POST_COUNT_SELECT };
  };
}>;

@Injectable()
export class ReelsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatGateway: ChatGateway,
  ) {}

  private readonly userSelect = USER_SELECT;

  private readonly countSelect = COUNT_SELECT;

  private readonly reelInclude = REEL_INCLUDE;

  private getReelWithRelations(id: string) {
    return this.prisma.reel.findUnique({
      where: { id },
      include: this.reelInclude,
    });
  }

  private extractSharedFromId(reel: ReelWithRelations | null) {
    const candidate = (reel as { sharedFromId?: unknown } | null)?.sharedFromId;
    return typeof candidate === 'string' && candidate.length > 0
      ? candidate
      : null;
  }

  private async resolveOriginalReel(reel: ReelWithRelations) {
    let current: ReelWithRelations | null = reel;

    while (true) {
      const parentId = this.extractSharedFromId(current);
      if (!parentId) break;

      const parent = await this.getReelWithRelations(parentId);
      if (!parent) break;
      current = parent;
    }

    return current ?? reel;
  }

  private async formatReelForViewer(reel: ReelWithRelations, viewerId: string) {
    const sharedFrom = reel.sharedFrom ?? null;

    const [likeRecord, shareCountForReel, sharedFromShareCount] =
      await Promise.all([
        this.prisma.reelLike.findUnique({
          where: {
            reelId_userId: {
              reelId: reel.id,
              userId: viewerId,
            },
          },
        }),
        this.prisma.reelShare.count({
          where: { reelId: reel.id },
        }),
        sharedFrom
          ? this.prisma.reelShare.count({
              where: { reelId: sharedFrom.id },
            })
          : Promise.resolve(undefined),
      ]);

    const formattedSharedFrom = sharedFrom
      ? {
          ...sharedFrom,
          _count: {
            ...(sharedFrom._count ?? { likes: 0, comments: 0, shares: 0 }),
            shares: sharedFromShareCount ?? sharedFrom._count?.shares ?? 0,
          },
        }
      : undefined;

    return {
      ...reel,
      sharedFrom: formattedSharedFrom,
      _count: {
        ...(reel._count ?? { likes: 0, comments: 0, shares: 0 }),
        shares: shareCountForReel,
      },
      isLiked: !!likeRecord,
    };
  }

  // Tạo reel mới
  async create(userId: string, createReelDto: CreateReelDto) {
    return this.prisma.reel.create({
      data: {
        ...createReelDto,
        userId,
      },
      include: this.reelInclude,
    });
  }

  // Lấy danh sách reels (feed). Supports modes: 'default' (recent), 'trending', 'random'
  async findAll(
    userId: string,
    page = 1,
    limit = 10,
    mode: string = 'default',
  ) {
    const skip = (page - 1) * limit;

    let reels: ReelWithRelations[] = [];

    if (mode === 'trending') {
      // Trending: order by views within the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      reels = await this.prisma.reel.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        skip,
        take: limit,
        orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
        include: this.reelInclude,
      });
    } else if (mode === 'random') {
      // Random: pick a random contiguous block using random skip to avoid DB-specific RANDOM() usage
      const total = await this.prisma.reel.count();
      if (total <= limit) {
        reels = await this.prisma.reel.findMany({
          take: limit,
          include: this.reelInclude,
        });
      } else {
        const maxSkip = Math.max(total - limit, 0);
        const randomSkip = Math.floor(Math.random() * (maxSkip + 1));
        reels = await this.prisma.reel.findMany({
          skip: randomSkip,
          take: limit,
          include: this.reelInclude,
        });
      }
    } else {
      // Default: recent
      reels = await this.prisma.reel.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: this.reelInclude,
      });
    }

    const reelsWithMeta = await Promise.all(
      reels.map((reel) => this.formatReelForViewer(reel, userId)),
    );

    return reelsWithMeta;
  }

  // Lấy reels của một user
  async findByUser(
    targetUserId: string,
    currentUserId: string,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;

    const reels = await this.prisma.reel.findMany({
      where: {
        userId: targetUserId,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: this.reelInclude,
    });

    const reelsWithMeta = await Promise.all(
      reels.map((reel) => this.formatReelForViewer(reel, currentUserId)),
    );

    return reelsWithMeta;
  }

  // Lấy một reel theo ID
  async findOne(id: string, userId: string) {
    const reel = await this.prisma.reel.findUnique({
      where: { id },
      include: this.reelInclude,
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    await this.prisma.reel.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    const formatted = await this.formatReelForViewer(reel, userId);

    return {
      ...formatted,
      views: reel.views + 1,
    };
  }

  // Increment view count (called when user watched video enough)
  async view(id: string, userId: string) {
    void userId;
    const reel = await this.prisma.reel.findUnique({ where: { id } });
    if (!reel) throw new NotFoundException('Reel not found');

    const updated = await this.prisma.reel.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return { views: updated.views };
  }

  // Cập nhật reel
  async update(id: string, userId: string, updateReelDto: UpdateReelDto) {
    const reel = await this.prisma.reel.findUnique({
      where: { id },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    if (reel.userId !== userId) {
      throw new ForbiddenException('You can only update your own reels');
    }

    return this.prisma.reel.update({
      where: { id },
      data: updateReelDto,
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
            likes: true,
            comments: true,
            shares: true,
          },
        },
      },
    });
  }

  // Xóa reel
  async remove(id: string, userId: string) {
    const reel = await this.prisma.reel.findUnique({
      where: { id },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    if (reel.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reels');
    }

    await this.prisma.reel.delete({
      where: { id },
    });

    return { message: 'Reel deleted successfully' };
  }

  // Like reel
  async like(reelId: string, userId: string) {
    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
      include: {
        user: {
          select: { id: true }
        }
      }
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    const existingLike = await this.prisma.reelLike.findUnique({
      where: {
        reelId_userId: {
          reelId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.reelLike.delete({
        where: {
          reelId_userId: {
            reelId,
            userId,
          },
        },
      });
      return { liked: false };
    } else {
      // Like
      await this.prisma.reelLike.create({
        data: {
          reelId,
          userId,
        },
      });

      try {
        if (reel.userId !== userId) {
          const liker = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, avatar: true },
          });

          if (liker) {
            const notification = await this.notificationsService.create({
              type: 'like',
              content: `liked your reel`,
              userId: reel.userId,
              actorId: userId,
              actorName: liker.name,
              actorAvatar: liker.avatar || undefined,
              relatedId: reelId,
            });

            this.chatGateway.notifyUser(reel.userId, notification);
          }
        }
      } catch (err) {
        console.error('Failed to emit like notification', err);
      }

      return { liked: true };
    }
  }

  // Get comments
  async getComments(reelId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const comments = await this.prisma.reelComment.findMany({
      where: {
        reelId,
        parentId: null, // Only get root comments
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
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
            replies: true,
          },
        },
      },
    });

    return comments;
  }

  // Get comment replies
  async getCommentReplies(commentId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const replies = await this.prisma.reelComment.findMany({
      where: {
        parentId: commentId,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'asc',
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
      },
    });

    return replies;
  }

  // Create comment
  async createComment(
    reelId: string,
    userId: string,
    createCommentDto: CreateReelCommentDto,
  ) {
    if (!createCommentDto.content?.trim() && !createCommentDto.imageUrl) {
      throw new BadRequestException('Comment content or image is required');
    }

    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    if (createCommentDto.parentId) {
      const parentComment = await this.prisma.reelComment.findUnique({
        where: { id: createCommentDto.parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.reelComment.create({
      data: {
        content: createCommentDto.content?.trim() ?? '',
        reelId,
        userId,
        parentId: createCommentDto.parentId,
        imageUrl: createCommentDto.imageUrl ?? null,
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
            replies: true,
          },
        },
      },
    });

    // Notify reel owner (if not the commenter)
    try {
      if (reel.userId !== userId) {
        const notification = await this.notificationsService.create({
          type: 'comment',
          content: `commented on your reel`,
          userId: reel.userId,
          actorId: userId,
          actorName: comment.user.name,
          actorAvatar: comment.user.avatar || undefined,
          relatedId: reelId,
        });

        // Emit realtime notification and a specific reel_comment_created event
        this.chatGateway.notifyUser(reel.userId, notification);
      }

      // If this is a reply, notify the parent comment owner (if different)
      if (createCommentDto.parentId) {
        const parent = await this.prisma.reelComment.findUnique({
          where: { id: createCommentDto.parentId },
          include: { user: { select: { id: true } } },
        });

        if (
          parent &&
          parent.user.id !== userId &&
          parent.user.id !== reel.userId
        ) {
          const notification = await this.notificationsService.create({
            type: 'comment',
            content: `replied to your comment`,
            userId: parent.user.id,
            actorId: userId,
            actorName: comment.user.name,
            actorAvatar: comment.user.avatar || undefined,
            relatedId: reelId,
          });

          this.chatGateway.notifyUser(parent.user.id, notification);
        }
      }
    } catch (err) {
      // If notification sending fails, don't block comment creation
      console.error('Failed to create/emit reel comment notification', err);
    }

    try {
      this.chatGateway.broadcast('reel_comment_created', comment);
    } catch (err) {
      console.error('Failed to broadcast reel comment', err);
    }

    return comment;
  }

  // Delete comment
  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.reelComment.findUnique({
      where: { id: commentId },
      include: {
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.reelComment.delete({
      where: { id: commentId },
    });

    const removedReplies = comment._count?.replies ?? 0;
    const payload = {
      reelId: comment.reelId,
      commentId,
      parentId: comment.parentId,
      removedCount: 1 + removedReplies,
      removedReplies,
    };

    try {
      this.chatGateway.broadcast('reel_comment_deleted', payload);
    } catch (err) {
      console.error('Failed to broadcast reel_comment_deleted', err);
    }

    return { message: 'Comment deleted successfully' };
  }

  // Share reel
  async share(reelId: string, userId: string, shareReelDto: ShareReelDto) {
    const target = await this.getReelWithRelations(reelId);

    if (!target) {
      throw new NotFoundException('Reel not found');
    }

    const original = await this.resolveOriginalReel(target);
    const shareContent = shareReelDto.content?.trim() || null;

    const sharedReelRaw = await this.prisma.reel.create({
      data: {
        userId,
        videoUrl: original.videoUrl,
        thumbnailUrl: original.thumbnailUrl,
        description: original.description,
        shareContent,
        sharedFromId: original.id,
      },
      include: this.reelInclude,
    });

    await this.prisma.reelShare.create({
      data: {
        reelId: original.id,
        userId,
        content: shareContent,
      },
    });

    const [sharedReelFormatted, shares] = await Promise.all([
      this.formatReelForViewer(sharedReelRaw, userId),
      this.prisma.reelShare.count({
        where: { reelId: original.id },
      }),
    ]);

    const createdPostRecord = await this.prisma.post.create({
      data: {
        userId,
        content: shareContent ?? '',
        sharedReelId: original.id,
      },
    });

    const createdPost = await this.prisma.post.findUnique({
      where: { id: createdPostRecord.id },
      include: {
        user: {
          select: USER_SELECT,
        },
        sharedReel: {
          include: this.reelInclude,
        },
        _count: {
          select: POST_COUNT_SELECT,
        },
      },
    });

    if (!createdPost) {
      throw new Error('Failed to load shared reel post');
    }

    const sharedReel = {
      ...sharedReelFormatted,
      sharedFrom: sharedReelFormatted.sharedFrom
        ? {
            ...sharedReelFormatted.sharedFrom,
            _count: {
              ...(sharedReelFormatted.sharedFrom._count ?? {
                likes: 0,
                comments: 0,
                shares: 0,
              }),
              shares,
            },
          }
        : undefined,
    };

    const sharedPostBase: SharedReelPostPayload = createdPost;

    const sharedPost = {
      ...sharedPostBase,
      _count: {
        comments: sharedPostBase._count.comments,
        shares: sharedPostBase._count.shares,
        likes: 0,
      },
      sharedReel: sharedPostBase.sharedReel ?? undefined,
    };

    if (original.userId !== userId && original.user) {
      try {
        const notification = await this.notificationsService.create({
          type: 'share',
          content: shareContent
            ? `shared your reel: "${shareContent}"`
            : 'shared your reel',
          userId: original.userId,
          actorId: userId,
          actorName: sharedReel.user?.name ?? 'Someone',
          actorAvatar: sharedReel.user?.avatar || undefined,
          relatedId: original.id,
        });

        this.chatGateway.notifyUser(original.userId, notification);
      } catch (err) {
        console.error('Failed to create/emit reel share notification', err);
      }
    }

    const payload = {
      reelId: original.id,
      shares,
      share: sharedReel,
      post: sharedPost,
    };

    try {
      this.chatGateway.broadcast('reel_share_created', payload);
    } catch (err) {
      console.error('Failed to broadcast reel share', err);
    }

    return {
      ...payload,
      message: 'Reel shared successfully',
    };
  }
}
