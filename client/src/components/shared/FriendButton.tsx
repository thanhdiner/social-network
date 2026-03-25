import { useState, useEffect, useCallback } from 'react'
import { UserPlus, UserMinus, UserCheck, UserX, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import friendService, { type FriendshipStatus } from '@/services/friendService'
import { useAuth } from '@/contexts/AuthContext'

interface FriendButtonProps {
  targetUserId: string
  className?: string
  size?: 'sm' | 'md'
  onStatusChange?: (status: FriendshipStatus) => void
}

export const FriendButton = ({ targetUserId, className = '', size = 'md', onStatusChange }: FriendButtonProps) => {
  const { user } = useAuth()
  const [status, setStatus] = useState<FriendshipStatus>('strangers')
  const [requestId, setRequestId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const loadStatus = useCallback(async () => {
    if (!user || user.id === targetUserId) { setLoading(false); return }
    try {
      const res = await friendService.getStatus(targetUserId)
      setStatus(res.status)
      setRequestId(res.requestId)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [targetUserId, user])

  useEffect(() => { loadStatus() }, [loadStatus])

  if (!user || user.id === targetUserId) return null

  const updateStatus = (s: FriendshipStatus, rid?: string) => {
    setStatus(s); setRequestId(rid)
    onStatusChange?.(s)
  }

  // Optimistic: send friend request
  const handleSend = async () => {
    const prevStatus = status
    const prevId = requestId
    updateStatus('request_sent', undefined)          // optimistic
    setActing(true)
    try {
      const req = await friendService.sendRequest(targetUserId)
      updateStatus('request_sent', req.id)
      toast.success('Đã gửi lời mời kết bạn')
    } catch (e: any) {
      updateStatus(prevStatus, prevId)               // revert
      toast.error(e?.response?.data?.message || 'Gửi thất bại')
    } finally { setActing(false) }
  }

  // Optimistic: cancel request
  const handleCancel = async () => {
    const prevStatus = status
    const prevId = requestId
    updateStatus('strangers', undefined)             // optimistic
    setActing(true); setShowConfirm(false)
    try {
      await friendService.cancelRequest(targetUserId)
      toast.success('Đã huỷ lời mời')
    } catch {
      updateStatus(prevStatus, prevId)               // revert
      toast.error('Thất bại')
    } finally { setActing(false) }
  }

  // Optimistic: accept request
  const handleAccept = async () => {
    if (!requestId) return
    const prevStatus = status
    const prevId = requestId
    updateStatus('friends', requestId)               // optimistic
    setActing(true)
    try {
      await friendService.acceptRequest(requestId)
      toast.success('Đã chấp nhận lời mời kết bạn!')
    } catch {
      updateStatus(prevStatus, prevId)               // revert
      toast.error('Thất bại')
    } finally { setActing(false) }
  }

  // Optimistic: reject request
  const handleReject = async () => {
    if (!requestId) return
    const prevStatus = status
    const prevId = requestId
    updateStatus('strangers', undefined)             // optimistic
    setActing(true)
    try {
      await friendService.rejectRequest(requestId)
      toast.success('Đã từ chối lời mời')
    } catch {
      updateStatus(prevStatus, prevId)               // revert
      toast.error('Thất bại')
    } finally { setActing(false) }
  }

  // Optimistic: unfriend
  const handleUnfriend = async () => {
    const prevStatus = status
    const prevId = requestId
    updateStatus('strangers', undefined)             // optimistic
    setActing(true); setShowConfirm(false)
    try {
      await friendService.unfriend(targetUserId)
      toast.success('Đã huỷ kết bạn')
    } catch {
      updateStatus(prevStatus, prevId)               // revert
      toast.error('Thất bại')
    } finally { setActing(false) }
  }

  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs gap-1.5' : 'px-4 py-2 text-sm gap-2'
  const iconSz = size === 'sm' ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'
  const base = `inline-flex items-center justify-center font-semibold rounded-lg transition-all active:scale-95 cursor-pointer ${sz}`

  if (loading) return (
    <div className={`${base} bg-gray-100 text-gray-400 ${className}`}>
      <Loader2 className={`${iconSz} animate-spin`} />
    </div>
  )

  if (status === 'friends') return (
    <div className="relative">
      <button
        onClick={() => setShowConfirm(v => !v)}
        className={`${base} bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 ${className}`}
        disabled={acting}
      >
        <UserCheck className={iconSz} />
        Bạn bè
      </button>
      {showConfirm && (
        <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
          <button
            onClick={handleUnfriend}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <UserMinus className="w-4 h-4" />
            Huỷ kết bạn
          </button>
        </div>
      )}
    </div>
  )

  if (status === 'request_sent') return (
    <div className="relative">
      <button
        onClick={() => setShowConfirm(v => !v)}
        className={`${base} bg-gray-100 hover:bg-gray-200 text-gray-600 ${className}`}
        disabled={acting}
      >
        {acting ? <Loader2 className={`${iconSz} animate-spin`} /> : <Clock className={iconSz} />}
        Đã gửi
      </button>
      {showConfirm && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
          <button onClick={handleCancel} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer">
            Huỷ lời mời
          </button>
        </div>
      )}
    </div>
  )

  if (status === 'request_received') return (
    <div className="flex gap-1.5">
      <button
        onClick={handleAccept}
        disabled={acting}
        className={`${base} bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-200 flex-1 ${className}`}
      >
        {acting ? <Loader2 className={`${iconSz} animate-spin`} /> : <UserCheck className={iconSz} />}
        Chấp nhận
      </button>
      <button
        onClick={handleReject}
        disabled={acting}
        className={`${base} bg-gray-100 hover:bg-gray-200 text-gray-700`}
      >
        <UserX className={iconSz} />
      </button>
    </div>
  )

  // strangers
  return (
    <button
      onClick={handleSend}
      disabled={acting}
      className={`${base} bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-200 ${className}`}
    >
      {acting ? <Loader2 className={`${iconSz} animate-spin`} /> : <UserPlus className={iconSz} />}
      Kết bạn
    </button>
  )
}
