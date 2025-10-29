import { useEffect, useState, useRef, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Trash2, Pencil, X, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { commentService } from '@/services/commentService'
import type { Comment } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

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
  const menuRef = useRef<HTMLDivElement>(null)

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

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await commentService.getCommentsByPostId(postId, 1, limit)
      setComments(response.comments)
      setTotal(response.total)
      setPage(1)
      setHasMore(response.comments.length < response.total)
    } catch (error) {
      console.error('Failed to load comments:', error)
      setComments([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }, [postId, limit])

  const loadMoreComments = async () => {
    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const response = await commentService.getCommentsByPostId(postId, nextPage, limit)
      setComments(prev => [...prev, ...response.comments])
      setPage(nextPage)
      setHasMore(comments.length + response.comments.length < response.total)
    } catch (error) {
      console.error('Failed to load more comments:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [postId, refresh, loadComments])

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await commentService.deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      setMenuOpen(null)
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert('Failed to delete comment. Please try again.')
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
      <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
        {comments.map(comment => (
        <div key={comment.id} className="flex gap-2 group">
          <Link to={`/profile/${comment.user?.username}`} className="cursor-pointer">
            <img
              src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'User')}&background=fb923c&color=fff`}
              alt={comment.user?.name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
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
                <p className="text-sm text-gray-800 wrap-break-word">{comment.content}</p>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 px-3 text-xs text-gray-500">
              <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
            </div>
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
