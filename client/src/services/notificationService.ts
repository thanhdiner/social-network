import api from './api'

export interface Notification {
  id: string
  type: 'follow' | 'unfollow' | 'like' | 'comment' | 'message' | 'share'
  content: string
  userId: string
  actorId?: string
  actorName?: string
  actorUsername?: string
  actorAvatar?: string
  relatedId?: string
  read: boolean
  createdAt: string
}

class NotificationService {
  async getNotifications(limit = 5, skip = 0): Promise<{
    notifications: Notification[]
    total: number
    hasMore: boolean
  }> {
    const response = await api.get('/notifications', {
      params: { limit, skip },
    })
    return response.data
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count')
    return response.data.count
  }

  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`)
  }

  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/mark-all-read')
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`)
  }

  async clearAll(): Promise<void> {
    await api.delete('/notifications')
  }
}

export default new NotificationService()
