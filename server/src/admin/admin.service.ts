/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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

const normalizeModerationKeyword = (keyword: string) =>
  keyword.trim().toLowerCase().replace(/\s+/g, ' ');

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

  // ─── Admin Account Management ──────────────────────────────────────────────

  async getAccountProfile(adminId: string, currentSessionId?: string) {
    const prismaAny = this.prisma as any;

    const admin = await prismaAny.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatar: true,
        loginAlertsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Không tìm thấy tài khoản admin');
    }

    const sessions = await this.getAccountSessions(adminId, currentSessionId);

    return {
      profile: {
        adminId: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        avatar: admin.avatar,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
      security: {
        loginAlertsEnabled: admin.loginAlertsEnabled,
      },
      sessions,
    };
  }

  async updateAccountProfile(
    adminId: string,
    payload: { name?: string; email?: string; avatar?: string | null },
  ) {
    const prismaAny = this.prisma as any;

    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const avatar =
      payload.avatar === undefined
        ? undefined
        : payload.avatar
          ? payload.avatar.trim()
          : null;

    if (!name) {
      throw new BadRequestException('Tên hiển thị không được để trống');
    }

    if (!email) {
      throw new BadRequestException('Email không được để trống');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    try {
      const updated = await prismaAny.admin.update({
        where: { id: adminId },
        data: {
          name,
          email,
          avatar,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        adminId: updated.id,
        username: updated.username,
        name: updated.name,
        email: updated.email,
        avatar: updated.avatar,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('Email đã được sử dụng bởi tài khoản khác');
      }
      if (err?.code === 'P2025') {
        throw new NotFoundException('Không tìm thấy tài khoản admin');
      }
      throw err;
    }
  }

  async updateAccountPassword(
    adminId: string,
    payload: { currentPassword: string; newPassword: string; confirmPassword?: string },
  ) {
    const prismaAny = this.prisma as any;

    const currentPassword = payload.currentPassword || '';
    const newPassword = payload.newPassword || '';
    const confirmPassword = payload.confirmPassword || '';

    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      throw new BadRequestException('Xác nhận mật khẩu không khớp');
    }

    const admin = await prismaAny.admin.findUnique({
      where: { id: adminId },
      select: { id: true, password: true },
    });

    if (!admin) {
      throw new NotFoundException('Không tìm thấy tài khoản admin');
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prismaAny.admin.update({
      where: { id: adminId },
      data: { password: hashed },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async updateAccountSecurity(
    adminId: string,
    payload: { loginAlertsEnabled?: boolean },
  ) {
    const prismaAny = this.prisma as any;

    if (typeof payload.loginAlertsEnabled !== 'boolean') {
      throw new BadRequestException('Không có thiết lập bảo mật để cập nhật');
    }

    const updated = await prismaAny.admin.update({
      where: { id: adminId },
      data: {
        ...(typeof payload.loginAlertsEnabled === 'boolean'
          ? { loginAlertsEnabled: payload.loginAlertsEnabled }
          : {}),
      },
      select: {
        loginAlertsEnabled: true,
        updatedAt: true,
      },
    });

    return {
      loginAlertsEnabled: updated.loginAlertsEnabled,
      updatedAt: updated.updatedAt,
    };
  }

  async getAccountSessions(adminId: string, currentSessionId?: string) {
    const prismaAny = this.prisma as any;

    const sessions = await prismaAny.adminSession.findMany({
      where: {
        adminId,
        revokedAt: null,
      },
      orderBy: [{ lastActiveAt: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        device: true,
        location: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    return sessions.map((session: any) => ({
      id: session.id,
      device: session.device,
      location: session.location || session.ipAddress || 'Unknown location',
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      current: Boolean(currentSessionId && session.id === currentSessionId),
    }));
  }

  async revokeAccountSession(
    adminId: string,
    sessionId: string,
    currentSessionId?: string,
  ) {
    const prismaAny = this.prisma as any;

    if (sessionId === currentSessionId) {
      throw new BadRequestException('Không thể thu hồi phiên hiện tại');
    }

    const target = await prismaAny.adminSession.findFirst({
      where: {
        id: sessionId,
        adminId,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('Không tìm thấy phiên đăng nhập');
    }

    await prismaAny.adminSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Đã thu hồi phiên đăng nhập' };
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
      const searchTerm = search.trim();
      conditions.push({
        OR: [
          { id: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { username: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
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

  async updateUser(
    userId: string,
    payload: {
      name?: string;
      username?: string;
      email?: string;
      bio?: string;
      avatar?: string;
    },
  ) {
    const prismaAny = this.prisma as any;

    const username = payload.username?.trim();
    const email = payload.email?.trim().toLowerCase();

    if (!username) {
      throw new BadRequestException('Username không được để trống');
    }

    if (!email) {
      throw new BadRequestException('Email không được để trống');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    try {
      return await prismaAny.user.update({
        where: { id: userId },
        data: {
          name: payload.name?.trim() || '',
          username,
          email,
          bio: payload.bio?.trim() || null,
          avatar:
            typeof payload.avatar === 'string' ? payload.avatar.trim() || null : undefined,
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          bio: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('Tên đăng nhập hoặc email đã tồn tại');
      }
      if (err?.code === 'P2025') {
        throw new NotFoundException('Không tìm thấy người dùng');
      }
      throw err;
    }
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

  async getPosts(page = 1, limit = 10, search?: string, media?: string) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search?.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
        { user: { id: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
        {
          user: { username: { contains: searchTerm, mode: 'insensitive' } },
        },
      ];
    }

    if (media === 'image') {
      where.imageUrl = { not: null };
    } else if (media === 'video') {
      where.videoUrl = { not: null };
    } else if (media === 'text') {
      where.imageUrl = null;
      where.videoUrl = null;
    }

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

  async getPostDetail(postId: string) {
    const prismaAny = this.prisma as any;

    const post = await prismaAny.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatar: true,
            bio: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        comments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
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
        likes: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            createdAt: true,
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
        shares: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            createdAt: true,
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
        _count: { select: { likes: true, comments: true, shares: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return post;
  }

  async createPost(payload: {
    userId: string;
    content?: string;
    imageUrl?: string;
    videoUrl?: string;
  }) {
    const prismaAny = this.prisma as any;
    const userId = payload.userId?.trim();
    const content = payload.content?.trim() || '';
    const imageUrl = payload.imageUrl?.trim() || null;
    const videoUrl = payload.videoUrl?.trim() || null;

    if (!userId) {
      throw new BadRequestException('Thiếu thông tin tác giả bài viết');
    }

    if (!content && !imageUrl && !videoUrl) {
      throw new BadRequestException('Bài viết phải có nội dung hoặc media');
    }

    const user = await prismaAny.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tác giả bài viết');
    }

    return prismaAny.post.create({
      data: {
        userId,
        content,
        imageUrl,
        videoUrl,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        _count: { select: { likes: true, comments: true, shares: true } },
      },
    });
  }

  async updatePost(
    postId: string,
    payload: {
      content?: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
    },
  ) {
    const prismaAny = this.prisma as any;
    const content = payload.content?.trim() ?? undefined;

    if (
      payload.content === undefined &&
      payload.imageUrl === undefined &&
      payload.videoUrl === undefined
    ) {
      throw new BadRequestException('Không có dữ liệu cần cập nhật');
    }

    const nextImageUrl =
      payload.imageUrl === undefined
        ? undefined
        : payload.imageUrl
          ? payload.imageUrl.trim() || null
          : null;

    const nextVideoUrl =
      payload.videoUrl === undefined
        ? undefined
        : payload.videoUrl
          ? payload.videoUrl.trim() || null
          : null;

    if (
      (content !== undefined ? !content : false) &&
      !nextImageUrl &&
      !nextVideoUrl
    ) {
      throw new BadRequestException('Bài viết phải có nội dung hoặc media');
    }

    try {
      return await prismaAny.post.update({
        where: { id: postId },
        data: {
          content,
          imageUrl: nextImageUrl,
          videoUrl: nextVideoUrl,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          _count: { select: { likes: true, comments: true, shares: true } },
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException('Không tìm thấy bài viết');
      }
      throw err;
    }
  }

  async deletePost(postId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.post.delete({ where: { id: postId } });
    return { message: 'Đã xóa bài viết thành công' };
  }

  // ─── Reels Management ────────────────────────────────────────────────────────

  async getReels(page = 1, limit = 10, search?: string) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search?.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { id: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { user: { id: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { username: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [reels, total] = await Promise.all([
      prismaAny.reel.findMany({
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
      prismaAny.reel.count({ where }),
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

  // ─── Comment Management ──────────────────────────────────────────────────────

  async getCommentBannedKeywords() {
    const prismaAny = this.prisma as any;
    return prismaAny.commentBannedKeyword.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async createCommentBannedKeyword(keyword: string) {
    const prismaAny = this.prisma as any;
    const normalizedKeyword = normalizeModerationKeyword(keyword || '');

    if (!normalizedKeyword) {
      throw new BadRequestException('Từ khóa cấm không được để trống');
    }

    if (normalizedKeyword.length < 2) {
      throw new BadRequestException('Từ khóa cấm phải có ít nhất 2 ký tự');
    }

    const existed = await prismaAny.commentBannedKeyword.findUnique({
      where: { keyword: normalizedKeyword },
    });

    if (existed) {
      throw new BadRequestException('Từ khóa này đã tồn tại');
    }

    return prismaAny.commentBannedKeyword.create({
      data: { keyword: normalizedKeyword },
    });
  }

  async deleteCommentBannedKeyword(keywordId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.commentBannedKeyword.delete({ where: { id: keywordId } });
    return { message: 'Đã xóa từ khóa cấm' };
  }

  async getComments(
    page = 1,
    limit = 20,
    search?: string,
    flaggedOnly = false,
  ) {
    const prismaAny = this.prisma as any;
    const skip = (page - 1) * limit;
    const conditions: any[] = [];

    const keywordRows = await prismaAny.commentBannedKeyword.findMany({
      select: { keyword: true },
    });
    const bannedKeywords = keywordRows.map((row: { keyword: string }) => row.keyword);

    if (search?.trim()) {
      const searchTerm = search.trim();
      conditions.push({
        OR: [
          { id: { contains: searchTerm, mode: 'insensitive' } },
          { content: { contains: searchTerm, mode: 'insensitive' } },
          { user: { id: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { username: { contains: searchTerm, mode: 'insensitive' } } },
          { post: { id: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      });
    }

    if (flaggedOnly) {
      if (bannedKeywords.length === 0) {
        return {
          comments: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      conditions.push({
        OR: bannedKeywords.map((keyword: string) => ({
          content: { contains: keyword, mode: 'insensitive' },
        })),
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [comments, total] = await Promise.all([
      prismaAny.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, username: true, avatar: true } },
          post: { select: { id: true, content: true } },
          _count: { select: { likes: true } },
        },
      }),
      prismaAny.comment.count({ where }),
    ]);

    const normalizedComments = comments.map((comment: any) => {
      const commentContent = String(comment.content || '').toLowerCase();
      const matchedKeywords = bannedKeywords.filter((keyword: string) =>
        commentContent.includes(String(keyword).toLowerCase()),
      );
      const keywordFlagged = matchedKeywords.length > 0;
      const moderationReason = keywordFlagged ? 'banned_keyword' : null;

      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: comment.user,
        post: comment.post,
        likesCount: comment._count?.likes ?? 0,
        moderation: {
          flagged: keywordFlagged,
          reason: moderationReason,
          matchedKeywords,
        },
      };
    });

    return {
      comments: normalizedComments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteComment(commentId: string) {
    const prismaAny = this.prisma as any;
    await prismaAny.comment.delete({ where: { id: commentId } });
    return { message: 'Đã xóa bình luận thành công' };
  }
}
