import {
  Mail,
  TextAlignJustify,
  Users,
  Search,
  LogOut,
  User,
  UserCog,
  Settings,
  Shield,
} from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { NotificationsDropdown } from '../shared/NotificationsDropdown'

export const Header = () => {
  const { user, logout } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white relative">
      {/* Left section */}
      <div className="flex items-center gap-20">
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <img className="w-11 h-11 rounded-md object-cover" src="/logo.jpg" alt="Logo" />
          <h1 className="text-2xl font-semibold leading-none">Diner</h1>
        </Link>
        <TextAlignJustify size={22} className="text-gray-600 mt-0.5 cursor-pointer" />
      </div>

      {/* Middle search */}
      <div className="hidden md:block w-1/3 relative">
        <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search here..."
          className="w-full rounded-full border pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring focus:ring-orange-200"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        {/* Icons */}
        <span className="flex items-center mr-2">
          <Link to="/friends" className="p-3 cursor-pointer hover:bg-orange-50 rounded-full transition">
            <Users className="text-orange-400" />
          </Link>
          <NotificationsDropdown />
          <Link to="/chat" className="p-3 cursor-pointer hover:bg-orange-50 rounded-full transition">
            <Mail className="text-orange-400" />
          </Link>
        </span>

        {/* Avatar */}
        <div
          onClick={() => setOpen(!open)}
          className="w-11 h-11 rounded-full overflow-hidden border-2 border-orange-200 cursor-pointer hover:ring-2 hover:ring-orange-300 transition"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-orange-500 flex items-center justify-center text-white font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute top-14 right-0 w-72 bg-white rounded-2xl shadow-lg border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            {/* Header card */}
            <div className="bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl || 'https://i.pravatar.cc/100'}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white"
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
                <button
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
