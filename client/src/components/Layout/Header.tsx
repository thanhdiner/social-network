import { MessageCircle, TextAlignJustify, LogOut, User, UserCog, Settings, Shield } from 'lucide-react'
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

  // Dev debug: log header's unreadCount and popup state to verify re-renders
  useEffect(() => {
    // Use warn so it's visible even if 'log' is filtered
    console.warn('[Header] render/update', { unreadCount, isPopupOpen, path: location.pathname })
  }, [unreadCount, isPopupOpen, location.pathname])

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
          className="text-gray-600 mt-0.5 cursor-pointer hover:text-orange-500 transition"
          onClick={onToggleSidebar}
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
        <div
          onClick={() => setOpen(!open)}
          className="cursor-pointer hover:ring-2 hover:ring-orange-300 transition rounded-full"
        >
          <Avatar
            src={avatarUrl}
            name={displayName}
            size="lg"
            className="border-2 border-orange-200"
          />
        </div>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute top-14 right-0 w-72 bg-white rounded-2xl shadow-lg border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            {/* Header card */}
            <div className="bg-linear-to-r from-orange-400 to-orange-500 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <Avatar
                  src={avatarUrl}
                  name={displayName}
                  size="lg"
                  className="border-2 border-white"
                />
                <div>
                  <p className="font-semibold text-base">{displayName}</p>
                  <p className="text-sm opacity-90">Available now</p>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="divide-y">
              <div className="space-y-1 py-2">
                <Link
                  to={`/profile/${user?.username || 'me'}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-orange-50 transition"
                  onClick={() => setOpen(false)}
                >
                  <User className="text-blue-400" />
                  <span className="text-gray-700 font-medium">My Profile</span>
                </Link>
                <Link
                  to="/profile/edit"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-orange-50 transition"
                  onClick={() => setOpen(false)}
                >
                  <UserCog className="text-orange-400" />
                  <span className="text-gray-700 font-medium">Edit Profile</span>
                </Link>
                <Link
                  to="/account-settings"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-orange-50 transition"
                  onClick={() => setOpen(false)}
                >
                  <Settings className="text-purple-400" />
                  <span className="text-gray-700 font-medium">Account Settings</span>
                </Link>
                <Link
                  to="/privacy"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-orange-50 transition"
                  onClick={() => setOpen(false)}
                >
                  <Shield className="text-red-400" />
                  <span className="text-gray-700 font-medium">Privacy Settings</span>
                </Link>
              </div>

              {/* Logout */}
              <div className="px-5 py-3 bg-gray-50">
                <button data-chat-trigger
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2.5 rounded-xl hover:bg-orange-600 transition font-medium"
                >
                  <LogOut size={18} />
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

