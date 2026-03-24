import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Heart,
  MessageCircle,
  Megaphone,
  Share2,
  ShieldAlert,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import notificationService, { type Notification } from '@/services/notificationService'
import postService, { type Post } from '@/services/postService'
import { getReel } from '@/services/reelService'
import type { Reel } from '@/types'
import { Avatar } from '@/components/shared/Avatar'
import { toast } from 'sonner'

const htmlToPlainText = (value?: string) => {
  if (!value) return ''

  if (typeof window === 'undefined') {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const temp = window.document.createElement('div')
  temp.innerHTML = value
  return (temp.textContent || temp.innerText || '').replace(/\s+/g, ' ').trim()
}

const sanitizeHtml = (value: string) => {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

const getNotificationTypeMeta = (type: Notification['type']) => {
  switch (type) {
    case 'like':
      return {
        label: 'Thông báo về bài viết của bạn',
        icon: <Heart size={16} className="text-white" />,
        iconWrap: 'bg-rose-500',
      }
    case 'comment':
      return {
        label: 'Bình luận mới',
        icon: <MessageCircle size={16} className="text-white" />,
        iconWrap: 'bg-blue-500',
      }
    case 'share':
      return {
        label: 'Chia sẻ nội dung',
        icon: <Share2 size={16} className="text-white" />,
        iconWrap: 'bg-emerald-500',
      }
    case 'follow':
      return {
        label: 'Theo dõi mới',
        icon: <UserPlus size={16} className="text-white" />,
        iconWrap: 'bg-violet-500',
      }
    case 'unfollow':
      return {
        label: 'Bỏ theo dõi',
        icon: <UserMinus size={16} className="text-white" />,
        iconWrap: 'bg-slate-500',
      }
    case 'announcement':
      return {
        label: 'Thông báo hệ thống',
        icon: <Megaphone size={16} className="text-white" />,
        iconWrap: 'bg-orange-500',
      }
    default:
      return {
        label: 'Thông báo',
        icon: <Bell size={16} className="text-white" />,
        iconWrap: 'bg-orange-500',
      }
  }
}

const NotificationsDetailPage = () => {
  const navigate = useNavigate()
  const { notificationId } = useParams<{ notificationId: string }>()

  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [relatedPost, setRelatedPost] = useState<Post | null>(null)
  const [relatedReel, setRelatedReel] = useState<Reel | null>(null)

  useEffect(() => {
    const loadDetail = async () => {
      if (!notificationId) return

      try {
        setLoading(true)
        const detail = await notificationService.getNotificationById(notificationId)
        setNotification(detail)

        if (!detail.read) {
          await notificationService.markAsRead(detail.id)
          setNotification((prev) => (prev ? { ...prev, read: true } : prev))
        }

        if (detail.relatedId && (detail.type === 'like' || detail.type === 'comment' || detail.type === 'share')) {
          const normalizedContent = htmlToPlainText(detail.content).toLowerCase()

          if (normalizedContent.includes('reel')) {
            const reel = await getReel(detail.relatedId)
            setRelatedReel(reel)
          } else if (normalizedContent.includes('post')) {
            const post = await postService.getPost(detail.relatedId)
            setRelatedPost(post)
          } else {
            try {
              const reel = await getReel(detail.relatedId)
              setRelatedReel(reel)
            } catch {
              const post = await postService.getPost(detail.relatedId)
              setRelatedPost(post)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load notification detail:', error)
        toast.error('Không thể tải chi tiết thông báo')
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [notificationId])

  const typeMeta = useMemo(() => {
    if (!notification) return null
    return getNotificationTypeMeta(notification.type)
  }, [notification])

  const announcementHtml = useMemo(() => {
    if (!notification || notification.type !== 'announcement') return ''
    return sanitizeHtml(notification.content)
  }, [notification])

  if (loading) {
    return (
      <div className="w-full px-4 md:px-8 py-8">
        <div className="max-w-[1280px] mx-auto animate-pulse space-y-4">
          <div className="h-10 w-72 bg-orange-100 rounded-xl" />
          <div className="h-80 bg-white rounded-2xl border border-orange-100" />
        </div>
      </div>
    )
  }

  if (!notification || !typeMeta) {
    return (
      <div className="w-full px-4 md:px-8 py-8">
        <div className="max-w-[980px] mx-auto bg-white rounded-2xl border border-orange-100 p-8 text-center">
          <Bell size={36} className="mx-auto text-orange-300" />
          <h2 className="mt-3 text-2xl font-extrabold text-gray-900">Không tìm thấy thông báo</h2>
          <p className="mt-2 text-sm text-gray-500">Thông báo có thể đã bị xóa hoặc bạn không có quyền truy cập.</p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 cursor-pointer"
            onClick={() => navigate('/notifications')}
          >
            <ArrowLeft size={15} />
            Quay về danh sách
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-6 md:py-8">
      <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="w-10 h-10 rounded-xl border border-orange-200 bg-white text-orange-500 hover:bg-orange-50 transition cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Chi tiết thông báo</h1>
          </div>

          <section className="rounded-3xl border border-orange-100 bg-white p-5 md:p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeMeta.iconWrap}`}>
                {typeMeta.icon}
              </div>
              <p className="text-sm font-semibold text-gray-600">{typeMeta.label}</p>
              <span className="text-xs text-gray-400">•</span>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}
              </p>
            </div>

            {notification.type === 'announcement' ? (
              <div className="relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 md:p-6">
                <div className="absolute -top-14 -right-14 h-36 w-36 rounded-full bg-orange-200/40 blur-3xl" />
                <div className="relative z-10">
                  <h2 className="text-xl font-extrabold text-gray-900 mb-2">Thông báo từ hệ thống Indigo Nexus</h2>
                  <div
                    className="text-sm leading-7 text-gray-700 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-extrabold"
                    dangerouslySetInnerHTML={{ __html: announcementHtml || htmlToPlainText(notification.content) }}
                  />

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      to="/settings/account"
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold !text-white hover:bg-orange-700 transition cursor-pointer shadow-sm"
                    >
                      <ShieldAlert size={14} />
                      Mở cài đặt tài khoản
                    </Link>
                    <button
                      type="button"
                      className="rounded-xl border border-orange-200 bg-white px-4 py-2 text-xs font-bold text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                    >
                      Tôi đã biết
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                  <div className="flex items-center gap-3">
                    {notification.actorAvatar ? (
                      <Avatar
                        src={notification.actorAvatar}
                        name={notification.actorName || 'U'}
                        size="xl"
                        className="w-12 h-12"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                        <Bell size={18} />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-900">{notification.actorName || 'Hệ thống'}</p>
                      <p className="text-xs text-gray-500">@{notification.actorUsername || 'nexus'}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-gray-700">{htmlToPlainText(notification.content)}</p>
                </div>

                {relatedPost && (
                  <article className="rounded-2xl border border-orange-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Bài viết liên quan</p>
                        <p className="text-xs text-gray-500">@{relatedPost.user.username}</p>
                      </div>
                      <Link
                        to={`/post/${relatedPost.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                      >
                        Xem bài viết
                        <ChevronRight size={13} />
                      </Link>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-700">
                      {relatedPost.content?.slice(0, 240)}
                      {relatedPost.content && relatedPost.content.length > 240 ? '...' : ''}
                    </p>

                    {relatedPost.imageUrl && (
                      <div className="mt-3 overflow-hidden rounded-xl aspect-video bg-gray-100">
                        <img src={relatedPost.imageUrl} alt="related-post" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-5 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><Heart size={13} /> {relatedPost._count?.likes || 0}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle size={13} /> {relatedPost._count?.comments || 0}</span>
                    </div>
                  </article>
                )}

                {relatedReel && (
                  <article className="rounded-2xl border border-orange-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">Reel liên quan</p>
                      <Link
                        to={`/reels/${relatedReel.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                      >
                        Mở reel
                        <ChevronRight size={13} />
                      </Link>
                    </div>

                    <p className="mt-3 text-sm text-gray-700 leading-6">
                      {relatedReel.description?.slice(0, 220) || 'Nội dung reel'}
                    </p>

                    <div className="mt-3 overflow-hidden rounded-xl aspect-video bg-gray-100">
                      <img
                        src={relatedReel.thumbnailUrl || relatedReel.videoUrl}
                        alt="related-reel"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </article>
                )}

                {(notification.type === 'follow' || notification.type === 'unfollow') && notification.actorUsername && (
                  <div className="flex gap-2">
                    <Link
                      to={`/profile/${notification.actorUsername}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 transition cursor-pointer"
                    >
                      Xem hồ sơ
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>
      </div>
    </div>
  )
}

export default NotificationsDetailPage
