import { useEffect, useState, useCallback, useRef } from 'react'
import { MessageCircle, Share2, MoreHorizontal, Bookmark, Trash2, Pencil, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import postService, { type Post } from '@/services/postService'
import { useAuth } from '@/contexts/AuthContext'
import { EditPostModal } from './EditPostModal'
import { ImageViewer } from './ImageViewer'
import { ReactionPicker, type ReactionType } from './ReactionPicker'
import { CommentList } from './CommentList'
import { CommentForm } from './CommentForm'
import { SharePostModal } from './SharePostModal'

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

  const handleLike = async (postId: string, type: ReactionType = 'like') => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const isSameReaction = post.reactionType === type
          return {
            ...post,
            isLiked: !isSameReaction,
            reactionType: isSameReaction ? null : type,
            _count: {
              ...post._count,
              likes: isSameReaction ? post._count.likes - 1 : (post.isLiked ? post._count.likes : post._count.likes + 1)
            }
          }
        }
        return post
      }))

      // Call API
      const result = await postService.toggleLike(postId, type)
      
      // Update with server response
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: result.liked,
            reactionType: result.type,
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
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await postService.deletePost(postId)
      setPosts(prev => prev.filter(post => post.id !== postId))
      setMenuOpen(null)
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete post. Please try again.')
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
      alert('Link copied to clipboard!')
      setMenuOpen(null)
    }).catch(() => {
      alert('Failed to copy link')
    })
  }

  const handleImageClick = (images: string[], index: number, postId: string) => {
    setViewerImages(images)
    setViewerIndex(index)
    setViewerPostId(postId)
    setViewerOpen(true)
  }

  const handleDeleteImage = async (postId: string, imageIndex: number) => {
    try {
      // Get current post
      const post = posts.find(p => p.id === postId)
      if (!post || !post.imageUrl) return

      // Get all images
      const images = post.imageUrl.split(',').filter(url => url.trim())
      
      // Remove the image at the specified index
      const newImages = images.filter((_, i) => i !== imageIndex)
      
      // Update post with new images
      const newImageUrl = newImages.length > 0 ? newImages.join(',') : undefined
      
      await postService.updatePost(postId, {
        content: post.content,
        imageUrl: newImageUrl,
      })
      
      // Update local state
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            imageUrl: newImageUrl
          }
        }
        return p
      }))
      
      // Update viewer images
      setViewerImages(newImages)
    } catch (error) {
      console.error('Failed to delete image:', error)
      alert('Failed to delete image. Please try again.')
    }
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
                <img
                  src={post.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.name)}&background=fb923c&color=fff`}
                  alt={post.user.name}
                  className="w-12 h-12 rounded-full object-cover"
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
          <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

          {/* Shared Post */}
          {post.sharedPost && (
            <div className="border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex gap-3 mb-3">
                <Link to={`/profile/${post.sharedPost.user.username}`} className="cursor-pointer">
                  <img
                    src={post.sharedPost.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.sharedPost.user.name)}&background=fb923c&color=fff`}
                    alt={post.sharedPost.user.name}
                    className="w-10 h-10 rounded-full object-cover"
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
            <button className="hover:underline cursor-pointer">
              {post._count.likes} {post._count.likes === 1 ? 'Like' : 'Likes'}
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
                {post._count.comments} {post._count.comments === 1 ? 'Comment' : 'Comments'}
              </button>
              {post._count.shares !== undefined && post._count.shares > 0 && (
                <span>
                  {post._count.shares} {post._count.shares === 1 ? 'Share' : 'Shares'}
                </span>
              )}
            </div>
          </div>

          {/* Post Actions */}
          <div className="flex items-center gap-2">
            <ReactionPicker 
              onReact={(type) => handleLike(post.id, type)}
              currentReaction={post.reactionType}
            />
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
                      ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
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
          open={!!editingPost}
          onClose={() => setEditingPost(null)}
          onUpdated={handlePostUpdated}
        />
      )}

      <ImageViewer
        images={viewerImages}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        postId={viewerPostId}
        updateUrl={true}
        onDeleteImage={viewerPostId ? (index) => handleDeleteImage(viewerPostId, index) : undefined}
        canDelete={viewerPostId ? posts.find(p => p.id === viewerPostId)?.userId === currentUser?.id : false}
      />

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
    </div>
  )
}
