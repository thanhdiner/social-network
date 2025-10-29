import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Trash2, Pause, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import storyService, { type Story } from '@/services/storyService'
import { formatDistanceToNow } from 'date-fns'

interface StoryViewerProps {
  open: boolean
  onClose: () => void
  stories: Story[]
  initialIndex?: number
  onStoryChange?: (index: number) => void
  onDelete?: () => void
}

export const StoryViewer = ({ 
  open, 
  onClose, 
  stories, 
  initialIndex = 0,
  onStoryChange,
  onDelete 
}: StoryViewerProps) => {
  const { user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressInterval = useRef<number | undefined>(undefined)

  const currentStory = stories[currentIndex]
  const isOwnStory = currentStory?.userId === user?.id
  const STORY_DURATION = 5000 // 5 seconds for images

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1)
      onStoryChange?.(currentIndex + 1)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length, onStoryChange, onClose])

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    if (!open || !currentStory) return

    // Mark story as viewed
    storyService.addView(currentStory.id).catch(console.error)

    // Reset progress and pause state when story changes
    setProgress(0)
    setIsPaused(false)

    // Handle video stories
    if (currentStory.videoUrl && videoRef.current) {
      const video = videoRef.current
      video.currentTime = 0
      video.play()

      const updateVideoProgress = () => {
        if (video.duration) {
          setProgress((video.currentTime / video.duration) * 100)
        }
      }

      video.addEventListener('timeupdate', updateVideoProgress)
      video.addEventListener('ended', handleNext)

      return () => {
        video.removeEventListener('timeupdate', updateVideoProgress)
        video.removeEventListener('ended', handleNext)
        video.pause()
      }
    }
  }, [currentIndex, open, currentStory, handleNext])

  // Separate useEffect for handling pause/resume for image stories
  useEffect(() => {
    if (!currentStory?.imageUrl || currentStory.videoUrl) return

    if (isPaused) {
      // Clear interval when paused
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    } else {
      // Start/resume interval when not paused
      progressInterval.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext()
            return 100
          }
          return prev + (100 / (STORY_DURATION / 100))
        })
      }, 100)
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPaused, currentStory?.imageUrl, currentStory?.videoUrl, handleNext, STORY_DURATION])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      onStoryChange?.(currentIndex - 1)
    }
  }

  const handleDelete = async () => {
    if (!currentStory || !isOwnStory) return

    if (!confirm('Are you sure you want to delete this story?')) return

    try {
      setIsDeleting(true)
      await storyService.deleteStory(currentStory.id)
      onDelete?.()
      
      // Move to next story or close if this was the last one
      if (stories.length > 1) {
        if (currentIndex === stories.length - 1) {
          handlePrevious()
        } else {
          handleNext()
        }
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Failed to delete story:', error)
      alert('Failed to delete story')
    } finally {
      setIsDeleting(false)
    }
  }

  const togglePause = () => {
    const newPausedState = !isPaused
    setIsPaused(newPausedState)

    // Handle video pause/play
    if (currentStory?.videoUrl && videoRef.current) {
      if (newPausedState) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }

    // Handle image story pause - the useEffect will handle starting/stopping interval
  }

  if (!open || !currentStory) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-4 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-10">
        <Link 
          to={`/profile/${currentStory.user.username}`}
          className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <img
            src={currentStory.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStory.user.name)}&background=fb923c&color=fff`}
            alt={currentStory.user.name}
            className="w-10 h-10 rounded-full border-2 border-white object-cover"
          />
          <div>
            <p className="text-white font-semibold">{currentStory.user.name}</p>
            <p className="text-white/80 text-sm">
              {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className="text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          {isOwnStory && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div className="relative w-full h-full max-w-lg flex items-center justify-center">
        {currentStory.imageUrl && (
          <img
            src={currentStory.imageUrl}
            alt="Story"
            className="max-w-full max-h-full object-contain"
            onClick={togglePause}
          />
        )}

        {currentStory.videoUrl && (
          <video
            ref={videoRef}
            src={currentStory.videoUrl}
            className="max-w-full max-h-full object-contain"
            onClick={togglePause}
            playsInline
          />
        )}

        {/* Navigation Buttons */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-full transition cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {currentIndex < stories.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 p-3 rounded-full transition cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* View Count (for own stories) */}
      {isOwnStory && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
          <p className="text-white text-sm">
            👁️ {currentStory._count.views} {currentStory._count.views === 1 ? 'view' : 'views'}
          </p>
        </div>
      )}
    </div>
  )
}
