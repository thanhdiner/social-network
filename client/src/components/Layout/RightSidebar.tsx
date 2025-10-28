import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import userService, { type ActiveUser } from '../../services/userService'
import socketService from '../../services/socketService'
import { Link } from 'react-router-dom'

export const RightSidebar = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadActiveUsers()

    // Listen for online users updates
    socketService.onOnlineUsersUpdated(() => {
      loadActiveUsers()
    })

    return () => {
      socketService.offOnlineUsersUpdated()
    }
  }, [])

  const loadActiveUsers = async () => {
    try {
      const users = await userService.getActiveUsers()
      setActiveUsers(users)
    } catch (error) {
      console.error('Failed to load active users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const friendStories = [
    { id: 1, name: 'Anna Mull', img: 'https://i.pravatar.cc/40?u=4', timeAgo: '1h ago' },
    { id: 2, name: 'Ira Membrit', img: 'https://i.pravatar.cc/40?u=5', timeAgo: '4h ago' },
    { id: 3, name: 'Bob Frapples', img: 'https://i.pravatar.cc/40?u=6', timeAgo: '9h ago' }
  ]

  return (
    <aside className="h-full p-4 bg-white">
      {/* Stories */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Stories</h3>

        {/* Create Story */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-orange-50 transition cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center border border-orange-200 group-hover:bg-orange-500 group-hover:text-white transition-all duration-200">
            <Plus size={22} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 group-hover:text-orange-600">Create Story</span>
            <span className="text-xs text-gray-500">Share your moment</span>
          </div>
        </div>

        {/* Friend Stories */}
        <div className="space-y-2 mt-2">
          {friendStories.map(story => (
            <div key={story.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-orange-50 cursor-pointer transition">
              <div className="relative">
                <img src={story.img} alt={story.name} className="w-12 h-12 rounded-full ring-2 ring-orange-400 ring-offset-2" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-800">{story.name}</span>
                <span className="text-xs text-gray-500">{story.timeAgo}</span>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-2 py-2 text-sm font-medium text-orange-600 rounded-lg hover:bg-orange-50 transition">
          See All Stories
        </button>
      </section>

      <hr className="my-5" />

      {/* Active Users */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Active Users</h3>
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : activeUsers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No active users</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {activeUsers.map(user => (
              <li key={user.id}>
                <Link 
                  to={`/${user.username}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50 transition cursor-pointer"
                >
                  <div className="relative">
                    <img 
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=fb923c&color=fff`} 
                      alt={user.name} 
                      className="w-9 h-9 rounded-full border border-gray-200 object-cover" 
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  </div>
                  <span className="text-gray-800 font-medium truncate">{user.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
