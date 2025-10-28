import { useEffect, useState, useCallback } from 'react'
import { Briefcase, GraduationCap, Heart, Home, MapPin, Trophy, HeartPulse, Plane, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import lifeEventService, { type LifeEvent } from '../../../services/lifeEventService'
import { CreateLifeEventModal } from './CreateLifeEventModal'
import { useAuth } from '../../../contexts/AuthContext'
import { format } from 'date-fns'

interface LifeEventsProps {
  userId: string
}

export const LifeEvents = ({ userId }: LifeEventsProps) => {
  const { user: currentUser } = useAuth()
  const [events, setEvents] = useState<LifeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<LifeEvent | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const isOwnProfile = currentUser?.id === userId

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      const data = await lifeEventService.getUserLifeEvents(userId, 5)
      setEvents(data)
    } catch (error) {
      console.error('Failed to load life events:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleCreate = () => {
    setEditEvent(null)
    setModalOpen(true)
  }

  const handleEdit = (event: LifeEvent) => {
    setEditEvent(event)
    setModalOpen(true)
    setMenuOpen(null)
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this life event?')) return

    try {
      await lifeEventService.deleteLifeEvent(eventId)
      loadEvents()
    } catch (error) {
      console.error('Failed to delete life event:', error)
      alert('Failed to delete life event. Please try again.')
    } finally {
      setMenuOpen(null)
    }
  }

  const getIcon = (type: LifeEvent['type']) => {
    const iconProps = { className: 'w-5 h-5 text-white' }
    switch (type) {
      case 'work':
        return <Briefcase {...iconProps} />
      case 'education':
        return <GraduationCap {...iconProps} />
      case 'relationship':
        return <Heart {...iconProps} />
      case 'home':
        return <Home {...iconProps} />
      case 'location':
        return <MapPin {...iconProps} />
      case 'achievement':
        return <Trophy {...iconProps} />
      case 'health':
        return <HeartPulse {...iconProps} />
      case 'travel':
        return <Plane {...iconProps} />
      default:
        return <Briefcase {...iconProps} />
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy')
    } catch {
      return dateString
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Life Events</h3>
          {isOwnProfile && (
            <button onClick={handleCreate} className="text-orange-500 hover:text-orange-600 font-medium text-sm cursor-pointer">
              Create
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-gray-200 h-40 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No life events yet</p>
            {isOwnProfile && (
              <button onClick={handleCreate} className="mt-2 text-orange-500 hover:text-orange-600 text-sm font-medium cursor-pointer">
                Add your first event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="group relative rounded-xl overflow-hidden hover:shadow-md transition">
                {event.imageUrl && <img src={event.imageUrl} alt={event.title} className="w-full h-40 object-cover" />}
                <div
                  className={`${
                    event.imageUrl
                      ? 'absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent'
                      : 'bg-gray-50 border border-gray-200 rounded-xl'
                  } p-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                      {getIcon(event.type)}
                    </div>
                    <div className={`flex-1 ${event.imageUrl ? 'text-white' : 'text-gray-800'}`}>
                      <p className="font-semibold">{event.title}</p>
                      <p className={`text-sm ${event.imageUrl ? 'text-gray-200' : 'text-gray-600'}`}>{formatDate(event.date)}</p>
                    </div>
                    {isOwnProfile && (
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === event.id ? null : event.id)}
                          className={`p-1.5 rounded-full transition ${
                            event.imageUrl ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-200 text-gray-600'
                          } cursor-pointer`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {menuOpen === event.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                            <button
                              onClick={() => handleEdit(event)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className={`text-sm mt-2 ml-13 ${event.imageUrl ? 'text-gray-200' : 'text-gray-600'}`}>{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {events.length >= 5 && (
          <button className="w-full mt-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer">
            See All Life Events
          </button>
        )}
      </div>

      <CreateLifeEventModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditEvent(null)
        }}
        onSuccess={loadEvents}
        editEvent={editEvent}
      />
    </>
  )
}
