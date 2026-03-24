/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';

interface CreateAnnouncementPayload {
  adminId: string;
  adminName?: string;
  title?: string;
  content: string;
  audience?: 'all' | 'active';
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatGateway: ChatGateway,
  ) {}

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

  async createAnnouncement(payload: CreateAnnouncementPayload) {
    const prismaAny = this.prisma as any;
    const title = payload.title?.trim() || '';
    const content = payload.content?.trim();
    const audience = payload.audience === 'active' ? 'active' : 'all';

    if (!content) {
      throw new BadRequestException('Nội dung thông báo không được để trống');
    }

    const fullContent = title ? `[${title}] ${content}` : content;

    const users = await prismaAny.user.findMany({
      where: audience === 'active' ? { isActive: true } : undefined,
      select: { id: true },
    });

    if (users.length === 0) {
      return {
        message: 'Không có người dùng phù hợp để gửi thông báo',
        delivered: 0,
      };
    }

    const actorName = payload.adminName || 'Admin';
    const chunkSize = 80;
    let delivered = 0;

    for (let i = 0; i < users.length; i += chunkSize) {
      const chunk = users.slice(i, i + chunkSize);
      const notifications = await Promise.all(
        chunk.map((user: { id: string }) =>
          this.notificationsService.create({
            type: 'announcement',
            content: fullContent,
            userId: user.id,
            actorId: payload.adminId,
            actorName,
          }),
        ),
      );

      notifications.forEach((notification) => {
        this.chatGateway.notifyUser(notification.userId, notification);
      });

      delivered += notifications.length;
    }

    return {
      message: 'Đã phát thông báo thành công',
      delivered,
      audience,
      title,
    };
  }

  // ─── User Management ─────────────────────────────────────────────────────────

  async createUser(payload: {
    name?: string;
    username: string;
    email: string;
    password: string;
    role?: string;
    isActive?: boolean;
    avatar?: string;
  }) {
    const prismaAny = this.prisma as any;
    const name = payload.name?.trim() || '';
    const username = payload.username?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;
    const role = payload.role === 'admin' ? 'admin' : 'user';
    const isActive = typeof payload.isActive === 'boolean' ? payload.isActive : true;

    if (!username || !email || !password) {
      throw new BadRequestException('Username, email và mật khẩu là bắt buộc');
    }

    if (password.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

    try {
      const hashed = await bcrypt.hash(password, 10);
      const user = await prismaAny.user.create({
        data: {
          name,
          username,
          email,
          password: hashed,
          role,
          isActive,
          avatar: payload.avatar || null,
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          avatar: true,
        },
      });
      return user;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('Tên đăng nhập hoặc email đã tồn tại');
      }
      throw err;
    }
  }

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
