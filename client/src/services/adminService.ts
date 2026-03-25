import axios from 'axios'

// Admin API instance — dùng adminToken riêng, không liên quan đến user token
const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
})

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  },
)

export interface AdminStats {
  totalUsers: number
  newUsersThisMonth: number
  usersGrowth: number
  totalPosts: number
  newPostsThisMonth: number
  postsGrowth: number
  totalReels: number
  totalComments: number
  totalLikes: number
  activeUsers: number
}

export interface GrowthPoint {
  month: string
  users: number
  posts: number
}

export interface AdminUser {
  id: string
  name: string
  username: string
  email: string
  avatar: string | null
  role: string
  isActive: boolean
  createdAt: string
  _count: {
    posts: number
    followers: number
    following: number
  }
}

export interface AdminUserDetail extends AdminUser {
  coverImage: string | null
  bio: string | null
  _count: AdminUser['_count'] & {
    comments: number
    likes: number
  }
  recentPosts: Array<{
    id: string
    content: string
    createdAt: string
    _count: {
      likes: number
      comments: number
    }
  }>
}

export interface AdminPost {
  id: string
  content: string
  imageUrl?: string
  videoUrl?: string
  visibility: string
  createdAt: string
  updatedAt?: string
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  _count: {
    likes: number
    comments: number
    shares: number
  }
}

export interface AdminPostDetail extends AdminPost {
  user: AdminPost['user'] & {
    email?: string
    bio?: string | null
    role?: string
    isActive?: boolean
  }
  comments: Array<{
    id: string
    content: string
    createdAt: string
    user: {
      id: string
      name: string
      username: string
      avatar: string | null
    }
  }>
  likes: Array<{
    id: string
    type: string
    createdAt: string
    user: {
      id: string
      name: string
      username: string
      avatar: string | null
    }
  }>
  shares: Array<{
    id: string
    createdAt: string
    user: {
      id: string
      name: string
      username: string
      avatar: string | null
    }
  }>
}

export interface AdminReel {
  id: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string
  views: number
  createdAt: string
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  _count: {
    likes: number
    comments: number
    shares: number
  }
}

export interface PaginatedResponse<T> {
  page: number
  limit: number
  total: number
  totalPages: number
  data?: T[]
}

export interface CreateAnnouncementPayload {
  title?: string
  content: string
  audience?: 'all' | 'active'
}

export interface CreateAnnouncementResponse {
  message: string
  delivered: number
  audience: 'all' | 'active'
  title: string
}

const adminService = {
  // Dashboard
  getStats: () => adminApi.get<AdminStats>('/admin/dashboard/stats').then(r => r.data),
  getGrowthChart: () => adminApi.get<GrowthPoint[]>('/admin/dashboard/growth').then(r => r.data),
  getRecentActivity: () => adminApi.get('/admin/dashboard/activity').then(r => r.data),
  createAnnouncement: (payload: CreateAnnouncementPayload) =>
    adminApi.post<CreateAnnouncementResponse>('/admin/dashboard/announcement', payload).then(r => r.data),

  // Users
  getUsers: (page = 1, limit = 10, search?: string, role?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.append('search', search)
    if (role) params.append('role', role)
    return adminApi.get(`/admin/users?${params}`).then(r => r.data)
  },
  getUserDetail: (userId: string) =>
    adminApi.get<AdminUserDetail>(`/admin/users/${userId}`).then(r => r.data),
  createUser: (payload: { name?: string; username: string; email: string; password: string; role?: 'user' | 'admin'; isActive?: boolean; avatar?: string }) =>
    adminApi.post('/admin/users', payload).then(r => r.data),
  updateUser: (userId: string, payload: { name?: string; username?: string; email?: string; bio?: string; avatar?: string }) =>
    adminApi.put(`/admin/users/${userId}`, payload).then(r => r.data),
  updateUserRole: (userId: string, role: string) =>
    adminApi.put(`/admin/users/${userId}/role`, { role }).then(r => r.data),
  toggleUserActive: (userId: string) =>
    adminApi.put(`/admin/users/${userId}/toggle-active`).then(r => r.data),
  deleteUser: (userId: string) =>
    adminApi.delete(`/admin/users/${userId}`).then(r => r.data),

  // Posts
  getPosts: (page = 1, limit = 10, search?: string, media?: 'all' | 'image' | 'video' | 'text') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.append('search', search)
    if (media && media !== 'all') params.append('media', media)
    return adminApi.get(`/admin/posts?${params}`).then(r => r.data)
  },
  getPostDetail: (postId: string) =>
    adminApi.get<AdminPostDetail>(`/admin/posts/${postId}`).then(r => r.data),
  createPost: (payload: { userId: string; content?: string; imageUrl?: string; videoUrl?: string }) =>
    adminApi.post<AdminPost>('/admin/posts', payload).then(r => r.data),
  updatePost: (postId: string, payload: { content?: string; imageUrl?: string | null; videoUrl?: string | null; visibility?: string }) =>
    adminApi.put<AdminPost>(`/admin/posts/${postId}`, payload).then(r => r.data),
  deletePost: (postId: string) =>
    adminApi.delete(`/admin/posts/${postId}`).then(r => r.data),

  // Reels
  getReels: (page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    return adminApi.get(`/admin/reels?${params}`).then(r => r.data)
  },
  deleteReel: (reelId: string) =>
    adminApi.delete(`/admin/reels/${reelId}`).then(r => r.data),
}

export default adminService
