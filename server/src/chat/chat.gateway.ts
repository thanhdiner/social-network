import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface UserSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>(); // userId -> socketId

  private serializeMessage<T>(payload: T): T {
    return JSON.parse(JSON.stringify(payload)) as T;
  }

  handleConnection(client: UserSocket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: UserSocket) {
    console.log(`Client disconnected: ${client.id}`);
    if (client.userId) {
      this.userSockets.delete(client.userId);
      // Broadcast updated online users list
      this.broadcastOnlineUsers();
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { userId: string },
  ) {
    client.userId = data.userId;
    this.userSockets.set(data.userId, client.id);
    console.log(`User ${data.userId} registered with socket ${client.id}`);
    // Broadcast updated online users list
    this.broadcastOnlineUsers();
    return { success: true };
  }

  // Get online user IDs
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  // Broadcast online users to all connected clients
  private broadcastOnlineUsers() {
    const onlineUserIds = this.getOnlineUserIds();
    this.server.emit('online_users_updated', { userIds: onlineUserIds });
  }

  @SubscribeMessage('message')
  handleMessage(): string {
    return 'Hello world!';
  }

  @SubscribeMessage('message_received')
  handleMessageReceived(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { messageId: string },
  ) {
    console.log('[ChatGateway] message_received ack', {
      userId: client.userId,
      messageId: data.messageId,
    });
    // Client acknowledges they received the message
    // This will be handled by ChatService to update deliveredAt
    return { success: true };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { receiverId: string; isTyping: boolean },
  ) {
    const receiverSocketId = this.userSockets.get(data.receiverId);
    if (receiverSocketId && client.userId) {
      this.server.to(receiverSocketId).emit('typing', {
        senderId: client.userId,
        isTyping: data.isTyping,
      });
    }
  }

  // Follow events
  notifyFollow(
    followerId: string,
    followingId: string,
    followerData: {
      id: string;
      name: string;
      username: string;
      avatar: string | null;
    },
  ) {
    const socketId = this.userSockets.get(followingId);
    if (socketId) {
      this.server.to(socketId).emit('new_follower', {
        followerId,
        followerData,
        timestamp: new Date().toISOString(),
      });
    }
  }

  notifyUnfollow(followerId: string, followingId: string) {
    const socketId = this.userSockets.get(followingId);
    if (socketId) {
      this.server.to(socketId).emit('unfollowed', {
        followerId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Notification events
  notifyUser(userId: string, notification: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('new_notification', notification);
    }
  }

  // Emit arbitrary event payload to a specific user's socket (if connected)
  emitToUser(userId: string, event: string, payload: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  // Broadcast an event to all connected sockets (optionally skipping users)
  broadcast(
    event: string,
    payload: any,
    options?: { excludeUserIds?: string[] },
  ) {
    const exclude = new Set(options?.excludeUserIds ?? []);
    if (exclude.size === 0) {
      this.server.emit(event, payload);
      return;
    }

    this.userSockets.forEach((socketId, userId) => {
      if (!exclude.has(userId)) {
        this.server.to(socketId).emit(event, payload);
      }
    });
  }

  // Chat events
  sendMessage(
    receiverId: string,
    message: { senderId: string; [key: string]: any },
  ) {
    let delivered = false;

    // Send to receiver if online
    const socketId = this.userSockets.get(receiverId);
    if (socketId) {
      this.server.to(socketId).emit('new_message', message);
      delivered = true; // Receiver is online and will get the message
    }

    // Always send to sender for multi-device support and real-time UI update
    const senderSocketId = this.userSockets.get(message.senderId);
    if (senderSocketId) {
      this.server.to(senderSocketId).emit('new_message', message);
    }

    return delivered;
  }

  // Notify message delivered status update
  notifyMessagesDelivered(
    senderId: string,
    messageIds: string[],
    deliveredAt: Date,
  ) {
    console.log(
      `[ChatGateway] notifyMessagesDelivered: senderId=${senderId}, messageIds=${messageIds.length}`,
    );
    const socketId = this.userSockets.get(senderId);
    console.log(`[ChatGateway] Socket ID for ${senderId}: ${socketId}`);

    const payload = {
      messageIds,
      deliveredAt: deliveredAt.toISOString(),
    };

    if (socketId) {
      this.server.to(socketId).emit('messages_delivered', payload);
      console.log(
        `[ChatGateway] Emitted messages_delivered to ${socketId}`,
        payload,
      );
    } else {
      console.log(`[ChatGateway] No socket found for sender ${senderId}`);
    }
  }

  // Notify message read status update
  notifyMessagesRead(senderId: string, messageIds: string[], readAt: Date) {
    console.log(
      `[ChatGateway] notifyMessagesRead: senderId=${senderId}, messageIds=${messageIds.length}`,
    );
    const socketId = this.userSockets.get(senderId);
    console.log(`[ChatGateway] Socket ID for ${senderId}: ${socketId}`);
    if (socketId) {
      this.server.to(socketId).emit('messages_read', {
        messageIds,
        readAt: readAt.toISOString(),
      });
      console.log(`[ChatGateway] Emitted messages_read to ${socketId}`);
    } else {
      console.log(`[ChatGateway] No socket found for sender ${senderId}`);
    }
  }

  // Notify reaction added
  notifyReactionAdded(
    messageId: string,
    reaction: { id: string; userId: string; emoji: string; createdAt: Date },
    receiverIds: string[],
  ) {
    const payload = {
      messageId,
      reaction: {
        ...reaction,
        createdAt: reaction.createdAt.toISOString(),
      },
    };

    receiverIds.forEach((receiverId) => {
      const socketId = this.userSockets.get(receiverId);
      if (socketId) {
        this.server.to(socketId).emit('reaction_added', payload);
      }
    });
  }

  // Notify reaction removed
  notifyReactionRemoved(
    messageId: string,
    userId: string,
    receiverIds: string[],
  ) {
    const payload = { messageId, userId };

    receiverIds.forEach((receiverId) => {
      const socketId = this.userSockets.get(receiverId);
      if (socketId) {
        this.server.to(socketId).emit('reaction_removed', payload);
      }
    });
  }

  notifyConversationCustomization(payload: {
    userAId: string;
    userBId: string;
    themeId: string;
    emoji: string;
    nicknameForUserA?: string | null;
    nicknameForUserB?: string | null;
    updatedById?: string | null;
    updatedAt: Date;
    summary?: string;
  }) {
    const serialized = {
      ...payload,
      updatedAt: payload.updatedAt.toISOString(),
      ...(payload.summary ? { summary: payload.summary } : {}),
    };

    [payload.userAId, payload.userBId].forEach((userId) => {
      const socketId = this.userSockets.get(userId);
      if (socketId) {
        this.server.to(socketId).emit('chat_customization_updated', serialized);
      }
    });
  }

  // Notify message unsent
  notifyMessageUnsent(messageId: string, receiverId: string) {
    const payload = { messageId };

    const socketId = this.userSockets.get(receiverId);
    if (socketId) {
      this.server.to(socketId).emit('message_unsent', payload);
    }
  }

  notifyMessagePinned(message: unknown, participantIds: string[]) {
    const payload = { message: this.serializeMessage(message) };
    const uniqueReceivers = new Set(participantIds);

    uniqueReceivers.forEach((receiverId) => {
      const socketId = this.userSockets.get(receiverId);
      if (socketId) {
        this.server.to(socketId).emit('message_pinned', payload);
      }
    });
  }

  notifyMessageUnpinned(message: unknown, participantIds: string[]) {
    const payload = { message: this.serializeMessage(message) };
    const uniqueReceivers = new Set(participantIds);

    uniqueReceivers.forEach((receiverId) => {
      const socketId = this.userSockets.get(receiverId);
      if (socketId) {
        this.server.to(socketId).emit('message_unpinned', payload);
      }
    });
  }

  // Voice call events
  @SubscribeMessage('voice_call_start')
  handleVoiceCallStart(
    @ConnectedSocket() client: UserSocket,
    @MessageBody()
    data: {
      receiverId: string;
      callerName: string;
      callerAvatar: string | null;
    },
  ) {
    try {
      console.log(
        `[ChatGateway] voice_call_start from ${client.userId} to ${data.receiverId}`,
      );
      const receiverSocketId = this.userSockets.get(data.receiverId);
      console.log(`[ChatGateway] Receiver socket ID: ${receiverSocketId}`);

      if (receiverSocketId && client.userId) {
        this.server.to(receiverSocketId).emit('voice_call_incoming', {
          callerId: client.userId,
          receiverId: data.receiverId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
        });
        console.log(
          `[ChatGateway] Emitted voice_call_incoming to ${receiverSocketId}`,
        );
      } else {
        console.log(
          `[ChatGateway] Cannot emit: receiverSocketId=${receiverSocketId}, clientUserId=${client.userId}`,
        );
      }
      return { success: true };
    } catch (error) {
      console.error('[ChatGateway] Error in voice_call_start:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('voice_call_accept')
  handleVoiceCallAccept(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { callerId: string },
  ) {
    const callerSocketId = this.userSockets.get(data.callerId);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('voice_call_accepted');
    }
    return { success: true };
  }

  @SubscribeMessage('voice_call_reject')
  handleVoiceCallReject(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { callerId: string },
  ) {
    const callerSocketId = this.userSockets.get(data.callerId);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('voice_call_rejected');
    }
    return { success: true };
  }

  @SubscribeMessage('voice_call_end')
  handleVoiceCallEnd(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { userId: string },
  ) {
    const userSocketId = this.userSockets.get(data.userId);
    if (userSocketId) {
      this.server.to(userSocketId).emit('voice_call_ended');
    }
    return { success: true };
  }

  @SubscribeMessage('voice_call_signal')
  handleVoiceCallSignal(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { userId: string; signal: unknown },
  ) {
    const userSocketId = this.userSockets.get(data.userId);
    if (userSocketId) {
      this.server.to(userSocketId).emit('voice_call_signal', {
        signal: data.signal,
      });
    }
    return { success: true };
  }

  // Video call events
  @SubscribeMessage('video_call_start')
  handleVideoCallStart(
    @ConnectedSocket() client: UserSocket,
    @MessageBody()
    data: {
      receiverId: string;
      callerName: string;
      callerAvatar: string | null;
    },
  ) {
    try {
      console.log(
        `[ChatGateway] video_call_start from ${client.userId} to ${data.receiverId}`,
      );
      const receiverSocketId = this.userSockets.get(data.receiverId);
      console.log(
        `[ChatGateway] Video receiver socket ID: ${receiverSocketId}`,
      );

      if (receiverSocketId && client.userId) {
        this.server.to(receiverSocketId).emit('video_call_incoming', {
          callerId: client.userId,
          receiverId: data.receiverId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar,
        });
        console.log(
          `[ChatGateway] Emitted video_call_incoming to ${receiverSocketId}`,
        );
      } else {
        console.log(
          `[ChatGateway] Cannot emit video call: receiverSocketId=${receiverSocketId}, clientUserId=${client.userId}`,
        );
      }
      return { success: true };
    } catch (error) {
      console.error('[ChatGateway] Error in video_call_start:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('video_call_accept')
  handleVideoCallAccept(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { callerId: string },
  ) {
    const callerSocketId = this.userSockets.get(data.callerId);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('video_call_accepted');
    }
    return { success: true };
  }

  @SubscribeMessage('video_call_reject')
  handleVideoCallReject(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { callerId: string },
  ) {
    const callerSocketId = this.userSockets.get(data.callerId);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('video_call_rejected');
    }
    return { success: true };
  }

  @SubscribeMessage('video_call_end')
  handleVideoCallEnd(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { userId: string },
  ) {
    const userSocketId = this.userSockets.get(data.userId);
    if (userSocketId) {
      this.server.to(userSocketId).emit('video_call_ended');
    }
    return { success: true };
  }

  @SubscribeMessage('video_call_signal')
  handleVideoCallSignal(
    @ConnectedSocket() client: UserSocket,
    @MessageBody() data: { userId: string; signal: unknown },
  ) {
    const userSocketId = this.userSockets.get(data.userId);
    if (userSocketId) {
      this.server.to(userSocketId).emit('video_call_signal', {
        signal: data.signal,
      });
    }
    return { success: true };
  }
}
