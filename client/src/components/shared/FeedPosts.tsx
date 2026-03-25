import { useEffect, useState, useCallback, useRef } from 'react'
import { MessageCircle, Share2, MoreHorizontal, Bookmark, Trash2, Pencil, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import postService, { type Post } from '@/services/postService'
import { useAuth } from '@/contexts/AuthContext'
import { EditPostModal } from './EditPostModal'
import { ImageGalleryModal } from './ImageGalleryModal'
import { ReactionPicker, type ReactionType } from './ReactionPicker'
import { CommentList } from './CommentList'
import { Avatar } from './Avatar'
import { CommentForm } from './CommentForm'
import { SharePostModal } from './SharePostModal'
import { LikeListModal } from './LikeListModal'
import { SharedReelPreview } from './SharedReelPreview'

interface FeedPostsProps {
  refresh?: number
}

export const FeedPosts = ({ refresh }: FeedPostsProps) => {
  const { user: currentUser } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerPostId, setViewerPostId] = useState<string | undefined>(undefined)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentRefresh, setCommentRefresh] = useState<Record<string, number>>({})
  const [sharingPost, setSharingPost] = useState<Post | null>(null)
  const [likeListPost, setLikeListPost] = useState<Post | null>(null)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Save original URL when modal opens
  const originalUrlRef = useRef<string | null>(null)

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

  const loadPosts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await postService.getAllPosts()
      setPosts(response.posts)
    } catch (error) {
      console.error('Failed to load posts:', error)
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts, refresh])

  useEffect(() => {
    const handleSharedReelPost = (event: Event) => {
      const newPost = (event as CustomEvent<Post>).detail
      setPosts((prev) => {
        if (prev.some((item) => item.id === newPost.id)) {
          return prev
        }
        return [newPost, ...prev]
      })
    }

    window.addEventListener('post:shared-reel-created', handleSharedReelPost as EventListener)
    return () => {
      window.removeEventListener('post:shared-reel-created', handleSharedReelPost as EventListener)
    }
  }, [])

  const handleLike = async (postId: string, type: ReactionType = 'like') => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const isSameReaction = post.reactionType === type
          const currentLikes = post._count?.likes || 0
          return {
            ...post,
            isLiked: !isSameReaction,
            reactionType: isSameReaction ? null : type,
            _count: {
              ...post._count,
              likes: isSameReaction ? currentLikes - 1 : (post.isLiked ? currentLikes : currentLikes + 1)
            }
          }
        }
        return post
      }))

      // Call API
      const result = await postService.toggleLike(postId, type)
      
      // Update with server response (keep the optimistic count)
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: result.liked,
            reactionType: result.type,
            // Keep the _count from optimistic update
          }
        }
        return post
      }))
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // Reload posts on error
      loadPosts()
    }
  }

  const handleSave = async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, isSaved: !post.isSaved }
          : post
      ))

      // Call API
      await postService.toggleSavePost(postId)
    } catch (error) {
      console.error('Failed to toggle save:', error)
      // Reload posts on error
      loadPosts()
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return

    try {
      await postService.deletePost(postId)
      setPosts(prev => prev.filter(post => post.id !== postId))
      setMenuOpen(null)
      toast.success('Đã xóa bài viết')
    } catch (error) {
      console.error('Failed to delete post:', error)
      toast.error('Xóa bài viết thất bại. Vui lòng thử lại.')
    }
  }

  const handleEdit = (post: Post) => {
    setEditingPost(post)
    setMenuOpen(null)
  }

  const handlePostUpdated = () => {
    setEditingPost(null)
    loadPosts()
  }

  const handleCopyLink = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Đã sao chép link vào clipboard!')
      setMenuOpen(null)
    }).catch(() => {
      toast.error('Sao chép link thất bại')
    })
  }

  const handleImageClick = (images: string[], index: number, postId: string) => {
    // Save current URL before opening modal
    originalUrlRef.current = window.location.pathname
    
    setViewerImages(images)
    setViewerIndex(index)
    setViewerPostId(postId)
    setViewerOpen(true)
  }

  const handleCloseViewer = () => {
    setViewerOpen(false)
    
    // Restore original URL if it was changed
    if (originalUrlRef.current && originalUrlRef.current !== window.location.pathname) {
      window.history.replaceState(null, '', originalUrlRef.current)
    }
    originalUrlRef.current = null
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow">
            <div className="flex gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/6 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
            </div>
            <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow text-center">
        <p className="text-gray-500">No posts yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <article key={post.id} className="bg-white rounded-2xl p-5 shadow">
          {/* Post Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex gap-3">
              <Link to={`/profile/${post.user.username}`} className="cursor-pointer">
                <Avatar
                  src={post.user.avatar}
                  name={post.user.name}
                  size="lg"
                />
              </Link>
              <div>
                <Link to={`/profile/${post.user.username}`} className="font-semibold text-gray-800 hover:text-orange-600 transition cursor-pointer">
                  {post.user.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="relative" ref={menuOpen === post.id ? menuRef : null}>
              <button 
                onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {menuOpen === post.id && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                  <button
                    onClick={() => handleCopyLink(post.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>Copy Link</span>
                  </button>
                  {post.userId === currentUser?.id && (
                    <>
                      <button
                        onClick={() => handleEdit(post)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 cursor-pointer transition"
                      >
                        <Pencil className="w-4 h-4" />
                        <span>Edit Post</span>
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 cursor-pointer rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Post</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Post Content */}
          <p className="text-gray-800 mb-4 whitespace-pre-wrap">
            {post.content.length > 300 && !expandedPosts.has(post.id) 
              ? post.content.slice(0, 300) + '...'
              : post.content
            }
          </p>
          {post.content.length > 300 && (
            <button
              onClick={() => {
                const newExpanded = new Set(expandedPosts)
                if (expandedPosts.has(post.id)) {
                  newExpanded.delete(post.id)
                } else {
                  newExpanded.add(post.id)
                }
                setExpandedPosts(newExpanded)
              }}
              className="text-orange-500 hover:text-orange-600 font-medium mb-4 cursor-pointer"
            >
              {expandedPosts.has(post.id) ? 'Read less' : 'Read more'}
            </button>
          )}

          {/* Shared Post */}
          {post.sharedPost && (
            <div className="border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex gap-3 mb-3">
                <Link to={`/profile/${post.sharedPost.user.username}`} className="cursor-pointer">
                  <Avatar
                    src={post.sharedPost.user.avatar}
                    name={post.sharedPost.user.name}
                    size="md"
                  />
                </Link>
                <div>
                  <Link to={`/profile/${post.sharedPost.user.username}`} className="font-semibold text-gray-800 hover:text-orange-600 transition cursor-pointer">
                    {post.sharedPost.user.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(post.sharedPost.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <p className="text-gray-800 mb-3 whitespace-pre-wrap">{post.sharedPost.content}</p>
              {post.sharedPost.imageUrl && (() => {
                const imageUrls = post.sharedPost.imageUrl.split(',').filter(url => url.trim())
                if (imageUrls.length === 0) return null
                
                return (
                  <div className={imageUrls.length === 1 ? '' : 'grid grid-cols-2 gap-1'}>
                    {imageUrls.slice(0, 4).map((url, index) => (
                      <div 
                        key={index} 
                        className={`rounded-lg overflow-hidden ${imageUrls.length === 1 ? '' : 'aspect-square'} cursor-pointer`}
                        onClick={() => handleImageClick(imageUrls, index, post.sharedPost!.id)}
                      >
                        <img
                          src={url.trim()}
                          alt=""
                          className={`w-full ${imageUrls.length === 1 ? 'max-h-[400px]' : 'h-full'} object-cover`}
                        />
                      </div>
                    ))}
                  </div>
                )
              })()}
              {post.sharedPost.videoUrl && (
                <video
                  src={post.sharedPost.videoUrl}
                  controls
                  className="w-full rounded-lg max-h-[400px]"
                />
              )}
            </div>
          )}

          {/* Shared Reel */}
          {post.sharedReel && <SharedReelPreview reel={post.sharedReel} />}

          {/* Post Images */}
          {post.imageUrl && (() => {
            const imageUrls = post.imageUrl.split(',').filter(url => url.trim())
            if (imageUrls.length === 0) return null
            
            const displayImages = imageUrls.slice(0, 4)
            const remainingCount = imageUrls.length - 4
            
            return (
              <div className={`mb-4 ${imageUrls.length === 1 ? '' : imageUrls.length === 2 ? 'grid grid-cols-2 gap-1' : 'grid grid-cols-2 gap-1'}`}>
                {displayImages.map((url, index) => (
                  <div 
                    key={index} 
                    className={`rounded-xl overflow-hidden ${imageUrls.length === 1 ? '' : 'aspect-square'} relative cursor-pointer`}
                    onClick={() => handleImageClick(imageUrls, index, post.id)}
                  >
                    <img
                      src={url.trim()}
                      alt=""
                      className={`w-full ${imageUrls.length === 1 ? 'max-h-[600px]' : 'h-full'} object-cover`}
                    />
                    {index === 3 && remainingCount > 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                        <span className="text-white text-4xl font-bold">+{remainingCount}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Post Video */}
          {post.videoUrl && (
            <div className="mb-4 rounded-xl overflow-hidden bg-black">
              <video 
                src={post.videoUrl} 
                controls 
                controlsList="nodownload"
                className="w-full max-h-[600px] object-contain"
                preload="metadata"
              />
            </div>
          )}

          {/* Post Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3 pb-3 border-b">
            <button 
              onClick={() => setLikeListPost(post)}
              className="hover:underline cursor-pointer"
            >
              {post._count?.likes || 0} {(post._count?.likes || 0) === 1 ? 'Like' : 'Likes'}
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setExpandedComments(prev => {
                    const newSet = new Set(prev)
                    if (newSet.has(post.id)) {
                      newSet.delete(post.id)
                    } else {
                      newSet.add(post.id)
                    }
                    return newSet
                  })
                }}
                className="hover:underline cursor-pointer"
              >
                {post._count?.comments || 0} {(post._count?.comments || 0) === 1 ? 'Comment' : 'Comments'}
              </button>
              {post._count?.shares !== undefined && post._count.shares > 0 && (
                <span>
                  {post._count.shares} {post._count.shares === 1 ? 'Share' : 'Shares'}
                </span>
              )}
            </div>
          </div>

          {/* Post Actions */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex justify-center">
              <ReactionPicker 
                onReact={(type) => handleLike(post.id, type)}
                currentReaction={post.reactionType}
              />
            </div>
            <button 
              onClick={() => {
                setExpandedComments(prev => {
                  const newSet = new Set(prev)
                  if (newSet.has(post.id)) {
                    newSet.delete(post.id)
                  } else {
                    newSet.add(post.id)
                    // Focus on comment input after state update
                    setTimeout(() => {
                      const commentInput = document.getElementById(`comment-input-${post.id}`)
                      if (commentInput) {
                        commentInput.focus()
                        commentInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                    }, 100)
                  }
                  return newSet
                })
              }}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Comment</span>
            </button>
            <button 
              onClick={() => setSharingPost(post)}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition"
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium">Share</span>
            </button>
            <button 
              onClick={() => handleSave(post.id)}
              className="cursor-pointer p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition"
            >
              <Bookmark className={`w-5 h-5 ${post.isSaved ? 'fill-orange-500 text-orange-500' : ''}`} />
            </button>
          </div>

          {/* Comments Section */}
          {expandedComments.has(post.id) && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <CommentList 
                postId={post.id} 
                refresh={commentRefresh[post.id]}
              />
              <CommentForm 
                postId={post.id}
                onCommentAdded={() => {
                  setCommentRefresh(prev => ({ ...prev, [post.id]: Date.now() }))
                  // Update comment count
                  setPosts(prevPosts => prevPosts.map(p => 
                    p.id === post.id 
                      ? { ...p, _count: { ...p._count, comments: (p._count?.comments || 0) + 1 } }
                      : p
                  ))
                }}
              />
            </div>
          )}
        </article>
      ))}

      {editingPost && (
        <EditPostModal
          postId={editingPost.id}
          initialContent={editingPost.content}
          initialImages={editingPost.imageUrl || ''}
          initialVideo={editingPost.videoUrl}
          initialVisibility={editingPost.visibility}
          open={!!editingPost}
          onClose={() => setEditingPost(null)}
          onUpdated={handlePostUpdated}
        />
      )}

      {viewerOpen && viewerPostId && (
        <ImageGalleryModal
          images={viewerImages}
          initialIndex={viewerIndex}
          postId={viewerPostId}
          post={posts.find(p => p.id === viewerPostId)!}
          onClose={handleCloseViewer}
          onShare={(post: Post) => setSharingPost(post)}
        />
      )}

      {sharingPost && currentUser && (
        <SharePostModal
          post={sharingPost}
          open={!!sharingPost}
          onClose={() => setSharingPost(null)}
          onShared={() => {
            setSharingPost(null)
            loadPosts()
          }}
          currentUserName={currentUser.name}
          currentUserAvatar={currentUser.avatar}
        />
      )}

      {likeListPost && (
        <LikeListModal
          postId={likeListPost.id}
          totalLikes={likeListPost._count?.likes || 0}
          onClose={() => setLikeListPost(null)}
        />
      )}
    </div>
  )
}
