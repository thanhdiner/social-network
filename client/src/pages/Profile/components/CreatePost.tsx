import { useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import postService from '@/services/postService'
import uploadService from '@/services/uploadService'

interface CreatePostProps {
  onPostCreated?: () => void
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      // Giới hạn tối đa 10 ảnh
      const newImages = [...selectedImages, ...files].slice(0, 10)
      setSelectedImages(newImages)

      // Tạo preview URLs
      const newUrls = newImages.map(file => URL.createObjectURL(file))
      // Revoke old URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls(newUrls)
    }
  }

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    setSelectedImages(newImages)

    // Revoke URL of removed image
    URL.revokeObjectURL(previewUrls[index])
    const newUrls = previewUrls.filter((_, i) => i !== index)
    setPreviewUrls(newUrls)
  }

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) return

    setIsSubmitting(true)
    try {
      let imageUrl: string | undefined

      // Upload images if selected
      if (selectedImages.length > 0) {
        const uploadedUrls: string[] = []
        for (const image of selectedImages) {
          const url = await uploadService.uploadImage(image)
          uploadedUrls.push(url)
        }
        // Store as comma-separated URLs for now
        imageUrl = uploadedUrls.join(',')
      }

      // Create post
      await postService.createPost({
        content: content.trim(),
        imageUrl
      })

      // Reset form
      setContent('')
      setSelectedImages([])
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])
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
            alt="avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
          <button
            onClick={() => setOpen(true)}
            className="flex-1 text-left text-gray-500 bg-gray-50 hover:bg-gray-100 border rounded-full px-4 py-2.5 transition cursor-pointer"
          >
            What's on your mind, {user?.name?.split(' ')[0]}?
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 -mb-2.5" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center border-b p-4 relative shrink-0">
              <h2 className="text-xl font-semibold text-gray-800">Create Post</h2>
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 text-gray-500 hover:bg-gray-100 p-2 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-3">
                <img
                  src={
                    user?.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=fb923c&color=fff`
                  }
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <p className="font-semibold text-gray-800">{user?.name}</p>
              </div>

              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
                className="w-full h-32 resize-none border-0 focus:ring-0 outline-none text-gray-800 placeholder-gray-400 text-lg"
              />

              {/* Image Preview with Scroll */}
              {previewUrls.length > 0 && (
                <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2">
                  <div
                    className={`grid gap-2 ${
                      previewUrls.length === 1 ? 'grid-cols-1' : previewUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
                    }`}
                  >
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

              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Add to your post</span>
                  <div className="flex gap-2">
                    <label className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition">
                      <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                      <ImageIcon className="w-5 h-5 text-green-500" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t p-4 shrink-0">
              <button
                onClick={handleSubmit}
                disabled={(!content.trim() && selectedImages.length === 0) || isSubmitting}
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
