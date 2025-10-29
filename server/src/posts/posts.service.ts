import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    return this.prisma.post.create({
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
            likes: true,
          },
        },
      },
    });
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
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
              comments: true,
              likes: true,
            },
          },
        },
      }),
      this.prisma.post.count(),
    ]);

    return {
      posts,
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
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where: { userId } }),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.post.findUnique({
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
            likes: true,
          },
        },
      },
    });
  }

  async checkIfUserLiked(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; type: string | null }> {
    const like = await this.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    return {
      liked: !!like,
      type: (like?.type as string) || null,
    };
  }

  async toggleLike(postId: string, userId: string, type: string = 'like') {
    const existingLike = await this.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // If same reaction type, unlike
      if (existingLike.type === type) {
        await this.prisma.like.delete({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
        });
        return { liked: false, type: null as string | null, message: 'Post unliked' };
      } else {
        // Update to new reaction type
        const updated = await this.prisma.like.update({
          where: {
            postId_userId: {
              postId,
              userId,
            },
          },
          data: {
            type,
          },
        });
        return { liked: true, type: updated.type as string, message: 'Reaction updated' };
      }
    } else {
      // Create new reaction
      const created = await this.prisma.like.create({
        data: {
          postId,
          userId,
          type,
        },
      });
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

    return this.prisma.post.update({
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
            likes: true,
          },
        },
      },
    });
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
}
