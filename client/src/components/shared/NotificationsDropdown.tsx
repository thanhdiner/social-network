import { useState, useEffect, useRef } from 'react'
import { Bell, X, UserPlus, Heart, MessageCircle, UserMinus, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import socketService from '@/services/socketService'
import notificationService from '@/services/notificationService'
import type { Notification } from '@/services/notificationService'
import { formatDistanceToNow } from 'date-fns'

export const NotificationsDropdown = () => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  // Load notifications from API on mount
  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true)
      }
      const [data, count] = await Promise.all([
        notificationService.getNotifications(5, 0),
        notificationService.getUnreadCount(),
      ])
      setNotifications(data.notifications)
      setHasMore(data.hasMore)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreNotifications = async () => {
    try {
      setLoadingMore(true)
      const data = await notificationService.getNotifications(5, notifications.length)
      setNotifications(prev => [...prev, ...data.notifications])
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to load more notifications:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Listen for realtime follow/unfollow events
  useEffect(() => {
    // Listen for new follower notifications
    socketService.onNewFollower(() => {
      // Reload notifications from server to get the latest
      loadNotifications()
    })

    socketService.onUnfollowed(() => {
      // Reload notifications from server to get the latest
      loadNotifications()
    })

    // Listen for new notifications (like, comment)
    socketService.onNewNotification((notification) => {
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(prev => prev + 1)
    })

    return () => {
      socketService.offNewFollower()
      socketService.offUnfollowed()
      socketService.offNewNotification()
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleOpen = async () => {
    setIsOpen(!isOpen)
    if (!isOpen && unreadCount > 0) {
      // Mark all as read on server
      try {
        await notificationService.markAllAsRead()
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      } catch (error) {
        console.error('Failed to mark notifications as read:', error)
      }
    }
  }

  const removeNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const clearAll = async () => {
    try {
      await notificationService.clearAll()
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="text-orange-500" size={20} />
      case 'unfollow':
        return <UserMinus className="text-gray-500" size={20} />
      case 'like':
        return <Heart className="text-red-500" size={20} />
      case 'comment':
        return <MessageCircle className="text-blue-500" size={20} />
      case 'share':
        return <Share2 className="text-green-500" size={20} />
      default:
        return <Bell className="text-gray-500" size={20} />
    }
  }

  const getMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'follow':
        return (
          <>
            <span className="font-semibold">{notification.actorName}</span> started following you
          </>
        )
      case 'unfollow':
        return (
          <>
            <span className="font-semibold">{notification.actorName}</span> unfollowed you
          </>
        )
      case 'like':
        return (
          <>
            <span className="font-semibold">{notification.actorName}</span> {notification.content}
          </>
        )
      case 'comment':
        return (
          <>
            <span className="font-semibold">{notification.actorName}</span> {notification.content}
          </>
        )
      case 'share':
        return (
          <>
            <span className="font-semibold">{notification.actorName}</span> {notification.content}
          </>
        )
      default:
        return notification.content
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Navigate to related post if it's a like, comment, or share notification
    if ((notification.type === 'like' || notification.type === 'comment' || notification.type === 'share') && notification.relatedId) {
      setIsOpen(false)
      navigate(`/post/${notification.relatedId}`)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="p-3 cursor-pointer hover:bg-orange-50 rounded-full transition relative"
      >
        <Bell className="text-orange-400" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-lg text-gray-800">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition ${
                    !notification.read ? 'bg-orange-50' : ''
                  } ${notification.type === 'like' || notification.type === 'comment' || notification.type === 'share' ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">{getIcon(notification.type)}</div>

                    <div className="flex-1 min-w-0">
                      {notification.actorAvatar && (notification.type === 'follow' || notification.type === 'unfollow') && (
                        <div className="flex items-center gap-2 mb-2">
                          {notification.actorAvatar ? (
                            <img
                              src={notification.actorAvatar}
                              alt={notification.actorName || ''}
                              className="w-10 h-10 rounded-full object-cover border border-orange-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
                              <span className="text-sm font-semibold text-orange-600">
                                {notification.actorName?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-sm text-gray-700">{getMessage(notification)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="shrink-0 text-gray-400 hover:text-gray-600 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
            
            {/* Load More Button */}
            {!loading && hasMore && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={loadMoreNotifications}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm text-orange-500 hover:text-orange-600 font-medium hover:bg-orange-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
