import { useState } from 'react'
import { Image as ImageIcon, UserPlus, Smile, X, Globe, Users, UserX, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface CreatePostProps {
  onPostCreated?: () => void
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacy, setPrivacy] = useState<'Public' | 'Friends' | 'Friends except' | 'Only Me'>('Public')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() && !selectedImage) return

    setIsSubmitting(true)
    try {
      // TODO: Call API to create post
      console.log('Creating post:', { content, privacy, image: selectedImage })
      
      // Reset form
      setContent('')
      setSelectedImage(null)
      setPreviewUrl(null)
      setOpen(false)
      onPostCreated?.()
    } catch (error) {
      console.error('Failed to create post:', error)
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
            className="flex-1 text-left text-gray-500 bg-gray-50 hover:bg-gray-100 border rounded-full px-4 py-2.5 transition"
          >
            Write something here...
          </button>
        </div>

        <div className="flex justify-between items-center mt-3 border-t pt-3 text-sm">
          <div className="flex gap-3">
            <button 
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 text-orange-500 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition"
            >
              <ImageIcon size={18} /> Photo/Video
            </button>
            <button 
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 text-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
            >
              <UserPlus size={18} /> Tag Friend
            </button>
            <button 
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 text-yellow-600 hover:bg-yellow-50 px-3 py-1.5 rounded-lg transition"
            >
              <Smile size={18} /> Feeling/Activity
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center border-b p-4 relative">
              <h2 className="text-xl font-semibold text-gray-800">Create Post</h2>
              <button 
                onClick={() => setOpen(false)} 
                className="absolute right-4 text-gray-500 hover:bg-gray-100 p-2 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=fb923c&color=fff`} 
                  alt="avatar" 
                  className="w-10 h-10 rounded-full object-cover" 
                />
                <div>
                  <p className="font-semibold text-gray-800">{user?.name}</p>
                  <div className="relative">
                    <button
                      onClick={() => setPrivacyOpen(!privacyOpen)}
                      className="bg-gray-100 hover:bg-gray-200 text-xs px-2 py-1 rounded flex items-center gap-1 mt-1 transition"
                    >
                      {privacy === 'Public' && <Globe className="w-3 h-3" />}
                      {privacy === 'Friends' && <Users className="w-3 h-3" />}
                      {privacy === 'Friends except' && <UserX className="w-3 h-3" />}
                      {privacy === 'Only Me' && <Lock className="w-3 h-3" />}
                      {privacy}
                    </button>

                    {privacyOpen && (
                      <div
                        className="absolute left-0 top-full mt-1 w-64 bg-white shadow-lg border rounded-lg py-2 z-50"
                        onMouseLeave={() => setPrivacyOpen(false)}
                      >
                        <PrivacyItem
                          icon={<Globe className="w-5 h-5 text-blue-500" />}
                          title="Public"
                          desc="Anyone can see this"
                          active={privacy === 'Public'}
                          onClick={() => {
                            setPrivacy('Public')
                            setPrivacyOpen(false)
                          }}
                        />
                        <PrivacyItem
                          icon={<Users className="w-5 h-5 text-green-500" />}
                          title="Friends"
                          desc="Your friends can see"
                          active={privacy === 'Friends'}
                          onClick={() => {
                            setPrivacy('Friends')
                            setPrivacyOpen(false)
                          }}
                        />
                        <PrivacyItem
                          icon={<UserX className="w-5 h-5 text-yellow-500" />}
                          title="Friends except"
                          desc="Don't show to some friends"
                          active={privacy === 'Friends except'}
                          onClick={() => {
                            setPrivacy('Friends except')
                            setPrivacyOpen(false)
                          }}
                        />
                        <PrivacyItem
                          icon={<Lock className="w-5 h-5 text-gray-500" />}
                          title="Only Me"
                          desc="Only you can see this"
                          active={privacy === 'Only Me'}
                          onClick={() => {
                            setPrivacy('Only Me')
                            setPrivacyOpen(false)
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on your mind, ${user?.name}?`}
                className="w-full h-32 resize-none border-0 focus:ring-0 outline-none text-gray-800 placeholder-gray-400 text-lg"
              />

              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={previewUrl} alt="Preview" className="w-full max-h-96 object-contain bg-gray-100" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-2 rounded-full shadow-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Add to your post</span>
                  <div className="flex gap-2">
                    <label className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <ImageIcon className="w-5 h-5 text-green-500" />
                    </label>
                    <button className="hover:bg-gray-100 p-2 rounded-full transition">
                      <UserPlus className="w-5 h-5 text-blue-500" />
                    </button>
                    <button className="hover:bg-gray-100 p-2 rounded-full transition">
                      <Smile className="w-5 h-5 text-yellow-500" />
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={(!content.trim() && !selectedImage) || isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition"
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

const PrivacyItem = ({
  icon,
  title,
  desc,
  active,
  onClick
}: {
  icon: React.ReactNode
  title: string
  desc: string
  active?: boolean
  onClick: () => void
}) => (
  <button 
    onClick={onClick} 
    className={`flex items-start gap-3 px-3 py-2 w-full text-left hover:bg-gray-50 transition ${active ? 'bg-gray-100' : ''}`}
  >
    {icon}
    <div>
      <p className="font-medium text-sm text-gray-800">{title}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  </button>
)
