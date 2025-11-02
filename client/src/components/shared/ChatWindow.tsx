import { useState, useEffect, useRef, useCallback, useTransition, memo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Minus,
  Send,
  Maximize2,
  Image as ImageIcon,
  Smile,
  ChevronDown,
  User as UserIcon,
  Trash2,
  Ban,
  ShieldOff,
  Phone,
  Video,
  MoreVertical,
  Copy,
  Reply,
  Paperclip,
  Play,
  Pause
} from 'lucide-react'
import RecordRTC from 'recordrtc'
import { useChat } from '../../contexts/ChatContext'
import { useAuth } from '../../contexts/AuthContext'
import { chatService } from '../../services/chatService'
import socketService from '../../services/socketService'
import voiceCallService from '../../services/voiceCallService'
import { EmojiPicker } from './EmojiPicker'
import { ImageViewer } from './ImageViewer'
import uploadService from '../../services/uploadService'
import type { Message, User } from '../../types'
import { Avatar } from './Avatar'
import { saveMessagesCache, clearMessagesCache, clearConversationsCache } from '../../utils/chatCache'
import { ChatMessageSkeleton } from './ChatMessageSkeleton'
import userService from '../../services/userService'
import { MessageStatus } from './MessageStatus'

// Custom Audio Player Component - Memoized for performance
interface AudioPlayerProps {
  audioUrl: string
  isOwn: boolean
}

const AudioPlayerBase = ({ audioUrl, isOwn }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="px-2 py-2">
      <div className={`flex items-center gap-2 rounded-full px-2 py-2 w-[146px] ${isOwn ? 'bg-white/20' : 'bg-orange-500'}`}>
        <button onClick={togglePlay} className="shrink-0 cursor-pointer">
          {isPlaying ? (
            <Pause className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-white'} fill-current`} />
          ) : (
            <Play className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-white'} fill-current`} />
          )}
        </button>

        {/* Simple progress bar instead of 30 divs */}
        <div className="flex-1 relative h-6 flex items-center">
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Duration */}
        <span className={`text-[10px] font-medium ${isOwn ? 'text-white' : 'text-white'} min-w-7`}>
          {formatTime(currentTime > 0 ? currentTime : duration)}
        </span>

        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      </div>
    </div>
  )
}

const AudioPlayer = memo(AudioPlayerBase, (prev, next) => {
  return prev.audioUrl === next.audioUrl && prev.isOwn === next.isOwn
})

AudioPlayer.displayName = 'AudioPlayer'

interface ChatWindowProps {
  user: User
  isMinimized: boolean
  onClose: () => void
  onMinimize: () => void
}

