import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Maximize2, MoreVertical, Trash2, User as UserIcon, Bell, BellOff, Ban, ShieldOff } from 'lucide-react'
import debounce from 'lodash.debounce'
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
  const [muteStatusMap, setMuteStatusMap] = useState<Record<string, boolean>>({})
  const [blockStatuses, setBlockStatuses] = useState<Record<string, { isBlocked: boolean; hasBlocked: boolean }>>({})
  const [blockStatusLoadingId, setBlockStatusLoadingId] = useState<string | null>(null)
  const [pendingActionUserId, setPendingActionUserId] = useState<string | null>(null)

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
      if (!popupRef.current?.contains(target) && !target.closest('[data-chat-trigger]')) {
        closePopup()
      }
      // Close menu if clicking outside
      if (menuRef.current && !menuRef.current.contains(target) && !target.closest('.group')) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closePopup])

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
    setMenuOpen(null)
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
      setMenuOpen(null)
    } catch (error) {
      console.error('Failed to toggle mute:', error)
      alert('An error occurred, please try again')
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
      const confirmed = confirm(`Are you sure you want to block ${conversation.participant.name}? You will not be able to message this person.`)
      if (!confirmed) {
        return
      }
    }

    setPendingActionUserId(userId)
    try {
      if (isBlocked) {
        await userService.unblockUser(userId)
        setBlockStatuses(prev => ({ ...prev, [userId]: { hasBlocked: prev[userId]?.hasBlocked ?? false, isBlocked: false } }))
        alert('User unblocked')
      } else {
        await userService.blockUser(userId)
        setBlockStatuses(prev => ({ ...prev, [userId]: { hasBlocked: prev[userId]?.hasBlocked ?? false, isBlocked: true } }))
        clearMessagesCache(userId)
        clearConversationsCache()
        closeChatWindow(userId)
        await loadConversations()
        alert('User blocked')
      }
      setMenuOpen(null)
    } catch (error) {
      console.error('Failed to block/unblock user:', error)
      alert('An error occurred, please try again')
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
    if (!confirm(`Delete all messages with ${conversation.participant.name}? This action cannot be undone.`)) {
      return
    }

    setPendingActionUserId(userId)
    try {
      await chatService.deleteConversation(userId)
      clearMessagesCache(userId)
      clearConversationsCache()
      closeChatWindow(userId)
      await loadConversations()
      setMenuOpen(null)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('An error occurred, please try again')
    } finally {
      setPendingActionUserId(prev => (prev === userId ? null : prev))
    }
  }

  const displayList = searchQuery.trim() ? searchResults : conversations

  return (
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
      <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
        {isSearching ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-gray-500">Searching...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <div className="text-gray-400 text-xl">💬</div>
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
                    className="p-3 hover:bg-orange-50 transition-colors duration-150 cursor-pointer group relative"
                    onClick={() => handleOpenChat(conversation.participant)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
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
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const isOpening = menuOpen !== conversation.id
                            setMenuOpen(isOpening ? conversation.id : null)
                            if (isOpening) {
                              void ensureBlockStatus(conversation.participantId)
                            }
                          }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-orange-100 rounded-full transition-all cursor-pointer"
                          title="Options"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        {menuOpen === conversation.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[200px] p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => handleViewProfile(e, conversation)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 transition-colors rounded-md cursor-pointer"
                            >
                              <UserIcon className="w-4 h-4 text-orange-500" />
                              <span>View Profile</span>
                            </button>

                            <button
                              onClick={(e) => handleToggleMute(e, conversation)}
                              disabled={pendingActionUserId === conversation.participantId}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors rounded-md ${pendingActionUserId === conversation.participantId ? 'opacity-60 cursor-not-allowed' : 'hover:bg-orange-50 cursor-pointer'}`}
                            >
                              {(muteStatusMap[conversation.participantId] ?? conversation.isMuted) ? (
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
                              onClick={(e) => handleBlockUser(e, conversation)}
                              disabled={pendingActionUserId === conversation.participantId || blockStatusLoadingId === conversation.participantId}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-md ${pendingActionUserId === conversation.participantId || blockStatusLoadingId === conversation.participantId ? 'opacity-60 cursor-not-allowed' : 'hover:bg-orange-50 cursor-pointer'} ${(blockStatuses[conversation.participantId]?.isBlocked ?? false) ? 'text-green-600' : 'text-orange-600'}`}
                            >
                              {blockStatusLoadingId === conversation.participantId ? (
                                <>
                                  <ShieldOff className="w-4 h-4 text-gray-400" />
                                  <span>Checking status...</span>
                                </>
                              ) : (blockStatuses[conversation.participantId]?.isBlocked ?? false) ? (
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
                              onClick={(e) => handleDeleteConversation(e, conversation)}
                              disabled={pendingActionUserId === conversation.participantId}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors rounded-md ${pendingActionUserId === conversation.participantId ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-50 cursor-pointer'}`}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete all messages</span>
                            </button>
                          </div>
                        )}
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
  )
}