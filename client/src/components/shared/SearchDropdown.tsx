import { Search, User, FileText, X, TrendingUp } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchService, type SearchResults } from '@/services/searchService'
import { useDebounce } from '@/hooks/useDebounce'

interface PopularSearch {
  type: 'user'
  query: string
  data: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
}

export const SearchDropdown = () => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 300)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch popular searches on mount
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const data = await searchService.getPopularSearches(5)
        setPopularSearches(data)
      } catch (error) {
        console.error('Error fetching popular searches:', error)
      }
    }
    fetchPopular()
  }, [])

  // Search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim().length === 0) {
        setResults(null)
        return
      }

      setLoading(true)
      try {
        const data = await searchService.searchAll(debouncedQuery, 5)
        setResults(data)
      } catch (error) {
        console.error('Error searching:', error)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setIsOpen(true)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
  }

  const handleUserClick = (username: string) => {
    navigate(`/profile/${username}`)
    setIsOpen(false)
    setQuery('')
  }

  const handlePostClick = (postId: string) => {
    navigate(`/post/${postId}`)
    setIsOpen(false)
    setQuery('')
  }

  const handleViewAll = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      handleViewAll()
    }
  }

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search here..."
          className="w-full rounded-full border pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring focus:ring-orange-200"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border z-50 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 mt-2">Searching...</p>
            </div>
          ) : query.trim().length === 0 ? (
            // Popular searches
            <div className="p-4">
              <div className="flex items-center gap-2 px-2 mb-3">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-700">Popular</h3>
              </div>
              {popularSearches.length > 0 ? (
                <div className="space-y-1">
                  {popularSearches.map((item) => (
                    <div
                      key={item.data.id}
                      onClick={() => handleUserClick(item.data.username)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                    >
                      <img
                        src={item.data.avatar || 'https://i.pravatar.cc/100'}
                        alt={item.data.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{item.data.name}</p>
                        <p className="text-sm text-gray-500">@{item.data.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm px-3">No popular searches</p>
              )}
            </div>
          ) : results && (results.users.length > 0 || results.posts.length > 0) ? (
            <div className="p-4">
              {/* Users Section */}
              {results.users.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 mb-3">
                    <User className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-700">People</h3>
                  </div>
                  <div className="space-y-1">
                    {results.users.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserClick(user.username)}
                        className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar || 'https://i.pravatar.cc/100'}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-800">{user.name}</p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.followersCount} followers
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Section */}
              {results.posts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 mb-3">
                    <FileText className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-gray-700">Posts</h3>
                  </div>
                  <div className="space-y-1">
                    {results.posts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handlePostClick(post.id)}
                        className="flex items-start gap-3 px-3 py-2 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                      >
                        <img
                          src={post.user.avatar || 'https://i.pravatar.cc/100'}
                          alt={post.user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{post.user.name}</p>
                          <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                          <div className="flex gap-3 mt-1 text-xs text-gray-500">
                            <span>{post.likesCount} likes</span>
                            <span>{post.commentsCount} comments</span>
                          </div>
                        </div>
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt="Post"
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View All Button */}
              <button
                onClick={handleViewAll}
                className="w-full mt-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium cursor-pointer"
              >
                View All Results
              </button>
            </div>
          ) : query.trim().length > 0 ? (
            <div className="p-6 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No results found for "{query}"</p>
              <p className="text-gray-400 text-sm mt-1">Try different keywords</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
