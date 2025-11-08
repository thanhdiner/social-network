import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, MessageCircle, Send, Loader2, Link2, Check, Download, Share2, Image, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { commentService, type CreateCommentData } from '@/services/commentService'
import postService, { type Post } from '@/services/postService'
import type { Comment } from '@/types'
import { ReactionPicker, type ReactionType } from './ReactionPicker'
import { SharePostModal } from './SharePostModal'
import { LikeListModal } from './LikeListModal'
import uploadService from '@/services/uploadService'
import { Avatar } from './Avatar'
import { useAuth } from '@/contexts/AuthContext'

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
}

export const ImageGalleryModal = ({ images, initialIndex = 0, postId, post, onClose }: ImageGalleryModalProps) => {
  const { user: currentUser } = useAuth()
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

  // Reply states
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyingToUser, setReplyingToUser] = useState<{ id: string; name: string } | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyImage, setReplyImage] = useState<File | null>(null)
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null)
  const [isUploadingReplyImage, setIsUploadingReplyImage] = useState(false)
  const [commentLikes, setCommentLikes] = useState<Record<string, { liked: boolean; type: ReactionType | null; count: number }>>({})
  const replyInputRef = useRef<HTMLInputElement>(null)
  const replyImageInputRef = useRef<HTMLInputElement>(null)

  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})

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

  // Load likes for all images in the post (so we can display per-image like counts/state)
  useEffect(() => {
    const loadImageLikes = async () => {
      try {
        const data = await postService.getImageLikes(postId, images.length)
        // API returns a map keyed by image index
        setImageLikes(data)
      } catch (err) {
        console.error('Failed to load image likes:', err)
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

        // Load like information for all comments and replies
        const allCommentIds = response.comments.flatMap(c => [c.id, ...(c.replies?.map(r => r.id) || [])])
        const likesData: Record<string, { liked: boolean; type: ReactionType | null; count: number }> = {}

        await Promise.all(
          allCommentIds.map(async commentId => {
            try {
              const likeInfo = await commentService.getCommentLikes(commentId)
              likesData[commentId] = {
                liked: !!likeInfo.userLike,
                type: likeInfo.userLike,
                count: likeInfo.likes.reduce((sum, l) => sum + l.count, 0)
              }
            } catch (error) {
              console.error(`Failed to load likes for comment ${commentId}:`, error)
            }
          })
        )

        setCommentLikes(likesData)
      } catch (error) {
        console.error('Error loading comments:', error)
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [currentIndex, postId])

  // Auto focus on reply input when replyingTo changes
  useEffect(() => {
    if (replyingTo && replyInputRef.current) {
      setTimeout(() => {
        replyInputRef.current?.focus()
      }, 100)
    }
  }, [replyingTo])

  // keyboard navigation useEffect will be registered after handlers are defined

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

      // Initialize like state for new comment
      setCommentLikes(prev => ({
        ...prev,
        [newComment.id]: {
          liked: false,
          type: null,
          count: 0
        }
      }))

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

  const handleDeleteComment = async (commentId: string, isReply = false) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await commentService.deleteComment(commentId)

      if (isReply) {
        // XÃ³a reply khá»i comment cha
        setComments(prev =>
          prev.map(c => ({
            ...c,
            replies: c.replies?.filter(r => r.id !== commentId)
          }))
        )
      } else {
        // XÃ³a comment
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
  alert('Unable to delete comment. Please try again.')
    }
  }

  const handleLikeComment = async (commentId: string, type: ReactionType = 'like') => {
    try {
      const result = await commentService.toggleLike(commentId, type)

      setCommentLikes(prev => ({
        ...prev,
        [commentId]: {
          liked: result.liked,
          type: result.type,
          count: result.liked ? (prev[commentId]?.count || 0) + 1 : Math.max(0, (prev[commentId]?.count || 0) - 1)
        }
      }))
    } catch (error) {
      console.error('Failed to like comment:', error)
    }
  }

  const handleReplyImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReplyImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setReplyImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveReplyImage = () => {
    setReplyImage(null)
    setReplyImagePreview(null)
    if (replyImageInputRef.current) {
      replyImageInputRef.current.value = ''
    }
  }

  const handleReplySubmit = async (parentId: string) => {
    if (!replyContent.trim() && !replyImage) return

    try {
      let imageUrl: string | undefined

      if (replyImage) {
        setIsUploadingReplyImage(true)
        imageUrl = await uploadService.uploadImage(replyImage)
      }

      const content = replyingToUser ? `@${replyingToUser.name} ${replyContent.trim()}` : replyContent.trim()

      const newReply = await commentService.createComment(postId, {
        content: content || '',
        parentId,
        imageUrl,
        imageIndex: currentIndex
      })

      setComments(prev =>
        prev.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newReply]
            }
          }
          return c
        })
      )

      // Initialize like state for new reply
      setCommentLikes(prev => ({
        ...prev,
        [newReply.id]: {
          liked: false,
          type: null,
          count: 0
        }
      }))

      setReplyingTo(null)
      setReplyingToUser(null)
      setReplyContent('')
      setReplyImage(null)
      setReplyImagePreview(null)
    } catch (error) {
      console.error('Failed to create reply:', error)
    } finally {
      setIsUploadingReplyImage(false)
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

  const handlePrevious = useCallback(() => {
    setCurrentIndex(i => (i - 1 + images.length) % images.length)
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard navigation when focus is on input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Only handle Escape when focus inside input
        if (e.key === 'Escape') {
          target.blur()
          onClose()
        }
        return
      }

      // Handle keyboard navigation when NOT focusing input
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
                {new Date(post.createdAt).toLocaleDateString()} â€¢ Image {currentIndex + 1} of {images.length}
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
                        ? 'ðŸ‘'
                        : currentImageLike.reactionType === 'love'
                        ? 'â¤ï¸'
                        : currentImageLike.reactionType === 'haha'
                        ? 'ðŸ˜‚'
                        : currentImageLike.reactionType === 'wow'
                        ? 'ðŸ˜®'
                        : currentImageLike.reactionType === 'sad'
                        ? 'ðŸ˜¢'
                        : 'ðŸ˜ '}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowLikeList(true)} className="hover:underline cursor-pointer">
                  {currentImageLike.count} {currentImageLike.count === 1 ? 'person' : 'people'}
                </button>
                {comments.length > 0 && (
                  <span className="ml-auto">
                    {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons - React, Comment, Share */}
          <div className="px-2 md:px-4 py-2 border-b">
            <div className="flex items-center justify-around gap-2">
              {/* React Button */}
              <div className="flex-1 flex justify-center">
                <ReactionPicker onReact={handleLikeClick} currentReaction={currentImageLike.reactionType} />
              </div>

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
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 pr-4 pb-2">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex gap-2 md:gap-3 group">
                    <Link to={`/profile/${comment.user?.username}`} className="cursor-pointer">
                      <Avatar src={comment.user?.avatar} name={comment.user?.name || 'User'} size="sm" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-100 rounded-2xl px-3 md:px-4 py-2">
                        <Link
                          to={`/profile/${comment.user?.username}`}
                          className="font-semibold text-xs md:text-sm text-gray-800 hover:text-orange-600 transition cursor-pointer"
                        >
                          {comment.user?.name || 'Unknown User'}
                        </Link>
                        <p className="text-sm md:text-base text-gray-700 wrap-break-word">{comment.content}</p>

                        {comment.imageUrl && (
                          <img
                            src={comment.imageUrl}
                            alt="Comment attachment"
                            className="mt-2 max-w-xs max-h-60 rounded-lg cursor-pointer"
                            onClick={() => window.open(comment.imageUrl, '_blank')}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 px-3 text-xs text-gray-500">
                        <span>{new Date(comment.createdAt).toLocaleString()}</span>

                        {/* Like button with ReactionPicker */}
                        <ReactionPicker
                          onReact={type => handleLikeComment(comment.id, type)}
                          currentReaction={commentLikes[comment.id]?.type || null}
                        />

                        {/* Reply button */}
                        <button
                          onClick={() => {
                            if (replyingTo === comment.id) {
                              setReplyingTo(null)
                              setReplyingToUser(null)
                              setReplyContent('')
                              handleRemoveReplyImage()
                            } else {
                              setReplyingTo(comment.id)
                              setReplyingToUser({ id: comment.userId, name: comment.user?.name || 'User' })
                            }
                          }}
                          className="hover:underline font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Reply
                        </button>

                        {/* Delete button - only show if current user is the author */}
                        {currentUser?.id === comment.userId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="hover:underline font-semibold cursor-pointer flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}

                        {commentLikes[comment.id]?.count > 0 && (
                          <span className="text-gray-600">{commentLikes[comment.id]?.count} {commentLikes[comment.id]?.count === 1 ? 'like' : 'likes'}</span>
                        )}
                      </div>

                      {/* Reply form */}
                      {replyingTo === comment.id && (
                        <div className="mt-2 ml-3">
                          <div className="flex items-center gap-2 mb-2 px-3">
                            <span className="text-xs text-gray-500">Replying</span>
                            <span className="text-xs font-semibold text-orange-500">{replyingToUser?.name}</span>
                            <button
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyingToUser(null)
                                setReplyContent('')
                                handleRemoveReplyImage()
                              }}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <Avatar src={comment.user?.avatar} name={comment.user?.name || 'User'} size="sm" />
                            <div className="flex-1">
                              {replyImagePreview && (
                                <div className="relative mb-2 inline-block">
                                  <img src={replyImagePreview} alt="Preview" className="max-h-40 rounded-lg object-cover" />
                                  <button
                                    onClick={handleRemoveReplyImage}
                                    className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  ref={replyingTo === comment.id ? replyInputRef : null}
                                  type="text"
                                  value={replyContent}
                                  onChange={e => setReplyContent(e.target.value)}
                                  placeholder={`Reply to ${replyingToUser?.name}...`}
                                  className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  onKeyPress={e => {
                                    if (e.key === 'Enter' && (replyContent.trim() || replyImage)) {
                                      handleReplySubmit(comment.id)
                                    }
                                  }}
                                />
                                <input
                                  ref={replyImageInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleReplyImageSelect}
                                  className="hidden"
                                />
                                <button
                                  onClick={() => replyImageInputRef.current?.click()}
                                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition cursor-pointer"
                                  title="Add image"
                                >
                                  <Image className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleReplySubmit(comment.id)}
                                  disabled={(!replyContent.trim() && !replyImage) || isUploadingReplyImage}
                                  className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                  {isUploadingReplyImage ? 'Sending...' : 'Send'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Nested replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-2 ml-8 space-y-2">
                          {(() => {
                            const total = comment.replies?.length || 0
                            const isExpanded = !!expandedReplies[comment.id]
                            const visible = isExpanded ? comment.replies : comment.replies?.slice(Math.max(0, total - 2)) || []

                            return (
                              <>
                                {total > visible.length && (
                                  <button
                                    onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: true }))}
                                    className="text-sm text-gray-500 hover:underline ml-8"
                                  >
                                    View previous replies ({total - visible.length})
                                  </button>
                                )}

                                {visible.map(reply => (
                            <div key={reply.id} className="flex gap-2 group">
                              <Link to={`/profile/${reply.user?.username}`} className="cursor-pointer">
                                <Avatar src={reply.user?.avatar} name={reply.user?.name || 'User'} size="sm" />
                              </Link>
                              <div className="flex-1">
                                <div className="bg-gray-100 rounded-2xl px-3 py-2">
                                  <Link
                                    to={`/profile/${reply.user?.username}`}
                                    className="font-semibold text-xs md:text-sm text-gray-800 hover:text-orange-600 transition cursor-pointer"
                                  >
                                    {reply.user?.name || 'Unknown User'}
                                  </Link>
                                  <p className="text-sm text-gray-800 wrap-break-word">
                                    {reply.content.startsWith('@')
                                      ? (() => {
                                          // Parse mention without regex: prefer matching known user names (supports multi-word names)
                                          const content = reply.content || ''
                                          if (!content.startsWith('@')) return content

                                          const candidates = [comment.user?.name, ...(comment.replies?.map(r => r.user?.name) || [])]
                                            .filter(Boolean) as string[]

                                          candidates.sort((a, b) => b.length - a.length)

                                          let taggedName: string | null = null
                                          let remainingContent = ''
                                          let taggedUser: typeof comment.user | undefined = undefined

                                          for (const name of candidates) {
                                            if (content.startsWith(`@${name}`)) {
                                              taggedName = name
                                              taggedUser = name === comment.user?.name ? comment.user : comment.replies?.find(r => r.user?.name === name)?.user
                                              remainingContent = content.slice((`@${name}`).length).trimStart()
                                              break
                                            }
                                          }

                                          if (!taggedName) {
                                            const firstSpace = content.indexOf(' ')
                                            if (firstSpace === -1) {
                                              taggedName = content.slice(1)
                                              remainingContent = ''
                                            } else {
                                              taggedName = content.slice(1, firstSpace)
                                              remainingContent = content.slice(firstSpace + 1)
                                            }
                                          }

                                          return (
                                            <>
                                              {taggedUser ? (
                                                <Link
                                                  to={`/profile/${taggedUser.username}`}
                                                  className="font-semibold text-orange-500 hover:underline cursor-pointer mr-1"
                                                >
                                                  @{taggedName}
                                                </Link>
                                              ) : (
                                                <span className="font-semibold text-orange-500 mr-1">@{taggedName}</span>
                                              )}
                                              <span className="text-sm text-gray-800">{remainingContent}</span>
                                            </>
                                          )
                                        })()
                                      : (
                                        reply.content
                                      )}
                                  </p>
                                  {reply.imageUrl && (
                                    <img
                                      src={reply.imageUrl}
                                      alt="Reply attachment"
                                      className="mt-2 max-w-xs max-h-60 rounded-lg cursor-pointer"
                                      onClick={() => window.open(reply.imageUrl, '_blank')}
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 px-3 text-xs text-gray-500">
                                  <span>{new Date(reply.createdAt).toLocaleString()}</span>

                                  <ReactionPicker
                                    onReact={type => handleLikeComment(reply.id, type)}
                                    currentReaction={commentLikes[reply.id]?.type || null}
                                  />

                                  <button
                                    onClick={() => {
                                      if (replyingTo === `reply-${reply.id}`) {
                                        setReplyingTo(null)
                                        setReplyingToUser(null)
                                        setReplyContent('')
                                        handleRemoveReplyImage()
                                      } else {
                                        setReplyingTo(`reply-${reply.id}`)
                                        setReplyingToUser({ id: reply.userId, name: reply.user?.name || 'User' })
                                      }
                                    }}
                                    className="hover:underline font-semibold cursor-pointer flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    Reply
                                  </button>

                                  {/* Delete button for reply - only show if current user is the author */}
                                  {currentUser?.id === reply.userId && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id, true)}
                                      className="hover:underline font-semibold cursor-pointer flex items-center gap-1 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </button>
                                  )}

                                  {commentLikes[reply.id]?.count > 0 && (
                                    <span className="text-gray-600">{commentLikes[reply.id]?.count} {commentLikes[reply.id]?.count === 1 ? 'like' : 'likes'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            ))}
                                </>
                              )
                            })()}

                          {/* Reply to reply form */}
                          {replyingTo?.startsWith('reply-') && (
                            <div className="mt-2">
                              <div className="flex items-center gap-2 mb-2 px-3">
                                <span className="text-xs text-gray-500">Replying</span>
                                <span className="text-xs font-semibold text-orange-500">{replyingToUser?.name}</span>
                                <button
                                  onClick={() => {
                                    setReplyingTo(null)
                                    setReplyingToUser(null)
                                    setReplyContent('')
                                    handleRemoveReplyImage()
                                  }}
                                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <Avatar src={comment.user?.avatar} name={comment.user?.name || 'User'} size="sm" />
                                <div className="flex-1">
                                  {replyImagePreview && (
                                    <div className="relative mb-2 inline-block">
                                      <img src={replyImagePreview} alt="Preview" className="max-h-40 rounded-lg object-cover" />
                                      <button
                                        onClick={handleRemoveReplyImage}
                                        className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 cursor-pointer"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <input
                                      ref={replyingTo?.startsWith('reply-') ? replyInputRef : null}
                                      type="text"
                                      value={replyContent}
                                      onChange={e => setReplyContent(e.target.value)}
                                      placeholder={`Reply to ${replyingToUser?.name}...`}
                                      className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                      onKeyPress={e => {
                                        if (e.key === 'Enter' && (replyContent.trim() || replyImage)) {
                                          handleReplySubmit(comment.id)
                                        }
                                      }}
                                    />
                                    <input
                                      ref={replyImageInputRef}
                                      type="file"
                                      accept="image/*"
                                      onChange={handleReplyImageSelect}
                                      className="hidden"
                                    />
                                    <button
                                      onClick={() => replyImageInputRef.current?.click()}
                                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition cursor-pointer"
                                      title="Add image"
                                    >
                                      <Image className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleReplySubmit(comment.id)}
                                      disabled={(!replyContent.trim() && !replyImage) || isUploadingReplyImage}
                                      className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                      {isUploadingReplyImage ? 'Sending...' : 'Send'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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

