import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileTabs, type ProfileTab } from './components/ProfileTabs'
import { ProfileTimeline } from './components/ProfileTimeline'
import { ProfileAbout } from './components/ProfileAbout'
import { ProfileConnections } from './components/ProfileConnections'
import { ProfilePhotos } from './components/ProfilePhotos'
import { SavedPosts } from './components/SavedPosts'
import { ProfileReels } from './components/ProfileReels.tsx'

const ALL_TABS: ProfileTab[] = ['timeline', 'about', 'connections', 'photos', 'reels', 'saved']
const isValidTab = (value: string | null): value is ProfileTab => {
  return Boolean(value && ALL_TABS.includes(value as ProfileTab))
}

export default function MyProfilePage() {
  const { username } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const isOwnProfile = username === currentUser?.username
  const profileUsername = username || currentUser?.username
  const tabFromUrl = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    if (!isValidTab(tabFromUrl)) return 'timeline'
    if (tabFromUrl === 'saved' && !isOwnProfile) return 'timeline'
    return tabFromUrl
  })

  // Fetch profile user data
  const { user: profileUser } = useUserProfile(profileUsername)

  // Update URL when tab changes
  useEffect(() => {
    if (profileUsername) {
      const newUrl = activeTab === 'timeline' 
        ? `/profile/${profileUsername}`
        : `/profile/${profileUsername}?tab=${activeTab}`
      navigate(newUrl, { replace: true })
    }
  }, [activeTab, profileUsername, navigate])

  // Sync activeTab with URL params
  useEffect(() => {
    if (!isValidTab(tabFromUrl)) {
      setActiveTab('timeline')
      return
    }

    if (tabFromUrl === 'saved' && !isOwnProfile) {
      setActiveTab('timeline')
      return
    }

    setActiveTab(tabFromUrl)
  }, [tabFromUrl, isOwnProfile])

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center bg-gray-50 min-h-screen py-2">
      {/* Header (cover + avatar + info) */}
      <ProfileHeader username={profileUsername} isOwnProfile={isOwnProfile} />

      {/* Tabs */}
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} isOwnProfile={isOwnProfile} />

      {/* Tab Content */}
      <div className="max-w-4xl w-full mt-6 space-y-6">
        {activeTab === 'timeline' && <ProfileTimeline userId={profileUser.id} isOwnProfile={isOwnProfile} />}
        {activeTab === 'about' && <ProfileAbout username={profileUsername} />}
        {activeTab === 'connections' && <ProfileConnections username={profileUsername} />}
        {activeTab === 'photos' && <ProfilePhotos userId={profileUser.id} />}
        {activeTab === 'reels' && <ProfileReels userId={profileUser.id} />}
        {activeTab === 'saved' && isOwnProfile && <SavedPosts />}
      </div>
    </div>
  )
}
