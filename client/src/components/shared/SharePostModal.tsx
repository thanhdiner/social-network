import { useState } from 'react'
import { X, Globe } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Post } from '@/services/postService'

interface SharePostModalProps {
  post: Post
  open: boolean
  onClose: () => void
  onShared: () => void
  currentUserName: string
  currentUserAvatar?: string
}

export const SharePostModal = ({
  post,
  open,
  onClose,
  onShared,
  currentUserName,
  currentUserAvatar,
}: SharePostModalProps) => {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const postService = (await import('@/services/postService')).default
      await postService.sharePost(post.id, content.trim() || undefined)
      onShared()
      onClose()
      setContent('')
    } catch (error: unknown) {
      console.error('Failed to share post:', error)
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? ((error.response as Record<string, unknown>)?.data as Record<string, unknown>)?.message as string
        : 'Failed to share post. Please try again.'
      alert(errorMessage || 'Failed to share post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Share Post</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* User info and input */}
            <div className="flex gap-3">
              <img
                src={currentUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=fb923c&color=fff`}
                alt={currentUserName}
                className="w-12 h-12 rounded-full object-cover shrink-0"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{currentUserName}</div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </div>
              </div>
            </div>

            {/* Caption input */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Say something about this..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              rows={3}
            />

            {/* Original post preview */}
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={post.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.name)}&background=fb923c&color=fff`}
                  alt={post.user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-sm text-gray-800">{post.user.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {post.content && (
                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
              )}

              {post.imageUrl && (() => {
                const imageUrls = post.imageUrl.split(',').filter(url => url.trim())
                if (imageUrls.length === 0) return null
                
                return (
                  <div className={`${imageUrls.length === 1 ? '' : 'grid grid-cols-2 gap-1'}`}>
                    {imageUrls.slice(0, 4).map((url, index) => (
                      <div key={index} className="rounded-lg overflow-hidden">
                        <img
                          src={url.trim()}
                          alt=""
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )
              })()}

              {post.videoUrl && (
                <div className="rounded-lg overflow-hidden bg-black">
                  <video 
                    src={post.videoUrl} 
                    controls 
                    className="w-full max-h-64 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Sharing...' : 'Share Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
