import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X, Sparkles, Wand2, Image, Video, Smile, MapPin, Tag, MoreHorizontal,
  Globe, ChevronDown, FolderPlus, Users, Lock, Check, Loader2, UserCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import postService from '@/services/postService'
import uploadService from '@/services/uploadService'
import geminiService from '@/services/geminiService'
import userService from '@/services/userService'
import { Avatar } from './Avatar'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreatePostCardProps {
  onPostCreated?: () => void
}

type Privacy = 'public' | 'friends' | 'private'

const PRIVACY_OPTIONS: { value: Privacy; label: string; icon: React.ReactNode }[] = [
  { value: 'public', label: 'Công khai', icon: <Globe className="w-4 h-4" /> },
  { value: 'friends', label: 'Bạn bè', icon: <Users className="w-4 h-4" /> },
  { value: 'private', label: 'Chỉ mình tôi', icon: <Lock className="w-4 h-4" /> },
]

// Emoji mood list
const MOOD_GROUPS = [
  {
    label: 'Cảm xúc',
    items: [
      { emoji: '😊', label: 'vui vẻ' }, { emoji: '😂', label: 'buồn cười' },
      { emoji: '😍', label: 'yêu thích' }, { emoji: '🥰', label: 'hạnh phúc' },
      { emoji: '😎', label: 'ngầu' }, { emoji: '🤩', label: 'phấn khích' },
      { emoji: '😢', label: 'buồn' }, { emoji: '😡', label: 'tức giận' },
      { emoji: '😴', label: 'buồn ngủ' }, { emoji: '🤔', label: 'đang suy nghĩ' },
      { emoji: '🥳', label: 'đang ăn mừng' }, { emoji: '😤', label: 'bực bội' },
      { emoji: '🤗', label: 'ôm ấp' }, { emoji: '😇', label: 'thánh thiện' },
      { emoji: '🫶', label: 'yêu thương' }, { emoji: '💪', label: 'mạnh mẽ' },
    ],
  },
  {
    label: 'Hoạt động',
    items: [
      { emoji: '🍽️', label: 'đang ăn' }, { emoji: '☕', label: 'đang uống cà phê' },
      { emoji: '✈️', label: 'đang du lịch' }, { emoji: '🏋️', label: 'đang tập gym' },
      { emoji: '📚', label: 'đang học' }, { emoji: '🎮', label: 'đang chơi game' },
      { emoji: '🎵', label: 'đang nghe nhạc' }, { emoji: '🏠', label: 'ở nhà' },
      { emoji: '🎉', label: 'đang tiệc tùng' }, { emoji: '🛒', label: 'đang mua sắm' },
      { emoji: '🌙', label: 'buổi tối' }, { emoji: '🌅', label: 'buổi sáng' },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export const CreatePostCard = ({ onPostCreated }: CreatePostCardProps) => {
  const { user } = useAuth()

  // Core state
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState<Privacy>('public')

  // Media
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Processing
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  // Mood picker
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [selectedMood, setSelectedMood] = useState<{ emoji: string; label: string } | null>(null)

  // Location
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [location, setLocation] = useState<string | null>(null)

  // Tag friends
  const [showTagPanel, setShowTagPanel] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<{ id: string; name: string; username: string; avatar: string | null }[]>([])
  const [taggedFriends, setTaggedFriends] = useState<{ id: string; name: string; username: string; avatar: string | null }[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)

  // Privacy dropdown
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false)

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const privacyRef = useRef<HTMLDivElement>(null)
  const moodRef = useRef<HTMLDivElement>(null)

  const canPost = content.trim() || selectedImages.length > 0 || selectedVideo

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node)) {
        setShowPrivacyMenu(false)
      }
      if (moodRef.current && !moodRef.current.contains(e.target as Node)) {
        setShowMoodPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Search friends for tagging
  const searchFriends = useCallback(async (q: string) => {
    if (!q.trim()) { setTagSuggestions([]); return }
    setIsLoadingTags(true)
    try {
      const results = await userService.getSuggestedUsers()
      const filtered = results
        .filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 8)
      setTagSuggestions(filtered)
    } catch {
      setTagSuggestions([])
    } finally { setIsLoadingTags(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchFriends(tagSearch), 300)
    return () => clearTimeout(t)
  }, [tagSearch, searchFriends])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = () => {
    setOpen(false)
    setShowMoodPicker(false)
    setShowTagPanel(false)
    setShowPrivacyMenu(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && !selectedVideo) {
      const newFiles = [...selectedImages, ...files].slice(0, 10)
      setSelectedImages(newFiles)
      previewUrls.forEach(u => URL.revokeObjectURL(u))
      setPreviewUrls(newFiles.map(f => URL.createObjectURL(f)))
    }
    e.target.value = ''
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && selectedImages.length === 0) {
      const v = uploadService.validateVideo(file)
      if (!v.valid) { alert(v.error); return }
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
      setSelectedVideo(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
    }
    e.target.value = ''
  }

  const handleRemoveImage = (i: number) => {
    URL.revokeObjectURL(previewUrls[i])
    setSelectedImages(selectedImages.filter((_, idx) => idx !== i))
    setPreviewUrls(previewUrls.filter((_, idx) => idx !== i))
  }

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setSelectedVideo(null)
    setVideoPreviewUrl(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (selectedVideo) return
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    const newFiles = [...selectedImages, ...files].slice(0, 10)
    setSelectedImages(newFiles)
    previewUrls.forEach(u => URL.revokeObjectURL(u))
    setPreviewUrls(newFiles.map(f => URL.createObjectURL(f)))
  }

  // Mood
  const handleSelectMood = (m: { emoji: string; label: string }) => {
    setSelectedMood(m)
    setShowMoodPicker(false)
  }

  const handleRemoveMood = () => setSelectedMood(null)

  // Location
  const handleGetLocation = () => {
    if (!navigator.geolocation) { alert('Trình duyệt không hỗ trợ định vị.'); return }
    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`
          )
          const data = await res.json()
          const city = data?.address?.city || data?.address?.town || data?.address?.county || data?.address?.state || 'Vị trí của tôi'
          const country = data?.address?.country || ''
          setLocation(country ? `${city}, ${country}` : city)
        } catch {
          setLocation('Vị trí của tôi')
        } finally { setIsGettingLocation(false) }
      },
      () => { alert('Không thể lấy vị trí. Vui lòng thử lại.'); setIsGettingLocation(false) },
      { timeout: 10000 }
    )
  }

  const handleRemoveLocation = () => setLocation(null)

  // Tag friends
  const handleToggleTag = (u: { id: string; name: string; username: string; avatar: string | null }) => {
    setTaggedFriends(prev =>
      prev.find(f => f.id === u.id) ? prev.filter(f => f.id !== u.id) : [...prev, u]
    )
  }

  // Insert mention into textarea
  const handleInsertMention = (u: { name: string; username: string }) => {
    const mention = `@${u.username} `
    const ta = textareaRef.current
    if (ta) {
      const start = ta.selectionStart
      const newContent = content.slice(0, start) + mention + content.slice(ta.selectionEnd)
      setContent(newContent)
      setTimeout(() => {
        ta.focus()
        ta.setSelectionRange(start + mention.length, start + mention.length)
      }, 0)
    } else {
      setContent(c => c + mention)
    }
    setShowTagPanel(false)
    setTagSearch('')
    setTagSuggestions([])
  }

  // AI
  const handleCompleteWithAI = async () => {
    if (!content.trim()) { alert('Hãy viết gì đó trước!'); return }
    setIsAiProcessing(true)
    try { setContent(await geminiService.completePost(content)) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      alert(`Lỗi AI: ${err?.response?.data?.message || err?.message || 'Unknown'}`)
    } finally { setIsAiProcessing(false) }
  }

  const handleImproveWithAI = async () => {
    if (!content.trim()) { alert('Hãy viết gì đó trước!'); return }
    setIsAiProcessing(true)
    try { setContent(await geminiService.improvePost(content)) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      alert(`Lỗi AI: ${err?.response?.data?.message || err?.message || 'Unknown'}`)
    } finally { setIsAiProcessing(false) }
  }

  // Submit
  const handleSubmit = async () => {
    if (!canPost) return
    setIsSubmitting(true)
    try {
      let imageUrl: string | undefined
      let videoUrl: string | undefined
      if (selectedImages.length > 0) {
        const urls: string[] = []
        for (const img of selectedImages) urls.push(await uploadService.uploadImage(img))
        imageUrl = urls.join(',')
      }
      if (selectedVideo) videoUrl = await uploadService.uploadVideo(selectedVideo)

      // Build rich content with mood/location/tags appended
      let richContent = content.trim()
      if (selectedMood) richContent += `\n đang cảm thấy ${selectedMood.emoji} ${selectedMood.label}`
      if (location) richContent += `\n 📍 ${location}`
      if (taggedFriends.length > 0) {
        const tags = taggedFriends.map(f => `@${f.username}`).join(' ')
        richContent += `\n 👥 Cùng với ${tags}`
      }

      await postService.createPost({ content: richContent || '', imageUrl, videoUrl, visibility: privacy })

      // Reset
      setContent(''); setSelectedImages([]); setSelectedVideo(null)
      previewUrls.forEach(u => URL.revokeObjectURL(u)); setPreviewUrls([])
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); setVideoPreviewUrl(null)
      setSelectedMood(null); setLocation(null); setTaggedFriends([])
      handleClose()
      onPostCreated?.()
    } catch { alert('Đăng bài thất bại. Vui lòng thử lại.') }
    finally { setIsSubmitting(false) }
  }

  const firstName = user?.name?.split(' ').slice(-1)[0] ?? 'bạn'
  const currentPrivacy = PRIVACY_OPTIONS.find(p => p.value === privacy)!

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar} name={user?.name || 'User'} size="lg" />
          <button
            onClick={() => setOpen(true)}
            className="flex-1 text-left text-gray-400 bg-gray-50 hover:bg-orange-50 hover:text-gray-500 border border-gray-200 hover:border-orange-200 rounded-full px-5 py-3 transition-all duration-200 cursor-pointer text-sm font-medium"
          >
            Bạn đang nghĩ gì, {firstName}?
          </button>
        </div>
        <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
          <button onClick={() => { setOpen(true); setTimeout(() => imageInputRef.current?.click(), 150) }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-green-600 hover:bg-green-50 transition-colors cursor-pointer">
            <Image className="w-4 h-4" /> Ảnh/Video
          </button>
          <button onClick={() => { setOpen(true); setTimeout(() => setShowMoodPicker(true), 150) }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-orange-500 hover:bg-orange-50 transition-colors cursor-pointer">
            <Smile className="w-4 h-4" /> Cảm xúc
          </button>
          <button onClick={() => { setOpen(true); setTimeout(handleGetLocation, 150) }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
            <MapPin className="w-4 h-4" /> Vị trí
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,12,40,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={handleClose}
        >
          <section
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="w-10" />
              <h2 className="text-lg font-bold text-gray-800">Tạo bài viết mới</h2>
              <button onClick={handleClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 active:scale-95 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

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
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors cursor-pointer ${privacy === opt.value ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
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
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`Bạn đang nghĩ gì, ${firstName}?`}
                className="w-full min-h-[100px] bg-transparent border-none focus:outline-none focus:ring-0 text-lg text-gray-800 placeholder-gray-400 resize-none"
                disabled={isAiProcessing}
              />

              {/* Mood / Location / Tagged chips */}
              {(selectedMood || location || taggedFriends.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {selectedMood && (
                    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-sm text-orange-700 font-medium">
                      {selectedMood.emoji} đang {selectedMood.label}
                      <button onClick={handleRemoveMood} className="hover:text-orange-900 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {location && (
                    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-red-50 border border-red-200 rounded-full text-sm text-red-700 font-medium">
                      📍 {location}
                      <button onClick={handleRemoveLocation} className="hover:text-red-900 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                  {taggedFriends.map(f => (
                    <span key={f.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 font-medium">
                      👤 {f.name}
                      <button onClick={() => setTaggedFriends(prev => prev.filter(t => t.id !== f.id))} className="hover:text-blue-900 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* AI Buttons */}
              {content.trim() && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleCompleteWithAI} disabled={isAiProcessing || isSubmitting}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer">
                    {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Hoàn chỉnh với AI
                  </button>
                  <button onClick={handleImproveWithAI} disabled={isAiProcessing || isSubmitting}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer">
                    {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Cải thiện với AI
                  </button>
                </div>
              )}

              {/* Media Dropzone */}
              {previewUrls.length === 0 && !videoPreviewUrl && (
                <div
                  className={`cursor-pointer rounded-xl border-2 border-dashed h-40 flex flex-col items-center justify-center transition-all duration-300
                    ${isDragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:bg-orange-50 hover:border-orange-300'}
                    ${selectedVideo ? 'opacity-40 pointer-events-none' : ''}`}
                  onClick={() => !selectedVideo && imageInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm text-orange-500 flex items-center justify-center mb-3">
                    <FolderPlus className="w-6 h-6" />
                  </div>
                  <p className="text-gray-700 font-semibold text-sm">Thêm ảnh/video</p>
                  <p className="text-gray-400 text-xs mt-1">hoặc kéo và thả vào đây</p>
                </div>
              )}

              {/* Image Previews */}
              {previewUrls.length > 0 && (
                <div className={`grid gap-2 ${previewUrls.length === 1 ? 'grid-cols-1' : previewUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden aspect-square border border-gray-100 bg-gray-50">
                      <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => handleRemoveImage(i)}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full shadow transition cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {previewUrls.length < 10 && !selectedVideo && (
                    <button onClick={() => imageInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-gray-200 aspect-square flex flex-col items-center justify-center text-gray-400 hover:border-orange-300 hover:text-orange-400 hover:bg-orange-50 transition cursor-pointer">
                      <FolderPlus className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium">Thêm</span>
                    </button>
                  )}
                </div>
              )}

              {/* Video Preview */}
              {videoPreviewUrl && (
                <div className="relative rounded-xl overflow-hidden border border-gray-100">
                  <video src={videoPreviewUrl} controls controlsList="nodownload" className="w-full max-h-56 object-contain bg-black" />
                  <button onClick={handleRemoveVideo}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full shadow transition cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ── Mood Picker Panel ── */}
              {showMoodPicker && (
                <div ref={moodRef} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                    <p className="font-bold text-gray-700 text-sm">Bạn đang cảm thấy gì?</p>
                    <button onClick={() => setShowMoodPicker(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 max-h-52 overflow-y-auto space-y-3">
                    {MOOD_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{group.label}</p>
                        <div className="grid grid-cols-4 gap-1">
                          {group.items.map(m => (
                            <button
                              key={m.label}
                              onClick={() => handleSelectMood(m)}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition cursor-pointer ${selectedMood?.label === m.label ? 'bg-orange-100 text-orange-600 font-semibold' : ''}`}
                            >
                              <span className="text-2xl">{m.emoji}</span>
                              <span className="leading-tight text-center">{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tag Friends Panel ── */}
              {showTagPanel && (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                    <p className="font-bold text-gray-700 text-sm">Gắn thẻ bạn bè</p>
                    <button onClick={() => setShowTagPanel(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <input
                      type="text"
                      value={tagSearch}
                      onChange={e => setTagSearch(e.target.value)}
                      placeholder="Tìm tên bạn bè..."
                      autoFocus
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition"
                    />
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
                      {isLoadingTags && (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      )}
                      {!isLoadingTags && tagSuggestions.length === 0 && tagSearch && (
                        <p className="text-center text-gray-400 text-sm py-3">Không tìm thấy người dùng</p>
                      )}
                      {!isLoadingTags && tagSuggestions.length === 0 && !tagSearch && (
                        <p className="text-center text-gray-400 text-sm py-3">Nhập tên để tìm kiếm</p>
                      )}
                      {tagSuggestions.map(u => {
                        const isTagged = taggedFriends.some(f => f.id === u.id)
                        return (
                          <div key={u.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${isTagged ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                            <button
                              onClick={() => handleToggleTag(u)}
                              className="flex items-center gap-3 flex-1 text-left"
                            >
                              <Avatar src={u.avatar} name={u.name} size="sm" />
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                                <p className="text-xs text-gray-400">@{u.username}</p>
                              </div>
                              {isTagged && <UserCheck className="w-4 h-4 text-orange-500 ml-auto" />}
                            </button>
                            <button
                              onClick={() => handleInsertMention(u)}
                              title="Thêm mention vào bài viết"
                              className="text-xs text-orange-500 hover:text-orange-700 font-medium px-2 py-1 rounded-lg hover:bg-orange-50 transition cursor-pointer shrink-0"
                            >
                              @mention
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick action chips */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowMoodPicker(v => !v); setShowTagPanel(false) }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all active:scale-95 text-left cursor-pointer ${showMoodPicker ? 'bg-orange-100 ring-1 ring-orange-300' : 'bg-gray-50 hover:bg-orange-50'}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500">
                    <Smile className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Cảm xúc/Hoạt động</span>
                </button>
                <button
                  onClick={() => { setShowTagPanel(v => !v); setShowMoodPicker(false) }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all active:scale-95 text-left cursor-pointer ${showTagPanel ? 'bg-blue-100 ring-1 ring-blue-300' : 'bg-gray-50 hover:bg-blue-50'}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500">
                    <Tag className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Gắn thẻ bạn bè</span>
                </button>
              </div>
            </div>

            {/* ── Footer ── */}
            <footer className="p-5 pt-2 shrink-0 border-t border-gray-100">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-4 border border-gray-100">
                <span className="text-sm font-bold text-gray-500 px-1">Thêm vào bài viết</span>
                <div className="flex gap-0.5">
                  {/* Image */}
                  <label className={`p-2 rounded-lg transition-colors cursor-pointer ${selectedVideo ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-200'}`} title="Ảnh">
                    <Image className="w-5 h-5 text-green-600" />
                    <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" disabled={!!selectedVideo} />
                  </label>
                  {/* Video */}
                  <label className={`p-2 rounded-lg transition-colors cursor-pointer ${selectedImages.length > 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-200'}`} title="Video">
                    <Video className="w-5 h-5 text-blue-500" />
                    <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" disabled={selectedImages.length > 0} />
                  </label>
                  {/* Mood */}
                  <button
                    onClick={() => { setShowMoodPicker(v => !v); setShowTagPanel(false) }}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${showMoodPicker || selectedMood ? 'bg-orange-100 text-orange-500' : 'hover:bg-gray-200 text-orange-400'}`}
                    title="Cảm xúc/Hoạt động">
                    <Smile className="w-5 h-5" />
                  </button>
                  {/* Location */}
                  <button
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${location ? 'bg-red-100 text-red-500' : 'hover:bg-gray-200 text-red-500'} disabled:opacity-50`}
                    title="Vị trí">
                    {isGettingLocation ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                  </button>
                  {/* Tag */}
                  <button
                    onClick={() => { setShowTagPanel(v => !v); setShowMoodPicker(false) }}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${showTagPanel || taggedFriends.length > 0 ? 'bg-blue-100 text-blue-500' : 'hover:bg-gray-200 text-blue-500'}`}
                    title="Gắn thẻ bạn bè">
                    <Tag className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500 cursor-pointer" title="Thêm">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canPost || isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                  canPost && !isSubmitting
                    ? 'bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white shadow-lg shadow-orange-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Đang đăng...</>
                ) : 'Đăng bài'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
