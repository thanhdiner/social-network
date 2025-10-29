import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, User, FileText, Loader2 } from 'lucide-react'
import { searchService, type SearchUser, type SearchPost } from '@/services/searchService'
import { useTitle } from '@/hooks/useTitle'

export const SearchResults = () => {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts'>('all')
  const [users, setUsers] = useState<SearchUser[]>([])
  const [posts, setPosts] = useState<SearchPost[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useTitle(`Search: ${query}`)

  useEffect(() => {
    if (!query) {
      navigate('/')
      return
    }

    const fetchResults = async () => {
      setLoading(true)
      try {
        if (activeTab === 'all') {
          const results = await searchService.searchAll(query, 20)
          setUsers(results.users)
          setPosts(results.posts)
        } else if (activeTab === 'users') {
          const userResults = await searchService.searchUsers(query, 50)
          setUsers(userResults)
        } else if (activeTab === 'posts') {
          const postResults = await searchService.searchPosts(query, 50)
          setPosts(postResults)
        }
      } catch (error) {
        console.error('Error fetching search results:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, activeTab, navigate])

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`)
  }

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-800">
            Search Results for "{query}"
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium transition cursor-pointer ${
              activeTab === 'all'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition cursor-pointer ${
              activeTab === 'users'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            People
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 font-medium transition cursor-pointer ${
              activeTab === 'posts'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Posts
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Users Section */}
          {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-800">People</h2>
                <span className="text-sm text-gray-500">({users.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user.username)}
                    className="flex items-center gap-3 p-3 hover:bg-orange-50 rounded-xl transition cursor-pointer"
                  >
                    <img
                      src={user.avatar || 'https://i.pravatar.cc/100'}
                      alt={user.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{user.name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      {user.bio && (
                        <p className="text-sm text-gray-600 line-clamp-1">{user.bio}</p>
                      )}
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

          {/* Posts Section */}
          {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-800">Posts</h2>
                <span className="text-sm text-gray-500">({posts.length})</span>
              </div>
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handlePostClick(post.id)}
                    className="border rounded-xl p-4 hover:bg-orange-50 transition cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={post.user.avatar || 'https://i.pravatar.cc/100'}
                        alt={post.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-800">{post.user.name}</p>
                          <span className="text-sm text-gray-500">
                            · {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{post.content}</p>
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt="Post"
                            className="w-full max-h-96 object-cover rounded-xl mb-3"
                          />
                        )}
                        {post.videoUrl && (
                          <video
                            src={post.videoUrl}
                            controls
                            className="w-full max-h-96 rounded-xl mb-3"
                          />
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

          {/* No Results */}
          {!loading &&
            ((activeTab === 'all' && users.length === 0 && posts.length === 0) ||
              (activeTab === 'users' && users.length === 0) ||
              (activeTab === 'posts' && posts.length === 0)) && (
              <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No results found</h3>
                <p className="text-gray-500">
                  We couldn't find anything for "{query}". Try searching for something else.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  )
}
