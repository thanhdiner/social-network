import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

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

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}
  private readonly logger = new Logger(ChatService.name);

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
    this.logger.log(
      `getMessages: userId=${userId}, partnerId=${partnerId}`,
    );

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
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages;
  }

  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    imageUrl?: string,
    videoUrl?: string,
    audioUrl?: string,
    replyToId?: string,
  ) {
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

      this.logger.log(`Message ${message.id} delivered to online user ${receiverId}`);

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

    this.logger.log(
      `User ${userId} reacted ${emoji} to message ${messageId}`,
    );

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

    this.logger.log(`User ${userId} removed reaction from message ${messageId}`);

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
      },
    });

    this.logger.log(`User ${userId} unsent message ${messageId}`);

    // Emit socket event to receiver
    this.chatGateway.notifyMessageUnsent(messageId, message.receiverId);

    return { success: true };
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
    this.logger.log(
      `User ${userId} unmuting conversation with ${mutedUserId}`,
    );

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
      const timeStr =
        minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
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

