import { Home, User, UserPlus, Film, MessageCircle, Settings, Video, Bell } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface LeftSidebarProps {
  isCollapsed?: boolean
}

export const LeftSidebar = ({ isCollapsed = false }: LeftSidebarProps) => {
  const location = useLocation()
  const { user } = useAuth()

  const menu = [
    { icon: Home, label: 'Newsfeed', path: '/' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Film, label: 'Stories', path: '/stories' },
    { icon: Video, label: 'Reels', path: '/reels' },
    { icon: User, label: 'Profile', path: user?.username ? `/profile/${user.username}` : '/profile' },
    { icon: UserPlus, label: 'Suggestions', path: '/suggestions' },
    { icon: Settings, label: 'Account Settings', path: '/settings/account' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
  ]

  return (
    <aside className="h-full p-4 bg-white overflow-hidden">
      <nav>
        <ul className="space-y-1">
          {menu.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            const isAdminItem = (item as { isAdmin?: boolean }).isAdmin
            return (
              <li key={item.label}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${
                    isAdminItem
                      ? isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'
                      : isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <item.icon
                    size={20}
                    className={`shrink-0 transition-colors duration-200 cursor-pointer ${
                      isAdminItem
                        ? isActive ? 'text-purple-600' : 'text-purple-500 group-hover:text-purple-600'
                        : isActive
                          ? 'text-orange-500'
                          : 'text-gray-500 group-hover:text-orange-500'
                    }`}
                  />
                  <span className={`font-medium whitespace-nowrap transition-all duration-300 ${
                    isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
