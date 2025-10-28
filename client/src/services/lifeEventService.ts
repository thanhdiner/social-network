import api from './api'

export interface LifeEvent {
  id: string
  userId: string
  type: 'work' | 'education' | 'relationship' | 'home' | 'location' | 'achievement' | 'health' | 'travel'
  title: string
  description?: string
  date: string
  endDate?: string
  imageUrl?: string
  privacy: 'public' | 'friends' | 'private'
  createdAt: string
  updatedAt: string
}

export interface CreateLifeEventData {
  type: string
  title: string
  description?: string
  date: string
  endDate?: string
  imageUrl?: string
}

export interface UpdateLifeEventData {
  type?: string
  title?: string
  description?: string
  date?: string
  endDate?: string
  imageUrl?: string
}

const lifeEventService = {
  // Get life events for a user (limited)
  getUserLifeEvents: async (userId: string, limit = 5): Promise<LifeEvent[]> => {
    const response = await api.get(`/life-events/user/${userId}?limit=${limit}`)
    return response.data
  },

  // Get all life events for a user
  getAllUserLifeEvents: async (userId: string): Promise<LifeEvent[]> => {
    const response = await api.get(`/life-events/user/${userId}/all`)
    return response.data
  },

  // Get single life event
  getLifeEvent: async (id: string): Promise<LifeEvent> => {
    const response = await api.get(`/life-events/${id}`)
    return response.data
  },

  // Create new life event
  createLifeEvent: async (data: CreateLifeEventData): Promise<LifeEvent> => {
    const response = await api.post('/life-events', data)
    return response.data
  },

  // Update life event
  updateLifeEvent: async (id: string, data: UpdateLifeEventData): Promise<LifeEvent> => {
    const response = await api.patch(`/life-events/${id}`, data)
    return response.data
  },

  // Delete life event
  deleteLifeEvent: async (id: string): Promise<void> => {
    await api.delete(`/life-events/${id}`)
  },
}

export default lifeEventService
