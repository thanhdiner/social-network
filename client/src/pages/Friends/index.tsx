import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { UserCheck, UserX, Users, Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useTitle } from '@/hooks/useTitle'
import friendService, { type FriendRequest, type FriendUser } from '@/services/friendService'
import { Avatar } from '@/components/shared/Avatar'
import { FriendButton } from '@/components/shared/FriendButton'

export const FriendsPage = () => {
  useTitle('Bạn bè')

  const [tab, setTab] = useState<'requests' | 'friends' | 'suggestions'>('requests')
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [suggestions, setSuggestions] = useState<FriendUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const { requests: r } = await friendService.getReceivedRequests()
      setRequests(r)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  const loadFriends = useCallback(async () => {
    setLoading(true)
    try {
      const { friends: f } = await friendService.getFriends(1, 50)
      setFriends(f)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    try {
      const s = await friendService.getSuggestions(20)
      setSuggestions(s)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'requests') loadRequests()
    else if (tab === 'friends') loadFriends()
    else loadSuggestions()
  }, [tab, loadRequests, loadFriends, loadSuggestions])

  const handleAccept = async (req: FriendRequest) => {
    try {
      await friendService.acceptRequest(req.id)
      setRequests(prev => prev.filter(r => r.id !== req.id))
      toast.success(`Bạn và ${req.sender?.name} đã là bạn bè!`)
    } catch { toast.error('Thất bại') }
  }

  const handleReject = async (req: FriendRequest) => {
    try {
      await friendService.rejectRequest(req.id)
      setRequests(prev => prev.filter(r => r.id !== req.id))
      toast.success('Đã từ chối lời mời')
    } catch { toast.error('Thất bại') }
  }

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { key: 'requests', label: 'Lời mời', count: requests.length },
    { key: 'friends',     label: 'Bạn bè', count: friends.length },
    { key: 'suggestions', label: 'Gợi ý',  count: null },
  ] as const

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-orange-500" />
          Bạn bè
        </h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý bạn bè và lời mời kết bạn</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
              tab === t.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-600'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Lời mời */}
      {tab === 'requests' && (
        <div>
          {loading && <div className="text-center py-12 text-gray-400">Đang tải...</div>}
          {!loading && requests.length === 0 && (
            <div className="text-center py-16">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Không có lời mời nào</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl p-4 shadow flex gap-3 items-center">
                <Link to={`/profile/${req.sender?.username}`}>
                  <Avatar src={req.sender?.avatar} name={req.sender?.name || ''} size="xl" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${req.sender?.username}`}
                    className="font-bold text-gray-800 hover:text-orange-600 transition cursor-pointer block truncate">
                    {req.sender?.name}
                  </Link>
                  <p className="text-xs text-gray-400 mb-3">@{req.sender?.username}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      Chấp nhận
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition cursor-pointer"
                    >
                      <UserX className="w-4 h-4" />
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Bạn bè */}
      {tab === 'friends' && (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm bạn bè..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 transition"
            />
          </div>

          {loading && <div className="text-center py-12 text-gray-400">Đang tải...</div>}
          {!loading && filteredFriends.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">{search ? 'Không tìm thấy' : 'Chưa có bạn bè'}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredFriends.map(friend => (
              <div key={friend.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
                <Link to={`/profile/${friend.username}`}>
                  <Avatar src={friend.avatar} name={friend.name} size="xl" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${friend.username}`}
                    className="font-bold text-gray-800 hover:text-orange-600 transition cursor-pointer block truncate">
                    {friend.name}
                  </Link>
                  <p className="text-xs text-gray-400">@{friend.username}</p>
                </div>
                <FriendButton targetUserId={friend.id} size="sm" onStatusChange={(s) => {
                  if (s === 'strangers') {
                    setFriends(prev => prev.filter(f => f.id !== friend.id))
                    toast.success(`Đã huỷ kết bạn với ${friend.name}`)
                  }
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Gợi ý */}
      {tab === 'suggestions' && (
        <div>
          {loading && <div className="text-center py-12 text-gray-400">Đang tải...</div>}
          {!loading && suggestions.length === 0 && (
            <div className="text-center py-16">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Không có gợi ý nào</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suggestions.map(user => (
              <div key={user.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
                <Link to={`/profile/${user.username}`}>
                  <Avatar src={user.avatar} name={user.name} size="xl" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${user.username}`}
                    className="font-bold text-gray-800 hover:text-orange-600 transition cursor-pointer block truncate">
                    {user.name}
                  </Link>
                  {user.mutualFriends != null && user.mutualFriends > 0
                    ? <p className="text-xs text-gray-500">{user.mutualFriends} bạn chung</p>
                    : <p className="text-xs text-gray-400">@{user.username}</p>
                  }
                </div>
                <FriendButton
                  targetUserId={user.id}
                  size="sm"
                  onStatusChange={(s) => {
                    if (s === 'request_sent') {
                      setSuggestions(prev => prev.filter(u => u.id !== user.id))
                      toast.success(`Đã gửi lời mời đến ${user.name}`)
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FriendsPage
