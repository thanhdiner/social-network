import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
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

  const handleSent = (userId: string) => {
    // Remove from suggestions after sending request
    setSuggestions(prev => prev.filter(u => u.id !== userId))
  }

  if (loading) return (
    <section>
      <div className="h-4 bg-gray-200 rounded w-36 mb-4 animate-pulse" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5 pt-1">
            <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-2.5 bg-gray-100 rounded w-1/2 animate-pulse" />
            <div className="h-6 bg-gray-100 rounded w-full animate-pulse mt-2" />
          </div>
        </div>
      ))}
    </section>
  )

  if (!suggestions.length) return null

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-orange-500" />
          Người bạn có thể biết
        </h3>
        <Link to="/friends" className="text-xs text-orange-500 hover:text-orange-600 font-semibold cursor-pointer">
          Xem tất cả
        </Link>
      </div>

      {/* List */}
      <div className="space-y-3">
        {suggestions.slice(0, 5).map(user => (
          <div key={user.id} className="flex gap-2.5">
            {/* Avatar */}
            <Link to={`/profile/${user.username}`} className="shrink-0">
              <Avatar src={user.avatar} name={user.name} size="md" />
            </Link>

            {/* Info + Button stacked */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/profile/${user.username}`}
                className="font-semibold text-sm text-gray-800 hover:text-orange-600 transition block truncate leading-tight"
              >
                {user.name}
              </Link>
              <p className="text-xs text-gray-400 truncate">
                {user.mutualFriends != null && user.mutualFriends > 0
                  ? `${user.mutualFriends} bạn chung`
                  : `@${user.username}`}
              </p>
              <div className="mt-1.5">
                <FriendButton
                  targetUserId={user.id}
                  size="sm"
                  className="w-full"
                  onStatusChange={(s) => {
                    if (s === 'request_sent') handleSent(user.id)
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
