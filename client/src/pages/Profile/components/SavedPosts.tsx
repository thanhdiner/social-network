import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, Bookmark, MessageCircle, Share2, Link as LinkIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import postService, { type Post } from '@/services/postService'
import { useAuth } from '@/contexts/AuthContext'
import { ImageGalleryModal } from '@/components/shared/ImageGalleryModal'
import { ReactionPicker } from '@/components/shared/ReactionPicker'
import { CommentList } from '@/components/shared/CommentList'
import { CommentForm } from '@/components/shared/CommentForm'
import { SharePostModal } from '@/components/shared/SharePostModal'

export const SavedPosts = () => {
  const { user: currentUser } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [sharingPost, setSharingPost] = useState<Post | null>(null)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerPostId, setViewerPostId] = useState<string | undefined>(undefined)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  
  // Save original URL when modal opens
  const originalUrlRef = useRef<string | null>(null)

  const loadSavedPosts = async (pageNum = 1) => {
    try {
      const data = await postService.getSavedPosts(pageNum, 10)
      if (pageNum === 1) {
        setPosts(data.posts)
      } else {
        setPosts(prev => [...prev, ...data.posts])
      }
      setHasMore(pageNum < data.totalPages)
      setPage(pageNum)
    } catch (error) {
      console.error('Failed to load saved posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSavedPosts()
  }, [])

  const handleUnsave = async (postId: string) => {
    try {
      await postService.toggleSavePost(postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (error) {
      console.error('Failed to unsave post:', error)
    }
  }

  const handleLike = async (postId: string, type: string) => {
    try {
      const result = await postService.toggleLike(postId, type)
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const isSameReaction = post.reactionType === type
          return {
            ...post,
            isLiked: result.liked,
            reactionType: result.type,
            _count: {
              ...post._count,
              likes: isSameReaction ? post._count.likes - 1 : (post.isLiked ? post._count.likes : post._count.likes + 1)
            }
          }
        }
        return post
      }))
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const handleCopyLink = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
    setMenuOpen(null)
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

  const handleCommentAdded = (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
        : p
    ))
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
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow text-center">
        <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Saved Posts</h3>
        <p className="text-gray-500">Posts you save will appear here</p>
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
            <div className="relative">
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
                  <button
                    onClick={() => {
                      handleUnsave(post.id)
                      setMenuOpen(null)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 cursor-pointer rounded-lg transition"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>Unsave Post</span>
                  </button>
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
                className="w-full max-h-[600px]"
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
                  newSet.add(post.id)
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
              onClick={() => handleUnsave(post.id)}
              className="cursor-pointer p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition"
            >
              <Bookmark className="w-5 h-5 fill-orange-500 text-orange-500" />
            </button>
          </div>

          {/* Comments Section */}
          {expandedComments.has(post.id) && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <CommentList postId={post.id} />
              <CommentForm postId={post.id} onCommentAdded={() => handleCommentAdded(post.id)} />
            </div>
          )}
        </article>
      ))}

      {hasMore && (
        <button
          onClick={() => loadSavedPosts(page + 1)}
          className="w-full py-3 bg-white rounded-lg shadow hover:bg-gray-50 transition text-orange-600 font-semibold cursor-pointer"
        >
          Load More
        </button>
      )}

      {viewerOpen && viewerPostId && (
        <ImageGalleryModal
          images={viewerImages}
          initialIndex={viewerIndex}
          postId={viewerPostId}
          post={posts.find(p => p.id === viewerPostId)!}
          onClose={handleCloseViewer}
          onShare={(post) => setSharingPost(post)}
        />
      )}

      {sharingPost && (
        <SharePostModal
          post={sharingPost}
          open={true}
          currentUserName={currentUser?.name || ''}
          onClose={() => setSharingPost(null)}
          onShared={() => {
            setSharingPost(null)
            // Update share count
            setPosts(prev => prev.map(p => 
              p.id === sharingPost.id 
                ? { ...p, _count: { ...p._count, shares: (p._count.shares || 0) + 1 } }
                : p
            ))
          }}
        />
      )}
    </div>
  )
}
