/**
 * Chat Cache Utilities
 * 
 * Hệ thống caching cho chat sử dụng localStorage với TTL (Time To Live)
 * 
 * Features:
 * - Cache danh sách hội thoại (conversations) với TTL 5 phút
 * - Cache tin nhắn (messages) cho mỗi conversation với TTL 5 phút
 * - Tự động xóa cache khi hết hạn hoặc version không khớp
 * - Tự động cập nhật cache khi có tin nhắn mới (qua socket hoặc API)
 * - Xóa toàn bộ cache khi logout
 * 
 * Usage:
 * - saveConversationsCache(conversations): Lưu danh sách hội thoại
 * - getConversationsCache(): Lấy danh sách hội thoại từ cache
 * - saveMessagesCache(conversationId, messages): Lưu tin nhắn của một hội thoại
 * - getMessagesCache(conversationId): Lấy tin nhắn từ cache
 * - clearAllChatCache(): Xóa toàn bộ cache (dùng khi logout)
 * 
 * Benefits:
 * - Giảm số lần gọi API, tăng tốc độ load
 * - Cải thiện trải nghiệm người dùng khi chuyển tab hoặc reload
 * - Tiết kiệm băng thông và giảm tải cho server
 */

import type { Conversation, Message } from '../types'

const CACHE_VERSION = '1.0'
const CONVERSATIONS_CACHE_KEY = 'chat:conversations:v' + CACHE_VERSION
const MESSAGES_CACHE_PREFIX = 'chat:messages:'
const CACHE_TTL = 5 * 60 * 1000 // 5 phút

interface CachedData<T> {
  data: T
  timestamp: number
  version: string
}

/**
 * Kiểm tra cache còn hợp lệ không
 */
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_TTL
}

/**
 * Lưu conversations vào cache
 */
export const saveConversationsCache = (conversations: Conversation[]): void => {
  try {
    const cached: CachedData<Conversation[]> = {
      data: conversations,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }
    localStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(cached))
  } catch (error) {
    console.error('Failed to save conversations cache:', error)
  }
}

/**
 * Lấy conversations từ cache
 */
export const getConversationsCache = (): Conversation[] | null => {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_CACHE_KEY)
    if (!raw) return null

    const cached = JSON.parse(raw) as CachedData<Conversation[]>
    
    // Kiểm tra version và TTL
    if (cached.version !== CACHE_VERSION || !isCacheValid(cached.timestamp)) {
      localStorage.removeItem(CONVERSATIONS_CACHE_KEY)
      return null
    }

    return cached.data
  } catch (error) {
    console.error('Failed to get conversations cache:', error)
    return null
  }
}

/**
 * Xóa cache conversations
 */
export const clearConversationsCache = (): void => {
  try {
    localStorage.removeItem(CONVERSATIONS_CACHE_KEY)
  } catch (error) {
    console.error('Failed to clear conversations cache:', error)
  }
}

/**
 * Lưu messages của một conversation vào cache
 */
export const saveMessagesCache = (conversationId: string, messages: Message[]): void => {
  try {
    const key = MESSAGES_CACHE_PREFIX + conversationId + ':v' + CACHE_VERSION
    const cached: CachedData<Message[]> = {
      data: messages,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    }
    localStorage.setItem(key, JSON.stringify(cached))
  } catch (error) {
    console.error('Failed to save messages cache:', error)
  }
}

/**
 * Lấy messages từ cache
 */
export const getMessagesCache = (conversationId: string): Message[] | null => {
  try {
    const key = MESSAGES_CACHE_PREFIX + conversationId + ':v' + CACHE_VERSION
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const cached = JSON.parse(raw) as CachedData<Message[]>
    
    // Kiểm tra version và TTL
    if (cached.version !== CACHE_VERSION || !isCacheValid(cached.timestamp)) {
      localStorage.removeItem(key)
      return null
    }

    return cached.data
  } catch (error) {
    console.error('Failed to get messages cache:', error)
    return null
  }
}

/**
 * Xóa messages cache của một conversation
 */
export const clearMessagesCache = (conversationId: string): void => {
  try {
    const key = MESSAGES_CACHE_PREFIX + conversationId + ':v' + CACHE_VERSION
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear messages cache:', error)
  }
}

/**
 * Xóa tất cả cache tin nhắn
 */
export const clearAllMessagesCache = (): void => {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(MESSAGES_CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Failed to clear all messages cache:', error)
  }
}

/**
 * Xóa tất cả cache chat
 */
export const clearAllChatCache = (): void => {
  clearConversationsCache()
  clearAllMessagesCache()
}
