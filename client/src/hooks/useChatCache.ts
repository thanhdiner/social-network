import { useCallback } from 'react'
import { 
  clearAllChatCache, 
  clearConversationsCache as clearConvCache,
  clearMessagesCache,
  clearAllMessagesCache 
} from '../utils/chatCache'

/**
 * Hook để quản lý chat cache
 */
export const useChatCache = () => {
  // Xóa toàn bộ cache chat (dùng khi logout)
  const clearAll = useCallback(() => {
    clearAllChatCache()
  }, [])

  // Xóa cache conversations
  const clearConversations = useCallback(() => {
    clearConvCache()
  }, [])

  // Xóa cache messages của một conversation
  const clearMessages = useCallback((conversationId: string) => {
    clearMessagesCache(conversationId)
  }, [])

  // Xóa tất cả messages cache
  const clearAllMessages = useCallback(() => {
    clearAllMessagesCache()
  }, [])

  return {
    clearAll,
    clearConversations,
    clearMessages,
    clearAllMessages,
  }
}
