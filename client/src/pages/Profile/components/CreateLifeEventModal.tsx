import { useState, useEffect } from 'react'
import { X, Upload, Briefcase, GraduationCap, Heart, Home, MapPin, Trophy, HeartPulse, Plane } from 'lucide-react'
import lifeEventService, { type CreateLifeEventData, type UpdateLifeEventData, type LifeEvent } from '../../../services/lifeEventService'
import uploadService from '../../../services/uploadService'

interface CreateLifeEventModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  editEvent?: LifeEvent | null
}

const eventTypes = [
  { value: 'work', label: 'Work & Career', icon: Briefcase },
  { value: 'education', label: 'Education', icon: GraduationCap },
  { value: 'relationship', label: 'Relationship', icon: Heart },
  { value: 'home', label: 'Home & Living', icon: Home },
  { value: 'location', label: 'Location', icon: MapPin },
  { value: 'achievement', label: 'Achievement', icon: Trophy },
  { value: 'health', label: 'Health & Wellness', icon: HeartPulse },
  { value: 'travel', label: 'Travel', icon: Plane }
]

export const CreateLifeEventModal = ({ open, onClose, onSuccess, editEvent }: CreateLifeEventModalProps) => {
  const [selectedType, setSelectedType] = useState<string>('work')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editEvent) {
      setSelectedType(editEvent.type)
      setTitle(editEvent.title)
      setDescription(editEvent.description || '')
      setDate(editEvent.date.split('T')[0])
      setEndDate(editEvent.endDate ? editEvent.endDate.split('T')[0] : '')
      setImagePreview(editEvent.imageUrl || '')
    } else {
      resetForm()
    }
  }, [editEvent, open])

  const resetForm = () => {
    setSelectedType('work')
    setTitle('')
    setDescription('')
    setDate('')
    setEndDate('')
    setImage(null)
    setImagePreview('')
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !date) return

    try {
      setLoading(true)

      let imageUrl = imagePreview

      // Upload new image if selected
      if (image) {
        setUploading(true)
        imageUrl = await uploadService.uploadImage(image)
        setUploading(false)
      }

      const data: CreateLifeEventData | UpdateLifeEventData = {
        type: selectedType,
        title,
        description: description || undefined,
        date,
        endDate: endDate || undefined,
        imageUrl: imageUrl || undefined
      }

      if (editEvent) {
        await lifeEventService.updateLifeEvent(editEvent.id, data)
      } else {
        await lifeEventService.createLifeEvent(data as CreateLifeEventData)
      }

      onSuccess?.()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Failed to save life event:', error)
      alert('Failed to save life event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 -mb-2.5" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-semibold">{editEvent ? 'Edit Life Event' : 'Create Life Event'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Event Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {eventTypes.map(type => {
                const TypeIcon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-2 cursor-pointer ${
                      selectedType === type.value
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <TypeIcon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`e.g., Started New Job at Google`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details about this event..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={date}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null)
                      setImagePreview('')
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition">
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click to upload photo</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium cursor-pointer"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading || !title || !date}
              className="flex-1 px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? 'Uploading...' : loading ? 'Saving...' : editEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
