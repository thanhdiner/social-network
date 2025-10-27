import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileTabs } from './components/ProfileTabs'
import { ProfileTimeline } from './components/ProfileTimeline'
import { ProfileAbout } from './components/ProfileAbout'
import { ProfileFriends } from './components/ProfileFriends'
import { ProfilePhotos } from './components/ProfilePhotos'

export default function MyProfilePage() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'timeline' | 'about' | 'friends' | 'photos'>('timeline')
  
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
        {activeTab === 'friends' && <ProfileFriends username={profileUsername} />}
        {activeTab === 'photos' && <ProfilePhotos username={profileUsername} />}
      </div>
    </div>
  )
}
