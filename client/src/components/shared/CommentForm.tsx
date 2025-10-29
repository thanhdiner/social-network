import { useState, useRef } from 'react'
import { Send, Image, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { commentService } from '@/services/commentService'
import uploadService from '@/services/uploadService'
import { Avatar } from './Avatar'

interface CommentFormProps {
  postId: string
  onCommentAdded?: () => void
}

export const CommentForm = ({ postId, onCommentAdded }: CommentFormProps) => {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const url = await uploadService.uploadImage(file)
      setImageUrl(url)
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    setImageUrl(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if ((!content.trim() && !imageUrl) || isSubmitting) return

    setIsSubmitting(true)
    try {
      await commentService.createComment(postId, {
        content: content.trim(),
        imageUrl: imageUrl || undefined,
      })
      setContent('')
      setImageUrl(null)
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
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <Avatar
        src={user?.avatar}
        name={user?.name || 'User'}
        size="sm"
        className="shrink-0 mt-1"
      />
      <div className="flex-1">
        {imageUrl && (
          <div className="mb-2 relative inline-block">
            <img
              src={imageUrl}
              alt="Comment attachment"
              className="max-w-xs max-h-40 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center bg-gray-100 rounded-full px-4 py-2">
          <input
            id={`comment-input-${postId}`}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent focus:outline-none"
            disabled={isSubmitting}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isSubmitting}
            className="text-gray-600 hover:text-orange-600 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={(!content.trim() && !imageUrl) || isSubmitting}
            className="text-orange-600 hover:text-orange-700 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </form>
  )
}
