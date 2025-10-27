import { useEffect, useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import socketService from '@/services/socketService'

interface FollowerNotification {
  id: string
  followerData: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  timestamp: string
}

export const FollowerNotifications = () => {
  const [notifications, setNotifications] = useState<FollowerNotification[]>([])

  useEffect(() => {
    socketService.onNewFollower((data) => {
      const notification: FollowerNotification = {
        id: `${data.followerId}-${Date.now()}`,
        followerData: data.followerData,
        timestamp: data.timestamp,
      }

      setNotifications((prev) => [notification, ...prev])

      // Auto remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      }, 5000)
    })

    return () => {
      socketService.offNewFollower()
    }
  }, [])

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-20 right-6 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white rounded-lg shadow-xl border border-orange-200 p-4 flex items-center gap-3 animate-in slide-in-from-right duration-300"
        >
          <div className="shrink-0">
            {notification.followerData.avatar ? (
              <img
                src={notification.followerData.avatar}
                alt={notification.followerData.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-orange-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-200">
                <span className="text-lg font-semibold text-orange-600">
                  {notification.followerData.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm font-medium text-gray-900 truncate">
                New Follower
              </p>
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{notification.followerData.name}</span>
              {' '}started following you
            </p>
          </div>

          <button
            onClick={() => removeNotification(notification.id)}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  )
}
