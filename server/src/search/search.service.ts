import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchAll(query: string, currentUserId: string, limit = 10) {
    if (!query || query.trim().length === 0) {
      return { users: [], posts: [] };
    }

    const searchQuery = query.trim();

    // Search users
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { username: { contains: searchQuery, mode: 'insensitive' } },
          { bio: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
      take: limit,
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
    });

    // Search posts
    const posts = await this.prisma.post.findMany({
      where: {
        content: { contains: searchQuery, mode: 'insensitive' },
      },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        videoUrl: true,
        createdAt: true,
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
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      users: users.map((user) => ({
        ...user,
        followersCount: user._count.followers,
        followingCount: user._count.following,
      })),
      posts: posts.map((post) => ({
        ...post,
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        sharesCount: post._count.shares,
      })),
    };
  }

  async searchUsers(query: string, currentUserId: string, limit = 20) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchQuery = query.trim();

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { username: { contains: searchQuery, mode: 'insensitive' } },
          { bio: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
      take: limit,
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
    });

    // Check follow status for each user
    const usersWithFollowStatus = await Promise.all(
      users.map(async (user) => {
        const isFollowing = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: user.id,
            },
          },
        });

        return {
          ...user,
          followersCount: user._count.followers,
          followingCount: user._count.following,
          postsCount: user._count.posts,
          isFollowing: !!isFollowing,
        };
      }),
    );

    return usersWithFollowStatus;
  }

  async searchPosts(query: string, currentUserId: string, limit = 20) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchQuery = query.trim();

    const posts = await this.prisma.post.findMany({
      where: {
        content: { contains: searchQuery, mode: 'insensitive' },
      },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        videoUrl: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        likes: {
          where: {
            userId: currentUserId,
          },
          select: {
            type: true,
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
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts.map((post) => ({
      ...post,
      currentUserReaction: post.likes[0]?.type || null,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post._count.shares,
    }));
  }

  async getPopularSearches(limit = 10) {
    // This could be implemented with a search_history table
    // For now, return popular users
    const popularUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
      },
      orderBy: {
        followers: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return popularUsers.map((user) => ({
      type: 'user' as const,
      query: user.name,
      data: user,
    }));
  }
}
