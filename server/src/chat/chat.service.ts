import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import type { ConversationCustomization as ConversationCustomizationModel } from '@prisma/client';

export interface ConversationResponse {
  id: string;
  participantId: string;
  participant: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    email: string;
  } | null;
  lastMessage: any;
  unreadCount: number;
  isMuted: boolean;
  updatedAt: Date;
}

const DEFAULT_CHAT_THEME_ID = 'sunset';
const DEFAULT_CHAT_EMOJI = '👍';
const CHAT_THEME_LABELS: Record<string, string> = {
  sunset: 'Sunset',
  ocean: 'Ocean',
  blossom: 'Blossom',
  forest: 'Forest',
  midnight: 'Midnight',
};

type ParticipantKey = 'userA' | 'userB';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}
  private readonly logger = new Logger(ChatService.name);

  private getOrderedParticipants(currentUserId: string, partnerId: string) {
    if (currentUserId === partnerId) {
      throw new BadRequestException(
        'Cannot customize conversation with yourself',
      );
    }

    const [userAId, userBId] = [currentUserId, partnerId].sort((a, b) =>
      a < b ? -1 : 1,
    );
    const isCurrentUserA = currentUserId === userAId;
    return { userAId, userBId, isCurrentUserA };
  }

  private normalizeNickname(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private getThemeLabel(themeId: string) {
    return CHAT_THEME_LABELS[themeId] ?? themeId;
  }

  private composeCustomizationChangeSummary(params: {
    actorId: string;
    actorName: string;
    partnerName: string;
    after: ConversationCustomizationModel;
    themeChanged: boolean;
    emojiChanged: boolean;
    nicknameSelfTargets: ParticipantKey[];
    nicknamePartnerTargets: ParticipantKey[];
  }) {
    const {
      actorId,
      actorName,
      partnerName,
      after,
      themeChanged,
      emojiChanged,
      nicknameSelfTargets,
      nicknamePartnerTargets,
    } = params;

    const parts: string[] = [];

    if (themeChanged) {
      parts.push(`theme → ${this.getThemeLabel(after.themeId)}`);
    }

    if (emojiChanged) {
      parts.push(`quick emoji → ${after.emoji}`);
    }

    const userAName = after.userAId === actorId ? actorName : partnerName;
    const userBName = after.userBId === actorId ? actorName : partnerName;

    nicknameSelfTargets.forEach((target) => {
      const nickname =
        target === 'userA'
          ? after.nicknameForUserA?.trim() || ''
          : after.nicknameForUserB?.trim() || '';

      if (nickname) {
        parts.push(`renamed themselves to "${nickname}"`);
      } else {
        parts.push('cleared their nickname');
      }
    });

    nicknamePartnerTargets.forEach((target) => {
      const nickname =
        target === 'userA'
          ? after.nicknameForUserA?.trim() || ''
          : after.nicknameForUserB?.trim() || '';
      const subjectName = target === 'userA' ? userAName : userBName;

      if (nickname) {
        parts.push(`now calls ${subjectName} "${nickname}"`);
      } else {
        parts.push(`cleared ${subjectName}'s nickname`);
      }
    });

    if (parts.length === 0) {
      return null;
    }

    const safeActorName = actorName || 'Someone';
    return `⚙️ ${safeActorName} updated the conversation: ${parts.join(' • ')}`;
  }

  private async ensureCustomizationRecord(
    userAId: string,
    userBId: string,
  ): Promise<ConversationCustomizationModel> {
    const existing = await this.prisma.conversationCustomization.findUnique({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.conversationCustomization.create({
      data: {
        userAId,
        userBId,
        themeId: DEFAULT_CHAT_THEME_ID,
        emoji: DEFAULT_CHAT_EMOJI,
      },
    });
  }

  private formatCustomizationForUser(
    record: ConversationCustomizationModel,
    isCurrentUserA: boolean,
    summary?: string | null,
  ) {
    const nicknameMe = isCurrentUserA
      ? record.nicknameForUserA
      : record.nicknameForUserB;
    const nicknameThem = isCurrentUserA
      ? record.nicknameForUserB
      : record.nicknameForUserA;

    return {
      themeId: record.themeId,
      emoji: record.emoji,
      nicknameMe: nicknameMe ?? '',
      nicknameThem: nicknameThem ?? '',
      updatedById: record.updatedById,
      updatedAt: record.updatedAt.toISOString(),
      // Prefer explicit summary passed by caller (recent update). If not provided, fall back to stored summary in DB.
      ...(summary
        ? { changeSummary: summary }
        : (record as any).changeSummary
        ? { changeSummary: (record as any).changeSummary }
        : {}),
    };
  }

  private broadcastCustomizationUpdate(
    record: ConversationCustomizationModel,
    summary?: string | null,
  ) {
    this.chatGateway.notifyConversationCustomization({
      userAId: record.userAId,
      userBId: record.userBId,
      themeId: record.themeId,
      emoji: record.emoji,
      nicknameForUserA: record.nicknameForUserA,
      nicknameForUserB: record.nicknameForUserB,
      updatedById: record.updatedById,
      updatedAt: record.updatedAt,
      summary: summary ?? undefined,
    });
  }

  async getConversations(userId: string): Promise<ConversationResponse[]> {
    // Lấy tất cả tin nhắn của user
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        // Không lấy messages mà user đã xóa
        NOT: {
          deletedBy: {
            has: userId,
          },
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
        pinnedBy: {
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

    // Nhóm theo conversation
    const conversationsMap = new Map();

    for (const message of messages) {
      const partnerId =
        message.senderId === userId ? message.receiverId : message.senderId;

      if (!conversationsMap.has(partnerId)) {
        // Lấy thông tin partner
        const partner = await this.prisma.user.findUnique({
          where: { id: partnerId },
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        });

        // Đếm số tin nhắn chưa đọc (không bao gồm messages đã xóa)
        const unreadCount = await this.prisma.message.count({
          where: {
            senderId: partnerId,
            receiverId: userId,
            read: false,
            NOT: {
              deletedBy: {
                has: userId,
              },
            },
          },
        });

        // Check if conversation is muted
        const isMuted = await this.checkIfMuted(userId, partnerId);

        conversationsMap.set(partnerId, {
          id: `${userId}-${partnerId}`,
          participantId: partnerId,
          participant: partner,
          lastMessage: {
            ...message,
            receiver: partner,
          },
          unreadCount,
          isMuted,
          updatedAt: message.createdAt,
        });
      }
    }

    return Array.from(conversationsMap.values()) as ConversationResponse[];
  }

  async getMessages(userId: string, partnerId: string) {
    this.logger.log(`getMessages: userId=${userId}, partnerId=${partnerId}`);

    // Mark messages as delivered when receiver fetches them
    const deliveredAt = new Date();
    const updateResult = await this.prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        deliveredAt: null, // Only update messages not yet delivered
      },
      data: {
        deliveredAt,
      },
    });

    this.logger.log(
      `Updated ${updateResult.count} messages to delivered for user ${userId}`,
    );

    // If we marked messages as delivered, notify the sender via socket
    if (updateResult.count > 0) {
      // Get the updated messages to send via socket
      const deliveredMessages = await this.prisma.message.findMany({
        where: {
          senderId: partnerId,
          receiverId: userId,
          deliveredAt,
        },
        select: {
          id: true,
          deliveredAt: true,
        },
      });

      this.logger.log(
        `Notifying ${partnerId} about ${deliveredMessages.length} delivered messages`,
      );

      // Emit to sender that their messages were delivered
      if (deliveredMessages.length > 0) {
        this.chatGateway.notifyMessagesDelivered(
          partnerId,
          deliveredMessages.map((m) => m.id),
          deliveredAt,
        );
      }
    }

    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
        // Không lấy messages mà user đã xóa
        NOT: {
          deletedBy: {
            has: userId,
          },
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
            createdAt: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            videoUrl: true,
            audioUrl: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        pinnedBy: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages;
  }

  async getConversationCustomization(currentUserId: string, partnerId: string) {
    const partner = await this.prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true },
    });

    if (!partner) {
      throw new NotFoundException('User not found');
    }

    const { userAId, userBId, isCurrentUserA } = this.getOrderedParticipants(
      currentUserId,
      partnerId,
    );

    const record = await this.ensureCustomizationRecord(userAId, userBId);
    return this.formatCustomizationForUser(record, isCurrentUserA);
  }

  async updateConversationCustomization(
    currentUserId: string,
    partnerId: string,
    payload: Partial<{
      themeId: string;
      emoji: string;
      nicknameMe: string;
      nicknameThem: string;
    }>,
  ) {
    const partner = await this.prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true },
    });

    if (!partner) {
      throw new NotFoundException('User not found');
    }

    const { userAId, userBId, isCurrentUserA } = this.getOrderedParticipants(
      currentUserId,
      partnerId,
    );

    const before = await this.ensureCustomizationRecord(userAId, userBId);

    const updateData: Record<string, unknown> = {};
    let hasChanges = false;
    let themeChanged = false;
    let emojiChanged = false;
    const nicknameSelfTargets = new Set<ParticipantKey>();
    const nicknamePartnerTargets = new Set<ParticipantKey>();

    if (payload.themeId && payload.themeId !== before.themeId) {
      updateData.themeId = payload.themeId;
      themeChanged = true;
      hasChanges = true;
    }

    if (payload.emoji && payload.emoji !== before.emoji) {
      updateData.emoji = payload.emoji;
      emojiChanged = true;
      hasChanges = true;
    }

    if ('nicknameMe' in payload) {
      const normalized = this.normalizeNickname(payload.nicknameMe);
      const currentValue = isCurrentUserA
        ? before.nicknameForUserA
        : before.nicknameForUserB;
      if (normalized !== currentValue) {
        if (isCurrentUserA) {
          updateData.nicknameForUserA = normalized;
          nicknameSelfTargets.add('userA');
        } else {
          updateData.nicknameForUserB = normalized;
          nicknameSelfTargets.add('userB');
        }
        hasChanges = true;
      }
    }

    if ('nicknameThem' in payload) {
      const normalized = this.normalizeNickname(payload.nicknameThem);
      const currentValue = isCurrentUserA
        ? before.nicknameForUserB
        : before.nicknameForUserA;
      if (normalized !== currentValue) {
        if (isCurrentUserA) {
          updateData.nicknameForUserB = normalized;
          nicknamePartnerTargets.add('userB');
        } else {
          updateData.nicknameForUserA = normalized;
          nicknamePartnerTargets.add('userA');
        }
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return this.formatCustomizationForUser(before, isCurrentUserA);
    }

    updateData.updatedById = currentUserId;

    const updated = await this.prisma.conversationCustomization.update({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
      data: updateData,
    });

  let summary: string | null = null;
    try {
      const actor = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { id: true, name: true },
      });

      if (actor) {
        summary = this.composeCustomizationChangeSummary({
          actorId: actor.id,
          actorName: actor.name?.trim() || 'Someone',
          partnerName: partner.name?.trim() || 'Someone',
          after: updated,
          themeChanged,
          emojiChanged,
          nicknameSelfTargets: Array.from(nicknameSelfTargets),
          nicknamePartnerTargets: Array.from(nicknamePartnerTargets),
        });
      }
    } catch (error) {
      this.logger.error('Failed to build customization change summary', error);
    }

    // Persist changeSummary so participants who reload later can still see the summary
    let finalRecord = updated;
    if (summary) {
      try {
        // Use any-cast because Prisma client types may not be regenerated yet in the running environment.
        finalRecord = await (this.prisma as any).conversationCustomization.update({
          where: {
            userAId_userBId: {
              userAId,
              userBId,
            },
          },
          data: {
            changeSummary: summary,
          },
        });
      } catch (err) {
        this.logger.error('Failed to persist changeSummary', err);
      }
    }

    this.broadcastCustomizationUpdate(finalRecord, summary);

    return this.formatCustomizationForUser(finalRecord, isCurrentUserA, summary);
  }

  async resetConversationCustomization(
    currentUserId: string,
    partnerId: string,
  ) {
    const partner = await this.prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true },
    });

    if (!partner) {
      throw new NotFoundException('User not found');
    }

    const { userAId, userBId, isCurrentUserA } = this.getOrderedParticipants(
      currentUserId,
      partnerId,
    );

    const before = await this.ensureCustomizationRecord(userAId, userBId);

    const isAlreadyDefault =
      before.themeId === DEFAULT_CHAT_THEME_ID &&
      before.emoji === DEFAULT_CHAT_EMOJI &&
      !before.nicknameForUserA &&
      !before.nicknameForUserB;

    if (isAlreadyDefault) {
      return this.formatCustomizationForUser(before, isCurrentUserA);
    }

    const updated = await this.prisma.conversationCustomization.update({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
      data: {
        themeId: DEFAULT_CHAT_THEME_ID,
        emoji: DEFAULT_CHAT_EMOJI,
        nicknameForUserA: null,
        nicknameForUserB: null,
        updatedById: currentUserId,
      },
    });

    let summary: string | null = null;
    try {
      const actor = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { name: true },
      });

      const actorName = actor?.name?.trim() || 'Someone';
      summary = `⚙️ ${actorName} reset the chat customization to default.`;
    } catch (error) {
      this.logger.error('Failed to build customization reset summary', error);
    }

    // Persist changeSummary so partner who reloads can see it
    let finalRecordReset = updated;
    if (summary) {
      try {
        finalRecordReset = await (this.prisma as any).conversationCustomization.update({
          where: {
            userAId_userBId: {
              userAId,
              userBId,
            },
          },
          data: {
            changeSummary: summary,
          },
        });
      } catch (err) {
        this.logger.error('Failed to persist reset changeSummary', err);
      }
    }

    this.broadcastCustomizationUpdate(finalRecordReset, summary);

    return this.formatCustomizationForUser(finalRecordReset, isCurrentUserA, summary);
  }

  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    options: {
      imageUrl?: string;
      videoUrl?: string;
      audioUrl?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      replyToId?: string;
    } = {},
  ) {
    const {
      imageUrl,
      videoUrl,
      audioUrl,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      replyToId,
    } = options;
    this.logger.log(
      `sendMessage: from=${senderId} to=${receiverId} contentLen=${content?.length ?? 0}`,
    );

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        imageUrl,
        videoUrl,
        audioUrl,
        fileUrl,
        fileName,
        fileSize,
        fileType,
        replyToId,
        // Don't set deliveredAt here initially
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            videoUrl: true,
            audioUrl: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        pinnedBy: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Emit realtime event
    this.logger.log(`emit new_message -> ${receiverId} msgId=${message.id}`);
    const delivered = this.chatGateway.sendMessage(receiverId, message);

    // If receiver is online, mark as delivered immediately
    if (delivered) {
      const deliveredAt = new Date();
      await this.prisma.message.update({
        where: { id: message.id },
        data: { deliveredAt },
      });

      this.logger.log(
        `Message ${message.id} delivered to online user ${receiverId}`,
      );

      // Notify sender that message was delivered
      this.chatGateway.notifyMessagesDelivered(
        senderId,
        [message.id],
        deliveredAt,
      );

      // Update message object to include deliveredAt
      message.deliveredAt = deliveredAt;
    }

    return message;
  }

  // Block feature removed

  async markAsRead(userId: string, partnerId: string) {
    const readAt = new Date();
    const readResult = await this.prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
        readAt,
      },
    });

    this.logger.log(
      `markAsRead: ${readResult.count} messages marked as read for user ${userId} from ${partnerId}`,
    );

    // If we marked messages as read, notify the sender via socket
    if (readResult.count > 0) {
      const readMessages = await this.prisma.message.findMany({
        where: {
          senderId: partnerId,
          receiverId: userId,
          readAt,
        },
        select: {
          id: true,
        },
      });

      this.logger.log(
        `Notifying ${partnerId} about ${readMessages.length} read messages`,
      );

      this.chatGateway.notifyMessagesRead(
        partnerId,
        readMessages.map((m) => m.id),
        readAt,
      );
    }

    return { success: true };
  }

  async deleteConversation(userId: string, partnerId: string) {
    // Đánh dấu xóa cho user hiện tại (không xóa thật)
    await this.prisma.message.updateMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
        NOT: {
          deletedBy: {
            has: userId,
          },
        },
      },
      data: {
        deletedBy: {
          push: userId,
        },
      },
    });

    return { success: true };
  }

  async addReaction(userId: string, messageId: string, emoji: string) {
    // Lấy thông tin message để biết sender và receiver
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, receiverId: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Upsert: nếu đã react thì update emoji, chưa thì tạo mới
    const reaction = await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: {
        emoji,
      },
      create: {
        messageId,
        userId,
        emoji,
      },
    });

    this.logger.log(`User ${userId} reacted ${emoji} to message ${messageId}`);

    // Emit socket event to both sender and receiver
    const receiverIds = [message.senderId, message.receiverId].filter(
      (id) => id !== userId,
    );
    this.chatGateway.notifyReactionAdded(messageId, reaction, receiverIds);

    return reaction;
  }

  async removeReaction(userId: string, messageId: string) {
    // Lấy thông tin message để biết sender và receiver
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, receiverId: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    await this.prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId,
      },
    });

    this.logger.log(
      `User ${userId} removed reaction from message ${messageId}`,
    );

    // Emit socket event to both sender and receiver
    const receiverIds = [message.senderId, message.receiverId].filter(
      (id) => id !== userId,
    );
    this.chatGateway.notifyReactionRemoved(messageId, userId, receiverIds);

    return { success: true };
  }

  async deleteMessage(messageId: string, userId: string) {
    this.logger.log(`User ${userId} deleting message ${messageId}`);

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Add userId to deletedBy array
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deletedBy: {
          push: userId,
        },
      },
    });

    this.logger.log(`User ${userId} deleted message ${messageId}`);

    return { success: true };
  }

  async unsendMessage(messageId: string, userId: string) {
    this.logger.log(`User ${userId} unsending message ${messageId}`);

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can unsend
    if (message.senderId !== userId) {
      throw new Error('Only sender can unsend message');
    }

    // Mark message as unsent
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        unsent: true,
        pinnedById: null,
        pinnedAt: null,
      },
    });

    this.logger.log(`User ${userId} unsent message ${messageId}`);

    // Emit socket event to receiver
    this.chatGateway.notifyMessageUnsent(messageId, message.receiverId);

    return { success: true };
  }

  async pinMessage(userId: string, messageId: string) {
    this.logger.log(`User ${userId} pinning message ${messageId}`);

    const existing = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        unsent: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Message not found');
    }

    if (existing.senderId !== userId && existing.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    if (existing.unsent) {
      throw new BadRequestException('Cannot pin an unsent message');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        pinnedById: userId,
        pinnedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            videoUrl: true,
            audioUrl: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
            createdAt: true,
          },
        },
        pinnedBy: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    const participantIds = [existing.senderId, existing.receiverId];
    this.chatGateway.notifyMessagePinned(updated, participantIds);

    return updated;
  }

  async unpinMessage(userId: string, messageId: string) {
    this.logger.log(`User ${userId} unpinning message ${messageId}`);

    const existing = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        pinnedById: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Message not found');
    }

    if (existing.senderId !== userId && existing.receiverId !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    if (!existing.pinnedById) {
      return { success: true };
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        pinnedById: null,
        pinnedAt: null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            videoUrl: true,
            audioUrl: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            emoji: true,
            createdAt: true,
          },
        },
        pinnedBy: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    const participantIds = [existing.senderId, existing.receiverId];
    this.chatGateway.notifyMessageUnpinned(updated, participantIds);

    return updated;
  }

  async muteConversation(userId: string, mutedUserId: string) {
    this.logger.log(`User ${userId} muting conversation with ${mutedUserId}`);

    // Check if already muted
    const existing = await this.prisma.mutedConversation.findUnique({
      where: {
        userId_mutedUserId: {
          userId,
          mutedUserId,
        },
      },
    });

    if (existing) {
      return { success: true, message: 'Already muted' };
    }

    await this.prisma.mutedConversation.create({
      data: {
        userId,
        mutedUserId,
      },
    });

    this.logger.log(`User ${userId} muted conversation with ${mutedUserId}`);

    return { success: true, message: 'Conversation muted' };
  }

  async unmuteConversation(userId: string, mutedUserId: string) {
    this.logger.log(`User ${userId} unmuting conversation with ${mutedUserId}`);

    await this.prisma.mutedConversation.deleteMany({
      where: {
        userId,
        mutedUserId,
      },
    });

    this.logger.log(`User ${userId} unmuted conversation with ${mutedUserId}`);

    return { success: true, message: 'Conversation unmuted' };
  }

  async checkIfMuted(userId: string, mutedUserId: string): Promise<boolean> {
    const muted = await this.prisma.mutedConversation.findUnique({
      where: {
        userId_mutedUserId: {
          userId,
          mutedUserId,
        },
      },
    });

    return !!muted;
  }

  async logCall(
    senderId: string,
    receiverId: string,
    callType: 'voice' | 'video',
    callDuration: number,
    callStatus: 'completed' | 'missed' | 'rejected' | 'no-answer',
  ) {
    this.logger.log(
      `Logging ${callType} call from ${senderId} to ${receiverId}: status=${callStatus}, duration=${callDuration}s`,
    );

    // Generate content based on call status
    let content = '';
    const icon = callType === 'voice' ? '📞' : '📹';

    if (callStatus === 'completed') {
      const minutes = Math.floor(callDuration / 60);
      const seconds = callDuration % 60;
      const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      content = `${icon} ${callType === 'voice' ? 'Voice' : 'Video'} call - ${timeStr}`;
    } else if (callStatus === 'missed') {
      content = `${icon} Missed ${callType} call`;
    } else if (callStatus === 'rejected') {
      content = `${icon} ${callType === 'voice' ? 'Voice' : 'Video'} call declined`;
    } else if (callStatus === 'no-answer') {
      content = `${icon} ${callType === 'voice' ? 'Voice' : 'Video'} call - No answer`;
    }

    // Create message with call log info
    const message = await this.prisma.message.create({
      data: {
        content,
        senderId,
        receiverId,
        callType,
        callDuration,
        callStatus,
        read: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Call log message created: ${message.id}`);

    // Emit to receiver (if online)
    this.chatGateway.sendMessage(receiverId, message);

    return message;
  }
}
