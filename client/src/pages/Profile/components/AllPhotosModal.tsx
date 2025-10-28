import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import postService, { type Photo } from '../../../services/postService'
import { ImageViewer } from '../../../components/shared/ImageViewer'
import { useAuth } from '../../../contexts/AuthContext'

interface AllPhotosModalProps {
  userId: string
  open: boolean
  onClose: () => void
}

export const AllPhotosModal = ({ userId, open, onClose }: AllPhotosModalProps) => {
  const { user: currentUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentPage, setCurrentPage] = useState(1)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const loadPhotos = useCallback(async (pageNum: number) => {
    if (loading) return

    try {
      setLoading(true)
      const response = await postService.getUserPhotos(userId, pageNum, 18)
      
      if (pageNum === 1) {
        setPhotos(response.photos)
      } else {
        setPhotos(prev => [...prev, ...response.photos])
      }

      setHasMore(pageNum < response.totalPages)
    } catch (error) {
      console.error('Failed to load photos:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, loading])

  useEffect(() => {
    if (open) {
      setPhotos([])
      setCurrentPage(1)
      setHasMore(true)
      loadPhotos(1)
    }
  }, [open, loadPhotos])

  useEffect(() => {
    if (!open || !hasMore || loading) return

    // Setup intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setCurrentPage(prev => {
            const nextPage = prev + 1
            loadPhotos(nextPage)
            return nextPage
          })
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
  }, [open, hasMore, loading, loadPhotos])

  const handlePhotoClick = (index: number, postId: string) => {
    setSelectedIndex(index)
    setSelectedPostId(postId)
    setViewerOpen(true)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">All Photos</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
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

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            )}

            {/* Load more sentinel */}
            {hasMore && !loading && (
              <div ref={loadMoreRef} className="h-20" />
            )}

            {/* No more photos */}
            {!hasMore && photos.length > 0 && (
              <p className="text-center text-gray-500 py-8">No more photos</p>
            )}

            {/* No photos at all */}
            {!loading && photos.length === 0 && (
              <p className="text-center text-gray-500 py-8">No photos yet</p>
            )}
          </div>
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
    </>
  )
}
