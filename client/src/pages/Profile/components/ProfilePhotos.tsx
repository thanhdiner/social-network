import { useState, useEffect, useCallback, useRef } from 'react'
import postService, { type Photo } from '../../../services/postService'
import { ImageViewer } from '../../../components/shared/ImageViewer'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProfilePhotosProps {
  userId: string
}

export const ProfilePhotos = ({ userId }: ProfilePhotosProps) => {
  const { user: currentUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const loadPhotos = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const response = await postService.getUserPhotos(userId, pageNum, 18)
      
      if (append) {
        setPhotos(prev => [...prev, ...response.photos])
      } else {
        setPhotos(response.photos)
      }

      setHasMore(pageNum < response.totalPages)
    } catch (error) {
      console.error('Failed to load photos:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId])

  useEffect(() => {
    setPhotos([])
    setPage(1)
    setHasMore(true)
    loadPhotos(1, false)
  }, [userId, loadPhotos])

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return

    // Setup intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1
          setPage(nextPage)
          loadPhotos(nextPage, true)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, loadingMore, page, loadPhotos])

  const handlePhotoClick = (index: number, postId: string) => {
    setSelectedIndex(index)
    setSelectedPostId(postId)
    setViewerOpen(true)
  }

  const handleDeleteImage = async (imageIndex: number) => {
    try {
      console.log('=== DELETE IMAGE DEBUG (ProfilePhotos) ===')
      console.log('imageIndex:', imageIndex)
      console.log('photos array:', photos)
      
      // Get the photo being viewed
      const photo = photos[imageIndex]
      console.log('photo at index:', photo)
      if (!photo) {
        console.log('ERROR: No photo found at index', imageIndex)
        return
      }

      // Fetch the full post to get all current images
      console.log('Fetching post:', photo.postId)
      const post = await postService.getPost(photo.postId)
      console.log('Full post:', post)
      
      if (!post || !post.imageUrl) {
        console.log('ERROR: No post or imageUrl found')
        return
      }

      // Get all images from the post
      const images = post.imageUrl.split(',').filter(url => url.trim())
      console.log('All images in post:', images)
      console.log('Current photo URL:', photo.imageUrl)
      
      // Find the index of the current photo URL in the post's images
      const photoIndexInPost = images.findIndex(url => url.trim() === photo.imageUrl.trim())
      console.log('Photo index in post:', photoIndexInPost)
      
      if (photoIndexInPost === -1) {
        console.log('ERROR: Photo URL not found in post images')
        return
      }

      // Remove the image at the found index
      const newImages = images.filter((_, i) => i !== photoIndexInPost)
      console.log('New images after delete:', newImages)
      
      // Update post with new images
      const newImageUrl = newImages.length > 0 ? newImages.join(',') : undefined
      console.log('New imageUrl string:', newImageUrl)
      
      await postService.updatePost(photo.postId, {
        imageUrl: newImageUrl,
      })

      console.log('Post updated successfully')
      // Reload photos from page 1
      setPhotos([])
      setPage(1)
      setHasMore(true)
      loadPhotos(1, false)
    } catch (error) {
      console.error('Failed to delete image:', error)
      alert('Failed to delete image. Please try again.')
    }
  }

  if (loading && photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Photos</h2>
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    )
  }

  if (!loading && photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Photos</h2>
        <p className="text-gray-500 text-center py-8">No photos yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Photos</h2>

        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div
              key={`${photo.postId}-${index}`}
              className="aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handlePhotoClick(index, photo.postId)}
            >
              <img
                src={photo.imageUrl}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        )}

        {/* Load more sentinel */}
        {hasMore && !loadingMore && (
          <div ref={loadMoreRef} className="h-20" />
        )}

        {/* No more photos */}
        {!hasMore && photos.length > 0 && (
          <p className="text-center text-gray-500 py-8">No more photos</p>
        )}
      </div>

      <ImageViewer
        images={photos.map(p => p.imageUrl)}
        initialIndex={selectedIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        postId={selectedPostId}
        updateUrl={true}
        onDeleteImage={handleDeleteImage}
        canDelete={currentUser?.id === userId}
      />
    </>
  )
}

