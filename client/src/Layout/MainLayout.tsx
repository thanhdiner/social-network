import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '../components/Layout/Header.tsx'
import { LeftSidebar } from '../components/Layout/LeftSidebar.tsx'
import { RightSidebar } from '../components/Layout/RightSidebar.tsx'
import { ChatWindow } from '../components/shared/ChatWindow.tsx'
import { Avatar } from '../components/shared/Avatar.tsx'
import { useChat } from '../contexts/ChatContext.tsx'
import { X, MoreHorizontal, XCircle, MinusCircle } from 'lucide-react'

interface MainLayoutProps {
  children?: ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation()
  const mainRef = useRef<HTMLDivElement>(null)
  const { chatWindows, closeChatWindow, minimizeChatWindow, onlineUsers, conversations, closeAllChatWindows, minimizeAllOpenChats } = useChat()
  const [hoveredMinId, setHoveredMinId] = useState<string | null>(null)
  const [globalOptionsOpen, setGlobalOptionsOpen] = useState<boolean>(false)
  const [hoverThreeDots, setHoverThreeDots] = useState<boolean>(false)
  const [hoverStack, setHoverStack] = useState<boolean>(false)
  const globalMenuRef = useRef<HTMLDivElement>(null)

  // Close global menu on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (globalMenuRef.current && !globalMenuRef.current.contains(e.target as Node)) {
        setGlobalOptionsOpen(false)
      }
    }
    if (globalOptionsOpen) document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [globalOptionsOpen])
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('leftSidebarOpen')
    if (saved !== null) {
      return JSON.parse(saved)
    }
    // Mặc định: mở trên desktop (>= 768px), đóng trên mobile
    return window.innerWidth >= 768
  })

  // Track window size for responsive chat windows
  const [maxVisibleChats, setMaxVisibleChats] = useState(() => {
    return window.innerWidth >= 1024 ? 3 : 1
  })

  // Update max visible chats on window resize
  useEffect(() => {
    const handleResize = () => {
      setMaxVisibleChats(window.innerWidth >= 1024 ? 3 : 1)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('leftSidebarOpen', JSON.stringify(isLeftSidebarOpen))
  }, [isLeftSidebarOpen])

  // Reset scroll position when route changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
  }, [location.pathname])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header onToggleSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden bg-gray-50 relative">
        {/* Left Sidebar - Desktop */}
        <aside 
          className={`fixed left-0 top-[65px] bottom-0 border-r bg-white overflow-y-auto transition-all duration-300 z-30 hidden md:block ${
            isLeftSidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <LeftSidebar isCollapsed={!isLeftSidebarOpen} />
        </aside>

        {/* Left Sidebar - Mobile (toggle) */}
        {isLeftSidebarOpen && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
              onClick={() => setIsLeftSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <aside className="fixed left-0 top-[65px] bottom-0 w-64 bg-white z-50 overflow-y-auto md:hidden shadow-xl animate-in slide-in-from-left duration-300">
              <LeftSidebar isCollapsed={false} />
            </aside>
          </>
        )}

        {/* Main content area */}
        <main 
          ref={mainRef} 
          className="flex-1 overflow-y-auto p-4 md:pl-8 md:ml-62"
        >
          {/* Middle content */}
          <div className="max-w-3xl mx-auto space-y-4">{children}</div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 border-l bg-white overflow-y-auto hidden lg:block">
          <RightSidebar />
        </aside>
      </div>

      {/* Chat UI docked to the right */}
      {/* Expanded chat windows along bottom-right */}
      <div className="fixed bottom-0 right-4 flex items-end gap-3 z-40">
          {chatWindows
            .filter((w) => !w.isMinimized)
            .slice(0, maxVisibleChats) // Limit visible chats based on screen size
            .map((chatWindow) => (
              <div key={chatWindow.userId}>
                <ChatWindow
                  user={chatWindow.user}
                  isMinimized={false}
                  onClose={() => closeChatWindow(chatWindow.userId)}
                  onMinimize={() => minimizeChatWindow(chatWindow.userId)}
                />
              </div>
            ))}
      </div>

      {/* Minimized chat bubbles pinned on the right (Facebook-like) */}
      <div className="fixed bottom-24 right-4 flex flex-col items-center gap-3 z-40" onMouseEnter={() => setHoverStack(true)} onMouseLeave={() => setHoverStack(false)}>
        {/* Shared actions trigger (3-dots) for minimized chat stack */}
        {(() => {
          const openCount = chatWindows.filter(w => !w.isMinimized).length
          const overflowCount = Math.max(openCount - maxVisibleChats, 0)
          const minimizedCount = chatWindows.filter(w => w.isMinimized).length
          const stackCount = minimizedCount + overflowCount
          const eligible = chatWindows.length >= 2 && stackCount >= 1
          if (!eligible) return false
          return (
          <div
            ref={globalMenuRef}
            className={`relative transition-all duration-200 ease-out ${ (hoverStack || hoverThreeDots || globalOptionsOpen) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-1 pointer-events-none' }`}
            onMouseEnter={() => setHoverThreeDots(true)}
            onMouseLeave={() => setHoverThreeDots(false)}
          >
            <button
              onClick={() => setGlobalOptionsOpen(v => !v)}
              title="Tùy chọn chat"
              className="w-10 h-10 rounded-full bg-neutral-800 text-white shadow-lg ring-1 ring-white/10 flex items-center justify-center hover:brightness-110"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {globalOptionsOpen && (
              <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-neutral-900 text-white rounded-2xl shadow-2xl border border-white/10 w-72 p-2 z-50 animate-in fade-in">
                <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-neutral-900 rotate-45 border-r border-b border-white/10" />
                <button
                  onClick={() => { closeAllChatWindows(); setGlobalOptionsOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 cursor-pointer text-sm font-medium"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Đóng tất cả đoạn chat</span>
                </button>
                <button
                  onClick={() => { minimizeAllOpenChats(); setGlobalOptionsOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 cursor-pointer text-sm font-medium"
                >
                  <MinusCircle className="w-5 h-5" />
                  <span>Thu nhỏ đoạn chat đang mở</span>
                </button>
              </div>
            )}
          </div>
          )
        })()}
        {/* Show minimized chats */}
        {chatWindows
          .filter((w) => w.isMinimized)
          .map((w) => {
            const conv = conversations.find(c => c.participantId === w.userId)
            const unread = conv?.unreadCount || 0
            return (
            <div
              key={w.userId}
              className="relative group"
              onMouseEnter={() => setHoveredMinId(w.userId)}
              onMouseLeave={() => { setHoveredMinId(null) }}
            >
              <button
                title={w.user.name}
                onClick={() => minimizeChatWindow(w.userId)}
                className="relative w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
              >
                {/* Avatar bubble */}
                <Avatar
                  src={w.user.avatar || undefined}
                  name={w.user.name}
                  size="lg"
                  className="w-12 h-12 border-2 border-white"
                />
                {/* Online indicator */}
                {onlineUsers.has(w.userId) && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
                )}
                {/* Unread badge when messages arrive while minimized */}
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full w-5 h-5 flex items-center justify-center font-bold shadow">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {/* Hover actions: close and more menu */}
              <button
                onClick={(e) => { e.stopPropagation(); closeChatWindow(w.userId) }}
                title="Đóng đoạn chat"
                className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-900/90 text-white shadow ring-1 ring-white/20 flex items-center justify-center ${hoveredMinId === w.userId ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition`}
                aria-label="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {/* Per-bubble menu removed; shared 3-dots controls used instead */}
            </div>
            )
          })}
        {/* Show expanded chats that exceed the limit as minimized avatars */}
        {chatWindows
          .filter((w) => !w.isMinimized)
          .slice(maxVisibleChats) // Get chats beyond the visible limit
          .map((w) => {
            const conv = conversations.find(c => c.participantId === w.userId)
            const unread = conv?.unreadCount || 0
            return (
            <div
              key={w.userId}
              className="relative group"
              onMouseEnter={() => setHoveredMinId(w.userId)}
              onMouseLeave={() => { setHoveredMinId(null) }}
            >
              <button
                title={w.user.name}
                onClick={() => minimizeChatWindow(w.userId)}
                className="relative w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
              >
                {/* Avatar bubble */}
                <Avatar
                  src={w.user.avatar || undefined}
                  name={w.user.name}
                  size="lg"
                  className="w-12 h-12 border-2 border-white"
                />
                {/* Online indicator */}
                {onlineUsers.has(w.userId) && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
                )}
                {/* Unread badge */}
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full w-5 h-5 flex items-center justify-center font-bold shadow">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {/* Hover actions: close and more menu */}
              <button
                onClick={(e) => { e.stopPropagation(); closeChatWindow(w.userId) }}
                title="Đóng đoạn chat"
                className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-900/90 text-white shadow ring-1 ring-white/20 flex items-center justify-center ${hoveredMinId === w.userId ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition`}
                aria-label="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {/* Per-bubble menu removed; shared 3-dots controls used instead */}
            </div>
            )
          })}
      </div>
    </div>
  )
}
