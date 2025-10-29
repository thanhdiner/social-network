import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, MessageCircle, Send, Loader2, Link2, Check, Download, Share2, Image } from 'lucide-react'
import { commentService, type CreateCommentData } from '@/services/commentService'
import postService, { type Post } from '@/services/postService'
import type { Comment } from '@/types'
import { ReactionPicker, type ReactionType } from './ReactionPicker'
import { SharePostModal } from './SharePostModal'
import { LikeListModal } from './LikeListModal'
import uploadService from '@/services/uploadService'
import { Avatar } from './Avatar'

// Like state for each image
interface ImageLikeState {
  isLiked: boolean
  reactionType: string | null
  count: number
}

interface ImageGalleryModalProps {
  images: string[]
  initialIndex?: number
  postId: string
  post: Post
  onClose: () => void
  onShare?: (post: Post) => void
}

export const ImageGalleryModal = ({ images, initialIndex = 0, postId, post, onClose, onShare }: ImageGalleryModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentImageUrl, setCommentImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharingPost, setSharingPost] = useState(false)
  const [showLikeList, setShowLikeList] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Track like state for each image separately
  const [imageLikes, setImageLikes] = useState<Record<number, ImageLikeState>>({})

  const currentImageUrl = images[currentIndex]
  const photoUrl = `${window.location.origin}/post/${postId}/photo/${currentIndex + 1}`

  // Get current image like state
  const currentImageLike = imageLikes[currentIndex] || {
    isLiked: false,
    reactionType: null,
    count: 0
  }

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  // Update URL when image changes - always update to show shareable link
  useEffect(() => {
    const newUrl = `/post/${postId}/photo/${currentIndex + 1}`
    window.history.replaceState(null, '', newUrl)
  }, [currentIndex, postId])

  // Load likes for all images once on mount
  useEffect(() => {
    const loadImageLikes = async () => {
      try {
        const likes = await postService.getImageLikes(postId, images.length)
        setImageLikes(likes)
      } catch (error) {
        console.error('Error loading image likes:', error)
      }
    }

    loadImageLikes()
  }, [postId, images.length])

  // Load comments for current image
  useEffect(() => {
    const loadComments = async () => {
      setLoading(true)
      try {
        const response = await commentService.getCommentsByPostId(postId, 1, 50, currentIndex)
        setComments(response.comments)
      } catch (error) {
        console.error('Error loading comments:', error)
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [currentIndex, postId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Không xử lý keyboard navigation khi đang focus vào input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Chỉ xử lý ESC khi đang ở input
        if (e.key === 'Escape') {
          target.blur() // Blur input trước
          onClose()
        }
        return
      }

      // Xử lý keyboard navigation khi KHÔNG focus vào input
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handlePrevious, handleNext])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!commentText.trim() && !commentImageUrl) || submitting) return

    setSubmitting(true)
    try {
      const data: CreateCommentData = {
        content: commentText.trim(),
        imageIndex: currentIndex,
        imageUrl: commentImageUrl || undefined
      }
      const newComment = await commentService.createComment(postId, data)
      setComments(prev => [newComment, ...prev])
      setCommentText('')
      setCommentImageUrl(null)
    } catch (error) {
      console.error('Error creating comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setUploadingImage(true)
    try {
      const uploadedUrl = await uploadService.uploadImage(file)
      setCommentImageUrl(uploadedUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setCommentImageUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleCopyImageUrl = async () => {
    try {
      await navigator.clipboard.writeText(photoUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying image URL:', error)
      alert('Failed to copy image URL')
    }
  }

  const handleDownloadImage = () => {
    const link = document.createElement('a')
    link.href = currentImageUrl
    link.download = `image-${currentIndex + 1}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShareClick = () => {
    setSharingPost(true)
  }

  const handleLikeClick = async (type: ReactionType = 'like') => {
    try {
      // Optimistic update
      setImageLikes(prev => {
        const current = prev[currentIndex] || { isLiked: false, reactionType: null, count: 0 }
        const isSameReaction = current.reactionType === type

        return {
          ...prev,
          [currentIndex]: {
            isLiked: !isSameReaction,
            reactionType: isSameReaction ? null : type,
            count: isSameReaction ? current.count - 1 : current.isLiked ? current.count : current.count + 1
          }
        }
      })

      // Call API with imageIndex
      await postService.toggleLike(postId, type, currentIndex)
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // TODO: Revert optimistic update on error
    }
  }

  return (
    <div className="fixed inset-0 z-9999 bg-black/95 flex items-center justify-center">
      {/* Close button - Darker background for visibility */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-gray-800/80 hover:bg-gray-700/90 rounded-full transition cursor-pointer z-10 shadow-lg"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Action buttons - Copy & Download - Hidden on mobile */}
      <div className="hidden md:flex absolute top-4 left-4 gap-2 z-10">
        <button
          onClick={handleCopyImageUrl}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/90 rounded-full transition cursor-pointer shadow-lg"
          title="Copy image URL"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-white text-sm">Copied!</span>
            </>
          ) : (
            <>
              <Link2 className="w-5 h-5 text-white" />
              <span className="text-white text-sm">Copy Link</span>
            </>
          )}
        </button>
        <button
          onClick={handleDownloadImage}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/90 rounded-full transition cursor-pointer shadow-lg"
          title="Download image"
        >
          <Download className="w-5 h-5 text-white" />
          <span className="text-white text-sm">Download</span>
        </button>
      </div>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-gray-800/80 hover:bg-gray-700/90 rounded-full transition cursor-pointer z-10 shadow-lg"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-gray-800/80 hover:bg-gray-700/90 rounded-full transition cursor-pointer z-10 shadow-lg"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="w-full h-full flex flex-col md:flex-row">
        {/* Image Section - Full width on mobile, 60% on desktop */}
        <div className="flex-1 md:w-[60%] flex items-center justify-center p-4 md:p-8">
          <div className="relative max-w-full max-h-full">
            <img
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="max-w-full max-h-[50vh] md:max-h-[90vh] object-contain"
            />
            {/* Image counter */}
            <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 md:py-2 bg-black/60 rounded-full text-white text-xs md:text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </div>

        {/* Comments Section - 40% on desktop, bottom sheet on mobile */}
        <div className="w-full md:w-[450px] bg-white flex flex-col max-h-[50vh] md:max-h-full">
          {/* Header - Post author info */}
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <Avatar src={post.user?.avatar} name={post.user?.name || 'User'} size="md" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{post.user?.name || 'Unknown User'}</h3>
              <p className="text-xs text-gray-500">
                {new Date(post.createdAt).toLocaleDateString()} • Image {currentIndex + 1} of {images.length}
              </p>
            </div>
          </div>

          {/* Reaction Summary */}
          {currentImageLike.count > 0 && (
            <div className="px-4 py-2 border-b">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex -space-x-1">
                  {currentImageLike.reactionType && (
                    <span className="text-lg">
                      {currentImageLike.reactionType === 'like'
                        ? '👍'
                        : currentImageLike.reactionType === 'love'
                        ? '❤️'
                        : currentImageLike.reactionType === 'haha'
                        ? '😂'
                        : currentImageLike.reactionType === 'wow'
                        ? '😮'
                        : currentImageLike.reactionType === 'sad'
                        ? '😢'
                        : '😠'}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowLikeList(true)} className="hover:underline cursor-pointer">
                  {currentImageLike.count} {currentImageLike.count === 1 ? 'người' : 'người'}
                </button>
                {comments.length > 0 && (
                  <span className="ml-auto">
                    {comments.length} {comments.length === 1 ? 'bình luận' : 'bình luận'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons - React, Comment, Share */}
          <div className="px-2 md:px-4 py-2 border-b">
            <div className="flex items-center justify-around">
              {/* React Button */}
              <ReactionPicker onReact={handleLikeClick} currentReaction={currentImageLike.reactionType} />

              {/* Comment Button - Focus on input when clicked */}
              <button
                className="flex-1 flex items-center justify-center gap-1 md:gap-2 py-2 rounded-lg hover:bg-gray-100 transition cursor-pointer text-gray-600"
                onClick={() => {
                  const input = document.getElementById('comment-input') as HTMLInputElement
                  if (input) {
                    input.focus()
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
              >
                <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm font-medium">Comment</span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShareClick}
                className="flex-1 flex items-center justify-center gap-1 md:gap-2 py-2 rounded-lg hover:bg-gray-100 transition cursor-pointer text-gray-600"
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm font-medium">Share</span>
              </button>
            </div>
          </div>

          {/* Comments List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-2 md:gap-3">
                  <Avatar src={comment.user?.avatar} name={comment.user?.name || 'User'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-100 rounded-2xl px-3 md:px-4 py-2">
                      <p className="font-semibold text-xs md:text-sm text-gray-800">{comment.user?.name || 'Unknown User'}</p>
                      <p className="text-sm md:text-base text-gray-700 wrap-break-word">{comment.content}</p>

                      {/* Display comment image if exists */}
                      {comment.imageUrl && (
                        <img
                          src={comment.imageUrl}
                          alt="Comment attachment"
                          className="mt-2 max-w-xs max-h-60 rounded-lg cursor-pointer"
                          onClick={() => window.open(comment.imageUrl, '_blank')}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 mt-1 px-3 md:px-4">
                      <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                      {/* Add delete button if it's user's comment */}
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm md:text-base text-gray-500">No comments yet</p>
                <p className="text-xs md:text-sm text-gray-400">Be the first to comment!</p>
              </div>
            )}
          </div>

          {/* Comment Input - Sticky at bottom */}
          <form onSubmit={handleSubmitComment} className="p-3 md:p-4 border-t bg-white">
            {/* Image Preview */}
            {commentImageUrl && (
              <div className="mb-2 relative inline-block">
                <img
                  src={commentImageUrl}
                  alt="Preview"
                  className="max-h-32 rounded-lg border cursor-pointer"
                  onClick={() => window.open(commentImageUrl, '_blank')}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                id="comment-input"
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-full border px-3 md:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                disabled={submitting}
              />

              {/* Image Upload Button */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || submitting}
                className="p-2 text-gray-600 hover:text-orange-500 hover:bg-orange-50 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
              </button>

              <button
                type="submit"
                disabled={(!commentText.trim() && !commentImageUrl) || submitting}
                className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>

      {sharingPost && (
        <SharePostModal
          post={post}
          open={sharingPost}
          onClose={() => setSharingPost(false)}
          onShared={() => {
            setSharingPost(false)
          }}
          currentUserName={post.user?.name || 'User'}
          currentUserAvatar={post.user?.avatar || undefined}
        />
      )}

      {showLikeList && (
        <LikeListModal
          postId={postId}
          imageIndex={currentIndex}
          totalLikes={currentImageLike.count}
          onClose={() => setShowLikeList(false)}
        />
      )}
    </div>
  )
}
