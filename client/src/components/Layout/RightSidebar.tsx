import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import userService, { type ActiveUser } from '../../services/userService'
import storyService, { type GroupedStories } from '../../services/storyService'
import socketService from '../../services/socketService'
import { Link } from 'react-router-dom'
import { CreateStoryModal } from '../shared/CreateStoryModal'
import { StoryViewer } from '../shared/StoryViewer'
import { Avatar } from '../shared/Avatar'
import { FriendSuggestions } from '../shared/FriendSuggestions'
import { formatDistanceToNow } from 'date-fns'

export const RightSidebar = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupedStories, setGroupedStories] = useState<GroupedStories[]>([])
  const [isStoriesLoading, setIsStoriesLoading] = useState(true)
  const [createStoryOpen, setCreateStoryOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupedStories | null>(null)

  useEffect(() => {
    loadActiveUsers()
    loadStories()

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

  const loadStories = async () => {
    try {
      const stories = await storyService.getAllStories()
      setGroupedStories(stories)
    } catch (error) {
      console.error('Failed to load stories:', error)
    } finally {
      setIsStoriesLoading(false)
    }
  }

  const handleStoryCreated = () => {
    loadStories()
  }

  return (
    <aside className="h-full p-4 bg-white space-y-5">
      {/* Stories */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Stories</h3>

        <div
          onClick={() => setCreateStoryOpen(true)}
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-orange-50 transition cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center border border-orange-200 group-hover:bg-orange-500 group-hover:text-white transition-all duration-200">
            <Plus size={22} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-800 group-hover:text-orange-600">Create Story</span>
            <span className="text-xs text-gray-500">Share your moment</span>
          </div>
        </div>

        {isStoriesLoading ? (
          <div className="mt-2 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedStories.length === 0 ? (
          <div className="mt-2 text-center py-4 text-gray-500 text-sm">
            No stories yet. Be the first to share!
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            {groupedStories.map(group => (
              <button
                key={group.userId}
                onClick={() => { setSelectedGroup(group); setViewerOpen(true) }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-orange-50 transition cursor-pointer text-left"
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={group.user.avatar || undefined}
                    name={group.user.name}
                    className={group.hasUnviewed
                      ? 'w-12 h-12 ring-2 ring-orange-400 ring-offset-2'
                      : 'w-12 h-12 ring-2 ring-gray-300 ring-offset-2'}
                  />
                  {group.hasUnviewed && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-gray-800 truncate">{group.user.name}</span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(group.stories[0].createdAt), { addSuffix: true })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {groupedStories.length > 0 && (
          <Link
            to="/stories"
            className="block w-full mt-2 py-2 text-sm font-medium text-orange-600 rounded-lg hover:bg-orange-50 transition text-center cursor-pointer"
          >
            See All Stories
          </Link>
        )}
      </section>

      <hr />

      {/* Friend Suggestions */}
      <FriendSuggestions />

      <hr />

      {/* Active Users */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Active Users</h3>
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : activeUsers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No friends online</p>
            <p className="text-xs mt-1">People you follow are not active right now</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {activeUsers.map(user => (
              <li key={user.id}>
                <Link
                  to={`/profile/${user.username}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50 transition cursor-pointer"
                >
                  <div className="relative">
                    <Avatar
                      src={user.avatar || undefined}
                      name={user.name}
                      className="w-9 h-9 border border-gray-200"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <span className="text-gray-800 font-medium truncate">{user.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CreateStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onStoryCreated={handleStoryCreated}
      />

      {selectedGroup && (
        <StoryViewer
          open={viewerOpen}
          onClose={() => { setViewerOpen(false); setSelectedGroup(null) }}
          stories={selectedGroup.stories}
          onDelete={() => { setViewerOpen(false); setSelectedGroup(null); loadStories() }}
        />
      )}
    </aside>
  )
}
