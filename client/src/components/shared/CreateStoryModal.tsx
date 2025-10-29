import { useState } from 'react'
import { X, Image as ImageIcon, Video, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import storyService from '@/services/storyService'
import uploadService from '@/services/uploadService'

interface CreateStoryModalProps {
  open: boolean
  onClose: () => void
  onStoryCreated?: () => void
}

export const CreateStoryModal = ({ open, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const { user } = useAuth()
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setSelectedVideo(null)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check video size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('Video file size should not exceed 50MB')
        return
      }
      setSelectedVideo(file)
      setSelectedImage(null)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!selectedImage && !selectedVideo) {
      alert('Please select an image or video')
      return
    }

    try {
      setIsSubmitting(true)

      let imageUrl: string | undefined
      let videoUrl: string | undefined

      if (selectedImage) {
        imageUrl = await uploadService.uploadImage(selectedImage)
      }

      if (selectedVideo) {
        videoUrl = await uploadService.uploadVideo(selectedVideo)
      }

      await storyService.createStory({
        imageUrl,
        videoUrl,
      })

      handleClose()
      onStoryCreated?.()
    } catch (error) {
      console.error('Failed to create story:', error)
      alert('Failed to create story. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedImage(null)
    setSelectedVideo(null)
    setPreviewUrl(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">Create Story</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=fb923c&color=fff`}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            <p className="font-semibold text-gray-800">{user?.name}</p>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden bg-gray-100">
              {selectedImage && (
                <img src={previewUrl} alt="Preview" className="w-full max-h-[400px] object-contain" />
              )}
              {selectedVideo && (
                <video src={previewUrl} controls className="w-full max-h-[400px] object-contain" />
              )}
              <button
                onClick={() => {
                  setSelectedImage(null)
                  setSelectedVideo(null)
                  setPreviewUrl(null)
                }}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          )}

          {/* Upload Options */}
          {!previewUrl && (
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition cursor-pointer">
                <ImageIcon className="w-12 h-12 text-orange-500" />
                <span className="font-medium text-gray-700">Add Photo</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>

              <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition cursor-pointer">
                <Video className="w-12 h-12 text-orange-500" />
                <span className="font-medium text-gray-700">Add Video</span>
                <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
              </label>
            </div>
          )}

          <p className="text-sm text-gray-500 text-center">
            Your story will be visible for 24 hours
          </p>
        </div>

        {/* Footer */}
        <div className="border-t p-4 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedImage && !selectedVideo)}
            className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Story...
              </>
            ) : (
              'Share to Story'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
