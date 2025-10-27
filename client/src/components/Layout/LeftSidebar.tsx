import { Home, User, Users, CheckSquare, Calendar, UserPlus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const LeftSidebar = () => {
  const location = useLocation()
  const { user } = useAuth()

  const menu = [
    { icon: Home, label: 'Newsfeed', path: '/' },
    { icon: User, label: 'Profile', path: user?.username ? `/profile/${user.username}` : '/profile' },
    { icon: UserPlus, label: 'Suggestions', path: '/suggestions' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: CheckSquare, label: 'Todo', path: '/todo' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' }
  ]

  return (
    <aside className="h-full p-4 bg-white">
      <nav>
        <ul className="space-y-1">
          {menu.map(item => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.label}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-orange-50 text-orange-600' 
                      : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  <item.icon 
                    size={20} 
                    className={`transition-colors duration-200 ${
                      isActive 
                        ? 'text-orange-500' 
                        : 'text-gray-500 group-hover:text-orange-500'
                    }`} 
                  />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
