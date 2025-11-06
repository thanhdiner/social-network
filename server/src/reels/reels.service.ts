import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateReelDto } from './dto/create-reel.dto';
import { UpdateReelDto } from './dto/update-reel.dto';
import { CreateReelCommentDto } from './dto/create-reel-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class ReelsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatGateway: ChatGateway,
  ) {}

  // Tạo reel mới
  async create(userId: string, createReelDto: CreateReelDto) {
    return this.prisma.reel.create({
      data: {
        ...createReelDto,
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
            likes: true,
            comments: true,
            shares: true,
          },
        },
      },
    });
  }

  // Lấy danh sách reels (feed)
  async findAll(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const reels = await this.prisma.reel.findMany({
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
            likes: true,
            comments: true,
            shares: true,
          },
        },
      },
    });

    // Check if user liked each reel
    const reelsWithLikeStatus = await Promise.all(
      reels.map(async (reel) => {
        const isLiked = await this.prisma.reelLike.findUnique({
          where: {
            reelId_userId: {
              reelId: reel.id,
              userId,
            },
          },
        });

        return {
          ...reel,
          isLiked: !!isLiked,
        };
      }),
    );

    return reelsWithLikeStatus;
  }

  // Lấy reels của một user
  async findByUser(targetUserId: string, currentUserId: string, page = 1, limit = 10) {
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

    const reelsWithLikeStatus = await Promise.all(
      reels.map(async (reel) => {
        const isLiked = await this.prisma.reelLike.findUnique({
          where: {
            reelId_userId: {
              reelId: reel.id,
              userId: currentUserId,
            },
          },
        });

        return {
          ...reel,
          isLiked: !!isLiked,
        };
      }),
    );

    return reelsWithLikeStatus;
  }

  // Lấy một reel theo ID
  async findOne(id: string, userId: string) {
    const reel = await this.prisma.reel.findUnique({
      where: { id },
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

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    const isLiked = await this.prisma.reelLike.findUnique({
      where: {
        reelId_userId: {
          reelId: id,
          userId,
        },
      },
    });

    // Increment views
    await this.prisma.reel.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    return {
      ...reel,
      isLiked: !!isLiked,
      views: reel.views + 1,
    };
  }

  // Increment view count (called when user watched video enough)
  async view(id: string, userId: string) {
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
  async createComment(reelId: string, userId: string, createCommentDto: CreateReelCommentDto) {
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

        if (parent && parent.user.id !== userId && parent.user.id !== reel.userId) {
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
  async share(reelId: string, userId: string) {
    const reel = await this.prisma.reel.findUnique({
      where: { id: reelId },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    await this.prisma.reelShare.create({
      data: {
        reelId,
        userId,
      },
    });

    return { message: 'Reel shared successfully' };
  }
}
