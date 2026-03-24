import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
  UserMinus,
  Share2,
  Megaphone,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, isToday, isYesterday, differenceInCalendarDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import notificationService, { type Notification } from '@/services/notificationService'
import socketService from '@/services/socketService'
import { Avatar } from '@/components/shared/Avatar'
import { toast } from 'sonner'

type NotificationFilter = 'all' | 'mentions' | 'system'

type GroupKey = 'Hôm nay' | 'Hôm qua' | 'Tuần này' | 'Trước đó'

const GROUP_ORDER: GroupKey[] = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Trước đó']

const htmlToPlainText = (value?: string) => {
  if (!value) return ''

  if (typeof window === 'undefined') {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const temp = window.document.createElement('div')
  temp.innerHTML = value
  return (temp.textContent || temp.innerText || '').replace(/\s+/g, ' ').trim()
}

const getGroupKey = (createdAt: string): GroupKey => {
  const date = new Date(createdAt)

  if (isToday(date)) return 'Hôm nay'
  if (isYesterday(date)) return 'Hôm qua'

  const dayDiff = Math.abs(differenceInCalendarDays(new Date(), date))
  if (dayDiff <= 7) return 'Tuần này'

  return 'Trước đó'
}

const normalizeNotificationContent = (notification: Notification) => {
  if (notification.type === 'announcement') {
    return htmlToPlainText(notification.content) || 'Bạn có một thông báo mới từ hệ thống'
  }

  return notification.content
}

const NotificationsPage = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications(100, 0)
      setNotifications(data.notifications)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast.error('Không thể tải danh sách thông báo')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    const handleIncoming = (notification: unknown) => {
      const notif = notification as Notification
      setNotifications((prev) => {
        if (prev.some((item) => item.id === notif.id)) return prev
        return [notif, ...prev]
      })
    }

    const handleFollowerEvents = () => {
      loadNotifications()
    }

    socketService.onNewNotification(handleIncoming)
    socketService.onNewFollower(handleFollowerEvents)
    socketService.onUnfollowed(handleFollowerEvents)

    return () => {
      socketService.offNewNotification()
      socketService.offNewFollower()
      socketService.offUnfollowed()
    }
  }, [loadNotifications])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (activeFilter === 'all') return true

      if (activeFilter === 'system') {
        return notification.type === 'announcement'
      }

      // "Nhắc đến" = nhóm tương tác liên quan đến bạn
      return (
        notification.type === 'comment' ||
        notification.type === 'follow' ||
        notification.type === 'unfollow' ||
        notification.type === 'like'
      )
    })
  }, [notifications, activeFilter])

  const groupedNotifications = useMemo(() => {
    const grouped = filteredNotifications.reduce<Record<GroupKey, Notification[]>>(
      (acc, notification) => {
        const key = getGroupKey(notification.createdAt)
        acc[key].push(notification)
        return acc
      },
      {
        'Hôm nay': [],
        'Hôm qua': [],
        'Tuần này': [],
        'Trước đó': [],
      },
    )

    return GROUP_ORDER
      .map((key) => ({ key, items: grouped[key] }))
      .filter((section) => section.items.length > 0)
  }, [filteredNotifications])

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return

    try {
      setIsMarkingAll(true)
      await notificationService.markAllAsRead()
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc')
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
      toast.error('Không thể cập nhật trạng thái thông báo')
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id)
    }

    navigate(`/notifications/${notification.id}`)
  }

  const getMessage = (notification: Notification) => {
    const content = normalizeNotificationContent(notification)

    switch (notification.type) {
      case 'follow':
        return (
          <>
            <span className="font-bold text-gray-900">{notification.actorName || 'Ai đó'}</span> đã bắt đầu theo dõi bạn.
          </>
        )
      case 'unfollow':
        return (
          <>
            <span className="font-bold text-gray-900">{notification.actorName || 'Ai đó'}</span> đã bỏ theo dõi bạn.
          </>
        )
      case 'like':
      case 'comment':
      case 'share':
        return (
          <>
            <span className="font-bold text-gray-900">{notification.actorName || 'Ai đó'}</span> {content}
          </>
        )
      case 'announcement':
        return (
          <>
            <span className="font-bold text-gray-900">Hệ thống:</span> <span className="text-orange-700">{content}</span>
          </>
        )
      default:
        return content
    }
  }

  const getTypeStyling = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return {
          icon: <Heart size={16} className="text-white" />,
          iconWrap: 'bg-rose-500',
          card: 'bg-white hover:bg-orange-50/45',
        }
      case 'comment':
        return {
          icon: <MessageCircle size={16} className="text-white" />,
          iconWrap: 'bg-blue-500',
          card: 'bg-white hover:bg-orange-50/45',
        }
      case 'follow':
        return {
          icon: <UserPlus size={16} className="text-white" />,
          iconWrap: 'bg-violet-500',
          card: 'bg-white hover:bg-orange-50/45',
        }
      case 'unfollow':
        return {
          icon: <UserMinus size={16} className="text-white" />,
          iconWrap: 'bg-gray-500',
          card: 'bg-white hover:bg-orange-50/45',
        }
      case 'share':
        return {
          icon: <Share2 size={16} className="text-white" />,
          iconWrap: 'bg-emerald-500',
          card: 'bg-white hover:bg-orange-50/45',
        }
      case 'announcement':
        return {
          icon: <Megaphone size={16} className="text-white" />,
          iconWrap: 'bg-orange-500',
          card: 'bg-orange-50/75 hover:bg-orange-100/70 border-orange-200',
        }
      default:
        return {
          icon: <Bell size={16} className="text-white" />,
          iconWrap: 'bg-orange-500',
          card: 'bg-white hover:bg-orange-50/45',
        }
    }
  }

  return (
    <div className="w-full py-6 md:py-8 space-y-6">
      <section className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 md:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Thông báo</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Theo dõi các hoạt động mới nhất dành cho bạn</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white border border-orange-100 px-3 py-1.5">
              <Sparkles size={14} className="text-orange-500" />
              <span className="text-xs font-semibold text-gray-700">{unreadCount.toLocaleString('vi-VN')} chưa đọc</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer transition"
          >
            <CheckCheck size={16} />
            {isMarkingAll ? 'Đang xử lý...' : 'Đánh dấu đã đọc tất cả'}
          </button>
        </div>

        <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-white/85 border border-orange-100 p-1.5">
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
            }`}
            onClick={() => setActiveFilter('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeFilter === 'mentions'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
            }`}
            onClick={() => setActiveFilter('mentions')}
          >
            Nhắc đến
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeFilter === 'system'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
            }`}
            onClick={() => setActiveFilter('system')}
          >
            Hệ thống
          </button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-orange-100 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-orange-100" />
                  <div className="h-3 w-1/4 rounded bg-orange-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : groupedNotifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center">
          <Bell className="mx-auto text-orange-300" size={38} />
          <h3 className="mt-3 text-lg font-bold text-gray-900">Không có thông báo phù hợp</h3>
          <p className="mt-1 text-sm text-gray-500">Thử chuyển tab lọc hoặc quay lại sau để xem cập nhật mới.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedNotifications.map((section) => (
            <section key={section.key}>
              <h2 className="mb-3 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
                {section.key}
                <span className="h-px flex-1 bg-orange-100" />
              </h2>

              <div className="space-y-3">
                {section.items.map((notification) => {
                  const style = getTypeStyling(notification.type)
                  const canOpenProfile =
                    (notification.type === 'follow' || notification.type === 'unfollow') &&
                    Boolean(notification.actorUsername)

                  const canNavigateToContent =
                    (notification.type === 'like' ||
                      notification.type === 'comment' ||
                      notification.type === 'share') &&
                    Boolean(notification.relatedId)

                  const cardClickable = true

                  return (
                    <article
                      key={notification.id}
                      className={`group rounded-2xl border p-4 transition ${
                        notification.read ? 'border-transparent' : 'border-orange-200'
                      } ${style.card} ${cardClickable ? 'cursor-pointer' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {notification.actorAvatar && notification.type !== 'announcement' ? (
                            <Avatar
                              src={notification.actorAvatar}
                              name={notification.actorName || 'U'}
                              size="xl"
                              className="w-12 h-12 ring-2 ring-orange-100"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                              <Bell size={18} className="text-orange-500" />
                            </div>
                          )}

                          <div
                            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${style.iconWrap}`}
                          >
                            {style.icon}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm md:text-[15px] leading-6 text-gray-700">{getMessage(notification)}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </p>

                          {canOpenProfile && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                if (notification.actorUsername) {
                                  navigate(`/profile/${notification.actorUsername}`)
                                }
                              }}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition cursor-pointer"
                            >
                              Xem hồ sơ
                              <ChevronRight size={13} />
                            </button>
                          )}
                        </div>

                        {!notification.read && (
                          <span className="mt-2 h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
