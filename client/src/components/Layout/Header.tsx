import { MessageCircle, TextAlignJustify, LogOut, User, UserCog, Settings, ChevronRight } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { NotificationsDropdown } from '../shared/NotificationsDropdown'
import { SearchDropdown } from '../shared/SearchDropdown'
import { Avatar } from '../shared/Avatar'
import { useChat } from '../../contexts/ChatContext'
import { ChatPopup } from '../shared/ChatPopup'

interface HeaderProps {
  onToggleSidebar?: () => void
}

export const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { user, logout } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const { isPopupOpen, togglePopup, unreadCount } = useChat()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const chatButtonRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Close dropdown when route changes
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  const avatarUrl = currentUser?.avatar || user?.avatar
  const displayName = user?.name || 'User'
  const username = user?.username || 'me'
  const profilePath = `/profile/${username}`

  const menuItems = [
    {
      to: profilePath,
      label: 'My Profile',
      icon: User,
      isActive: location.pathname.startsWith('/profile/') && location.pathname !== '/profile/edit',
    },
    {
      to: '/profile/edit',
      label: 'Edit Profile',
      icon: UserCog,
      isActive: location.pathname === '/profile/edit',
    },
    {
      to: '/settings/account',
      label: 'Account Settings',
      icon: Settings,
      isActive: location.pathname.startsWith('/settings/account'),
    },
  ]

  const handleChatIconClick = () => {
    if (window.innerWidth < 768) {
      navigate('/chat')
      return
    }
    togglePopup()
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white relative z-49">
      {/* Left section */}
      <div className="flex items-center md:gap-20 gap-3">
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <img className="w-11 h-11 rounded-md object-cover" src="/logo.jpg" alt="Logo" />
          <h1 className="text-2xl font-semibold leading-none">Diner</h1>
        </Link>
        <TextAlignJustify
          size={22}
          className={`text-gray-600 mt-0.5 cursor-pointer hover:text-orange-500 transition ${location.pathname.startsWith('/reels') ? 'opacity-40 cursor-not-allowed' : ''}`}
          onClick={() => {
            // Prevent toggling the left sidebar while on the Reels page
            if (location.pathname.startsWith('/reels')) return
            onToggleSidebar?.()
          }}
        />
      </div>

      {/* Middle search */}
      <div className="hidden md:block w-1/3">
        <SearchDropdown />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        {/* Icons */}
        <span className="flex items-center mr-2">
          <NotificationsDropdown />
          
          {/* Chat Icon with Popup (hidden on /chat page) */}
          {!location.pathname.startsWith('/chat') && (
            <div ref={chatButtonRef} className="relative" data-chat-trigger>
              <button data-chat-trigger
                onClick={handleChatIconClick}
                className="p-3 cursor-pointer hover:bg-orange-50 rounded-full transition relative"
              >
                <MessageCircle className="text-orange-400 w-[23px] h-[23px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {/* Only render popup on md+ screens */}
              {isPopupOpen && (
                <div className="hidden md:block">
                  <ChatPopup />
                </div>
              )}
            </div>
          )}
        </span>

        {/* Avatar */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="cursor-pointer hover:ring-2 hover:ring-orange-300 transition rounded-full"
          aria-label="Open profile menu"
          aria-expanded={open}
        >
          <Avatar
            src={avatarUrl}
            name={displayName}
            size="lg"
            className="border-2 border-orange-200"
          />
        </button>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute top-14 right-0 w-64 rounded-2xl border border-orange-100/80 bg-white/95 p-2 shadow-[0_20px_45px_-22px_rgba(249,115,22,0.45)] backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2">
            {/* Header card */}
            <div className="rounded-xl bg-linear-to-r from-orange-500 to-orange-400 px-3 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={avatarUrl}
                  name={displayName}
                  size="md"
                  className="border-2 border-white"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm">{displayName}</p>
                  <p className="truncate text-[11px] text-orange-100">@{username}</p>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="pt-2">
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition cursor-pointer ${
                      item.isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <item.icon
                      size={17}
                      className={item.isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-orange-500'}
                    />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-orange-300" />
                  </Link>
                ))}
              </div>

              {/* Logout */}
              <div className="mt-2 border-t border-gray-100 pt-2">
                <button data-chat-trigger
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition cursor-pointer"
                >
                  <LogOut size={17} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}



