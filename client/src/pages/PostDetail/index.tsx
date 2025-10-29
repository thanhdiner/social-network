import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { MessageCircle, Share2, MoreHorizontal, Bookmark, Trash2, Pencil, Link as LinkIcon, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import postService, { type Post } from '@/services/postService'
import { useAuth } from '@/contexts/AuthContext'
import { EditPostModal } from '@/components/shared/EditPostModal'
import { ImageViewer } from '@/components/shared/ImageViewer'
import { useTitle } from '@/hooks/useTitle'
import { ReactionPicker, type ReactionType } from '@/components/shared/ReactionPicker'

export const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)

  useTitle(post ? `${post.user.name}'s Post` : 'Post')

  const loadPost = useCallback(async () => {
    if (!postId) return
    
    setIsLoading(true)
    try {
      const data = await postService.getPost(postId)
      setPost(data)
    } catch (error) {
      console.error('Failed to load post:', error)
      setPost(null)
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => {
    loadPost()
  }, [loadPost])

  const handleToggleLike = async (type: ReactionType = 'like') => {
    if (!post) return

    try {
      // Optimistic update
      setPost(prev => {
        if (!prev) return prev
        const isSameReaction = prev.reactionType === type
        return {
          ...prev,
          isLiked: !isSameReaction,
          reactionType: isSameReaction ? null : type,
          _count: {
            ...prev._count,
            likes: isSameReaction ? prev._count.likes - 1 : (prev.isLiked ? prev._count.likes : prev._count.likes + 1)
          }
        }
      })

      // Call API
      const result = await postService.toggleLike(post.id, type)

      // Update with server response
      setPost(prev => {
        if (!prev) return prev
        return {
          ...prev,
          isLiked: result.liked,
          reactionType: result.type,
        }
      })
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // Reload on error
      loadPost()
    }
  }

  const handleDelete = async () => {
    if (!post || !window.confirm('Are you sure you want to delete this post?')) return

    try {
      await postService.deletePost(post.id)
      navigate('/')
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete post. Please try again.')
    }
  }

  const handleEdit = () => {
    if (post) {
      setEditingPost(post)
      setMenuOpen(false)
    }
  }

  const handlePostUpdated = () => {
    setEditingPost(null)
    loadPost()
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post?.id}`
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!')
      setMenuOpen(false)
    }).catch(() => {
      alert('Failed to copy link')
    })
  }

  const handleImageClick = (images: string[], index: number) => {
    setViewerImages(images)
    setViewerIndex(index)
    setViewerOpen(true)
  }

  const handleDeleteImage = async (imageIndex: number) => {
    if (!post || !post.imageUrl) return

    try {
      // Get all images
      const images = post.imageUrl.split(',').filter(url => url.trim())
      
      // Remove the image at the specified index
      const newImages = images.filter((_, i) => i !== imageIndex)
      
      // Update post with new images
      const newImageUrl = newImages.length > 0 ? newImages.join(',') : undefined
      
      await postService.updatePost(post.id, {
        content: post.content,
        imageUrl: newImageUrl,
      })
      
      // Update local state
      setPost(prev => {
        if (!prev) return prev
        return {
          ...prev,
          imageUrl: newImageUrl
        }
      })
      
      // Update viewer images
      setViewerImages(newImages)
    } catch (error) {
      console.error('Failed to delete image:', error)
      alert('Failed to delete image. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-2xl p-5 shadow animate-pulse">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          </div>
          <div className="h-20 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-2xl p-10 shadow text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Post Not Found</h2>
          <p className="text-gray-600 mb-6">This post may have been deleted or doesn't exist.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      <article className="bg-white rounded-2xl p-5 shadow">
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
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 cursor-pointer transition"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>Copy Link</span>
                </button>
                {post.userId === currentUser?.id && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50 cursor-pointer transition"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit Post</span>
                    </button>
                    <button
                      onClick={handleDelete}
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
                  onClick={() => handleImageClick(imageUrls, index)}
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
          <button className="hover:underline cursor-pointer">
            {post._count.comments} {post._count.comments === 1 ? 'Comment' : 'Comments'}
          </button>
        </div>

        {/* Post Actions */}
        <div className="flex items-center gap-1">
          <ReactionPicker 
            onReact={handleToggleLike}
            currentReaction={post.reactionType}
          />
          <button className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition">
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Comment</span>
          </button>
          <button className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition">
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </button>
          <button className="cursor-pointer p-2 rounded-lg hover:bg-gray-50 text-gray-600 transition">
            <Bookmark className="w-5 h-5" />
          </button>
        </div>
      </article>

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
        postId={postId}
        updateUrl={true}
        onDeleteImage={handleDeleteImage}
        canDelete={post?.userId === currentUser?.id}
      />
    </div>
  )
}