export const ChatWindow = ({ user, isMinimized, onClose, onMinimize }: ChatWindowProps) => {
  // Voice recording state
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioPreview, setAudioPreview] = useState<string>('')
  const recorderRef = useRef<any>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const { conversations, markAsRead, onlineUsers, typingUsers, setTyping, loadConversations } = useChat()
  const [messages, setMessages] = useState<Message[]>([])
  const [, startTransition] = useTransition()
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true) // Bắt đầu với loading = true
  const [initialLoadDone, setInitialLoadDone] = useState(false) // Track xem đã load xong chưa
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<number | null>(null)
  const isTypingRef = useRef(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const MAX_CACHE = 50
  const CHUNK = 15
  const [visibleCount, setVisibleCount] = useState(CHUNK)
  const [showScrollToLatest, setShowScrollToLatest] = useState(false)
  const atBottomRef = useRef(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [hasBlocked, setHasBlocked] = useState(false) // User đã block mình
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null) // messageId
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const messageMenuRef = useRef<HTMLDivElement>(null)
  const [showEmojiReactions, setShowEmojiReactions] = useState<string | null>(null) // messageId
  const emojiReactionsRef = useRef<HTMLDivElement>(null)

  const quickReactions = ['❤️', '😂', '😮', '😢', '😡', '👍']

  const isUserOnline = onlineUsers.has(user.id)
  const isUserTyping = user.id !== currentUser?.id && (typingUsers.get(user.id) || false)

  // Handle typing indicator - optimized to reduce re-renders
  const handleTypingChange = useCallback((typing: boolean) => {
    if (isTypingRef.current === typing) return // Skip if state hasn't changed
    isTypingRef.current = typing
    setTyping(user.id, typing)
  }, [user.id, setTyping])

  // Reset initialLoadDone when switching to a different user
  useEffect(() => {
    setInitialLoadDone(false)
    setMessages([])
    setVisibleCount(CHUNK)
  }, [user.id])

  // Fetch messages when opening/un-minimizing with caching
  useEffect(() => {
    const run = async () => {
      if (isMinimized) return

      // Nếu đã load xong rồi thì skip (tránh fetch lại khi re-render)
      if (initialLoadDone) return

      try {
        setLoading(true)
        // Always fetch from server to get fresh messages (including messages sent while window was closed)
        const data = await chatService.getMessages(user.id)
        const capped = data.slice(-MAX_CACHE)
        setMessages(capped)
        setVisibleCount(Math.min(CHUNK, capped.length))
        saveMessagesCache(user.id, capped)
        setLoading(false)
        setInitialLoadDone(true)
      } catch (error) {
        console.error('Failed to load messages:', error)
        setLoading(false)
        setInitialLoadDone(true)
      }

      // Mark as read after a delay to allow user to see "Delivered" status first
      const convCheck = conversations?.find(c => c.participantId === user.id)
      if (convCheck && convCheck.unreadCount > 0) {
        // Delay 1.5 seconds to show "Delivered" status before "Seen"
        setTimeout(() => {
          markAsRead(user.id)
        }, 1500)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, isMinimized])

  // Socket event for new messages
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (
        (message.senderId === user.id && message.receiverId === currentUser?.id) ||
        (message.senderId === currentUser?.id && message.receiverId === user.id)
      ) {
        startTransition(() => {
          setMessages(prev => {
            // Avoid duplicates - check if message already exists
            if (prev.some(m => m.id === message.id)) {
              return prev
            }
            const next = [...prev, message]
            // keep only last MAX_CACHE in RAM
            const capped = next.slice(-MAX_CACHE)

            // Lưu vào cache
            saveMessagesCache(user.id, capped)

            return capped
          })

          // Update visibleCount to show the new message
          setVisibleCount(prev => prev + 1)
        })

        if (message.senderId === user.id && !isMinimized) {
          markAsRead(user.id)
        }
      }
    }

    const handleMessagesDelivered = (event: Event) => {
      const customEvent = event as CustomEvent
      const { messageIds, deliveredAt } = customEvent.detail

      startTransition(() => {
        setMessages(prev => {
          const updated = prev.map(msg => (messageIds.includes(msg.id) ? { ...msg, deliveredAt } : msg))
          saveMessagesCache(user.id, updated)
          return updated
        })
      })
    }

    const handleMessagesRead = (event: Event) => {
      const customEvent = event as CustomEvent
      const { messageIds, readAt } = customEvent.detail

      startTransition(() => {
        setMessages(prev => {
          const updated = prev.map(msg => (messageIds.includes(msg.id) ? { ...msg, readAt, read: true } : msg))
          saveMessagesCache(user.id, updated)
          return updated
        })
      })
    }

    const handleReactionAdded = (event: Event) => {
      const customEvent = event as CustomEvent
      const { messageId, reaction } = customEvent.detail

      startTransition(() => {
        setMessages(prev => {
          const updated = prev.map(msg => {
            if (msg.id === messageId) {
              // Remove existing reaction from this user (if changing emoji)
              const filteredReactions = (msg.reactions || []).filter(r => r.userId !== reaction.userId)
              return {
                ...msg,
                reactions: [...filteredReactions, reaction]
              }
            }
            return msg
          })
          saveMessagesCache(user.id, updated)
          return updated
        })
      })
    }

    const handleReactionRemoved = (event: Event) => {
      const customEvent = event as CustomEvent
      const { messageId, userId } = customEvent.detail

      startTransition(() => {
        setMessages(prev => {
          const updated = prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                reactions: (msg.reactions || []).filter(r => r.userId !== userId)
              }
            }
            return msg
          })
          saveMessagesCache(user.id, updated)
          return updated
        })
      })
    }

    const handleMessageUnsent = (event: Event) => {
      const customEvent = event as CustomEvent
      const { messageId } = customEvent.detail

      startTransition(() => {
        setMessages(prev => {
          const updated = prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                unsent: true
              }
            }
            return msg
          })
          saveMessagesCache(user.id, updated)
          return updated
        })
      })
    }

    socketService.getSocket()?.on('new_message', handleNewMessage)
    window.addEventListener('messages_delivered', handleMessagesDelivered)
    window.addEventListener('messages_read', handleMessagesRead)
    window.addEventListener('reaction_added', handleReactionAdded)
    window.addEventListener('reaction_removed', handleReactionRemoved)
    window.addEventListener('message_unsent', handleMessageUnsent)

    return () => {
      socketService.getSocket()?.off('new_message', handleNewMessage)
      window.removeEventListener('messages_delivered', handleMessagesDelivered)
      window.removeEventListener('messages_read', handleMessagesRead)
      window.removeEventListener('reaction_added', handleReactionAdded)
      window.removeEventListener('reaction_removed', handleReactionRemoved)
      window.removeEventListener('message_unsent', handleMessageUnsent)
    }
  }, [user.id, currentUser?.id, isMinimized, markAsRead])

  // Close attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false)
      }
    }

    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAttachmentMenu])

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const el = messagesContainerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
    // Fallback to sentinel element and double-pass to finish after layout
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    requestAnimationFrame(() => {
      const el2 = messagesContainerRef.current
      if (el2) el2.scrollTop = el2.scrollHeight
    })
    window.setTimeout(() => {
      const el3 = messagesContainerRef.current
      if (el3) el3.scrollTop = el3.scrollHeight
    }, 80)
  }

  // Ensure scroll to bottom after loading finishes (no animation)
  useEffect(() => {
    if (!isMinimized && !loading) {
      scrollToBottom('auto')
    }
  }, [loading, isMinimized])

  // Focus input when opened
  useEffect(() => {
    if (!isMinimized) {
      inputRef.current?.focus()
    }
  }, [isMinimized])

  // Update menu position when scrolling
  useEffect(() => {
    const updateMenuPosition = () => {
      if (menuButtonRef.current && messageMenuOpen) {
        const rect = menuButtonRef.current.getBoundingClientRect()
        const container = messagesContainerRef.current

        // Close menu if button is scrolled out of view
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const isOutOfView = rect.bottom < containerRect.top || rect.top > containerRect.bottom

          if (isOutOfView) {
            setMessageMenuOpen(null)
            setMenuPosition(null)
            return
          }

          // Menu height approximately 200px, check if enough space above
          const menuHeight = 200
          const spaceAbove = rect.top - containerRect.top

          // Close if not enough space above (menu only shows above, not below)
          if (spaceAbove < menuHeight) {
            setMessageMenuOpen(null)
            setMenuPosition(null)
            return
          }
        }

        const isOwn = messages.find(m => m.id === messageMenuOpen)?.senderId === currentUser?.id
        // Position menu ABOVE the button
        setMenuPosition({
          top: rect.top - 200 - 5, // 200 is approximate menu height, 5 is gap
          left: isOwn ? rect.right - 160 : rect.left
        })
      }
    }

    const container = messagesContainerRef.current
    if (container && messageMenuOpen) {
      container.addEventListener('scroll', updateMenuPosition)
      window.addEventListener('resize', updateMenuPosition)
      return () => {
        container.removeEventListener('scroll', updateMenuPosition)
        window.removeEventListener('resize', updateMenuPosition)
      }
    }
  }, [messageMenuOpen, messages, currentUser?.id])

  // When reopening (un-minimizing), mark as read
  useEffect(() => {
    if (!isMinimized) {
      markAsRead(user.id)
    }
  }, [isMinimized, markAsRead, user.id])

  // Keep scrolled to bottom when the other user is typing
  useEffect(() => {
    if (!isMinimized && isUserTyping) {
      scrollToBottom('smooth')
    }
  }, [isUserTyping, isMinimized])

  // Track bottom state and show scroll-to-latest button
  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const nearTop = el.scrollTop < 40
    if (nearTop) {
      setVisibleCount(c => Math.min(c + CHUNK, messages.length))
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8
    atBottomRef.current = atBottom
    setShowScrollToLatest(!atBottom)
  }

  // When messages change, if user is at bottom then stay pinned to bottom
  useEffect(() => {
    if (!isMinimized && atBottomRef.current) {
      scrollToBottom('auto')
    }
  }, [messages, isMinimized])

  // Caching disabled – do not persist

  // No blocking: removed block status fetching and actions

  const handleDeleteLocal = async () => {
    if (confirm(`Delete all messages with ${user.name}? This action cannot be undone.`)) {
      try {
        // Delete on server (mark as deleted for current user)
        await chatService.deleteConversation(user.id)
        // Clear local state and cache
        setMessages([])
        clearMessagesCache(user.id)
        clearConversationsCache() // Clear conversations cache to refresh list
        setMenuOpen(false)
        // Reload conversations to remove from list
        loadConversations()
        onClose()
        alert('All messages deleted')
      } catch (error) {
        console.error('Failed to delete conversation:', error)
        alert('An error occurred, please try again')
      }
    }
  }

  const handleBlockUser = async () => {
    try {
      if (isBlocked) {
        await userService.unblockUser(user.id)
        setIsBlocked(false)
        alert('User unblocked')
      } else {
        if (confirm(`Are you sure you want to block ${user.name}? You will not be able to message this person.`)) {
          await userService.blockUser(user.id)
          setIsBlocked(true)
          setMenuOpen(false)
          onClose()
          alert('User blocked')
        }
      }
    } catch (error) {
      console.error('Failed to block/unblock user:', error)
      alert('An error occurred, please try again')
    }
  }

  // Check block status when opening
  useEffect(() => {
    const checkBlock = async () => {
      try {
        const status = await userService.checkBlockStatus(user.id)
        setIsBlocked(status.isBlocked) // Mình đã block user này
        setHasBlocked(status.hasBlocked) // User này đã block mình
      } catch (error) {
        console.error('Failed to check block status:', error)
      }
    }
    checkBlock()
  }, [user.id])

  // Close menu when clicking outside (use 'click' to avoid mousedown/click race)
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (messageMenuRef.current && !messageMenuRef.current.contains(e.target as Node)) {
        setMessageMenuOpen(null)
      }
      if (emojiReactionsRef.current && !emojiReactionsRef.current.contains(e.target as Node)) {
        setShowEmojiReactions(null)
      }
    }
    if (menuOpen || messageMenuOpen || showEmojiReactions) document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpen, messageMenuOpen, showEmojiReactions])

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedImages.length === 0 && !selectedVideo && !audioBlob) return

    const content = newMessage.trim() || (audioBlob ? '🎤 Voice message' : selectedVideo ? '🎥 Video' : '📷 Photo')
    const replyToId = replyingTo?.id
    setNewMessage('')
    setReplyingTo(null) // Clear reply state

    // Stop typing indicator
    handleTypingChange(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    try {
      let imageUrl: string | undefined
      let videoUrl: string | undefined
      let audioUrl: string | undefined

      // Upload audio if recorded
      if (audioBlob) {
        setUploading(true)
        audioUrl = await uploadService.uploadAudio(audioBlob)

        // Clear audio preview
        if (audioPreview) {
          URL.revokeObjectURL(audioPreview)
        }
        setAudioBlob(null)
        setAudioPreview('')
        setUploading(false)
      }
      // Upload video if selected
      else if (selectedVideo) {
        setUploading(true)
        videoUrl = await uploadService.uploadVideo(selectedVideo)

        // Clear video preview
        if (videoPreview) {
          URL.revokeObjectURL(videoPreview)
        }
        setSelectedVideo(null)
        setVideoPreview('')
        setUploading(false)
      }
      // Upload images if selected
      else if (selectedImages.length > 0) {
        setUploading(true)
        const uploadedUrls: string[] = []
        for (const file of selectedImages) {
          const url = await uploadService.uploadImage(file)
          uploadedUrls.push(url)
        }
        imageUrl = uploadedUrls.join(',')

        // Clear image previews
        setSelectedImages([])
        setImagePreviews([])
        setUploading(false)
      }

      // Send message with replyToId if replying
      const sentMessage = await chatService.sendMessage({
        receiverId: user.id,
        content,
        imageUrl,
        videoUrl,
        audioUrl,
        replyToId
      })

      // Optimistically add message to UI
      if (sentMessage) {
        setMessages(prev => {
          // Check if message already exists (from socket)
          if (prev.some(m => m.id === sentMessage.id)) {
            return prev
          }
          const next = [...prev, sentMessage]
          const capped = next.slice(-MAX_CACHE)
          saveMessagesCache(user.id, capped)
          return capped
        })

        // Update visibleCount to show the new message
        setVisibleCount(prev => prev + 1)
      }

      // Scroll to bottom immediately while waiting for echo
      scrollToBottom('auto')
    } catch (error) {
      console.error('Failed to send message:', error)
      setNewMessage(content) // Restore message on error
      setUploading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newFiles: File[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const validation = uploadService.validateImage(file)
      if (!validation.valid) {
        alert(validation.error || 'Invalid image')
        continue
      }
      newFiles.push(file)
    }

    if (newFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Limit to max 10 images per message
    const combined = [...selectedImages, ...newFiles].slice(0, 10)
    setSelectedImages(combined)

    // Generate previews for combined list
    const readers: Promise<string>[] = combined.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    })
    void Promise.all(readers).then(results => setImagePreviews(results))
  }

  const handleRemoveImage = (index: number) => {
    const newFiles = [...selectedImages]
    newFiles.splice(index, 1)
    setSelectedImages(newFiles)
    const newPreviews = [...imagePreviews]
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file')
      return
    }

    const validation = uploadService.validateVideo(file)
    if (!validation.valid) {
      alert(validation.error || 'Invalid video')
      if (videoInputRef.current) videoInputRef.current.value = ''
      return
    }

    // Clear images if video is selected
    setSelectedImages([])
    setImagePreviews([])
    if (fileInputRef.current) fileInputRef.current.value = ''

    setSelectedVideo(file)

    // Generate video preview
    const url = URL.createObjectURL(file)
    setVideoPreview(url)
  }

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    setSelectedVideo(null)
    setVideoPreview('')
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleGoToFullPage = () => {
    navigate(`/chat?userId=${user.id}`)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="w-80 h-[420px] bg-white rounded-t-lg shadow-2xl border border-gray-200 flex flex-col overflow-visible">
      {/* Header */}
      <div className="bg-linear-to-r from-orange-500 to-orange-600 text-white p-3 flex items-center justify-between shrink-0 relative rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="relative cursor-pointer"
            onClick={e => {
              e.stopPropagation()
              setMenuOpen(v => !v)
            }}
          >
            <Avatar src={user.avatar || undefined} name={user.name} size="sm" className="w-8 h-8" />
            {isUserOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-semibold truncate cursor-pointer flex items-center gap-1 hover:opacity-90"
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(v => !v)
              }}
            >
              <span>{user.name}</span>
              <ChevronDown className="w-4 h-4 shrink-0" />
            </div>
            {isUserOnline ? <div className="text-xs opacity-90">Active now</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {currentUser?.id !== user.id && (
            <>
              <button
                onClick={() => {
                  console.log('Voice call button clicked', { user, currentUser })
                  if (currentUser) {
                    console.log('Starting call to', user.id)
                    voiceCallService.startCall(user.id, user.name, user.avatar || null)
                  } else {
                    console.error('No current user')
                  }
                }}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                title="Voice call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => alert('Video call feature coming soon')}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                title="Video call"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={handleGoToFullPage}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Open full page"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onMinimize} className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer" title="Minimize">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute top-14 left-3 z-50 bg-white text-gray-800 rounded-xl shadow-lg border w-52 overflow-hidden"
          >
            {currentUser?.id !== user.id && (
              <>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                  onClick={() => window.open(`/profile/${user.username || user.id}`, '_self')}
                >
                  <UserIcon className="w-4 h-4 text-orange-500" />
                  <span>View Profile</span>
                </button>

                <button className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 cursor-pointer" onClick={handleBlockUser}>
                  {isBlocked ? (
                    <>
                      <ShieldOff className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Unblock User</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-600">Block User</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-red-600 cursor-pointer"
              onClick={handleDeleteLocal}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete All Messages</span>
            </button>
          </div>
        )}
      </div>

      {/* Body - Hidden when minimized */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="relative flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 bg-gray-50 min-h-0 chat-messages"
          >
            {!initialLoadDone || (loading && messages.length === 0) ? (
              <ChatMessageSkeleton />
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Avatar src={user.avatar || undefined} name={user.name} size="xl" className="w-16 h-16 mb-2" />
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm">Start the conversation</p>
              </div>
            ) : (
              messages.slice(Math.max(messages.length - visibleCount, 0)).map((message, index, arr) => {
                const isOwn = message.senderId === currentUser?.id
                const showAvatar = !isOwn && (index === arr.length - 1 || arr[index + 1]?.senderId !== message.senderId)

                return (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className={`flex gap-1 animate-fadeIn group items-center ${isOwn ? 'flex-row-reverse' : ''}`}
                    style={{ animation: 'fadeIn 0.3s ease-in' }}
                  >
                    {/* Only show avatar for the other user */}
                    <div className={isOwn ? 'w-0' : 'w-6 shrink-0'}>
                      {showAvatar && <Avatar src={user.avatar || undefined} name={user.name} size="xs" className="w-6 h-6" />}
                    </div>

                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[65%] relative`}>
                      {/* Emoji reactions picker - shown above message */}
                      {showEmojiReactions === message.id && (
                        <div
                          ref={emojiReactionsRef}
                          onClick={e => e.stopPropagation()}
                          className="mb-1 bg-white border border-gray-200 rounded-full shadow-lg px-2 py-2 z-50 flex items-center gap-1"
                        >
                          {quickReactions.map(emoji => (
                            <button
                              key={emoji}
                              onClick={async () => {
                                try {
                                  await chatService.addReaction(message.id, emoji)
                                  // Update local state
                                  setMessages(prev =>
                                    prev.map(msg =>
                                      msg.id === message.id
                                        ? {
                                            ...msg,
                                            reactions: [
                                              ...(msg.reactions || []).filter(r => r.userId !== currentUser?.id),
                                              {
                                                id: Date.now().toString(),
                                                userId: currentUser?.id || '',
                                                emoji,
                                                createdAt: new Date().toISOString()
                                              }
                                            ]
                                          }
                                        : msg
                                    )
                                  )
                                  setShowEmojiReactions(null)
                                } catch (error) {
                                  console.error('Failed to add reaction:', error)
                                }
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-full cursor-pointer transition-transform hover:scale-125"
                              title={emoji}
                            >
                              <span className="text-xl">{emoji}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div
                        className={`rounded-2xl transition-all hover:shadow-md ${message.imageUrl || message.videoUrl ? '' : 'px-3 py-2'} ${
                          isOwn ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        } ${message.unsent ? 'opacity-60 italic' : ''}`}
                      >
                        {message.unsent ? (
                          <p className={`text-sm italic ${isOwn ? 'text-white/90' : 'text-gray-600'}`}>Message unsent</p>
                        ) : (
                          <>
                            {/* Reply preview */}
                            {message.replyTo && (
                              <div
                                onClick={() => {
                                  // Scroll to original message
                                  if (message.replyTo?.id) {
                                    const element = document.getElementById(`message-${message.replyTo.id}`)
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                      // Highlight effect
                                      element.classList.add('highlight-message')
                                      setTimeout(() => {
                                        element.classList.remove('highlight-message')
                                      }, 2000)
                                    }
                                  }
                                }}
                                className={`px-3 py-2 border-l-4 ${
                                  isOwn
                                    ? 'border-orange-300 bg-orange-400/30 hover:bg-orange-400/50'
                                    : 'border-gray-400 bg-gray-200/50 hover:bg-gray-300/70'
                                } mx-2 mt-2 rounded cursor-pointer transition-colors`}
                              >
                                <p className={`text-xs font-semibold ${isOwn ? 'text-orange-100' : 'text-gray-700'}`}>
                                  {message.replyTo.sender?.name || 'Unknown'}
                                </p>
                                <p className={`text-xs truncate ${isOwn ? 'text-orange-50' : 'text-gray-600'}`}>
                                  {message.replyTo.audioUrl
                                    ? '🎤 Voice message'
                                    : message.replyTo.videoUrl
                                    ? '🎥 Video'
                                    : message.replyTo.imageUrl
                                    ? '📷 Photo'
                                    : message.replyTo.content}
                                </p>
                              </div>
                            )}

                            {(() => {
                              const imgs = (message.imageUrl || '')
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean)
                              if (imgs.length > 0) {
                                return (
                                  <div className={imgs.length === 1 ? '' : 'grid grid-cols-2 gap-1 p-1'}>
                                    {imgs.map((url, i) => (
                                      <div key={i} className={`overflow-hidden ${imgs.length === 1 ? '' : 'aspect-square'} rounded-2xl`}>
                                        <img
                                          src={url}
                                          alt={`Shared image ${i + 1}`}
                                          className={`object-cover cursor-pointer ${
                                            imgs.length === 1 ? 'max-w-full max-h-60 rounded-2xl' : 'w-full h-full'
                                          }`}
                                          onClick={() => {
                                            setViewerImages(imgs)
                                            setViewerIndex(i)
                                            setViewerOpen(true)
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )
                              }
                              return null
                            })()}

                            {/* Video */}
                            {message.videoUrl && (
                              <div className="rounded-2xl overflow-hidden">
                                <video src={message.videoUrl} className="max-w-full max-h-60 w-full" controls />
                              </div>
                            )}

                            {/* Audio */}
                            {message.audioUrl && <AudioPlayer audioUrl={message.audioUrl} isOwn={isOwn} />}

                            {message.content &&
                              message.content !== '📷 Photo' &&
                              message.content !== '🎥 Video' &&
                              message.content !== '🎤 Voice message' && (
                                <p
                                  className={`text-sm wrap-break-word ${
                                    message.imageUrl || message.videoUrl || message.audioUrl ? 'px-3 py-2' : ''
                                  }`}
                                >
                                  {message.content}
                                </p>
                              )}
                          </>
                        )}
                      </div>

                      {/* Reactions display */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div
                          className={`flex items-center gap-0.5 mt-1 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm`}
                        >
                          {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
                            const count = message.reactions?.filter(r => r.emoji === emoji).length || 0
                            const hasMyReaction = message.reactions?.some(r => r.emoji === emoji && r.userId === currentUser?.id)
                            return (
                              <button
                                key={emoji}
                                onClick={async () => {
                                  try {
                                    if (hasMyReaction) {
                                      await chatService.removeReaction(message.id)
                                      setMessages(prev =>
                                        prev.map(msg =>
                                          msg.id === message.id
                                            ? { ...msg, reactions: msg.reactions?.filter(r => r.userId !== currentUser?.id) }
                                            : msg
                                        )
                                      )
                                    } else {
                                      await chatService.addReaction(message.id, emoji)
                                      setMessages(prev =>
                                        prev.map(msg =>
                                          msg.id === message.id
                                            ? {
                                                ...msg,
                                                reactions: [
                                                  ...(msg.reactions || []).filter(r => r.userId !== currentUser?.id),
                                                  {
                                                    id: Date.now().toString(),
                                                    userId: currentUser?.id || '',
                                                    emoji,
                                                    createdAt: new Date().toISOString()
                                                  }
                                                ]
                                              }
                                            : msg
                                        )
                                      )
                                    }
                                  } catch (error) {
                                    console.error('Failed to toggle reaction:', error)
                                  }
                                }}
                                className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full cursor-pointer transition-colors ${
                                  hasMyReaction ? 'bg-orange-100' : 'hover:bg-gray-100'
                                }`}
                              >
                                <span className="text-sm">{emoji}</span>
                                {count > 1 && <span className="text-xs text-gray-600">{count}</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {showAvatar && (
                        <span className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-1">{formatTime(message.createdAt)}</span>
                      )}
                      {/* Show timestamp for my messages */}
                      {isOwn && (
                        <span className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-1">
                          {formatTime(message.createdAt)}
                          <MessageStatus isSentByMe={true} delivered={!!message.deliveredAt} read={!!message.readAt} />
                        </span>
                      )}
                    </div>

                    {/* Quick action buttons - shown on hover, placed beside message */}
                    {!message.unsent && showEmojiReactions !== message.id && (
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1">
                        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-md px-1 py-1">
                          {/* Emoji React */}
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setShowEmojiReactions(showEmojiReactions === message.id ? null : message.id)
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                            title="React"
                          >
                            <span className="text-sm">❤️</span>
                          </button>

                          {/* Reply */}
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setReplyingTo(message)
                              setMessageMenuOpen(null)
                              setShowEmojiReactions(null)
                              inputRef.current?.focus()
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                            title="Reply"
                          >
                            <Reply size={14} className="text-gray-600" />
                          </button>

                          {/* More options */}
                          <button
                            ref={messageMenuOpen === message.id ? menuButtonRef : null}
                            onClick={e => {
                              e.stopPropagation()
                              menuButtonRef.current = e.currentTarget
                              const rect = e.currentTarget.getBoundingClientRect()
                              const container = messagesContainerRef.current

                              if (container) {
                                const containerRect = container.getBoundingClientRect()
                                const menuHeight = 200
                                const spaceAbove = rect.top - containerRect.top

                                // Determine position: above if space available, below otherwise
                                let top: number
                                if (spaceAbove >= menuHeight) {
                                  top = rect.top - menuHeight - 5 // Position above
                                } else {
                                  top = rect.bottom + 5 // Position below
                                }

                                setMenuPosition({
                                  top,
                                  left: isOwn ? rect.right - 160 : rect.left
                                })
                              } else {
                                setMenuPosition({
                                  top: rect.top - 200 - 5, // Position above
                                  left: isOwn ? rect.right - 160 : rect.left
                                })
                              }

                              setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                            title="More"
                          >
                            <MoreVertical size={14} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    )}
                    {/* For unsent messages: show only more menu trigger to allow local delete */}
                    {message.unsent && (
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1">
                        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-md px-1 py-1">
                          <button
                            ref={messageMenuOpen === message.id ? menuButtonRef : null}
                            onClick={e => {
                              e.stopPropagation()
                              menuButtonRef.current = e.currentTarget
                              const rect = e.currentTarget.getBoundingClientRect()
                              setMenuPosition({ top: rect.bottom + 5, left: rect.left })
                              setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                            title="More"
                          >
                            <MoreVertical size={14} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
            {isUserTyping && (
              <div className="flex gap-2 animate-in fade-in duration-150">
                <div className="w-6" />
                <div className="rounded-2xl bg-gray-100 px-2.5 py-1.5 border border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-500/70 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-500/70 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-500/70 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
            {showScrollToLatest && (
              <button
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-4 right-4 bg-orange-500 text-white rounded-full p-2 shadow-lg hover:bg-orange-600 transition-colors cursor-pointer"
                title="Scroll to latest"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white shrink-0 relative">
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className={`mb-2 grid gap-2 ${imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative inline-block">
                    <img
                      src={preview}
                      alt={`Preview ${idx + 1}`}
                      className="max-h-32 rounded-lg border-2 border-orange-500 object-cover w-full"
                    />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Video Preview */}
            {videoPreview && (
              <div className="mb-2">
                <div className="relative inline-block max-w-md">
                  <video src={videoPreview} className="max-h-48 rounded-lg border-2 border-orange-500 w-full" controls />
                  <button
                    onClick={handleRemoveVideo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Audio Preview */}
            {audioPreview && (
              <div className="mb-2">
                <div className="relative inline-block max-w-md">
                  <audio src={audioPreview} controls className="w-full" />
                  <button
                    onClick={() => {
                      setAudioBlob(null)
                      setAudioPreview('')
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Show blocked message if blocked */}
            {isBlocked || hasBlocked ? (
              <div className="p-4 bg-gray-100 rounded-lg text-center">
                <Ban className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  {isBlocked ? `You blocked ${user.name}. Unblock to message.` : `You can't message this user.`}
                </p>
                {isBlocked && (
                  <button
                    onClick={handleBlockUser}
                    className="mt-2 px-4 py-1.5 bg-orange-500 text-white text-sm rounded-full hover:bg-orange-600 transition-colors cursor-pointer"
                  >
                    Unblock
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Reply preview bar */}
                {replyingTo && (
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Reply size={14} className="text-gray-500 shrink-0" />
                        <p className="text-xs text-gray-600 font-medium">Replying to {replyingTo.sender?.name || 'Unknown'}</p>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5 ml-5">
                        {replyingTo.audioUrl
                          ? '🎤 Voice message'
                          : replyingTo.videoUrl
                          ? '🎥 Video'
                          : replyingTo.imageUrl
                          ? '📷 Photo'
                          : replyingTo.content}
                      </p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1">
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />

                  {/* Single Attachment Button with Menu */}
                  <div className="relative" ref={attachmentMenuRef}>
                    <button
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="p-2 text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer shrink-0"
                      type="button"
                      disabled={uploading}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    {/* Attachment Menu */}
                    {showAttachmentMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-40 z-50">
                        <button
                          onClick={() => {
                            fileInputRef.current?.click()
                            setShowAttachmentMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                        >
                          <ImageIcon size={16} className="text-orange-500" />
                          <span>Photo</span>
                        </button>
                        <button
                          onClick={() => {
                            videoInputRef.current?.click()
                            setShowAttachmentMenu(false)
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                        >
                          <Video size={16} className="text-orange-500" />
                          <span>Video</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Voice button nằm cạnh gim */}
                  <button
                    onMouseDown={async e => {
                      e.preventDefault()
                      setRecording(true)
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                        mediaStreamRef.current = stream

                        // Use RecordRTC for better audio quality and compatibility
                        const recorder = new RecordRTC(stream, {
                          type: 'audio',
                          mimeType: 'audio/webm',
                          recorderType: RecordRTC.StereoAudioRecorder,
                          numberOfAudioChannels: 1,
                          desiredSampRate: 16000
                        })

                        recorderRef.current = recorder
                        recorder.startRecording()
                      } catch (err) {
                        setRecording(false)
                        console.error('Microphone access error:', err)
                        alert('Không thể truy cập micro! Vui lòng cho phép quyền truy cập micro.')
                      }
                    }}
                    onMouseUp={async () => {
                      if (recorderRef.current && recording) {
                        recorderRef.current.stopRecording(async () => {
                          const blob = recorderRef.current.getBlob()

                          // Stop all tracks to release microphone
                          if (mediaStreamRef.current) {
                            mediaStreamRef.current.getTracks().forEach(track => track.stop())
                            mediaStreamRef.current = null
                          }

                          setRecording(false)

                          // Gửi luôn không cần preview
                          try {
                            setUploading(true)
                            const audioUrl = await uploadService.uploadAudio(blob)

                            const sentMessage = await chatService.sendMessage({
                              receiverId: user.id,
                              content: '🎤 Voice message',
                              audioUrl
                            })

                            // Optimistically add message to UI
                            if (sentMessage) {
                              setMessages(prev => {
                                if (prev.some(m => m.id === sentMessage.id)) {
                                  return prev
                                }
                                const next = [...prev, sentMessage]
                                const capped = next.slice(-MAX_CACHE)
                                saveMessagesCache(user.id, capped)
                                return capped
                              })

                              setVisibleCount(prev => prev + 1)
                            }

                            scrollToBottom('auto')
                            setUploading(false)
                          } catch (error) {
                            console.error('Failed to send voice message:', error)
                            alert('Không thể gửi tin nhắn voice. Vui lòng thử lại!')
                            setUploading(false)
                          }
                        })
                      }
                    }}
                    onMouseLeave={async () => {
                      // Also stop if user moves mouse away while holding
                      if (recorderRef.current && recording) {
                        recorderRef.current.stopRecording(async () => {
                          const blob = recorderRef.current.getBlob()

                          // Stop all tracks
                          if (mediaStreamRef.current) {
                            mediaStreamRef.current.getTracks().forEach(track => track.stop())
                            mediaStreamRef.current = null
                          }

                          setRecording(false)

                          // Gửi luôn
                          try {
                            setUploading(true)
                            const audioUrl = await uploadService.uploadAudio(blob)

                            const sentMessage = await chatService.sendMessage({
                              receiverId: user.id,
                              content: '🎤 Voice message',
                              audioUrl
                            })

                            if (sentMessage) {
                              setMessages(prev => {
                                if (prev.some(m => m.id === sentMessage.id)) {
                                  return prev
                                }
                                const next = [...prev, sentMessage]
                                const capped = next.slice(-MAX_CACHE)
                                saveMessagesCache(user.id, capped)
                                return capped
                              })

                              setVisibleCount(prev => prev + 1)
                            }

                            scrollToBottom('auto')
                            setUploading(false)
                          } catch (error) {
                            console.error('Failed to send voice message:', error)
                            setUploading(false)
                          }
                        })
                      }
                    }}
                    className={`p-2 rounded-full transition-all cursor-pointer shrink-0 ${
                      recording
                        ? 'bg-red-500 text-white animate-pulse'
                        : uploading
                        ? 'bg-gray-300 text-gray-500'
                        : 'text-orange-500 hover:bg-orange-50'
                    }`}
                    type="button"
                    disabled={uploading}
                    title={recording ? 'Đang ghi âm... Thả để gửi' : uploading ? 'Đang gửi...' : 'Giữ để ghi âm'}
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    )}
                  </button>

                  <div className={`flex-1 rounded-full px-4 py-2 flex items-center bg-gray-100 min-w-0`}>
                    <textarea
                      ref={inputRef}
                      value={newMessage}
                      onChange={e => {
                        const value = e.target.value
                        setNewMessage(value)

                        // Send typing indicator only once
                        if (value.length > 0 && !isTypingRef.current) {
                          handleTypingChange(true)
                        }

                        // Clear previous timeout
                        if (typingTimeoutRef.current) {
                          clearTimeout(typingTimeoutRef.current)
                        }

                        // Set new timeout to stop typing after 2 seconds
                        typingTimeoutRef.current = window.setTimeout(() => {
                          handleTypingChange(false)
                        }, 2000)
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="Aa"
                      rows={1}
                      className="flex-1 bg-transparent resize-none outline-none text-sm max-h-20"
                      style={{ minHeight: '20px' }}
                    />
                    <button
                      data-emoji-trigger
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => setShowEmojiPicker(v => !v)}
                      className="p-1 text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer"
                      type="button"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && selectedImages.length === 0 && !selectedVideo && !audioBlob) || uploading}
                    className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                      (newMessage.trim() || selectedImages.length > 0 || selectedVideo) && !uploading
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={emoji => {
                  setNewMessage(prev => prev + emoji)
                  inputRef.current?.focus()
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
            <ImageViewer images={viewerImages} initialIndex={viewerIndex} open={viewerOpen} onClose={() => setViewerOpen(false)} />
          </div>
        </>
      )}

      {/* Message menu dropdown - rendered via Portal */}
      {messageMenuOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={messageMenuRef}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 9999
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-40"
          >
            {/* Copy only for non-unsent messages with content */}
            {(() => {
              const msg = messages.find(m => m.id === messageMenuOpen)
              if (msg && !msg.unsent && msg.content) {
                return (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content || '')
                      setMessageMenuOpen(null)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>
                )
              }
              return null
            })()}
            {(() => {
              const msg = messages.find(m => m.id === messageMenuOpen)
              return msg && !msg.unsent && msg.senderId === currentUser?.id
            })() && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={async () => {
                    try {
                      await chatService.unsendMessage(messageMenuOpen)
                      // Update message to unsent in UI
                      setMessages(prev => {
                        const updated = prev.map(msg => (msg.id === messageMenuOpen ? { ...msg, unsent: true } : msg))
                        saveMessagesCache(user.id, updated)
                        return updated
                      })
                      setMessageMenuOpen(null)
                    } catch (error) {
                      console.error('Error unsending message:', error)
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-red-600"
                >
                  <Ban size={14} />
                  <span>Unsend</span>
                </button>
              </>
            )}
            <div className="border-t border-gray-200 my-1"></div>
            <button
              onClick={async () => {
                try {
                  await chatService.deleteMessage(messageMenuOpen)
                  // Remove message from UI
                  setMessages(prev => {
                    const updated = prev.filter(msg => msg.id !== messageMenuOpen)
                    saveMessagesCache(user.id, updated)
                    return updated
                  })
                  setMessageMenuOpen(null)
                } catch (error) {
                  console.error('Error deleting message:', error)
                }
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-red-600"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}
