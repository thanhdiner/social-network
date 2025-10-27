import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Settings, UserPlus, MessageCircle, UserCheck, Camera, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import uploadService from '@/services/uploadService'
import userService from '@/services/userService'
import socketService from '@/services/socketService'

interface ProfileHeaderProps {
  username?: string
  isOwnProfile: boolean
}

export const ProfileHeader = ({ username, isOwnProfile }: ProfileHeaderProps) => {
  const navigate = useNavigate()
  const { refreshUser, user: currentUser } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followsMe, setFollowsMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [checkingFollow, setCheckingFollow] = useState(true)
  
  // Local stats state để update mượt mà
  const [localStats, setLocalStats] = useState({
    posts: 0,
    followers: 0,
    following: 0
  })
  
  // Image upload states
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Fetch user data based on username
  const { user: profileUser, loading: userLoading, error: userError } = useUserProfile(username)

  // Update local stats when profileUser changes
  useEffect(() => {
    if (profileUser?.stats) {
      setLocalStats({
        posts: profileUser.stats.posts || 0,
        followers: profileUser.stats.followers || 0,
        following: profileUser.stats.following || 0
      })
    }
  }, [profileUser])

  // Redirect to user not found page if user doesn't exist
  useEffect(() => {
    if (!userLoading && (userError || !profileUser)) {
      navigate(`/user-not-found${username ? `/${username}` : ''}`, { replace: true })
    }
  }, [userLoading, userError, profileUser, username, navigate])

  // Check follow status when profile user changes
  useEffect(() => {
    const checkFollow = async () => {
      if (profileUser && !isOwnProfile) {
        setCheckingFollow(true)
        try {
          const { isFollowing: following, followsMe: followsMeStatus } = await userService.checkFollowStatus(profileUser.id)
          setIsFollowing(following)
          setFollowsMe(followsMeStatus)
        } catch (error) {
          console.error('Failed to check follow status:', error)
        } finally {
          setCheckingFollow(false)
        }
      }
    }
    checkFollow()
  }, [profileUser, isOwnProfile])

  // Listen for realtime follow/unfollow events
  useEffect(() => {
    if (!profileUser || !currentUser) return

    const handleNewFollower = (data: { followerId: string }) => {
      // If someone followed this profile and we're viewing it
      if (data.followerId === currentUser.id && profileUser.id) {
        setIsFollowing(true)
      }
      // Update followers count
      setLocalStats(prev => ({ ...prev, followers: prev.followers + 1 }))
    }

    const handleUnfollowed = (data: { followerId: string }) => {
      // If someone unfollowed this profile and we're viewing it
      if (data.followerId === currentUser.id && profileUser.id) {
        setIsFollowing(false)
      }
      // Update followers count
      setLocalStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }))
    }

    socketService.onNewFollower(handleNewFollower)
    socketService.onUnfollowed(handleUnfollowed)

    return () => {
      socketService.offNewFollower()
      socketService.offUnfollowed()
    }
  }, [profileUser, currentUser])

  // Stats - Dùng local stats
  const stats = localStats

  // Loading state
  if (userLoading) {
    return (
      <div className="relative w-full max-w-5xl mx-auto">
        <div className="h-48 rounded-t-2xl bg-gray-200 animate-pulse"></div>
        <div className="bg-white shadow rounded-b-2xl px-8 pt-14 pb-6 relative z-10 flex flex-col items-center">
          <div className="absolute -top-14">
            <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse"></div>
          </div>
          <div className="h-6 w-32 bg-gray-200 animate-pulse mt-2 rounded"></div>
          <div className="h-4 w-48 bg-gray-200 animate-pulse mt-2 rounded"></div>
        </div>
      </div>
    )
  }

  // Error state or no user - will redirect via useEffect
  if (userError || !profileUser) {
    return null
  }

  const handleFollow = async () => {
    if (!profileUser) return
    
    setIsLoading(true)
    try {
      if (isFollowing) {
        await userService.unfollowUser(profileUser.id)
        setIsFollowing(false)
        // Update followers count locally
        setLocalStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }))
      } else {
        await userService.followUser(profileUser.id)
        setIsFollowing(true)
        // Update followers count locally
        setLocalStats(prev => ({ ...prev, followers: prev.followers + 1 }))
      }
      // Không cần refetch nữa - stats đã được update local
    } catch (error) {
      console.error('Follow error:', error)
      // Revert on error
      setIsFollowing(!isFollowing)
      // Revert stats
      if (isFollowing) {
        setLocalStats(prev => ({ ...prev, followers: prev.followers + 1 }))
      } else {
        setLocalStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleMessage = () => {
    navigate('/chat')
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = uploadService.validateImage(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    try {
      setUploadingAvatar(true)
      
      // Xóa ảnh cũ trên Cloudinary (nếu có)
      if (profileUser?.avatar) {
        await uploadService.deleteImage(profileUser.avatar).catch(err => {
          console.warn('Failed to delete old avatar:', err)
        })
      }
      
      // Upload ảnh mới
      const imageUrl = await uploadService.uploadImage(file)
      
      // Update profile với avatar mới
      await userService.updateProfile({ avatar: imageUrl })
      
      // Refresh user data
      await refreshUser()
      
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload avatar error:', err)
      alert('Upload avatar thất bại')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = uploadService.validateImage(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    try {
      setUploadingCover(true)
      
      // Xóa ảnh bìa cũ trên Cloudinary (nếu có)
      if (profileUser?.coverImage) {
        await uploadService.deleteImage(profileUser.coverImage).catch(err => {
          console.warn('Failed to delete old cover:', err)
        })
      }
      
      // Upload ảnh mới
      const imageUrl = await uploadService.uploadImage(file)
      
      // Update profile với cover image mới
      await userService.updateProfile({ coverImage: imageUrl })
      
      // Refresh user data
      await refreshUser()
      
      // Reset input
      if (coverInputRef.current) {
        coverInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload cover error:', err)
      alert('Upload ảnh bìa thất bại')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleRemoveCover = async () => {
    if (!confirm('Bạn có chắc muốn xóa ảnh bìa?')) return

    try {
      setUploadingCover(true)
      
      // Xóa ảnh trên Cloudinary trước
      if (profileUser?.coverImage) {
        await uploadService.deleteImage(profileUser.coverImage).catch(err => {
          console.warn('Failed to delete cover from Cloudinary:', err)
        })
      }
      
      // Xóa trong database
      await userService.updateProfile({ coverImage: '' })
      await refreshUser()
    } catch (err) {
      console.error('Remove cover error:', err)
      alert('Xóa ảnh bìa thất bại')
    } finally {
      setUploadingCover(false)
    }
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Cover */}
      <div className="h-48 rounded-t-2xl bg-linear-to-r from-orange-100 to-orange-200 relative overflow-hidden">
        {profileUser?.coverImage && (
          <img 
            src={profileUser.coverImage} 
            alt="cover" 
            className="w-full h-full object-cover" 
          />
        )}
        {uploadingCover && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white">Đang upload...</div>
          </div>
        )}
        <div className="absolute top-3 right-4 flex gap-2 z-20">
          {isOwnProfile ? (
            <>
              {/* Hidden file inputs */}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
              
              {/* 📷 Camera - Upload cover */}
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="p-2 bg-white rounded-full shadow-md hover:bg-orange-50 transition"
                title="Thay đổi ảnh bìa"
              >
                <Camera className="text-orange-500" size={17} />
              </button>

              {/* ❌ Remove cover - Chỉ hiện nếu có ảnh bìa */}
              {profileUser?.coverImage && (
                <button
                  onClick={handleRemoveCover}
                  disabled={uploadingCover}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition"
                  title="Xóa ảnh bìa"
                >
                  <X className="text-red-500" size={17} />
                </button>
              )}

              {/* ✏️ Edit - Chỉ hiện khi là profile của mình */}
              <button
                onClick={() => navigate('/profile/edit')}
                className="p-2 bg-white rounded-full shadow-md hover:bg-orange-50 transition"
              >
                <Pencil className="text-orange-500" size={17} />
              </button>

              {/* ⚙️ Settings - Chỉ hiện khi là profile của mình */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 bg-white rounded-full shadow-md hover:bg-orange-50 transition"
              >
                <Settings className="text-gray-600" size={17} />
              </button>
            </>
          ) : (
            <>
              {/* 💬 Message - Hiện khi xem profile người khác */}
              <button
                onClick={handleMessage}
                className="p-2 bg-white rounded-full shadow-md hover:bg-orange-50 transition"
                title="Send Message"
              >
                <MessageCircle className="text-orange-500" size={17} />
              </button>

              {/* ➕ Follow/Following - Hiện khi xem profile người khác */}
              <button
                onClick={handleFollow}
                disabled={isLoading || checkingFollow}
                className={`p-2 bg-white rounded-full shadow-md transition ${
                  checkingFollow
                    ? 'opacity-50 cursor-not-allowed'
                    : isFollowing 
                      ? 'hover:bg-gray-100' 
                      : 'hover:bg-orange-50'
                }`}
                title={
                  checkingFollow
                    ? 'Loading...'
                    : isFollowing
                    ? 'Following'
                    : followsMe
                    ? 'Follow Back'
                    : 'Follow'
                }
              >
                {checkingFollow ? (
                  <div className="animate-spin w-[17px] h-[17px] border-2 border-orange-500 border-t-transparent rounded-full" />
                ) : isFollowing ? (
                  <UserCheck className="text-green-500" size={17} />
                ) : (
                  <UserPlus className="text-orange-500" size={17} />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Avatar + Info */}
      <div className="bg-white shadow rounded-b-2xl px-8 pt-14 pb-6 relative z-10 flex flex-col items-center">
        <div className="absolute -top-14">
          <div className="relative p-1.5 bg-white rounded-full shadow-md">
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full z-10">
                <div className="text-white text-xs">Uploading...</div>
              </div>
            )}
            <img
              src={profileUser?.avatar || 'https://i.pravatar.cc/150'}
              alt="avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-white"
            />
            {/* ✏️ Edit Avatar - Chỉ hiện cho profile của mình */}
            {isOwnProfile && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 p-2 bg-orange-500 text-white rounded-full shadow-md hover:bg-orange-600 transition"
                  title="Thay đổi avatar"
                >
                  <Pencil size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <h2 className="text-lg font-semibold mt-2">{profileUser?.name || 'User'}</h2>

        {/* 📝 Bio */}
        <p className="text-gray-600 text-sm mt-0.5 text-center max-w-xs">
          {profileUser?.bio || 'No bio yet'}
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-8 mt-4 text-sm">
          <div className="text-center">
            <p className="font-semibold text-gray-800">{stats.posts}</p>
            <p className="text-gray-500">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">{stats.followers}</p>
            <p className="text-gray-500">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">{stats.following}</p>
            <p className="text-gray-500">Following</p>
          </div>
        </div>

        {/* Action Buttons dưới stats - Chỉ cho profile người khác */}
        {!isOwnProfile && (
          <div className="flex gap-3 mt-5">
            <Button
              onClick={handleFollow}
              disabled={isLoading || checkingFollow}
              className={`cursor-pointer ${
                checkingFollow
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isFollowing
                  ? 'bg-gray-500 hover:bg-gray-600'
                  : 'bg-orange-500 hover:bg-orange-600'
              } text-white px-6`}
            >
              {checkingFollow ? (
                <>
                  <div className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Loading...
                </>
              ) : isFollowing ? (
                <>
                  <UserCheck className="inline mr-2" size={18} />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="inline mr-2" size={18} />
                  {followsMe ? 'Follow Back' : 'Follow'}
                </>
              )}
            </Button>
            <Button
              onClick={handleMessage}
              variant="outline"
              className="cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50 px-6"
            >
              <MessageCircle size={16} className="mr-2" />
              Message
            </Button>
          </div>
        )}
      </div>

      {/* ⚙️ Settings Modal - Chỉ cho profile của mình */}
      {isOwnProfile && (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-orange-600">Profile Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <Button variant="outline" className="w-full justify-start">
                Privacy Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Account Security
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Notification Preferences
              </Button>
            </div>
            <DialogFooter>
              <Button variant="destructive" className="w-full">
                Deactivate Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
