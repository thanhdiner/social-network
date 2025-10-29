import { useEffect, useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useTitle } from '@/hooks/useTitle'
import { useAuth } from '@/contexts/AuthContext'
import storyService, { type GroupedStories } from '@/services/storyService'
import { CreateStoryModal } from '@/components/shared/CreateStoryModal'
import { StoryViewer } from '@/components/shared/StoryViewer'
import { formatDistanceToNow } from 'date-fns'

export default function Stories() {
  useTitle('Stories • Diner')
  const { user } = useAuth()
  const [groupedStories, setGroupedStories] = useState<GroupedStories[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createStoryOpen, setCreateStoryOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<GroupedStories | null>(null)

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      const stories = await storyService.getAllStories()
      setGroupedStories(stories)
    } catch (error) {
      console.error('Failed to load stories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStoryCreated = () => {
    loadStories()
  }

  const handleStoryDeleted = () => {
    loadStories()
    setViewerOpen(false)
  }

  const handleViewStory = (group: GroupedStories) => {
    setSelectedStoryGroup(group)
    setViewerOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Stories</h1>
        <p className="text-gray-600 mt-1">View stories from people you follow</p>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {/* Create Story Card */}
        <div
          onClick={() => setCreateStoryOpen(true)}
          className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group bg-gradient-to-br from-orange-400 to-orange-600 hover:shadow-lg transition-all"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 group-hover:bg-white/30 transition">
              <Plus className="w-8 h-8" />
            </div>
            <span className="font-semibold">Create Story</span>
          </div>
        </div>

        {/* Friend Stories */}
        {groupedStories.map(group => (
          <div
            key={group.userId}
            onClick={() => handleViewStory(group)}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group hover:shadow-lg transition-all"
          >
            {/* Background Image/Video */}
            {group.stories[0].imageUrl && (
              <img
                src={group.stories[0].imageUrl}
                alt={group.user.name}
                className="w-full h-full object-cover"
              />
            )}
            {group.stories[0].videoUrl && (
              <video
                src={group.stories[0].videoUrl}
                className="w-full h-full object-cover"
                muted
              />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

            {/* User Info */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <img
                src={group.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.user.name)}&background=fb923c&color=fff`}
                alt={group.user.name}
                className={`w-10 h-10 rounded-full object-cover border-2 ${
                  group.hasUnviewed ? 'border-orange-400' : 'border-gray-300'
                }`}
              />
            </div>

            {/* Story Info */}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-semibold truncate">{group.user.name}</p>
              <p className="text-white/80 text-xs">
                {formatDistanceToNow(new Date(group.stories[0].createdAt), { addSuffix: true })}
              </p>
            </div>

            {/* Unviewed Indicator */}
            {group.hasUnviewed && (
              <div className="absolute top-4 right-4">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
              </div>
            )}

            {/* Story Count Badge */}
            {group.stories.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium">
                {group.stories.length}
              </div>
            )}
          </div>
        ))}
      </div>

      {groupedStories.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No stories yet</h3>
          <p className="text-gray-600 mb-4">Be the first to share your moment!</p>
          <button
            onClick={() => setCreateStoryOpen(true)}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition cursor-pointer"
          >
            Create Story
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateStoryModal
        open={createStoryOpen}
        onClose={() => setCreateStoryOpen(false)}
        onStoryCreated={handleStoryCreated}
      />

      {selectedStoryGroup && (
        <StoryViewer
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          stories={selectedStoryGroup.stories}
          onDelete={handleStoryDeleted}
        />
      )}
    </div>
  )
}
