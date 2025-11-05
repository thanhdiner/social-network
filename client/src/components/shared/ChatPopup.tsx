import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, Maximize2, MoreVertical, Trash2, User as UserIcon, Bell, BellOff, Ban, ShieldOff } from 'lucide-react'
import debounce from 'lodash.debounce'
import { toast } from 'sonner'
import { useChat } from '../../contexts/ChatContext'
import { chatService } from '../../services/chatService'
import { clearMessagesCache, clearConversationsCache } from '../../utils/chatCache'
import type { User } from '../../types'
import { ChatListItem } from './ChatListItem'
import userService from '../../services/userService'

interface Conversation {
  id: string
  participant: User
  lastMessage?: { content?: string; createdAt: string }
  unreadCount: number
  isMuted: boolean
  participantId: string
}

export const ChatPopup = () => {
  const navigate = useNavigate()
  const { conversations, openChatWindow, closePopup, onlineUsers, closeChatWindow, loadConversations } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [menuConversation, setMenuConversation] = useState<Conversation | null>(null)
  const [muteStatusMap, setMuteStatusMap] = useState<Record<string, boolean>>({})
  const [blockStatuses, setBlockStatuses] = useState<Record<string, { isBlocked: boolean; hasBlocked: boolean }>>({})
  const [blockStatusLoadingId, setBlockStatusLoadingId] = useState<string | null>(null)
  const [pendingActionUserId, setPendingActionUserId] = useState<string | null>(null)

  const closeMenu = useCallback(() => {
    setMenuOpen(null)
    setMenuConversation(null)
    setMenuPosition(null)
  }, [])

  // Initialize debounced search function once
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      try {
        const results = await chatService.searchUsers(query)
        setSearchResults(results)
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      debouncedSearchRef.current?.cancel()
    }
  }, [])

  useEffect(() => {
    debouncedSearchRef.current?.(searchQuery)
  }, [searchQuery])

  // Auto load conversations when popup opens or when new message arrives
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const map: Record<string, boolean> = {}
    conversations.forEach(conv => {
      map[conv.participantId] = conv.isMuted
    })
    setMuteStatusMap(map)
  }, [conversations])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Don't close if clicking on menu buttons
      if (target.closest('[data-menu-item]')) {
        return
      }
      
      if (!popupRef.current?.contains(target) && !target.closest('[data-chat-trigger]')) {
        closePopup()
      }
      // Close menu if clicking outside
      if (menuRef.current && !menuRef.current.contains(target) && !target.closest('[data-chat-menu-trigger]')) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closePopup, closeMenu])

  const handleOpenChat = (user: User) => openChatWindow(user)

  const handleGoToFullPage = () => {
    navigate('/chat')
    closePopup()
  }

  const ensureBlockStatus = useCallback(
    async (userId: string) => {
      if (blockStatuses[userId]) return
      setBlockStatusLoadingId(userId)
      try {
        const status = await userService.checkBlockStatus(userId)
        setBlockStatuses(prev => ({ ...prev, [userId]: status }))
      } catch (error) {
        console.error('Failed to check block status:', error)
      } finally {
        setBlockStatusLoadingId(prev => (prev === userId ? null : prev))
      }
    },
    [blockStatuses]
  )
  const handleViewProfile = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    closeMenu()
    closePopup()
    navigate(`/profile/${conversation.participant.username || conversation.participant.id}`)
  }

  const handleToggleMute = async (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    const userId = conversation.participantId
    const isMuted = muteStatusMap[userId] ?? conversation.isMuted
    setPendingActionUserId(userId)
    try {
      if (isMuted) {
        await chatService.unmuteConversation(userId)
        setMuteStatusMap(prev => ({ ...prev, [userId]: false }))
      } else {
        await chatService.muteConversation(userId)
        setMuteStatusMap(prev => ({ ...prev, [userId]: true }))
      }
      clearConversationsCache()
      await loadConversations()
      closeMenu()
    } catch (error) {
      console.error('Failed to toggle mute:', error)
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setPendingActionUserId(prev => (prev === userId ? null : prev))
    }
  }

  const handleBlockUser = async (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    const userId = conversation.participantId
    const status = blockStatuses[userId]
    const isBlocked = status?.isBlocked ?? false

    if (!isBlocked) {
      const confirmed = confirm(`Bạn có chắc chắn muốn chặn ${conversation.participant.name}? Bạn sẽ không thể nhắn tin với người này.`)
      if (!confirmed) {
        return
      }
    }

    setPendingActionUserId(userId)
    try {
      if (isBlocked) {
        await userService.unblockUser(userId)
        setBlockStatuses(prev => ({ ...prev, [userId]: { hasBlocked: prev[userId]?.hasBlocked ?? false, isBlocked: false } }))
        toast.success('Đã bỏ chặn người dùng')
      } else {
        await userService.blockUser(userId)
        setBlockStatuses(prev => ({ ...prev, [userId]: { hasBlocked: prev[userId]?.hasBlocked ?? false, isBlocked: true } }))
        clearMessagesCache(userId)
        clearConversationsCache()
        closeChatWindow(userId)
        await loadConversations()
        toast.success('Đã chặn người dùng')
      }
      closeMenu()
    } catch (error) {
      console.error('Failed to block/unblock user:', error)
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setPendingActionUserId(prev => (prev === userId ? null : prev))
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('en-US')
  }

  const handleDeleteConversation = async (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    const userId = conversation.participantId
    if (!confirm(`Xóa tất cả tin nhắn với ${conversation.participant.name}? Hành động này không thể hoàn tác.`)) {
      return
    }

    setPendingActionUserId(userId)
    try {
      await chatService.deleteConversation(userId)
      clearMessagesCache(userId)
      clearConversationsCache()
      closeChatWindow(userId)
      await loadConversations()
      closeMenu()
      toast.success('Đã xóa cuộc trò chuyện')
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      toast.error('Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setPendingActionUserId(prev => (prev === userId ? null : prev))
    }
  }

  const displayList = searchQuery.trim() ? searchResults : conversations

  return (
    <>
    <div
      ref={popupRef}
      role="dialog"
      aria-label="Chat popup"
      tabIndex={-1}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[500px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-linear-to-r from-orange-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">Messages</h3>
          <button
            onClick={handleGoToFullPage}
            className="p-2 hover:bg-orange-100 rounded-full transition-all duration-200 cursor-pointer hover:scale-110"
            title="Open full chat page"
          >
            <Maximize2 className="w-5 h-5 text-orange-500" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700 placeholder:text-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="overflow-y-auto overflow-x-hidden flex-1 divide-y divide-gray-100">
        {isSearching ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-gray-500">Searching...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <div className="text-gray-400 text-xl">??</div>
            </div>
            <p className="text-sm font-medium text-gray-700">{searchQuery.trim() ? 'No conversations found' : 'No messages yet'}</p>
            <p className="text-xs text-gray-500 mt-1">{searchQuery.trim() ? 'Try a different search term' : 'Start a new conversation'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(searchQuery ? searchResults : conversations).map(item => {
              if (searchQuery) {
                const user = item as User
                return (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-orange-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => handleOpenChat(user)}
                  >
                    <ChatListItem user={user} online={onlineUsers.has(user.id)} onClick={() => {}} />
                  </div>
                )
              } else {
                const conversation = item as Conversation
                return (
                  <div
                    key={conversation.id}
                    className="p-2 cursor-pointer group"
                    onClick={() => handleOpenChat(conversation.participant)}
                  >
                    <div className="flex items-center justify-between rounded-2xl px-2 py-1 transition-colors duration-150 group-hover:bg-orange-50">
                      <div className="flex-1 min-w-0">
                        <ChatListItem
                          user={conversation.participant}
                          online={onlineUsers.has(conversation.participant.id)}
                          lastMessage={conversation.lastMessage}
                          unreadCount={conversation.unreadCount}
                          isMuted={conversation.isMuted}
                          formatTime={formatTime}
                          onClick={() => {}}
                        />
                      </div>
                      <div className="shrink-0 ml-2 relative z-10">
                        <button
                          data-chat-menu-trigger
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            const isOpening = menuOpen !== conversation.id
                            if (isOpening) {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              const MENU_WIDTH = 220
                              const MENU_HEIGHT = 240
                              const padding = 12
                              let top = rect.bottom + 8
                              if (top + MENU_HEIGHT > window.innerHeight - padding) {
                                top = Math.max(padding, rect.top - MENU_HEIGHT - 8)
                              }
                              let left = rect.right - MENU_WIDTH
                              if (left + MENU_WIDTH > window.innerWidth - padding) {
                                left = window.innerWidth - MENU_WIDTH - padding
                              }
                              if (left < padding) left = padding

                              setMenuPosition({ top, left })
                              setMenuOpen(conversation.id)
                              setMenuConversation(conversation)
                              void ensureBlockStatus(conversation.participantId)
                            } else {
                              closeMenu()
                            }
                          }}
                          className="p-2 opacity-60 group-hover:opacity-100 hover:bg-orange-100 rounded-full transition-all cursor-pointer active:scale-95 hover:scale-110"
                          title="Options"
                          type="button"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        )}
      </div>
    </div>
    {menuOpen && menuConversation && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-9999 min-w-[200px] p-1"
              style={{ top: menuPosition.top, left: menuPosition.left }}
              onClick={e => e.stopPropagation()}
            >
              <button
                data-menu-item
                onClick={e => handleViewProfile(e, menuConversation)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors rounded-md cursor-pointer"
                type="button"
              >
                <UserIcon className="w-4 h-4 text-orange-500" />
                <span>View Profile</span>
              </button>

              <button
                data-menu-item
                onClick={e => handleToggleMute(e, menuConversation)}
                disabled={pendingActionUserId === menuConversation.participantId}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors rounded-md ${
                  pendingActionUserId === menuConversation.participantId ? 'opacity-60 cursor-not-allowed' : 'hover:bg-orange-50 cursor-pointer'
                }`}
                type="button"
              >
                {(muteStatusMap[menuConversation.participantId] ?? menuConversation.isMuted) ? (
                  <>
                    <Bell className="w-4 h-4 text-orange-500" />
                    <span>Unmute Notifications</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 text-orange-500" />
                    <span>Mute Notifications</span>
                  </>
                )}
              </button>

              <button
                data-menu-item
                onClick={e => handleBlockUser(e, menuConversation)}
                disabled={
                  pendingActionUserId === menuConversation.participantId ||
                  blockStatusLoadingId === menuConversation.participantId
                }
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-md ${
                  pendingActionUserId === menuConversation.participantId ||
                  blockStatusLoadingId === menuConversation.participantId
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:bg-orange-50 cursor-pointer'
                } ${
                  (blockStatuses[menuConversation.participantId]?.isBlocked ?? false)
                    ? 'text-green-600'
                    : 'text-orange-600'
                }`}
                type="button"
              >
                {blockStatusLoadingId === menuConversation.participantId ? (
                  <>
                    <ShieldOff className="w-4 h-4 text-gray-400" />
                    <span>Checking status...</span>
                  </>
                ) : (blockStatuses[menuConversation.participantId]?.isBlocked ?? false) ? (
                  <>
                    <ShieldOff className="w-4 h-4 text-green-600" />
                    <span>Unblock User</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 text-orange-600" />
                    <span>Block User</span>
                  </>
                )}
              </button>

              <div className="my-1 mx-2 border-t border-gray-100" />

              <button
                data-menu-item
                onClick={e => handleDeleteConversation(e, menuConversation)}
                disabled={pendingActionUserId === menuConversation.participantId}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors rounded-md ${
                  pendingActionUserId === menuConversation.participantId ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-50 cursor-pointer'
                }`}
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete all messages</span>
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  )
}


















