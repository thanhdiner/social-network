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

  handleConnection(client: UserSocket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: UserSocket) {
    console.log(`Client disconnected: ${client.id}`);
    if (client.userId) {
      this.userSockets.delete(client.userId);
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
    return { success: true };
  }

  @SubscribeMessage('message')
  handleMessage(): string {
    return 'Hello world!';
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
}
