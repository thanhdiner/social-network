import { useState, useEffect, useRef } from 'react'
import { X, Image as ImageIcon, Video, Sparkles, Wand2, Globe, Users, Lock, Check, ChevronDown, Loader2 } from 'lucide-react'
import geminiService from '@/services/geminiService'
import { useAuth } from '@/contexts/AuthContext'
import postService from '@/services/postService'
import uploadService from '@/services/uploadService'
import { Avatar } from './Avatar'

type Privacy = 'public' | 'friends' | 'private'

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: React.ReactNode }[] = [
  { value: 'public',  label: 'Công khai',    icon: <Globe className="w-4 h-4" /> },
  { value: 'friends', label: 'Bạn bè',       icon: <Users className="w-4 h-4" /> },
  { value: 'private', label: 'Chỉ mình tôi', icon: <Lock  className="w-4 h-4" /> },
]

interface EditPostModalProps {
  postId: string
  initialContent: string
  initialImages: string
  initialVideo?: string
  initialVisibility?: string
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export const EditPostModal = ({
  postId, initialContent, initialImages, initialVideo,
  initialVisibility = 'public', open, onClose, onUpdated,
}: EditPostModalProps) => {
  const { user } = useAuth()
  const [content, setContent]               = useState(initialContent)
  const [privacy, setPrivacy]               = useState<Privacy>((initialVisibility as Privacy) || 'public')
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedVideo, setSelectedVideo]   = useState<File | null>(null)
  const [previewUrls, setPreviewUrls]       = useState<string[]>([])
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [existingVideo, setExistingVideo]   = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting]     = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  const privacyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setContent(initialContent)
      setPrivacy((initialVisibility as Privacy) || 'public')
      setExistingImages(initialImages ? initialImages.split(',').filter(u => u.trim()) : [])
      setExistingVideo(initialVideo || null)
      setSelectedImages([]); setSelectedVideo(null)
      setPreviewUrls([]); setVideoPreviewUrl(null)
    }
  }, [open, initialContent, initialImages, initialVideo, initialVisibility])

  // Close privacy dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node))
        setShowPrivacyMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && !existingVideo && !selectedVideo) {
      if (existingImages.length + selectedImages.length + files.length > 10) {
        alert('Chỉ được tải lên tối đa 10 ảnh'); return
      }
      const newFiles = [...selectedImages, ...files].slice(0, 10 - existingImages.length)
      setSelectedImages(newFiles)
      previewUrls.forEach(u => URL.revokeObjectURL(u))
      setPreviewUrls(newFiles.map(f => URL.createObjectURL(f)))
    }
    e.target.value = ''
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && existingImages.length === 0 && selectedImages.length === 0) {
      const v = uploadService.validateVideo(file)
      if (!v.valid) { alert(v.error); return }
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
      setSelectedVideo(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
      setExistingVideo(null)
    }
    e.target.value = ''
  }

  const handleSubmit = async () => {
    const totalImages = existingImages.length + selectedImages.length
    const hasVideo = !!existingVideo || !!selectedVideo
    if (!content.trim() && totalImages === 0 && !hasVideo) return

    setIsSubmitting(true)
    try {
      const uploadedUrls: string[] = []
      for (const img of selectedImages) uploadedUrls.push(await uploadService.uploadImage(img))

      const allImages  = [...existingImages, ...uploadedUrls]
      const imageUrl   = allImages.length > 0 ? allImages.join(',') : null
      let   videoUrl: string | null = null
      if (selectedVideo)             videoUrl = await uploadService.uploadVideo(selectedVideo)
      else if (existingVideo && !imageUrl) videoUrl = existingVideo

      await postService.updatePost(postId, {
        content:    content.trim(),
        imageUrl:   imageUrl,
        videoUrl:   videoUrl,
        visibility: privacy,
      })

      // Cleanup
      previewUrls.forEach(u => URL.revokeObjectURL(u))
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
      onClose(); onUpdated()
    } catch {
      alert('Cập nhật bài viết thất bại. Vui lòng thử lại.')
    } finally { setIsSubmitting(false) }
  }

  if (!open) return null

  const totalImages = existingImages.length + selectedImages.length
  const hasVideo    = !!existingVideo || !!selectedVideo
  const currentPrivacy = PRIVACY_OPTIONS.find(p => p.value === privacy)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,12,40,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="w-10" />
          <h2 className="text-lg font-bold text-gray-800">Chỉnh sửa bài viết</h2>
          <button onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 active:scale-95 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* User + Privacy */}
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar} name={user?.name || 'User'} size="lg" />
            <div>
              <p className="font-bold text-gray-800 leading-tight">{user?.name}</p>
              {/* Privacy Dropdown */}
              <div ref={privacyRef} className="relative mt-1">
                <button
                  onClick={() => setShowPrivacyMenu(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {currentPrivacy.icon}
                  <span>{currentPrivacy.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPrivacyMenu ? 'rotate-180' : ''}`} />
                </button>
                {showPrivacyMenu && (
                  <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-10 py-1 overflow-hidden">
                    {PRIVACY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setPrivacy(opt.value); setShowPrivacyMenu(false) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                          privacy === opt.value ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className={privacy === opt.value ? 'text-orange-500' : 'text-gray-400'}>{opt.icon}</span>
                        {opt.label}
                        {privacy === opt.value && <Check className="w-3.5 h-3.5 ml-auto text-orange-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Nội dung bài viết..."
            className="w-full min-h-[120px] bg-transparent border-none focus:outline-none focus:ring-0 text-lg text-gray-800 placeholder-gray-400 resize-none"
            disabled={isAiProcessing}
          />

          {/* AI Buttons */}
          {content.trim() && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  if (!content.trim()) return
                  setIsAiProcessing(true)
                  try { setContent(await geminiService.completePost(content)) }
                  catch (err) {
                    const e = err as { response?: { data?: { message?: string } }; message?: string }
                    alert(`Lỗi AI: ${e?.response?.data?.message || e?.message || 'Unknown'}`)
                  } finally { setIsAiProcessing(false) }
                }}
                disabled={isAiProcessing || isSubmitting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition cursor-pointer"
              >
                {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Hoàn chỉnh với AI
              </button>
              <button
                onClick={async () => {
                  if (!content.trim()) return
                  setIsAiProcessing(true)
                  try { setContent(await geminiService.improvePost(content)) }
                  catch (err) {
                    const e = err as { response?: { data?: { message?: string } }; message?: string }
                    alert(`Lỗi AI: ${e?.response?.data?.message || e?.message || 'Unknown'}`)
                  } finally { setIsAiProcessing(false) }
                }}
                disabled={isAiProcessing || isSubmitting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition cursor-pointer"
              >
                {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Cải thiện với AI
              </button>
            </div>
          )}

          {/* Existing + new images */}
          {(existingImages.length > 0 || previewUrls.length > 0) && (
            <div className={`grid gap-2 ${totalImages === 1 ? 'grid-cols-1' : totalImages === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {existingImages.map((url, i) => (
                <div key={`e-${i}`} className="relative rounded-xl overflow-hidden aspect-square border border-gray-100">
                  <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {previewUrls.map((url, i) => (
                <div key={`n-${i}`} className="relative rounded-xl overflow-hidden aspect-square border border-gray-100">
                  <img src={url} alt={`New ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => {
                    URL.revokeObjectURL(url)
                    setSelectedImages(prev => prev.filter((_, idx) => idx !== i))
                    setPreviewUrls(prev => prev.filter((_, idx) => idx !== i))
                  }} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Existing video */}
          {existingVideo && !selectedVideo && (
            <div className="relative rounded-xl overflow-hidden border border-gray-100">
              <video src={existingVideo} controls controlsList="nodownload" className="w-full max-h-56 object-contain bg-black" />
              <button onClick={() => setExistingVideo(null)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* New video preview */}
          {videoPreviewUrl && (
            <div className="relative rounded-xl overflow-hidden border border-gray-100">
              <video src={videoPreviewUrl} controls controlsList="nodownload" className="w-full max-h-56 object-contain bg-black" />
              <button onClick={() => {
                if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
                setSelectedVideo(null); setVideoPreviewUrl(null)
              }} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm font-bold text-gray-500 px-1">Thêm vào bài viết</span>
            <div className="flex gap-1">
              {totalImages < 10 && !hasVideo && (
                <label className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer" title="Ảnh">
                  <ImageIcon className="w-5 h-5 text-green-600" />
                  <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                </label>
              )}
              {totalImages === 0 && !hasVideo && (
                <label className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer" title="Video">
                  <Video className="w-5 h-5 text-blue-500" />
                  <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                </label>
              )}
              {totalImages >= 10 && (
                <span className="text-xs text-gray-400 px-2 self-center">Tối đa 10 ảnh</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && totalImages === 0 && !hasVideo) || isSubmitting}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              (content.trim() || totalImages > 0 || hasVideo) && !isSubmitting
                ? 'bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white shadow-lg shadow-orange-200 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Đang lưu...</>
            ) : 'Lưu thay đổi'}
          </button>
        </footer>
      </div>
    </div>
  )
}
