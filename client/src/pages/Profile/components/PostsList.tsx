import { useEffect, useState } from 'react'
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

interface Post {
  id: string
  content: string
  imageUrl?: string
  userId: string
  createdAt: string
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  _count: {
    likes: number
    comments: number
  }
  isLiked?: boolean
}

interface PostsListProps {
  username?: string
}

export const PostsList = ({ username: _username }: PostsListProps) => {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [_username])

  const loadPosts = async () => {
    try {
      // TODO: Fetch posts from API based on username
      // Mock data
      const mockPosts: Post[] = [
        {
          id: '1',
          content: 'Just finished an amazing project! 🎉',
          imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop',
          userId: '1',
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          user: {
            id: '1',
            name: 'Bni Cyst',
            username: 'bnicyst',
            avatar: 'https://i.pravatar.cc/150?u=bnicyst'
          },
          _count: {
            likes: 140,
            comments: 20
          },
          isLiked: false
        },
        {
          id: '2',
          content: 'Beautiful day at the park with family! 🌳☀️',
          imageUrl: 'https://images.unsplash.com/photo-1516802273409-68526ee1bdd6?w=800&h=600&fit=crop',
          userId: '1',
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          user: {
            id: '1',
            name: 'Bni Cyst',
            username: 'bnicyst',
            avatar: 'https://i.pravatar.cc/150?u=bnicyst'
          },
          _count: {
            likes: 89,
            comments: 12
          },
          isLiked: true
        }
      ]
      setPosts(mockPosts)
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          _count: {
            ...post._count,
            likes: post.isLiked ? post._count.likes - 1 : post._count.likes + 1
          }
        }
      }
      return post
    }))
    // TODO: Call API to like/unlike post
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow">
            <div className="flex gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/6 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
            </div>
            <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow text-center">
        <p className="text-gray-500">No posts yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <article key={post.id} className="bg-white rounded-2xl p-5 shadow">
          {/* Post Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex gap-3">
              <Link to={`/profile/${post.user.username}`}>
                <img
                  src={post.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.name)}&background=fb923c&color=fff`}
                  alt={post.user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              </Link>
              <div>
                <Link to={`/profile/${post.user.username}`} className="font-semibold text-gray-800 hover:text-orange-600 transition">
                  {post.user.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <button className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Post Content */}
          <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

          {/* Post Image */}
          {post.imageUrl && (
            <div className="rounded-xl overflow-hidden mb-4">
              <img
                src={post.imageUrl}
                alt=""
                className="w-full max-h-[600px] object-cover"
              />
            </div>
          )}

          {/* Post Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3 pb-3 border-b">
            <button className="hover:underline">
              {post._count.likes} {post._count.likes === 1 ? 'Like' : 'Likes'}
            </button>
            <button className="hover:underline">
              {post._count.comments} {post._count.comments === 1 ? 'Comment' : 'Comments'}
            </button>
          </div>

          {/* Post Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 transition ${
                post.isLiked ? 'text-orange-500' : 'text-gray-600'
              }`}
            >
              <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-orange-500' : ''}`} />
              <span className="font-medium">Like</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Comment</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition">
              <Share2 className="w-5 h-5" />
              <span className="font-medium">Share</span>
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
