import { useState, useEffect, useCallback } from 'react'
import postService, { type Photo } from '../../../services/postService'
import { ImageViewer } from '../../../components/shared/ImageViewer'
import { AllPhotosModal } from './AllPhotosModal'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProfilePhotosProps {
  userId: string
}

export const ProfilePhotos = ({ userId }: ProfilePhotosProps) => {
  const { user: currentUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<string>('')
  const [allPhotosOpen, setAllPhotosOpen] = useState(false)

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true)
      const response = await postService.getUserPhotos(userId, 1, 9)
      setPhotos(response.photos)
    } catch (error) {
      console.error('Failed to load photos:', error)
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow">
        <h2 className="text-lg font-semibold mb-4">Photos</h2>
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    )
  }

  if (photos.length === 0) {
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Photos</h2>
          {photos.length >= 9 && (
            <button
              onClick={() => setAllPhotosOpen(true)}
              className="text-orange-500 hover:text-orange-600 text-sm font-medium cursor-pointer"
            >
              See All Photos
            </button>
          )}
        </div>

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

      <AllPhotosModal
        userId={userId}
        open={allPhotosOpen}
        onClose={() => setAllPhotosOpen(false)}
      />
    </>
  )
}

