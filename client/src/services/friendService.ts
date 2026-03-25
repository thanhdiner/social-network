import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({ baseURL: API_URL, withCredentials: true })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export type FriendshipStatus = 'self' | 'friends' | 'request_sent' | 'request_received' | 'strangers'

export interface FriendUser {
  id: string
  name: string
  username: string
  avatar: string | null
  mutualFriends?: number
  _count?: { followers: number; posts: number }
}

export interface FriendRequest {
  id: string
  senderId: string
  receiverId: string
  status: string
  createdAt: string
  sender?: FriendUser
  receiver?: FriendUser
}

const friendService = {
  // Status
  getStatus: (targetUserId: string) =>
    api.get<{ status: FriendshipStatus; requestId?: string }>(`/friends/status/${targetUserId}`).then(r => r.data),

  getPendingCount: () =>
    api.get<{ count: number }>('/friends/pending-count').then(r => r.data),

  // Actions
  sendRequest: (userId: string) =>
    api.post<FriendRequest>(`/friends/request/${userId}`).then(r => r.data),

  cancelRequest: (userId: string) =>
    api.delete(`/friends/request/${userId}`).then(r => r.data),

  acceptRequest: (requestId: string) =>
    api.post<FriendRequest>(`/friends/accept/${requestId}`).then(r => r.data),

  rejectRequest: (requestId: string) =>
    api.post(`/friends/reject/${requestId}`).then(r => r.data),

  unfriend: (userId: string) =>
    api.delete(`/friends/${userId}`).then(r => r.data),

  // Lists
  getFriends: (page = 1, limit = 20) =>
    api.get<{ friends: FriendUser[]; total: number; page: number; totalPages: number }>(
      `/friends?page=${page}&limit=${limit}`
    ).then(r => r.data),

  getUserFriends: (userId: string, page = 1, limit = 20) =>
    api.get<{ friends: FriendUser[]; total: number; page: number; totalPages: number }>(
      `/friends/user/${userId}?page=${page}&limit=${limit}`
    ).then(r => r.data),

  getReceivedRequests: (page = 1, limit = 20) =>
    api.get<{ requests: FriendRequest[]; total: number; page: number; totalPages: number }>(
      `/friends/requests/received?page=${page}&limit=${limit}`
    ).then(r => r.data),

  getSentRequests: () =>
    api.get<FriendRequest[]>('/friends/requests/sent').then(r => r.data),

  getSuggestions: (limit = 10) =>
    api.get<FriendUser[]>(`/friends/suggestions?limit=${limit}`).then(r => r.data),
}

export default friendService
