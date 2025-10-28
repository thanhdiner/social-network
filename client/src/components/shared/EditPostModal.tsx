import { useState, useEffect } from 'react'
import { X, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import postService from '@/services/postService'
import uploadService from '@/services/uploadService'

interface EditPostModalProps {
  postId: string
  initialContent: string
  initialImages: string
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export const EditPostModal = ({ postId, initialContent, initialImages, open, onClose, onUpdated }: EditPostModalProps) => {
  const { user } = useAuth()
  const [content, setContent] = useState(initialContent)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setContent(initialContent)
      const images = initialImages ? initialImages.split(',').filter(url => url.trim()) : []
      setExistingImages(images)
      setSelectedImages([])
      setPreviewUrls([])
    }
  }, [open, initialContent, initialImages])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const totalImages = existingImages.length + selectedImages.length + files.length
      if (totalImages > 10) {
        alert('You can only upload up to 10 images')
        return
      }
      
      const newFiles = [...selectedImages, ...files].slice(0, 10 - existingImages.length)
      setSelectedImages(newFiles)
      
      const newUrls = newFiles.map(file => URL.createObjectURL(file))
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls(newUrls)
    }
  }

  const handleRemoveNewImage = (index: number) => {
    const newFiles = selectedImages.filter((_, i) => i !== index)
    setSelectedImages(newFiles)
    
    URL.revokeObjectURL(previewUrls[index])
    const newUrls = previewUrls.filter((_, i) => i !== index)
    setPreviewUrls(newUrls)
  }

  const handleRemoveExistingImage = (index: number) => {
    const newExisting = existingImages.filter((_, i) => i !== index)
    setExistingImages(newExisting)
  }

  const handleSubmit = async () => {
    if (!content.trim() && existingImages.length === 0 && selectedImages.length === 0) return

    setIsSubmitting(true)
    try {
      // Upload new images if selected
      const uploadedUrls: string[] = []
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const url = await uploadService.uploadImage(image)
          uploadedUrls.push(url)
        }
      }

      // Combine existing and new images
      const allImages = [...existingImages, ...uploadedUrls]
      const imageUrl = allImages.length > 0 ? allImages.join(',') : undefined

      // Update post
      await postService.updatePost(postId, {
        content: content.trim(),
        imageUrl,
      })
      
      // Reset form
      setContent('')
      setSelectedImages([])
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])
      setExistingImages([])
      onClose()
      
      // Callback to refresh posts list
      onUpdated()
    } catch (error) {
      console.error('Failed to update post:', error)
      alert('Failed to update post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  const totalImages = existingImages.length + selectedImages.length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-semibold">Edit Post</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=fb923c&color=fff`}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            <p className="font-semibold text-gray-800">{user?.name}</p>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
            className="w-full h-32 resize-none border-0 focus:ring-0 outline-none text-gray-800 placeholder-gray-400 text-lg"
          />

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className={`grid gap-2 ${existingImages.length === 1 ? 'grid-cols-1' : existingImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {existingImages.map((url, index) => (
                <div key={`existing-${index}`} className="relative rounded-lg overflow-hidden border aspect-square">
                  <img src={url} alt={`Existing ${index + 1}`} className="w-full h-full object-cover bg-gray-100" />
                  <button
                    onClick={() => handleRemoveExistingImage(index)}
                    className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-1.5 rounded-full shadow-lg transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New Images Preview */}
          {previewUrls.length > 0 && (
            <div className={`grid gap-2 ${previewUrls.length === 1 ? 'grid-cols-1' : previewUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {previewUrls.map((url, index) => (
                <div key={`new-${index}`} className="relative rounded-lg overflow-hidden border aspect-square">
                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover bg-gray-100" />
                  <button
                    onClick={() => handleRemoveNewImage(index)}
                    className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-1.5 rounded-full shadow-lg transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Add to your post</span>
              <div className="flex gap-2">
                {totalImages < 10 && (
                  <label className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <ImageIcon className="w-5 h-5 text-green-500" />
                  </label>
                )}
              </div>
            </div>
            {totalImages >= 10 && (
              <p className="text-xs text-gray-500 mt-2">Maximum 10 images reached</p>
            )}
          </div>

          <button 
            onClick={handleSubmit}
            disabled={(!content.trim() && totalImages === 0) || isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition cursor-pointer"
          >
            {isSubmitting ? 'Updating...' : 'Update Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
