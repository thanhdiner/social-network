import { Briefcase, GraduationCap, Heart, Home, MapPin } from 'lucide-react'

interface LifeEvent {
  id: string
  type: 'work' | 'education' | 'relationship' | 'home' | 'location'
  title: string
  date: string
  image?: string
}

interface LifeEventsProps {
  username?: string
}

export const LifeEvents = ({ username }: LifeEventsProps) => {
  // TODO: Fetch life events from API based on username
  console.log('Loading events for:', username)
  const events: LifeEvent[] = [
    {
      id: '1',
      type: 'work',
      title: 'Started New Job at Apple',
      date: 'January 24, 2019',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop'
    },
    {
      id: '2',
      type: 'education',
      title: 'Freelance Photographer',
      date: 'January 24, 2019',
      image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop'
    }
  ]

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
      default:
        return <Briefcase {...iconProps} />
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Life Events</h3>
        <button className="text-orange-500 hover:text-orange-600 font-medium text-sm">
          Create
        </button>
      </div>

      <div className="space-y-3">
        {events.map(event => (
          <div key={event.id} className="group relative rounded-xl overflow-hidden hover:shadow-md transition">
            {event.image && (
              <img 
                src={event.image} 
                alt={event.title} 
                className="w-full h-40 object-cover"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                  {getIcon(event.type)}
                </div>
                <div className="text-white">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-sm text-gray-200">{event.date}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition">
        See All Life Events
      </button>
    </div>
  )
}
