import { io, Socket } from 'socket.io-client'
import type { Message } from '../types'

class SocketService {
  private socket: Socket | null = null
  private userId: string | null = null
  private connecting = false

  connect(userId: string) {
    // Idempotent: if already connected/connecting with same user, do nothing
    if ((this.socket?.connected || this.connecting) && this.userId === userId) {
      return
    }

    // If switching user or stale socket exists, clean up first
    if (this.socket) {
      try {
        this.socket.off()
        this.socket.disconnect()
      } catch {}
      this.socket = null
    }

    this.userId = userId
    this.connecting = true

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      withCredentials: true,
      // Force websocket first to avoid polling churn in dev proxies
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    this.socket.on('connect', () => {
      this.connecting = false
      console.log('Socket connected:', this.socket?.id)
      // Register user with socket
      this.socket?.emit('register', { userId })
    })

    this.socket.on('disconnect', (reason) => {
      this.connecting = false
      console.log('Socket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      this.connecting = false
      console.error('Socket connection error:', error.message)
    })
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.off()
        this.socket.disconnect()
      } catch {}
      this.socket = null
      this.userId = null
      this.connecting = false
    }
  }

  // Follow events
  onNewFollower(callback: (data: { 
    followerId: string; 
    followerData: { 
      id: string; 
      name: string; 
      username: string; 
      avatar: string | null 
    }; 
    timestamp: string 
  }) => void) {
    this.socket?.on('new_follower', callback)
  }

  onUnfollowed(callback: (data: { followerId: string; timestamp: string }) => void) {
    this.socket?.on('unfollowed', callback)
  }

  offNewFollower() {
    this.socket?.off('new_follower')
  }

  offUnfollowed() {
    this.socket?.off('unfollowed')
  }

  // Online users events
  onOnlineUsersUpdated(callback: (data: { userIds: string[] }) => void) {
    this.socket?.on('online_users_updated', callback)
  }

  offOnlineUsersUpdated() {
    this.socket?.off('online_users_updated')
  }

  // Notification events
  onNewNotification(callback: (notification: unknown) => void) {
    this.socket?.on('new_notification', callback)
  }

  offNewNotification() {
    this.socket?.off('new_notification')
  }

  // Chat events
  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('new_message', callback)
  }

  offNewMessage() {
    this.socket?.off('new_message')
  }

  sendMessage(data: { receiverId: string; content: string }) {
    this.socket?.emit('send_message', data)
  }

  onMessageUnsent(callback: (data: { messageId: string }) => void) {
    this.socket?.on('message_unsent', (data) => {
      callback(data);
      window.dispatchEvent(new CustomEvent('message_unsent', { detail: data }));
    });
  }

  offMessageUnsent() {
    this.socket?.off('message_unsent');
  }

  getSocket() {
    return this.socket
  }
}

export default new SocketService()
