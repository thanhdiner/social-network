import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
} as const;

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ── Status helpers ────────────────────────────────────────────────────────

  async getFriendshipStatus(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) return { status: 'self' };

    const [sent, received] = await Promise.all([
      this.prisma.friendRequest.findUnique({
        where: { senderId_receiverId: { senderId: currentUserId, receiverId: targetUserId } },
      }),
      this.prisma.friendRequest.findUnique({
        where: { senderId_receiverId: { senderId: targetUserId, receiverId: currentUserId } },
      }),
    ]);

    if (sent?.status === 'accepted' || received?.status === 'accepted') {
      return { status: 'friends', requestId: sent?.id ?? received?.id };
    }
    if (sent?.status === 'pending') {
      return { status: 'request_sent', requestId: sent.id };
    }
    if (received?.status === 'pending') {
      return { status: 'request_received', requestId: received.id };
    }
    return { status: 'strangers' };
  }

  // ── Send request ──────────────────────────────────────────────────────────

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) throw new BadRequestException('Cannot send friend request to yourself');

    const receiver = await this.prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) throw new NotFoundException('User not found');

    // Check if already friends or request exists
    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing?.status === 'accepted') throw new BadRequestException('Already friends');
    if (existing?.status === 'pending') throw new BadRequestException('Friend request already exists');

    // If previously rejected, delete and resend
    if (existing?.status === 'rejected') {
      await this.prisma.friendRequest.delete({ where: { id: existing.id } });
    }

    const request = await this.prisma.friendRequest.create({
      data: { senderId, receiverId, status: 'pending' },
      include: { sender: { select: USER_SELECT }, receiver: { select: USER_SELECT } },
    });

    // Notify receiver
    await this.notificationsService.create({
      type: 'friend_request',
      content: `${request.sender.name} đã gửi cho bạn lời mời kết bạn`,
      userId: receiverId,
      actorId: senderId,
      actorName: request.sender.name,
      actorUsername: request.sender.username,
      actorAvatar: request.sender.avatar ?? undefined,
      relatedId: request.id,
    });

    return request;
  }

  // ── Cancel / withdraw request ─────────────────────────────────────────────

  async cancelRequest(senderId: string, receiverId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId, receiverId } },
    });
    if (!request || request.status !== 'pending') throw new NotFoundException('No pending request found');

    await this.prisma.friendRequest.delete({ where: { id: request.id } });
    return { message: 'Friend request cancelled' };
  }

  // ── Accept ────────────────────────────────────────────────────────────────

  async acceptRequest(requestId: string, currentUserId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: { sender: { select: USER_SELECT } },
    });

    if (!request) throw new NotFoundException('Friend request not found');
    if (request.receiverId !== currentUserId) throw new BadRequestException('Not authorized');
    if (request.status !== 'pending') throw new BadRequestException('Request is not pending');

    // Accept the request
    const updated = await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'accepted' },
      include: {
        sender: { select: USER_SELECT },
        receiver: { select: USER_SELECT },
      },
    });

    // Auto follow each other (if not already)
    await Promise.allSettled([
      this.prisma.follow.upsert({
        where: { followerId_followingId: { followerId: request.senderId, followingId: currentUserId } },
        create: { followerId: request.senderId, followingId: currentUserId },
        update: {},
      }),
      this.prisma.follow.upsert({
        where: { followerId_followingId: { followerId: currentUserId, followingId: request.senderId } },
        create: { followerId: currentUserId, followingId: request.senderId },
        update: {},
      }),
    ]);

    // Notify sender
    const receiver = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: USER_SELECT,
    });
    await this.notificationsService.create({
      type: 'friend_accept',
      content: `${receiver?.name} đã chấp nhận lời mời kết bạn của bạn`,
      userId: request.senderId,
      actorId: currentUserId,
      actorName: receiver?.name,
      actorUsername: receiver?.username,
      actorAvatar: receiver?.avatar ?? undefined,
      relatedId: requestId,
    });

    return updated;
  }

  // ── Reject ────────────────────────────────────────────────────────────────

  async rejectRequest(requestId: string, currentUserId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.receiverId !== currentUserId) throw new BadRequestException('Not authorized');

    await this.prisma.friendRequest.delete({ where: { id: requestId } });
    return { message: 'Friend request rejected' };
  }

  // ── Unfriend ──────────────────────────────────────────────────────────────

  async unfriend(currentUserId: string, targetUserId: string) {
    // Delete friendship record (either direction)
    await this.prisma.friendRequest.deleteMany({
      where: {
        status: 'accepted',
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
    });

    // Unfollow each other
    await Promise.allSettled([
      this.prisma.follow.deleteMany({
        where: { followerId: currentUserId, followingId: targetUserId },
      }),
      this.prisma.follow.deleteMany({
        where: { followerId: targetUserId, followingId: currentUserId },
      }),
    ]);

    return { message: 'Unfriended successfully' };
  }

  // ── Lists ─────────────────────────────────────────────────────────────────

  async getFriends(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      status: 'accepted',
      OR: [{ senderId: userId }, { receiverId: userId }],
    };

    const [requests, total] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          sender: { select: USER_SELECT },
          receiver: { select: USER_SELECT },
        },
      }),
      this.prisma.friendRequest.count({ where }),
    ]);

    const friends = requests.map((r) => (r.senderId === userId ? r.receiver : r.sender));
    return { friends, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getReceivedRequests(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { receiverId: userId, status: 'pending' };

    const [requests, total] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: USER_SELECT } },
      }),
      this.prisma.friendRequest.count({ where }),
    ]);

    return { requests, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getSentRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { receiver: { select: USER_SELECT } },
    });
  }

  // ── Suggestions "Người bạn có thể biết" ──────────────────────────────────

  async getSuggestions(userId: string, limit = 10) {
    // Get existing friend/request IDs to exclude
    const [friendRequests, following] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
        select: { senderId: true, receiverId: true },
      }),
      this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
    ]);

    const excludeIds = new Set<string>([userId]);
    friendRequests.forEach((r) => {
      excludeIds.add(r.senderId);
      excludeIds.add(r.receiverId);
    });
    following.forEach((f) => excludeIds.add(f.followingId));

    // Get friends-of-friends (mutual connection boost)
    const myFriendIds = friendRequests
      .filter((r) => r.senderId === userId || r.receiverId === userId)
      .map((r) => (r.senderId === userId ? r.receiverId : r.senderId));

    const friendsOfFriends = await this.prisma.friendRequest.findMany({
      where: {
        status: 'accepted',
        OR: [
          { senderId: { in: myFriendIds } },
          { receiverId: { in: myFriendIds } },
        ],
      },
      select: { senderId: true, receiverId: true },
    });

    // Count mutual friends per candidate
    const mutualCount: Record<string, number> = {};
    friendsOfFriends.forEach((r) => {
      [r.senderId, r.receiverId].forEach((id) => {
        if (!excludeIds.has(id)) {
          mutualCount[id] = (mutualCount[id] ?? 0) + 1;
        }
      });
    });

    // Primary: friends-of-friends sorted by mutual count
    const candidateIds = Object.keys(mutualCount)
      .sort((a, b) => mutualCount[b] - mutualCount[a])
      .slice(0, limit);

    // Secondary: fill remainder with popular active users
    let users = candidateIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: candidateIds } },
          select: {
            ...USER_SELECT,
            _count: { select: { followers: true, posts: true } },
          },
        })
      : [];

    if (users.length < limit) {
      const extra = await this.prisma.user.findMany({
        where: { id: { notIn: [...excludeIds, ...candidateIds] } },
        take: limit - users.length,
        orderBy: { createdAt: 'desc' },
        select: {
          ...USER_SELECT,
          _count: { select: { followers: true, posts: true } },
        },
      });
      users = [...users, ...extra];
    }

    return users.map((u) => ({
      ...u,
      mutualFriends: mutualCount[u.id] ?? 0,
    }));
  }

  // ── Count pending received requests ───────────────────────────────────────

  async getPendingCount(userId: string) {
    const count = await this.prisma.friendRequest.count({
      where: { receiverId: userId, status: 'pending' },
    });
    return { count };
  }
}
