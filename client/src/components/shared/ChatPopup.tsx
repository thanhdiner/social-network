import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Maximize2 } from 'lucide-react'
import { useChat } from '../../contexts/ChatContext'
import { chatService } from '../../services/chatService'
import type { User } from '../../types'
import { Avatar } from './Avatar'
import { ChatListItem } from './ChatListItem'
import debounce from 'lodash.debounce'

export const ChatPopup = () => {
  const navigate = useNavigate()
  const { conversations, openChatWindow, closePopup, onlineUsers } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Debounced search handler
  const handleSearch = useCallback(
    debounce(async (query: string) => {
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
    }, 300),
    []
  )

  useEffect(() => {
    handleSearch(searchQuery)
  }, [searchQuery, handleSearch])

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!popupRef.current?.contains(target) && !target.closest('[data-chat-trigger]')) {
        closePopup()
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

  const displayList = searchQuery.trim() ? searchResults : conversations

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="Chat popup"
      tabIndex={-1}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[450px] flex flex-col"
    >
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900">Messages</h3>
          <button
            onClick={handleGoToFullPage}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title="Open full page"
          >
            <Maximize2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search on Messenger..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-orange-50 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="overflow-y-auto flex-1">
        {isSearching ? (
          <div className="p-4 text-center text-gray-500">Searching...</div>
        ) : displayList.length === 0 ? (
          <div className="p-4 text-center text-gray-500">{searchQuery.trim() ? 'No results found' : 'No messages yet'}</div>
        ) : (
          <div>
            {(searchQuery ? searchResults : conversations).map(item =>
              searchQuery ? (
                <ChatListItem key={item.id} user={item} online={onlineUsers.has(item.id)} onClick={() => handleOpenChat(item)} />
              ) : (
                <ChatListItem
                  key={item.id}
                  user={item.participant}
                  online={onlineUsers.has(item.participant.id)}
                  lastMessage={item.lastMessage}
                  unreadCount={item.unreadCount}
                  formatTime={formatTime}
                  onClick={() => handleOpenChat(item.participant)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
