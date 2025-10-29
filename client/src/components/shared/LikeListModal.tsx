import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import postService from '@/services/postService'

interface LikeUser {
  id: string
  name: string
  avatar: string | null
  username: string
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'
}

interface LikeListModalProps {
  postId: string
  imageIndex?: number
  totalLikes: number
  onClose: () => void
}

const reactionIcons = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
}

const reactionLabels = {
  like: 'Thích',
  love: 'Yêu thích',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  angry: 'Phẫn nộ',
}

export const LikeListModal = ({ postId, imageIndex, totalLikes, onClose }: LikeListModalProps) => {
  const [likes, setLikes] = useState<LikeUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'>('all')

  useEffect(() => {
    const loadLikes = async () => {
      try {
        setLoading(true)
        const response = await postService.getLikeList(postId, imageIndex)
        setLikes(response as LikeUser[])
      } catch (error) {
        console.error('Error loading likes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLikes()
  }, [postId, imageIndex])

  // Group likes by reaction type
  const likesByType = likes.reduce((acc, like) => {
    if (!acc[like.type]) {
      acc[like.type] = []
    }
    acc[like.type].push(like)
    return acc
  }, {} as Record<string, LikeUser[]>)

  // Get filtered likes based on active tab
  const filteredLikes = activeTab === 'all' ? likes : likes.filter(like => like.type === activeTab)

  // Get reaction counts
  const reactionCounts = Object.keys(likesByType).map(type => ({
    type: type as keyof typeof reactionIcons,
    count: likesByType[type].length,
  }))

  const getInitials = (name: string) => {
    const words = name.trim().split(' ')
    if (words.length === 0) return '?'
    const lastName = words[words.length - 1]
    return lastName.charAt(0).toUpperCase()
  }

  return (
    <div 
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Tất cả {totalLikes}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-orange-100 text-orange-600'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            Tất cả {totalLikes}
          </button>
          {reactionCounts.map(({ type, count }) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeTab === type
                  ? 'bg-orange-100 text-orange-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <span className="text-base">{reactionIcons[type]}</span>
              <span>{count}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredLikes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <p>Chưa có ai {activeTab !== 'all' && reactionLabels[activeTab]}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLikes.map((like) => (
                <div key={like.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className="relative">
                    {like.avatar ? (
                      <img
                        src={like.avatar}
                        alt={like.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {getInitials(like.name)}
                        </span>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <span className="text-sm">{reactionIcons[like.type]}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{like.name}</p>
                    <p className="text-sm text-gray-500 truncate">@{like.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
