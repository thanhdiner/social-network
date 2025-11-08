import { useState, useEffect } from 'react'
import { X, Image as ImageIcon, Video, Sparkles, Wand2 } from 'lucide-react'
import geminiService from '@/services/geminiService'
import { useAuth } from '@/contexts/AuthContext'
import postService from '@/services/postService'
import uploadService from '@/services/uploadService'
import { Avatar } from './Avatar'

interface EditPostModalProps {
  postId: string
  initialContent: string
  initialImages: string
  initialVideo?: string
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export const EditPostModal = ({ postId, initialContent, initialImages, initialVideo, open, onClose, onUpdated }: EditPostModalProps) => {
  const { user } = useAuth()
  const [content, setContent] = useState(initialContent)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [existingVideo, setExistingVideo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  useEffect(() => {
    if (open) {
      setContent(initialContent)
      const images = initialImages ? initialImages.split(',').filter(url => url.trim()) : []
      setExistingImages(images)
      setExistingVideo(initialVideo || null)
      setSelectedImages([])
      setSelectedVideo(null)
      setPreviewUrls([])
      setVideoPreviewUrl(null)
    }
  }, [open, initialContent, initialImages, initialVideo])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && !existingVideo && !selectedVideo) {
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

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && existingImages.length === 0 && selectedImages.length === 0) {
      // Validate video
      const validation = uploadService.validateVideo(file)
      if (!validation.valid) {
        alert(validation.error)
        return
      }

      setSelectedVideo(file)
      
      // Revoke old video preview URL
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
      
      setVideoPreviewUrl(URL.createObjectURL(file))
      
      // Remove existing video if uploading new one
      setExistingVideo(null)
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

  const handleRemoveNewVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setSelectedVideo(null)
    setVideoPreviewUrl(null)
  }

  const handleRemoveExistingVideo = () => {
    setExistingVideo(null)
  }

  const handleSubmit = async () => {
    if (!content.trim() && existingImages.length === 0 && selectedImages.length === 0 && !existingVideo && !selectedVideo) return

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
      const imageUrl = allImages.length > 0 ? allImages.join(',') : ''

      // Handle video
      let videoUrl: string = ''
      if (selectedVideo) {
        // Upload new video
        videoUrl = await uploadService.uploadVideo(selectedVideo)
      } else if (existingVideo && allImages.length === 0) {
        // Keep existing video only if there are no images
        videoUrl = existingVideo
      }
      // else: videoUrl stays '' to remove video

      console.log('=== EDIT POST DEBUG ===')
      console.log('existingImages:', existingImages)
      console.log('uploadedUrls:', uploadedUrls)
      console.log('allImages:', allImages)
      console.log('selectedVideo:', selectedVideo)
      console.log('existingVideo:', existingVideo)
      console.log('Final imageUrl:', imageUrl || undefined)
      console.log('Final videoUrl:', videoUrl || undefined)
      console.log('======================')

      // Prepare update data - always send imageUrl and videoUrl
      const updateData = {
        content: content.trim(),
        imageUrl: imageUrl || null,  // Send null instead of undefined to explicitly remove
        videoUrl: videoUrl || null,   // Send null instead of undefined to explicitly remove
      }

      console.log('Sending to server:', updateData)

      // Update post
      await postService.updatePost(postId, updateData)
      
      // Reset form
      setContent('')
      setSelectedImages([])
      setSelectedVideo(null)
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
      setVideoPreviewUrl(null)
      setExistingImages([])
      setExistingVideo(null)
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
  const hasVideo = !!existingVideo || !!selectedVideo

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-semibold">Edit Post</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar
              src={user?.avatar}
              name={user?.name || 'User'}
              size="md"
            />
            <p className="font-semibold text-gray-800">{user?.name}</p>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
            className="w-full h-32 resize-none border-0 focus:ring-0 outline-none text-gray-800 placeholder-gray-400 text-lg"
          />

          {/* AI Buttons for edit */}
          {content.trim() && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!content.trim()) return
                  setIsAiProcessing(true)
                  try {
                    const completed = await geminiService.completePost(content)
                    setContent(completed)
                  } catch (err) {
                    console.error('Failed to complete with AI:', err)
                    const e = err as { response?: { data?: { message?: string } }; message?: string }
                    const msg = e?.response?.data?.message || e?.message || 'Unknown error'
                    alert(`Failed to complete with AI: ${msg}`)
                  } finally {
                    setIsAiProcessing(false)
                  }
                }}
                disabled={isAiProcessing || isSubmitting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {isAiProcessing ? 'Processing...' : 'Complete with AI'}
              </button>

              <button
                onClick={async () => {
                  if (!content.trim()) return
                  setIsAiProcessing(true)
                  try {
                    const improved = await geminiService.improvePost(content)
                    setContent(improved)
                  } catch (err) {
                    console.error('Failed to improve with AI:', err)
                    const e = err as { response?: { data?: { message?: string } }; message?: string }
                    const msg = e?.response?.data?.message || e?.message || 'Unknown error'
                    alert(`Failed to improve with AI: ${msg}`)
                  } finally {
                    setIsAiProcessing(false)
                  }
                }}
                disabled={isAiProcessing || isSubmitting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                {isAiProcessing ? 'Processing...' : 'Improve with AI'}
              </button>
            </div>
          )}

          {/* Images Preview with Scroll */}
          {(existingImages.length > 0 || previewUrls.length > 0) && (
            <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2">
              <div className={`grid gap-2 ${totalImages === 1 ? 'grid-cols-1' : totalImages === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {/* Existing Images */}
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
                
                {/* New Images Preview */}
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
            </div>
          )}

          {/* Video Preview */}
          {existingVideo && !selectedVideo && (
            <div className="max-h-[300px] overflow-hidden border rounded-lg p-2">
              <div className="relative rounded-lg overflow-hidden">
                <video 
                  src={existingVideo} 
                  controls 
                  controlsList="nodownload"
                  className="w-full max-h-[280px] object-contain bg-black"
                />
                <button
                  onClick={handleRemoveExistingVideo}
                  className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-1.5 rounded-full shadow-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {videoPreviewUrl && (
            <div className="max-h-[300px] overflow-hidden border rounded-lg p-2">
              <div className="relative rounded-lg overflow-hidden">
                <video 
                  src={videoPreviewUrl} 
                  controls 
                  controlsList="nodownload"
                  className="w-full max-h-[280px] object-contain bg-black"
                />
                <button
                  onClick={handleRemoveNewVideo}
                  className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-1.5 rounded-full shadow-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Add to your post</span>
              <div className="flex gap-2">
                {totalImages < 10 && !hasVideo && (
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
                {totalImages === 0 && !hasVideo && (
                  <label className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    <Video className="w-5 h-5 text-red-500" />
                  </label>
                )}
              </div>
            </div>
            {totalImages >= 10 && (
              <p className="text-xs text-gray-500 mt-2">Maximum 10 images reached</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 shrink-0">
          <button 
            onClick={handleSubmit}
            disabled={(!content.trim() && totalImages === 0 && !hasVideo) || isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition cursor-pointer"
          >
            {isSubmitting ? 'Updating...' : 'Update Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
