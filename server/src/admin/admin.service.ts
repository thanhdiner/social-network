/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Dashboard Stats ─────────────────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const prismaAny = this.prisma as any;

    const [
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      totalPosts,
      newPostsThisMonth,
      newPostsLastMonth,
      totalReels,
      totalComments,
      totalLikes,
      activeUsers,
    ] = await Promise.all([
      prismaAny.user.count(),
      prismaAny.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prismaAny.user.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),
      prismaAny.post.count(),
      prismaAny.post.count({ where: { createdAt: { gte: startOfMonth } } }),
      prismaAny.post.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),
      prismaAny.reel.count(),
      prismaAny.comment.count(),
      prismaAny.like.count(),
      prismaAny.user.count({ where: { isActive: true } }),
    ]);

    return {
      totalUsers,
      newUsersThisMonth,
      usersGrowth:
        newUsersLastMonth === 0
          ? 100
          : Math.round(
              ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) *
                100,
            ),
      totalPosts,
      newPostsThisMonth,
      postsGrowth:
        newPostsLastMonth === 0
          ? 100
          : Math.round(
              ((newPostsThisMonth - newPostsLastMonth) / newPostsLastMonth) *
                100,
            ),
      totalReels,
      totalComments,
      totalLikes,
      activeUsers,
    };
  }

  async getGrowthChart() {
    const prismaAny = this.prisma as any;
    const months: Array<{ month: string; users: number; posts: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [users, posts] = await Promise.all([
        prismaAny.user.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        prismaAny.post.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
      ]);

      months.push({
        month: start.toLocaleString('vi-VN', { month: 'short', year: 'numeric' }),
        users: users as number,
        posts: posts as number,
      });
    }

    return months;
  }

  async getRecentActivity() {
    const prismaAny = this.prisma as any;

    const [recentUsers, recentPosts] = await Promise.all([
      prismaAny.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          email: true,
          createdAt: true,
          role: true,
          isActive: true,
        },
      }),
      prismaAny.post.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, username: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
    ]);

    return { recentUsers, recentPosts };
  }

  // ─── User Management ─────────────────────────────────────────────────────────

  async getUsers(page = 1, limit = 10, search?: string, role?: string) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;

    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (role) {
      conditions.push({ role });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [users, total] = await Promise.all([
      prismaAny.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { posts: true, followers: true, following: true },
          },
        },
      }),
      prismaAny.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string) {
    const prismaAny = this.prisma as any;

    const user = await prismaAny.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        coverImage: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!user) return null;

    const recentPosts = await prismaAny.post.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    return { ...user, recentPosts };
  }

  async updateUserRole(userId: string, role: string) {
    const prismaAny = this.prisma as any;
    return prismaAny.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, role: true },
    });
  }

  async toggleUserActive(userId: string) {
    const prismaAny = this.prisma as any;
    const user = await prismaAny.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user) return null;

    return prismaAny.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  async deleteUser(userId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.user.delete({ where: { id: userId } });
    return { message: 'Đã xóa người dùng thành công' };
  }

  // ─── Post Management ─────────────────────────────────────────────────────────

  async getPosts(page = 1, limit = 10, search?: string) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;
    const where = search
      ? { content: { contains: search, mode: 'insensitive' } }
      : {};

    const [posts, total] = await Promise.all([
      prismaAny.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          _count: { select: { likes: true, comments: true, shares: true } },
        },
      }),
      prismaAny.post.count({ where }),
    ]);

    return {
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deletePost(postId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.post.delete({ where: { id: postId } });
    return { message: 'Đã xóa bài viết thành công' };
  }

  // ─── Reels Management ────────────────────────────────────────────────────────

  async getReels(page = 1, limit = 10) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;

    const [reels, total] = await Promise.all([
      prismaAny.reel.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          _count: { select: { likes: true, comments: true, shares: true } },
        },
      }),
      prismaAny.reel.count(),
    ]);

    return {
      reels,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteReel(reelId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.reel.delete({ where: { id: reelId } });
    return { message: 'Đã xóa reel thành công' };
  }
}
