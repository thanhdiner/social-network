import { useState, useRef } from 'react'
import { Send, Image, X, Sparkles, Wand2, Loader2 } from 'lucide-react'
import geminiService from '@/services/geminiService'
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
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const adjustTextareaHeight = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const maxHeight = 150 // Maximum height before scrollbar appears
    if (ta.scrollHeight > maxHeight) {
      ta.style.height = maxHeight + 'px'
      ta.style.overflowY = 'auto'
    } else {
      ta.style.height = ta.scrollHeight + 'px'
      ta.style.overflowY = 'hidden'
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
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

  const handleAIComplete = async () => {
    if (!content.trim()) return
    setIsAiProcessing(true)
    try {
      const completed = await geminiService.completePost(content)
      setContent(completed)
      requestAnimationFrame(adjustTextareaHeight)
    } catch (err) {
      console.error('Failed to complete comment with AI:', err)
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      const msg = e?.response?.data?.message || e?.message || 'Unknown error'
      alert(`Failed to complete with AI: ${msg}`)
    } finally {
      setIsAiProcessing(false)
    }
  }

  const handleAIImprove = async () => {
    if (!content.trim()) return
    setIsAiProcessing(true)
    try {
      const improved = await geminiService.improvePost(content)
      setContent(improved)
      requestAnimationFrame(adjustTextareaHeight)
    } catch (err) {
      console.error('Failed to improve comment with AI:', err)
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      const msg = e?.response?.data?.message || e?.message || 'Unknown error'
      alert(`Failed to improve with AI: ${msg}`)
    } finally {
      setIsAiProcessing(false)
    }
  }

  const isDisabled = isSubmitting || isAiProcessing || isUploading
  const hasContent = content.trim().length > 0 || imageUrl !== null

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3 items-start">
        <Avatar
          src={user?.avatar}
          name={user?.name || 'User'}
          size="sm"
          className="shrink-0 mt-1"
        />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Image Preview */}
          {imageUrl && (
            <div className="relative inline-block animate-in fade-in slide-in-from-bottom-2 duration-200">
              <img
                src={imageUrl}
                alt="Comment attachment"
                className="max-w-xs max-h-48 rounded-xl object-cover shadow-md border border-gray-200"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isDisabled}
                className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1.5 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all shadow-lg hover:scale-110"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          {/* Input Container */}
          <div 
            className={`relative bg-white rounded-2xl border-2 transition-all duration-200 ${
              isFocused 
                ? 'border-orange-400 shadow-lg shadow-orange-100' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Textarea */}
            <textarea
              id={`comment-input-${postId}`}
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                requestAnimationFrame(adjustTextareaHeight)
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Write a comment..."
              className="comment-textarea w-full bg-transparent focus:outline-none resize-none leading-6 text-sm px-4 pt-3 pb-2"
              style={{ minHeight: '44px', maxHeight: '150px' }}
              disabled={isDisabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  const form = (e.target as HTMLElement).closest('form') as HTMLFormElement | null
                  form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
                }
              }}
            />

            {/* Action Bar */}
            <div className="flex items-center justify-between px-3 pb-2 gap-2">
              <div className="flex items-center gap-1">
                {/* Image Upload Button */}
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
                  disabled={isDisabled}
                  className="group relative p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer transition-all"
                  title="Attach image"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Image className="w-5 h-5" />
                  )}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Image
                  </span>
                </button>

                {/* AI Complete Button */}
                <button
                  type="button"
                  onClick={handleAIComplete}
                  disabled={isDisabled || !content.trim()}
                  className="group relative p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer transition-all"
                  title="Complete with AI"
                >
                  <Sparkles className={`w-5 h-5 ${isAiProcessing ? 'animate-pulse' : ''}`} />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Complete
                  </span>
                </button>

                {/* AI Improve Button */}
                <button
                  type="button"
                  onClick={handleAIImprove}
                  disabled={isDisabled || !content.trim()}
                  className="group relative p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer transition-all"
                  title="Improve with AI"
                >
                  <Wand2 className={`w-5 h-5 ${isAiProcessing ? 'animate-pulse' : ''}`} />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Improve
                  </span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!hasContent || isDisabled}
                className={`group relative p-2 rounded-lg transition-all ${
                  hasContent && !isDisabled
                    ? 'text-white bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg cursor-pointer'
                    : 'text-gray-300 bg-gray-100 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {hasContent && !isDisabled && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Send
                  </span>
                )}
              </button>
            </div>

            {/* Loading Indicator */}
            {isAiProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <div className="flex items-center gap-2 text-orange-600 bg-white px-4 py-2 rounded-full shadow-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">AI Processing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Character Count (optional) */}
          {content.length > 0 && (
            <div className="text-right">
              <span className={`text-xs ${content.length > 500 ? 'text-orange-600' : 'text-gray-400'}`}>
                {content.length} characters
              </span>
            </div>
          )}
        </div>
      </div>
    </form>
  )
}