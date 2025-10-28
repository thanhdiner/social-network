import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import userService, { type ActiveUser } from '@/services/userService'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/contexts/AuthContext'

interface FollowerWithStatus extends ActiveUser {
  isFollowing?: boolean
}

interface ProfileConnectionsProps {
  username?: string
}

export const ProfileConnections = ({ username }: ProfileConnectionsProps) => {
  const { user: profileUser } = useUserProfile(username)
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers')
  const [followers, setFollowers] = useState<FollowerWithStatus[]>([])
  const [following, setFollowing] = useState<ActiveUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check if viewing own profile
  const isOwnProfile = profileUser?.id === currentUser?.id

  const loadData = async () => {
    if (!profileUser?.id) return

    setIsLoading(true)
    try {
      if (activeTab === 'followers') {
        const data = await userService.getFollowers(profileUser.id)
        // Check follow status for each follower
        const followersWithStatus = await Promise.all(
          data.map(async follower => {
            if (follower.id === currentUser?.id) {
              return { ...follower, isFollowing: false } // Don't show button for self
            }
            try {
              const status = await userService.checkFollowStatus(follower.id)
              return { ...follower, isFollowing: status.isFollowing }
            } catch {
              return { ...follower, isFollowing: false }
            }
          })
        )
        setFollowers(followersWithStatus)
      } else {
        const data = await userService.getFollowing(profileUser.id)
        setFollowing(data)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUser?.id, activeTab])

  const handleFollow = async (userId: string) => {
    try {
      await userService.followUser(userId)
      // Reload data after following
      await loadData()
    } catch (error) {
      console.error('Failed to follow user:', error)
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      await userService.unfollowUser(userId)
      // Reload data after unfollowing
      await loadData()
    } catch (error) {
      console.error('Failed to unfollow user:', error)
    }
  }

  const displayList = activeTab === 'followers' ? followers : following

  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <h2 className="text-lg font-semibold mb-4">{activeTab === 'followers' ? 'Followers' : 'Following'}</h2>

      <div className="flex gap-4 border-b pb-3 text-sm text-gray-600 mb-4">
        <button
          onClick={() => setActiveTab('followers')}
          className={`font-medium cursor-pointer ${activeTab === 'followers' ? 'text-orange-500' : 'hover:text-orange-500'}`}
        >
          Followers
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`font-medium cursor-pointer ${activeTab === 'following' ? 'text-orange-500' : 'hover:text-orange-500'}`}
        >
          Following
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between border rounded-xl p-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">{activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeTab === 'followers'
            ? followers.map(person => (
                <div key={person.id} className="flex items-center justify-between border rounded-xl p-3 hover:shadow transition">
                  <Link to={`/profile/${person.username}`} className="flex items-center gap-3 flex-1">
                    <img
                      src={
                        person.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=fb923c&color=fff`
                      }
                      alt={person.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-800 hover:text-orange-600 transition">{person.name}</p>
                      <p className="text-sm text-gray-500">@{person.username}</p>
                    </div>
                  </Link>
                  {person.id !== currentUser?.id &&
                    (person.isFollowing ? (
                      <button
                        onClick={() => handleUnfollow(person.id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Following
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFollow(person.id)}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        {isOwnProfile ? 'Follow Back' : 'Follow'}
                      </button>
                    ))}
                </div>
              ))
            : following.map(person => (
                <div key={person.id} className="flex items-center justify-between border rounded-xl p-3 hover:shadow transition">
                  <Link to={`/profile/${person.username}`} className="flex items-center gap-3 flex-1">
                    <img
                      src={
                        person.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=fb923c&color=fff`
                      }
                      alt={person.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-800 hover:text-orange-600 transition">{person.name}</p>
                      <p className="text-sm text-gray-500">@{person.username}</p>
                    </div>
                  </Link>
                  {person.id !== currentUser?.id && (
                    <button
                      onClick={() => handleUnfollow(person.id)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Following
                    </button>
                  )}
                </div>
              ))}
        </div>
      )}
    </div>
  )
}
