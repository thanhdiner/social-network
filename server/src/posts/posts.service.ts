import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatGateway: ChatGateway,
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
    let whereClause = {};
    if (userId) {
      // Get list of users that current user is following
      const following = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      
      const followingIds = following.map(f => f.followingId);
      
      // Include posts from user and people they follow
      whereClause = {
        userId: {
          in: [userId, ...followingIds],
        },
      };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: whereClause,
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
          sharedPost: {
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
          },
          _count: {
            select: {
              comments: true,
              shares: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where: whereClause }),
    ]);

    // Count likes with imageIndex = null for each post
    const postsWithLikes = await Promise.all(
      posts.map(async (post) => {
        const postLikesCount = await this.prisma.like.count({
          where: {
            postId: post.id,
            imageIndex: null,
          },
        });

        return {
          ...post,
          _count: {
            ...post._count,
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

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId },
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
          sharedPost: {
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
          },
          _count: {
            select: {
              comments: true,
              shares: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where: { userId } }),
    ]);

    // Count likes with imageIndex = null for each post
    const postsWithLikes = await Promise.all(
      posts.map(async (post) => {
        const postLikesCount = await this.prisma.like.count({
          where: {
            postId: post.id,
            imageIndex: null,
          },
        });

        return {
          ...post,
          _count: {
            ...post._count,
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
    const post = await this.prisma.post.findUnique({
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
        sharedPost: {
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
        },
        comments: {
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
        },
        likes: {
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
        },
        _count: {
          select: {
            comments: true,
            shares: true,
          },
        },
      },
    });

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
        ...post._count,
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
    const whereClause: any = {
      postId,
      userId,
    };

    // Only add imageIndex to where clause if it's a valid number
    if (imageIndex !== undefined && imageIndex !== null) {
      whereClause.imageIndex = imageIndex;
    } else {
      // For post likes (not image likes), imageIndex should be null
      whereClause.imageIndex = null;
    }

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
        } as any,
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
    const whereClause: any = { postId };
    
    if (imageIndex !== undefined && imageIndex !== null) {
      whereClause.imageIndex = imageIndex;
    } else {
      whereClause.imageIndex = null;
    }

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
    const whereClause: any = { postId, userId };
    
    if (imageIndex !== undefined && imageIndex !== null) {
      whereClause.imageIndex = imageIndex;
    } else {
      whereClause.imageIndex = null;
    }

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
          imageIndex: imageIndex !== undefined && imageIndex !== null ? imageIndex : null,
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

      return { liked: true, type: created.type as string, message: 'Post liked' };
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
    // Kiểm tra xem post có tồn tại không
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        sharedPost: {
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
        },
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Lấy ID của bài gốc (nếu đang share bài đã share thì lấy bài gốc)
    const originalPostId = post.sharedPostId || postId;
    const originalPost = post.sharedPostId ? post.sharedPost : post;

    if (!originalPost) {
      throw new Error('Original post not found');
    }

    // Tạo shared post mới (luôn trỏ về bài gốc)
    const sharedPost = await this.prisma.post.create({
      data: {
        content: content || '',
        userId,
        sharedPostId: originalPostId,
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
        sharedPost: {
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
        },
        _count: {
          select: {
            comments: true,
            shares: true,
          },
        },
      },
    });

    // Count likes with imageIndex = null
    const postLikesCount = await this.prisma.like.count({
      where: {
        postId: sharedPost.id,
        imageIndex: null,
      },
    });

    const sharedPostWithLikes = {
      ...sharedPost,
      _count: {
        ...sharedPost._count,
        likes: postLikesCount,
      },
    };

    // Tạo bản ghi share (luôn lưu là share bài gốc)
    await this.prisma.share.create({
      data: {
        postId: originalPostId,
        userId,
      },
    });

    // Tạo thông báo cho chủ bài gốc (nếu không phải chính mình share)
    if (originalPost.userId !== userId) {
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
          userId: originalPost.userId,
          actorId: userId,
          actorName: user.name,
          actorAvatar: user.avatar || undefined,
          relatedId: originalPostId,
        });

        // Emit realtime notification
        this.chatGateway.notifyUser(originalPost.userId, notification);
      }
    }

    return sharedPostWithLikes;
  }

  async toggleSavePost(postId: string, userId: string) {
    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    // Check if already saved
    const existingSave = await this.prisma.savedPost.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingSave) {
      // Unsave
      await this.prisma.savedPost.delete({
        where: { id: existingSave.id },
      });
      return { saved: false, message: 'Post unsaved' };
    } else {
      // Save
      await this.prisma.savedPost.create({
        data: {
          postId,
          userId,
        },
      });
      return { saved: true, message: 'Post saved' };
    }
  }

  async getSavedPosts(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [savedPosts, total] = await Promise.all([
      this.prisma.savedPost.findMany({
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
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true,
                },
              },
              sharedPost: {
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
      }),
      this.prisma.savedPost.count({ where: { userId } }),
    ]);

    // Extract posts from savedPosts and check if user liked/saved them, count post likes
    const posts = await Promise.all(
      savedPosts.map(async (savedPost) => {
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
            ...savedPost.post._count,
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
