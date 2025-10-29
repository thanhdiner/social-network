import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private userId: string | null = null

  connect(userId: string) {
    if (this.socket?.connected && this.userId === userId) {
      return
    }

    this.userId = userId
    
    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
      // Register user with socket
      this.socket?.emit('register', { userId })
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.userId = null
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
  onNewNotification(callback: (notification: any) => void) {
    this.socket?.on('new_notification', callback)
  }

  offNewNotification() {
    this.socket?.off('new_notification')
  }

  getSocket() {
    return this.socket
  }
}

export default new SocketService()
