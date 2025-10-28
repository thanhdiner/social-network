import { useState } from 'react'
import { CreatePost } from './CreatePost'
import { LifeEvents } from './LifeEvents'
import { PhotosGallery } from './PhotosGallery'
import { PostsList } from './PostsList'

interface ProfileTimelineProps {
  userId: string
  isOwnProfile?: boolean
}

export const ProfileTimeline = ({ userId, isOwnProfile }: ProfileTimelineProps) => {
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Sidebar */}
      <div className="space-y-6">
        <LifeEvents />
        <PhotosGallery />
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {isOwnProfile && <CreatePost onPostCreated={handlePostCreated} />}
        <PostsList userId={userId} refresh={refreshKey} />
      </div>
    </div>
  )
}
