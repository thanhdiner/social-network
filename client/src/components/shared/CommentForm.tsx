import { useState } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { commentService } from '@/services/commentService'

interface CommentFormProps {
  postId: string
  onCommentAdded?: () => void
}

export const CommentForm = ({ postId, onCommentAdded }: CommentFormProps) => {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await commentService.createComment(postId, { content: content.trim() })
      setContent('')
      if (onCommentAdded) {
        onCommentAdded()
      }
    } catch (error) {
      console.error('Failed to create comment:', error)
      alert('Failed to post comment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <img
        src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=fb923c&color=fff`}
        alt={user?.name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
      <div className="flex-1 relative">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="w-full px-4 py-2 pr-10 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-600 hover:text-orange-700 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  )
}
