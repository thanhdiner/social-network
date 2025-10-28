import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileTabs } from './components/ProfileTabs'
import { ProfileTimeline } from './components/ProfileTimeline'
import { ProfileAbout } from './components/ProfileAbout'
import { ProfileConnections } from './components/ProfileConnections'
import { ProfilePhotos } from './components/ProfilePhotos'

export default function MyProfilePage() {
  const { username } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  
  // Get tab from URL params or default to 'timeline'
  const tabFromUrl = searchParams.get('tab') as 'timeline' | 'about' | 'connections' | 'photos' | null
  const [activeTab, setActiveTab] = useState<'timeline' | 'about' | 'connections' | 'photos'>(
    tabFromUrl && ['timeline', 'about', 'connections', 'photos'].includes(tabFromUrl) 
      ? tabFromUrl 
      : 'timeline'
  )

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
    if (tabFromUrl && ['timeline', 'about', 'connections', 'photos'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    } else {
      setActiveTab('timeline')
    }
  }, [tabFromUrl])

  // Kiểm tra xem có phải profile của mình không
  const isOwnProfile = username === currentUser?.username
  // Username thực tế để fetch data (ưu tiên username từ URL, fallback về currentUser.username)
  const profileUsername = username || currentUser?.username

  return (
    <div className="flex flex-col items-center bg-gray-50 min-h-screen py-2">
      {/* Header (cover + avatar + info) */}
      <ProfileHeader username={profileUsername} isOwnProfile={isOwnProfile} />

      {/* Tabs */}
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Tab Content */}
      <div className="max-w-4xl w-full mt-6 space-y-6">
        {activeTab === 'timeline' && <ProfileTimeline username={profileUsername} />}
        {activeTab === 'about' && <ProfileAbout username={profileUsername} />}
        {activeTab === 'connections' && <ProfileConnections username={profileUsername} />}
        {activeTab === 'photos' && <ProfilePhotos username={profileUsername} />}
      </div>
    </div>
  )
}
