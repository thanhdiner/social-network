import { useEffect, useState, useRef, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Trash2, Pencil, X, Check, MessageCircle, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { commentService } from '@/services/commentService'
import type { Comment, ReactionType } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from './Avatar'
import { ReactionPicker } from './ReactionPicker'
import uploadService from '@/services/uploadService'
import geminiService from '@/services/geminiService'

interface CommentListProps {
  postId: string
  refresh?: number
  initialLimit?: number
}

export const CommentList = ({ postId, refresh, initialLimit = 3 }: CommentListProps) => {
  const { user: currentUser } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(initialLimit)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyingToUser, setReplyingToUser] = useState<{ id: string; name: string } | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyImage, setReplyImage] = useState<File | null>(null)
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null)
  const [isUploadingReplyImage, setIsUploadingReplyImage] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [commentLikes, setCommentLikes] = useState<Record<string, { liked: boolean; type: ReactionType | null; count: number }>>({})
  const menuRef = useRef<HTMLDivElement>(null)
  const replyInputRef = useRef<HTMLInputElement>(null)
  const replyImageInputRef = useRef<HTMLInputElement>(null)
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await commentService.getCommentsByPostId(postId, 1, limit)
      setComments(response.comments)
      setPage(1)
      setTotal(response.total)
      setHasMore(response.comments.length < response.total)

      // Load like information for comments and replies
      const allCommentIds = response.comments.flatMap(c => [c.id, ...(c.replies?.map(r => r.id) || [])])
  const likesData: Record<string, { liked: boolean; type: ReactionType | null; count: number }> = {}

      await Promise.all(
        allCommentIds.map(async (commentId) => {
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
      console.error('Failed to load comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [postId, limit])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Auto focus on reply input when replyingTo changes
  useEffect(() => {
    if (replyingTo && replyInputRef.current) {
      setTimeout(() => {
        replyInputRef.current?.focus()
      }, 100)
    }
  }, [replyingTo])

  const loadMoreComments = async () => {
    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const response = await commentService.getCommentsByPostId(postId, nextPage, limit)
      setComments(prev => [...prev, ...response.comments])
      setPage(nextPage)
      setHasMore(comments.length + response.comments.length < response.total)
      
      // Load like information for new comments and replies
      const allCommentIds = response.comments.flatMap(c => [c.id, ...(c.replies?.map(r => r.id) || [])])
      const likesData = { ...commentLikes }
      
      await Promise.all(
        allCommentIds.map(async (commentId) => {
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
      console.error('Failed to load more comments:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [postId, refresh, loadComments])

  const handleDelete = async (commentId: string, isReply = false) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await commentService.deleteComment(commentId)
      
      if (isReply) {
          // Remove reply from parent comment
        setComments(prev => prev.map(c => ({
          ...c,
          replies: c.replies?.filter(r => r.id !== commentId)
        })))
      } else {
          // Remove comment
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
      
      setMenuOpen(null)
    } catch (error) {
      console.error('Failed to delete comment:', error)
  alert('Unable to delete comment. Please try again.')
    }
  }

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
    setMenuOpen(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const updated = await commentService.updateComment(commentId, { content: editContent.trim() })
      setComments(prev => prev.map(c => c.id === commentId ? updated : c))
      setEditingId(null)
      setEditContent('')
    } catch (error) {
      console.error('Failed to update comment:', error)
      alert('Failed to update comment. Please try again.')
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

      // Upload image if exists
      if (replyImage) {
        setIsUploadingReplyImage(true)
        imageUrl = await uploadService.uploadImage(replyImage)
      }

      // If replying to a reply, prepend an @tag to the content
      const content = replyingToUser 
        ? `@${replyingToUser.name} ${replyContent.trim()}`
        : replyContent.trim()

      const newReply = await commentService.createComment(postId, {
        content: content || '',
        parentId,
        imageUrl,
      })
      
      // Add reply to parent comment
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), newReply]
          }
        }
        return c
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded-2xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No comments yet. Be the first to comment!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="max-h-96 overflow-y-auto space-y-3 pr-4 pb-2">
        {comments.map(comment => (
        <div key={comment.id} className="flex gap-2 group">
          <Link to={`/profile/${comment.user?.username}`} className="cursor-pointer">
            <Avatar
              src={comment.user?.avatar}
              name={comment.user?.name || 'User'}
              size="sm"
              className="shrink-0"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
              <Link to={`/profile/${comment.user?.username}`} className="font-semibold text-sm text-gray-800 hover:text-orange-600 transition cursor-pointer">
                {comment.user?.name}
              </Link>
              {editingId === comment.id ? (
                <div className="mt-1 flex gap-2 items-center">
                  <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(comment.id)}
                    className="text-green-600 hover:text-green-700 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-600 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-800 wrap-break-word">{comment.content}</p>
                  {comment.imageUrl && (
                    <img
                      src={comment.imageUrl}
                      alt="Comment attachment"
                      className="mt-2 max-w-xs max-h-60 rounded-lg object-cover cursor-pointer"
                      onClick={() => window.open(comment.imageUrl, '_blank')}
                    />
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 px-3 text-xs text-gray-500">
              <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
              
              {/* Like button with ReactionPicker */}
              <ReactionPicker
                onReact={(type) => handleLikeComment(comment.id, type)}
                currentReaction={commentLikes[comment.id]?.type || null}
              />

              {/* Reply button */}
              <button
                onClick={() => {
                  if (replyingTo === comment.id) {
                    setReplyingTo(null);
                    setReplyingToUser(null);
                    setReplyContent('');
                  } else {
                    setReplyingTo(comment.id);
                    setReplyingToUser({ id: comment.userId, name: comment.user?.name || 'User' });
                  }
                }}
                className="hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3" />
                Reply
              </button>

              {/* Like count */}
              {commentLikes[comment.id]?.count > 0 && (
                <span className="text-gray-600">
                  {commentLikes[comment.id]?.count} {commentLikes[comment.id]?.count === 1 ? 'like' : 'likes'}
                </span>
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
                      setReplyingTo(null);
                      setReplyingToUser(null);
                      setReplyContent('');
                      handleRemoveReplyImage();
                    }}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <Avatar 
                    src={currentUser?.avatar || undefined}
                    name={currentUser?.name || 'User'}
                    size="sm"
                  />
                  <div className="flex-1">
                    {/* Image preview */}
                    {replyImagePreview && (
                      <div className="relative mb-2 inline-block">
                        <img
                          src={replyImagePreview}
                          alt="Preview"
                          className="max-h-40 rounded-lg object-cover"
                        />
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
                        ref={replyInputRef}
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to ${replyingToUser?.name}...`}
                        className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && (replyContent.trim() || replyImage)) {
                            handleReplySubmit(comment.id);
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
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      {/* AI buttons for reply (icon-only) */}
                      <button
                        onClick={async () => {
                          if (!replyContent.trim()) return
                          setIsAiProcessing(true)
                          try {
                            const completed = await geminiService.completePost(replyContent)
                            setReplyContent(completed)
                          } catch (err) {
                            console.error('Failed to complete reply with AI:', err)
                            const e = err as { response?: { data?: { message?: string } }; message?: string }
                            const msg = e?.response?.data?.message || e?.message || 'Unknown error'
                            alert(`Failed to complete with AI: ${msg}`)
                          } finally {
                            setIsAiProcessing(false)
                          }
                        }}
                        disabled={isAiProcessing || isUploadingReplyImage}
                        aria-disabled={isAiProcessing || isUploadingReplyImage}
                        className="p-2 text-orange-600 hover:bg-orange-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 rounded-full transition cursor-pointer"
                        title={isAiProcessing ? 'Processing...' : 'Complete with AI'}
                      >
                        <Sparkles className={`w-4 h-4 ${isAiProcessing ? 'text-gray-400' : 'text-orange-600'}`} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!replyContent.trim()) return
                          setIsAiProcessing(true)
                          try {
                            const improved = await geminiService.improvePost(replyContent)
                            setReplyContent(improved)
                          } catch (err) {
                            console.error('Failed to improve reply with AI:', err)
                            const e = err as { response?: { data?: { message?: string } }; message?: string }
                            const msg = e?.response?.data?.message || e?.message || 'Unknown error'
                            alert(`Failed to improve with AI: ${msg}`)
                          } finally {
                            setIsAiProcessing(false)
                          }
                        }}
                        disabled={isAiProcessing || isUploadingReplyImage}
                        aria-disabled={isAiProcessing || isUploadingReplyImage}
                        className="p-2 text-orange-600 hover:bg-orange-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 rounded-full transition cursor-pointer"
                        title={isAiProcessing ? 'Processing...' : 'Improve with AI'}
                      >
                        <Wand2 className={`w-4 h-4 ${isAiProcessing ? 'text-gray-400' : 'text-orange-600'}`} />
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

                      {visible.map((reply) => (
                  <div key={reply.id} className="flex gap-2 group">
                    <Avatar 
                      src={reply.user?.avatar || undefined}
                      name={reply.user?.name || 'User'}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-2xl px-3 py-2 inline-block max-w-full">
                        <Link to={`/profile/${reply.user?.username}`} className="font-semibold text-sm hover:underline cursor-pointer">
                          {reply.user?.name}
                        </Link>
                        <p className="text-sm text-gray-800 wrap-break-word">
                          {reply.content.startsWith('@') ? (
                            <>
                              {(() => {
                                // Parse mention without regex: prefer matching known user names (supports multi-word names)
                                if (!reply.content.startsWith('@')) return reply.content

                                const candidates = [comment.user?.name, ...(comment.replies?.map(r => r.user?.name) || [])]
                                  .filter(Boolean) as string[]

                                candidates.sort((a, b) => b.length - a.length)

                                let taggedName: string | null = null
                                let remainingContent = ''
                                let taggedUser: typeof comment.user | undefined = undefined

                                for (const name of candidates) {
                                  if (reply.content.startsWith(`@${name}`)) {
                                    taggedName = name
                                    taggedUser = name === comment.user?.name ? comment.user : comment.replies?.find(r => r.user?.name === name)?.user
                                    remainingContent = reply.content.slice((`@${name}`).length).trimStart()
                                    break
                                  }
                                }

                                if (!taggedName) {
                                  const firstSpace = reply.content.indexOf(' ')
                                  if (firstSpace === -1) {
                                    taggedName = reply.content.slice(1)
                                    remainingContent = ''
                                  } else {
                                    taggedName = reply.content.slice(1, firstSpace)
                                    remainingContent = reply.content.slice(firstSpace + 1)
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
                              })()}
                            </>
                          ) : (
                            reply.content
                          )}
                        </p>
                        {reply.imageUrl && (
                          <img
                            src={reply.imageUrl}
                            alt="Reply attachment"
                            className="mt-2 max-w-xs max-h-60 rounded-lg object-cover cursor-pointer"
                            onClick={() => window.open(reply.imageUrl, '_blank')}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-3 text-xs text-gray-500">
                        <span>{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</span>
                        
                        {/* Like button for reply with ReactionPicker */}
                        <ReactionPicker
                          onReact={(type) => handleLikeComment(reply.id, type)}
                          currentReaction={commentLikes[reply.id]?.type || null}
                        />

                        {/* Reply button for reply */}
                        <button
                          onClick={() => {
                            if (replyingTo === `reply-${reply.id}`) {
                              setReplyingTo(null);
                              setReplyingToUser(null);
                              setReplyContent('');
                            } else {
                              setReplyingTo(`reply-${reply.id}`);
                              setReplyingToUser({ id: reply.userId, name: reply.user?.name || 'User' });
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
                            onClick={() => handleDelete(reply.id, true)}
                            className="hover:underline font-semibold cursor-pointer flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}

                        {/* Like count for reply */}
                        {commentLikes[reply.id]?.count > 0 && (
                          <span className="text-gray-600">
                            {commentLikes[reply.id]?.count} {commentLikes[reply.id]?.count === 1 ? 'like' : 'likes'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                    </>
                  )
                })()}
                
                {/* Reply form for replying to a reply */}
                {replyingTo?.startsWith('reply-') && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-2 px-3">
                      <span className="text-xs text-gray-500">Replying</span>
                      <span className="text-xs font-semibold text-orange-500">{replyingToUser?.name}</span>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyingToUser(null);
                          setReplyContent('');
                          handleRemoveReplyImage();
                        }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Avatar 
                        src={currentUser?.avatar || undefined}
                        name={currentUser?.name || 'User'}
                        size="sm"
                      />
                      <div className="flex-1">
                        {/* Image preview */}
                        {replyImagePreview && (
                          <div className="relative mb-2 inline-block">
                            <img
                              src={replyImagePreview}
                              alt="Preview"
                              className="max-h-40 rounded-lg object-cover"
                            />
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
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`Reply to ${replyingToUser?.name}...`}
                            className="flex-1 px-3 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && (replyContent.trim() || replyImage)) {
                                handleReplySubmit(comment.id);
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
                            <ImageIcon className="w-5 h-5" />
                          </button>
                          {/* AI buttons for reply-to-reply (icon-only) */}
                          <button
                            onClick={async () => {
                              if (!replyContent.trim()) return
                              setIsAiProcessing(true)
                              try {
                                const completed = await geminiService.completePost(replyContent)
                                setReplyContent(completed)
                              } catch (err) {
                                console.error('Failed to complete reply with AI:', err)
                                const e = err as { response?: { data?: { message?: string } }; message?: string }
                                const msg = e?.response?.data?.message || e?.message || 'Unknown error'
                                alert(`Failed to complete with AI: ${msg}`)
                              } finally {
                                setIsAiProcessing(false)
                              }
                            }}
                            disabled={isAiProcessing || isUploadingReplyImage}
                            aria-disabled={isAiProcessing || isUploadingReplyImage}
                            className="p-2 text-orange-600 hover:bg-orange-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 rounded-full transition cursor-pointer"
                            title={isAiProcessing ? 'Processing...' : 'Complete with AI'}
                          >
                            <Sparkles className={`w-4 h-4 ${isAiProcessing ? 'text-gray-400' : 'text-orange-600'}`} />
                          </button>
                          <button
                            onClick={async () => {
                              if (!replyContent.trim()) return
                              setIsAiProcessing(true)
                              try {
                                const improved = await geminiService.improvePost(replyContent)
                                setReplyContent(improved)
                              } catch (err) {
                                console.error('Failed to improve reply with AI:', err)
                                const e = err as { response?: { data?: { message?: string } }; message?: string }
                                const msg = e?.response?.data?.message || e?.message || 'Unknown error'
                                alert(`Failed to improve with AI: ${msg}`)
                              } finally {
                                setIsAiProcessing(false)
                              }
                            }}
                            disabled={isAiProcessing || isUploadingReplyImage}
                            aria-disabled={isAiProcessing || isUploadingReplyImage}
                            className="p-2 text-orange-600 hover:bg-orange-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 rounded-full transition cursor-pointer"
                            title={isAiProcessing ? 'Processing...' : 'Improve with AI'}
                          >
                            <Wand2 className={`w-4 h-4 ${isAiProcessing ? 'text-gray-400' : 'text-orange-600'}`} />
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
          {comment.userId === currentUser?.id && editingId !== comment.id && (
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity" ref={menuOpen === comment.id ? menuRef : null}>
              <button
                onClick={() => setMenuOpen(menuOpen === comment.id ? null : comment.id)}
                className="text-gray-500 hover:bg-gray-100 p-1 rounded-full transition cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen === comment.id && (
                <div className="absolute right-0 top-6 w-40 bg-white rounded-lg shadow-lg border z-10">
                  <button
                    onClick={() => handleStartEdit(comment)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="text-sm">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 cursor-pointer rounded-lg transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="text-sm">Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={loadMoreComments}
            disabled={isLoadingMore}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium cursor-pointer disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : `View more comments (${total - comments.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  )
}

