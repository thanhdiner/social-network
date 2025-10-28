import { CreatePost } from './CreatePost'
import { LifeEvents } from './LifeEvents'
import { PhotosGallery } from './PhotosGallery'
import { PostsList } from './PostsList'

interface ProfileTimelineProps {
  username?: string
}

export const ProfileTimeline = ({ username }: ProfileTimelineProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Sidebar */}
      <div className="space-y-6">
        <LifeEvents username={username} />
        <PhotosGallery username={username} />
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <CreatePost />
        <PostsList username={username} />
      </div>
    </div>
  )
}
