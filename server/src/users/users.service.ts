import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(userData: {
    email: string;
    username: string;
    password: string;
    name: string;
  }): Promise<User> {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: userData.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username đã được sử dụng');
    }

    return this.prisma.user.create({
      data: userData,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async getUserStats(userId: string) {
    const [postsCount, followersCount, followingCount] = await Promise.all([
      this.prisma.post.count({
        where: { userId },
      }),
      this.prisma.follow.count({
        where: { followingId: userId },
      }),
      this.prisma.follow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      posts: postsCount,
      followers: followersCount,
      following: followingCount,
    };
  }

  async update(
    id: string,
    data: {
      name?: string;
      avatar?: string;
      coverImage?: string;
      bio?: string;
      gender?: string;
      dateOfBirth?: string;
      address?: string;
      phone?: string;
      website?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
    },
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Convert dateOfBirth string to Date if provided
    const updateData: {
      name?: string;
      avatar?: string;
      coverImage?: string;
      bio?: string;
      gender?: string;
      dateOfBirth?: Date;
      address?: string;
      phone?: string;
      website?: string;
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
    } = {
      name: data.name,
      avatar: data.avatar,
      coverImage: data.coverImage,
      bio: data.bio,
      gender: data.gender,
      address: data.address,
      phone: data.phone,
      website: data.website,
      facebook: data.facebook,
      instagram: data.instagram,
      twitter: data.twitter,
      linkedin: data.linkedin,
    };

    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new ConflictException('Mật khẩu hiện tại không đúng');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async getSuggestedUsers(currentUserId: string, limit = 20) {
    // Get users that current user is not following
    const following = await this.prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    const suggestedUsers = await this.prisma.user.findMany({
      where: {
        AND: [{ id: { not: currentUserId } }, { id: { notIn: followingIds } }],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return suggestedUsers;
  }

  async getUsersByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
      },
    });

    return users;
  }

  async getActiveFollowingUsers(
    currentUserId: string,
    onlineUserIds: string[],
  ) {
    // Get list of users that current user is following
    const following = await this.prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // Filter to get only following users who are online
    const activeFollowingIds = followingIds.filter((id) =>
      onlineUserIds.includes(id),
    );

    if (activeFollowingIds.length === 0) {
      return [];
    }

    // Get user details
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: activeFollowingIds },
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
      },
    });

    return users;
  }

  async checkFollowStatus(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return !!follow;
  }

  async getFollowers(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return follows.map((f) => f.follower);
  }

  async getFollowing(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return follows.map((f) => f.following);
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ConflictException('Không thể follow chính mình');
    }

    const followingUser = await this.findById(followingId);
    if (!followingUser) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Đã follow người dùng này');
    }

    await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!existingFollow) {
      throw new NotFoundException('Chưa follow người dùng này');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ConflictException('Không thể block chính mình');
    }

    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (existingBlock) {
      throw new ConflictException('Đã block người dùng này');
    }

    // Unfollow if following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: blockerId,
          followingId: blockedId,
        },
      },
    });

    if (existingFollow) {
      await this.prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: blockerId,
            followingId: blockedId,
          },
        },
      });
    }

    // Create block
    await this.prisma.block.create({
      data: {
        blockerId,
        blockedId,
      },
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    if (!existingBlock) {
      throw new NotFoundException('Chưa block người dùng này');
    }

    await this.prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });

    return !!block;
  }
}
