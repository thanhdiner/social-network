import { io, Socket } from 'socket.io-client'
import type { Message } from '../types'

type IncomingCallPayload = {
  callerId: string
  receiverId: string
  callerName: string
  callerAvatar: string | null
}

type CallSignalPayload = {
  signal: unknown
}

type ChatCustomizationSocketPayload = {
  userAId: string
  userBId: string
  themeId: string
  emoji: string
  nicknameForUserA?: string | null
  nicknameForUserB?: string | null
  updatedById?: string | null
  updatedAt?: string
  summary?: string
}

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
      } catch (error) {
        console.warn('SocketService: failed to reset existing socket', error)
      }
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
      } catch (error) {
        console.warn('SocketService: failed to disconnect socket', error)
      }
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

  onChatCustomizationUpdated(callback: (payload: ChatCustomizationSocketPayload) => void) {
    this.socket?.on('chat_customization_updated', callback)
  }

  offChatCustomizationUpdated(callback: (payload: ChatCustomizationSocketPayload) => void) {
    this.socket?.off('chat_customization_updated', callback)
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

  // Voice call events
  onVoiceCallIncoming(callback: (data: IncomingCallPayload) => void) {
    this.socket?.on('voice_call_incoming', callback);
  }

  onVoiceCallAccepted(callback: () => void) {
    this.socket?.on('voice_call_accepted', callback);
  }

  onVoiceCallRejected(callback: () => void) {
    this.socket?.on('voice_call_rejected', callback);
  }

  onVoiceCallEnded(callback: () => void) {
    this.socket?.on('voice_call_ended', callback);
  }

  onVoiceCallSignal(callback: (data: CallSignalPayload) => void) {
    this.socket?.on('voice_call_signal', callback);
  }

  offVoiceCallEvents() {
    this.socket?.off('voice_call_incoming');
    this.socket?.off('voice_call_accepted');
    this.socket?.off('voice_call_rejected');
    this.socket?.off('voice_call_ended');
    this.socket?.off('voice_call_signal');
  }

  // Video call events
  onVideoCallIncoming(callback: (data: IncomingCallPayload) => void) {
    this.socket?.on('video_call_incoming', callback);
  }

  onVideoCallAccepted(callback: () => void) {
    this.socket?.on('video_call_accepted', callback);
  }

  onVideoCallRejected(callback: () => void) {
    this.socket?.on('video_call_rejected', callback);
  }

  onVideoCallEnded(callback: () => void) {
    this.socket?.on('video_call_ended', callback);
  }

  onVideoCallSignal(callback: (data: CallSignalPayload) => void) {
    this.socket?.on('video_call_signal', callback);
  }

  offVideoCallEvents() {
    this.socket?.off('video_call_incoming');
    this.socket?.off('video_call_accepted');
    this.socket?.off('video_call_rejected');
    this.socket?.off('video_call_ended');
    this.socket?.off('video_call_signal');
  }

  getSocket() {
    return this.socket
  }
}

export default new SocketService()
