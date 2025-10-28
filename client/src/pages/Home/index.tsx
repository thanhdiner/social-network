import { useState } from 'react'
import { useTitle } from '@/hooks/useTitle'
import { CreatePostCard } from '@/components/shared/CreatePostCard'
import { FeedPosts } from '@/components/shared/FeedPosts'

export default function Home() {
  useTitle('Home • Diner')
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-4">
      <CreatePostCard onPostCreated={handlePostCreated} />
      <FeedPosts refresh={refreshKey} />
    </div>
  )
}

