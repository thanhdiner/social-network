import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, User, FileText, Film, Loader2, Eye, Heart, MessageCircle } from 'lucide-react'
import { searchService, type SearchUser, type SearchPost, type SearchReel } from '@/services/searchService'
import { useTitle } from '@/hooks/useTitle'
import { Avatar } from '@/components/shared/Avatar'

type Tab = 'all' | 'users' | 'posts' | 'reels'

export const SearchResults = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [users, setUsers] = useState<SearchUser[]>([])
  const [posts, setPosts] = useState<SearchPost[]>([])
  const [reels, setReels] = useState<SearchReel[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useTitle(`Search: ${query}`)

  useEffect(() => {
    if (!query) { navigate('/'); return }

    const fetchResults = async () => {
      setLoading(true)
      try {
        if (activeTab === 'all') {
          const results = await searchService.searchAll(query, 20)
          setUsers(results.users)
          setPosts(results.posts)
          setReels(results.reels ?? [])
        } else if (activeTab === 'users') {
          const r = await searchService.searchUsers(query, 50); setUsers(r)
        } else if (activeTab === 'posts') {
          const r = await searchService.searchPosts(query, 50); setPosts(r)
        } else if (activeTab === 'reels') {
          const r = await searchService.searchReels(query, 50); setReels(r)
        }
      } catch (error) {
        console.error('Error fetching search results:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [query, activeTab, navigate])

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'users', label: 'Người dùng' },
    { key: 'posts', label: 'Bài viết' },
    { key: 'reels', label: 'Reels' },
  ]

  const noResults =
    (activeTab === 'all' && users.length === 0 && posts.length === 0 && reels.length === 0) ||
    (activeTab === 'users' && users.length === 0) ||
    (activeTab === 'posts' && posts.length === 0) ||
    (activeTab === 'reels' && reels.length === 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-800">
            Kết quả tìm kiếm cho "{query}"
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Users */}
          {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-800">Người dùng</h2>
                <span className="text-sm text-gray-500">({users.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => navigate(`/profile/${user.username}`)}
                    className="flex items-center gap-3 p-3 hover:bg-orange-50 rounded-xl transition cursor-pointer"
                  >
                    <Avatar src={user.avatar} name={user.name} size="xl" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      {user.bio && <p className="text-sm text-gray-600 line-clamp-1">{user.bio}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>{user.followersCount} followers</span>
                        <span>{user.followingCount} following</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-800">Bài viết</h2>
                <span className="text-sm text-gray-500">({posts.length})</span>
              </div>
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="border rounded-xl p-4 hover:bg-orange-50 transition cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar src={post.user.avatar} name={post.user.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-800">{post.user.name}</p>
                          <span className="text-sm text-gray-500">· {new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="text-gray-700 mb-3 line-clamp-3">{post.content}</p>
                        {post.imageUrl && (
                          <img src={post.imageUrl} alt="Post" className="w-full max-h-64 object-cover rounded-xl mb-3" />
                        )}
                        <div className="flex gap-6 text-sm text-gray-500">
                          <span>{post.likesCount} likes</span>
                          <span>{post.commentsCount} comments</span>
                          <span>{post.sharesCount} shares</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reels */}
          {(activeTab === 'all' || activeTab === 'reels') && reels.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Film className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-800">Reels</h2>
                <span className="text-sm text-gray-500">({reels.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {reels.map((reel) => (
                  <div
                    key={reel.id}
                    onClick={() => navigate(`/reels/${reel.id}`)}
                    className="group relative rounded-xl overflow-hidden cursor-pointer bg-black aspect-[9/16] hover:ring-2 hover:ring-orange-400 transition"
                  >
                    {reel.thumbnailUrl ? (
                      <img src={reel.thumbnailUrl} alt="Reel" className="w-full h-full object-cover" />
                    ) : (
                      <video src={reel.videoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {/* User info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Avatar src={reel.user.avatar} name={reel.user.name} size="sm" />
                        <span className="text-white text-xs font-medium truncate">{reel.user.name}</span>
                      </div>
                      {reel.description && (
                        <p className="text-white/80 text-xs line-clamp-2">{reel.description}</p>
                      )}
                    </div>
                    {/* Stats */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <span className="flex items-center gap-0.5 text-white text-xs bg-black/40 rounded px-1">
                        <Eye className="w-3 h-3" />{reel.views}
                      </span>
                      <span className="flex items-center gap-0.5 text-white text-xs bg-black/40 rounded px-1">
                        <Heart className="w-3 h-3" />{reel.likesCount}
                      </span>
                      <span className="flex items-center gap-0.5 text-white text-xs bg-black/40 rounded px-1">
                        <MessageCircle className="w-3 h-3" />{reel.commentsCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && noResults && (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Không tìm thấy kết quả</h3>
              <p className="text-gray-500">Không có kết quả nào cho "{query}". Hãy thử từ khóa khác.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
