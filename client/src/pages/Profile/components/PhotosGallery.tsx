import { useEffect, useState } from 'react'

interface Photo {
  id: string
  url: string
  createdAt: string
}

interface PhotosGalleryProps {
  username?: string
}

export const PhotosGallery = ({ username: _username }: PhotosGalleryProps) => {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch photos from API
    loadPhotos()
  }, [_username])

  const loadPhotos = async () => {
    try {
      // Mock data
      const mockPhotos: Photo[] = [
        { id: '1', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop', createdAt: '2024-01-01' },
        { id: '2', url: 'https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=300&h=300&fit=crop', createdAt: '2024-01-02' },
        { id: '3', url: 'https://images.unsplash.com/photo-1555448248-2571daf6344b?w=300&h=300&fit=crop', createdAt: '2024-01-03' },
        { id: '4', url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300&h=300&fit=crop', createdAt: '2024-01-04' },
        { id: '5', url: 'https://images.unsplash.com/photo-1533450718592-29d45635f0a9?w=300&h=300&fit=crop', createdAt: '2024-01-05' },
        { id: '6', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=300&fit=crop', createdAt: '2024-01-06' },
        { id: '7', url: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=300&h=300&fit=crop', createdAt: '2024-01-07' },
        { id: '8', url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=300&fit=crop', createdAt: '2024-01-08' },
        { id: '9', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop', createdAt: '2024-01-09' }
      ]
      setPhotos(mockPhotos)
    } catch (error) {
      console.error('Failed to load photos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Photos</h3>
        <button className="text-orange-500 hover:text-orange-600 font-medium text-sm">
          Add Photo
        </button>
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
          {photos.map(photo => (
            <div 
              key={photo.id} 
              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition group relative"
            >
              <img 
                src={photo.url} 
                alt="" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <button className="w-full mt-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition">
          See All Photos
        </button>
      )}
    </div>
  )
}
