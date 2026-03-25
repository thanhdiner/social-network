import { Home, User, UserPlus, Film, MessageCircle, Settings, Video, Bell, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import friendService from '@/services/friendService'

interface LeftSidebarProps {
  isCollapsed?: boolean
}

export const LeftSidebar = ({ isCollapsed = false }: LeftSidebarProps) => {
  const location = useLocation()
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    friendService.getPendingCount()
      .then(r => setPendingCount(r.count))
      .catch(() => {})
  }, [user])

  const menu = [
    { icon: Home, label: 'Newsfeed', path: '/' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Film, label: 'Stories', path: '/stories' },
    { icon: Video, label: 'Reels', path: '/reels' },
    { icon: Users, label: 'Bạn bè', path: '/friends', badge: pendingCount },
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
            const badge = (item as { badge?: number }).badge
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
                  <div className="relative shrink-0">
                    <item.icon
                      size={20}
                      className={`transition-colors duration-200 cursor-pointer ${
                        isAdminItem
                          ? isActive ? 'text-purple-600' : 'text-purple-500 group-hover:text-purple-600'
                          : isActive
                            ? 'text-orange-500'
                            : 'text-gray-500 group-hover:text-orange-500'
                      }`}
                    />
                    {badge != null && badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className={`font-medium whitespace-nowrap transition-all duration-300 ${
                    isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  }`}>
                    {item.label}
                    {!isCollapsed && badge != null && badge > 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
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
