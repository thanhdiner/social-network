import { useState, useRef, useEffect } from 'react'
import { Heart, Laugh, Frown, Angry, PartyPopper, ThumbsUp } from 'lucide-react'

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'

interface Reaction {
  type: ReactionType
  icon: React.ReactNode
  color: string
  label: string
}

const reactions: Reaction[] = [
  {
    type: 'like',
    icon: <ThumbsUp className="w-6 h-6 fill-current" />,
    color: '#1877f2',
    label: 'Thích',
  },
  {
    type: 'love',
    icon: <Heart className="w-6 h-6 fill-current" />,
    color: '#ef4444',
    label: 'Yêu thích',
  },
  {
    type: 'haha',
    icon: <Laugh className="w-6 h-6" />,
    color: '#fbbf24',
    label: 'Haha',
  },
  {
    type: 'wow',
    icon: <PartyPopper className="w-6 h-6" />,
    color: '#fbbf24',
    label: 'Wow',
  },
  {
    type: 'sad',
    icon: <Frown className="w-6 h-6" />,
    color: '#fbbf24',
    label: 'Buồn',
  },
  {
    type: 'angry',
    icon: <Angry className="w-6 h-6" />,
    color: '#f97316',
    label: 'Phẫn nộ',
  },
]

interface ReactionPickerProps {
  onReact: (type: ReactionType) => void
  currentReaction?: string | null
}

export const ReactionPicker = ({ onReact, currentReaction }: ReactionPickerProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true)
    }, 500)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false)
      setHoveredReaction(null)
    }, 300)
  }

  const handleReactionClick = (type: ReactionType) => {
    onReact(type)
    setIsVisible(false)
    setHoveredReaction(null)
  }

  const handleQuickLike = () => {
    if (currentReaction) {
      // Nếu đã có reaction (bất kỳ loại nào), click để gỡ reaction đó
      onReact(currentReaction as ReactionType)
    } else {
      // Nếu chưa có reaction, click để thêm like
      onReact('like')
    }
  }

  const currentReactionData = reactions.find(r => r.type === currentReaction)

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Reaction Picker Popup */}
      {isVisible && (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-lg border px-2 py-2 flex gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
          }}
        >
          {reactions.map((reaction) => (
            <button
              key={reaction.type}
              onClick={() => handleReactionClick(reaction.type)}
              onMouseEnter={() => setHoveredReaction(reaction.type)}
              onMouseLeave={() => setHoveredReaction(null)}
              className={`cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-all duration-200 ${
                hoveredReaction === reaction.type ? 'scale-125 -translate-y-1' : ''
              }`}
              style={{ color: reaction.color }}
              title={reaction.label}
            >
              {reaction.icon}
            </button>
          ))}
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={handleQuickLike}
        className={`cursor-pointer w-full flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 transition ${
          currentReaction ? '' : 'text-gray-600'
        }`}
        style={currentReaction ? { color: currentReactionData?.color } : {}}
      >
        {currentReaction ? (
          currentReactionData?.icon
        ) : (
          <ThumbsUp className="w-5 h-5" />
        )}
        <span className="font-medium">
          {currentReaction ? currentReactionData?.label : 'Thích'}
        </span>
      </button>
    </div>
  )
}
