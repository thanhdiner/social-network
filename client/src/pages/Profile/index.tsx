import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileTabs } from './components/ProfileTabs'
import { ProfileTimeline } from './components/ProfileTimeline'
import { ProfileAbout } from './components/ProfileAbout'
import { ProfileConnections } from './components/ProfileConnections'
import { ProfilePhotos } from './components/ProfilePhotos'
import { SavedPosts } from './components/SavedPosts'

export default function MyProfilePage() {
  const { username } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  
  // Get tab from URL params or default to 'timeline'
  const tabFromUrl = searchParams.get('tab') as 'timeline' | 'about' | 'connections' | 'photos' | 'saved' | null
  const [activeTab, setActiveTab] = useState<'timeline' | 'about' | 'connections' | 'photos' | 'saved'>(
    tabFromUrl && ['timeline', 'about', 'connections', 'photos', 'saved'].includes(tabFromUrl) 
      ? tabFromUrl 
      : 'timeline'
  )

  // Check if this is the user's own profile
  const isOwnProfile = username === currentUser?.username
  // Actual username to fetch data (prefer username from URL, fallback to currentUser.username)
  const profileUsername = username || currentUser?.username

  // Fetch profile user data
  const { user: profileUser } = useUserProfile(profileUsername)

  // Update URL when tab changes
  useEffect(() => {
    const profileUsername = username || currentUser?.username
    if (profileUsername) {
      const newUrl = activeTab === 'timeline' 
        ? `/profile/${profileUsername}`
        : `/profile/${profileUsername}?tab=${activeTab}`
      navigate(newUrl, { replace: true })
    }
  }, [activeTab, username, currentUser?.username, navigate])

  // Sync activeTab with URL params
  useEffect(() => {
    if (tabFromUrl && ['timeline', 'about', 'connections', 'photos', 'saved'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    } else {
      setActiveTab('timeline')
    }
  }, [tabFromUrl])

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
        {activeTab === 'saved' && isOwnProfile && <SavedPosts />}
      </div>
    </div>
  )
}
