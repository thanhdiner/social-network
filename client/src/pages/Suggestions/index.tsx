import { useEffect, useState } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import userService from '@/services/userService'
import socketService from '@/services/socketService'
import { useTitle } from '@/hooks/useTitle'

interface SuggestedUser {
  id: string
  name: string
  username: string
  avatar: string | null
  bio: string | null
  mutualFriends?: number
}

const Suggestions = () => {
  useTitle('Suggestions - Diner')
  const navigate = useNavigate()
  const [users, setUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())
  const [followersMap, setFollowersMap] = useState<Map<string, boolean>>(new Map()) // Track who follows me

  useEffect(() => {
    loadSuggestions()

    // Listen for real-time follow events
    socketService.onNewFollower((data) => {
      console.log('New follower event received:', data)
      // Update followers map when someone follows me
      if (data.followerId) {
        setFollowersMap(prev => new Map(prev).set(data.followerId, true))
      }
    })

    return () => {
      socketService.offNewFollower()
    }
  }, [])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const data = await userService.getSuggestedUsers()
      setUsers(data)
      
      // Check follow status for each user
      const followStatusPromises = data.map(async (user) => {
        try {
          const status = await userService.checkFollowStatus(user.id)
          return { userId: user.id, ...status }
        } catch (error) {
          console.error('Failed to check follow status:', error)
          return { userId: user.id, isFollowing: false, followsMe: false }
        }
      })
      
      const statuses = await Promise.all(followStatusPromises)
      
      // Update following users
      const following = new Set<string>()
      const followers = new Map<string, boolean>()
      
      statuses.forEach(status => {
        if (status.isFollowing) {
          following.add(status.userId)
        }
        if (status.followsMe) {
          followers.set(status.userId, true)
        }
      })
      
      setFollowingUsers(following)
      setFollowersMap(followers)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click event
    
    const isCurrentlyFollowing = followingUsers.has(userId)
    
    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        await userService.unfollowUser(userId)
        setFollowingUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      } else {
        // Follow
        await userService.followUser(userId)
        setFollowingUsers(prev => new Set(prev).add(userId))
      }
    } catch (error) {
      console.error('Failed to follow/unfollow user:', error)
    }
  }

  const handleCardClick = (username: string) => {
    navigate(`/profile/${username}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <UserPlus className="text-orange-500" size={28} />
          Suggested for You
        </h1>
        <p className="text-gray-600 mt-1">Discover people you might know</p>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No suggestions available</h3>
          <p className="text-gray-500">Check back later for new people to connect with</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const isFollowing = followingUsers.has(user.id)
            return (
              <div
                key={user.id}
                onClick={() => handleCardClick(user.username)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-100 cursor-pointer"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-orange-200">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                        <span className="text-2xl font-semibold text-orange-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-800 text-lg mb-1">
                    {user.name}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">@{user.username}</p>

                  {user.bio && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {user.bio}
                    </p>
                  )}

                  {user.mutualFriends !== undefined && user.mutualFriends > 0 && (
                    <p className="text-xs text-gray-500 mb-3">
                      {user.mutualFriends} mutual friend{user.mutualFriends > 1 ? 's' : ''}
                    </p>
                  )}

                  <button
                    onClick={(e) => handleFollow(user.id, e)}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center cursor-pointer gap-2 ${
                      isFollowing
                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                    }`}
                  >
                    <UserPlus size={16} />
                    {isFollowing 
                      ? 'Following' 
                      : followersMap.get(user.id) 
                        ? 'Follow Back' 
                        : 'Follow'
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Suggestions
