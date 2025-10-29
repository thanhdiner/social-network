import { useState } from 'react'
import { Image as ImageIcon, X, Video } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import postService from '@/services/postService'
import uploadService from '@/services/uploadService'

interface CreatePostCardProps {
  onPostCreated?: () => void
}

export const CreatePostCard = ({ onPostCreated }: CreatePostCardProps) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && !selectedVideo) {
      // Limit to 10 images total
      const newFiles = [...selectedImages, ...files].slice(0, 10)
      setSelectedImages(newFiles)
      
      // Create preview URLs for new files
      const newUrls = newFiles.map(file => URL.createObjectURL(file))
      
      // Revoke old preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls(newUrls)
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && selectedImages.length === 0) {
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
    }
  }

  const handleRemoveImage = (index: number) => {
    const newFiles = selectedImages.filter((_, i) => i !== index)
    setSelectedImages(newFiles)
    
    URL.revokeObjectURL(previewUrls[index])
    const newUrls = previewUrls.filter((_, i) => i !== index)
    setPreviewUrls(newUrls)
  }

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setSelectedVideo(null)
    setVideoPreviewUrl(null)
  }

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0 && !selectedVideo) return

    setIsSubmitting(true)
    try {
      let imageUrl: string | undefined
      let videoUrl: string | undefined

      // Upload images if selected
      if (selectedImages.length > 0) {
        const uploadedUrls: string[] = []
        for (const image of selectedImages) {
          const url = await uploadService.uploadImage(image)
          uploadedUrls.push(url)
        }
        // Store as comma-separated URLs
        imageUrl = uploadedUrls.join(',')
      }

      // Upload video if selected
      if (selectedVideo) {
        videoUrl = await uploadService.uploadVideo(selectedVideo)
      }

      // Create post
      await postService.createPost({
        content: content.trim(),
        imageUrl,
        videoUrl,
      })
      
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
      setOpen(false)
      
      // Callback to refresh posts list
      onPostCreated?.()
    } catch (error) {
      console.error('Failed to create post:', error)
      alert('Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-5 shadow">
        <div className="flex items-start gap-3">
          <img 
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=fb923c&color=fff`} 
            alt={user?.name || 'User'} 
            className="w-12 h-12 rounded-full object-cover" 
          />
          <button
            onClick={() => setOpen(true)}
            className="flex-1 text-left text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-full px-4 py-3 transition cursor-pointer"
          >
            What's on your mind, {user?.name?.split(' ')[0]}?
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 -mb-2.5" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-semibold">Create Post</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
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
                  alt={user?.name || 'User'}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <p className="font-semibold">{user?.name}</p>
              </div>

              {/* Content Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
                className="w-full min-h-[150px] text-gray-800 placeholder-gray-400 resize-none focus:outline-none text-lg"
              />

              {/* Image Preview with Scroll */}
              {previewUrls.length > 0 && (
                <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2">
                  <div className={`grid gap-2 ${previewUrls.length === 1 ? 'grid-cols-1' : previewUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden border aspect-square">
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover bg-gray-100" />
                        <button
                          onClick={() => handleRemoveImage(index)}
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
                      onClick={handleRemoveVideo}
                      className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-1.5 rounded-full shadow-lg transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Add to Post */}
              <div className="border rounded-xl p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Add to your post</p>
                <div className="flex gap-2">
                  <label className={`${selectedVideo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'} p-2 rounded-full transition`}>
                    <ImageIcon className="w-6 h-6 text-green-500" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={!!selectedVideo}
                    />
                  </label>
                  <label className={`${selectedImages.length > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'} p-2 rounded-full transition`}>
                    <Video className="w-6 h-6 text-red-500" />
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                      disabled={selectedImages.length > 0}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white border-t px-6 py-4 shrink-0">
              <button
                onClick={handleSubmit}
                disabled={(!content.trim() && selectedImages.length === 0 && !selectedVideo) || isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition cursor-pointer"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
