import api from './api'

export interface SearchUser {
  id: string
  name: string
  username: string
  avatar: string | null
  bio: string | null
  followersCount: number
  followingCount: number
  postsCount?: number
  isFollowing?: boolean
}

export interface SearchPost {
  id: string
  content: string
  imageUrl: string | null
  videoUrl: string | null
  createdAt: string
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  currentUserReaction: string | null
  likesCount: number
  commentsCount: number
  sharesCount: number
}

export interface SearchReel {
  id: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  views: number
  createdAt: string
  user: {
    id: string
    name: string
    username: string
    avatar: string | null
  }
  likesCount: number
  commentsCount: number
}

export interface SearchResults {
  users: SearchUser[]
  posts: SearchPost[]
  reels: SearchReel[]
}

export const searchService = {
  // Search all (users, posts, and reels)
  searchAll: async (query: string, limit = 10): Promise<SearchResults> => {
    const response = await api.get(`/search?q=${encodeURIComponent(query)}&limit=${limit}`)
    return response.data
  },

  // Search only users
  searchUsers: async (query: string, limit = 20): Promise<SearchUser[]> => {
    const response = await api.get(`/search/users?q=${encodeURIComponent(query)}&limit=${limit}`)
    return response.data
  },

  // Search only posts
  searchPosts: async (query: string, limit = 20): Promise<SearchPost[]> => {
    const response = await api.get(`/search/posts?q=${encodeURIComponent(query)}&limit=${limit}`)
    return response.data
  },

  // Search only reels
  searchReels: async (query: string, limit = 20): Promise<SearchReel[]> => {
    const response = await api.get(`/search/reels?q=${encodeURIComponent(query)}&limit=${limit}`)
    return response.data
  },

  // Get popular searches
  getPopularSearches: async (limit = 10) => {
    const response = await api.get(`/search/popular?limit=${limit}`)
    return response.data
  },
}
