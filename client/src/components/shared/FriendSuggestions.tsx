import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import friendService, { type FriendUser } from '@/services/friendService'
import { Avatar } from './Avatar'
import { FriendButton } from './FriendButton'

export const FriendSuggestions = () => {
  const [suggestions, setSuggestions] = useState<FriendUser[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await friendService.getSuggestions(6)
      setSuggestions(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="bg-white rounded-2xl p-5 shadow">
      <div className="h-4 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
            <div className="h-2.5 bg-gray-100 rounded w-16 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )

  if (!suggestions.length) return null

  return (
    <div className="bg-white rounded-2xl p-5 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500" />
          Người bạn có thể biết
        </h3>
        <Link to="/friends" className="text-xs text-orange-500 hover:text-orange-600 font-semibold cursor-pointer">
          Xem tất cả
        </Link>
      </div>

      <div className="space-y-3">
        {suggestions.slice(0, 5).map(user => (
          <div key={user.id} className="flex items-center gap-3">
            <Link to={`/profile/${user.username}`}>
              <Avatar src={user.avatar} name={user.name} size="md" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${user.username}`} className="font-semibold text-sm text-gray-800 hover:text-orange-600 transition cursor-pointer block truncate">
                {user.name}
              </Link>
              {user.mutualFriends != null && user.mutualFriends > 0 ? (
                <p className="text-xs text-gray-500">{user.mutualFriends} bạn chung</p>
              ) : (
                <p className="text-xs text-gray-400">@{user.username}</p>
              )}
            </div>
            <FriendButton
              targetUserId={user.id}
              size="sm"
              onStatusChange={(s) => {
                if (s === 'request_sent') toast.success(`Đã gửi lời mời đến ${user.name}`)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
