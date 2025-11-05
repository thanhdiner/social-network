import { Home, User, Users, CheckSquare, Calendar, UserPlus, Film, MessageCircle, Settings } from 'lucide-react'
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
    { icon: Film, label: 'Stories', path: '/stories' },
    { icon: User, label: 'Profile', path: user?.username ? `/profile/${user.username}` : '/profile' },
  { icon: UserPlus, label: 'Suggestions', path: '/suggestions' },
  { icon: Settings, label: 'Account Settings', path: '/settings/account' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: CheckSquare, label: 'Todo', path: '/todo' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' }
  ]

  return (
    <aside className="h-full p-4 bg-white overflow-hidden">
      <nav>
        <ul className="space-y-1">
          {menu.map(item => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.label}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${
                    isActive 
                      ? 'bg-orange-50 text-orange-600' 
                      : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <item.icon 
                    size={20} 
                    className={`shrink-0 transition-colors duration-200 cursor-pointer ${
                      isActive 
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
