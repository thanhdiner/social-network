import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import postService, { type Photo } from '../../../services/postService'
import { ImageViewer } from '../../../components/shared/ImageViewer'
import { useAuth } from '../../../contexts/AuthContext'

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

  const handleSeeAllPhotos = () => {
    // Navigate to Photos tab
    const username = currentUser?.username
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
        updateUrl={false}
        canDelete={currentUser?.id === userId}
      />
    </>
  )
}
