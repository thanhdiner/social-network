import { useEffect, useState, useCallback } from 'react'
import postService, { type Photo } from '../../../services/postService'
import { ImageViewer } from '../../../components/shared/ImageViewer'
import { useAuth } from '../../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface PhotosGalleryProps {
  userId: string
}

export const PhotosGallery = ({ userId }: PhotosGalleryProps) => {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<string>('')

  const loadPhotos = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await postService.getUserPhotos(userId, 1, 9)
      setPhotos(response.photos)
    } catch (error) {
      console.error('Failed to load photos:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadPhotos()
  }, [loadPhotos])

  const handlePhotoClick = (index: number, postId: string) => {
    setSelectedIndex(index)
    setSelectedPostId(postId)
    setViewerOpen(true)
  }

  const handleDeleteImage = async (imageIndex: number) => {
    try {
      // Get the photo being viewed
      const photo = photos[imageIndex]
      if (!photo) return

      // Fetch the full post to get all current images
      const post = await postService.getPost(photo.postId)
      if (!post || !post.imageUrl) return

      // Get all images from the post
      const images = post.imageUrl.split(',').filter(url => url.trim())
      
      // Find the index of the current photo URL in the post's images
      const photoIndexInPost = images.findIndex(url => url.trim() === photo.imageUrl.trim())
      if (photoIndexInPost === -1) return

      // Remove the image at the found index
      const newImages = images.filter((_, i) => i !== photoIndexInPost)
      
      // Update post with new images
      const newImageUrl = newImages.length > 0 ? newImages.join(',') : undefined
      
      await postService.updatePost(photo.postId, {
        imageUrl: newImageUrl,
      })

      // Reload photos
      loadPhotos()
    } catch (error) {
      console.error('Failed to delete image:', error)
      alert('Failed to delete image. Please try again.')
    }
  }

  const handleSeeAllPhotos = () => {
    // Navigate to Photos tab
    const currentPath = window.location.pathname
    const username = currentPath.split('/profile/')[1]?.split('?')[0] || currentUser?.username
    if (username) {
      navigate(`/profile/${username}?tab=photos`)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Photos</h3>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No photos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div
                key={`${photo.postId}-${index}`}
                className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition group relative"
                onClick={() => handlePhotoClick(index, photo.postId)}
              >
                <img
                  src={photo.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
              </div>
            ))}
          </div>
        )}

        {photos.length >= 9 && (
          <button
            onClick={handleSeeAllPhotos}
            className="w-full mt-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer"
          >
            See All Photos
          </button>
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
