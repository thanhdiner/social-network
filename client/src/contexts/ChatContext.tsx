import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Conversation, Message, User, SendMessageData } from '../types';
import { chatService } from '../services/chatService';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';
import { 
  saveConversationsCache, 
  getConversationsCache
} from '../utils/chatCache';

interface ChatWindow {
  userId: string;
  user: User;
  isMinimized: boolean;
}
// Persist minimal fields for restore across reloads
interface PersistedChatWindow {
  userId: string;
  user: Pick<User, 'id' | 'name' | 'username' | 'avatar'>;
  isMinimized: boolean;
}

interface ChatContextType {
  conversations: Conversation[];
  chatWindows: ChatWindow[];
  isPopupOpen: boolean;
  unreadCount: number;
  onlineUsers: Set<string>;
  typingUsers: Map<string, boolean>;
  openChatWindow: (user: User) => void;
  closeChatWindow: (userId: string) => void;
  minimizeChatWindow: (userId: string) => void;
  closeAllChatWindows: () => void;
  minimizeAllOpenChats: () => void;
  togglePopup: () => void;
  closePopup: () => void;
  loadConversations: () => void;
  sendMessage: (data: SendMessageData) => Promise<Message>;
  markAsRead: (userId: string) => void;
  setTyping: (receiverId: string, isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatWindows, setChatWindows] = useState<ChatWindow[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());
  // Throttle map to avoid repeated markAsRead bursts
  const lastMarkRef = useRef<Map<string, number>>(new Map());

  // Always keep global unread count in sync with conversations
  useEffect(() => {
    const totalUnread = conversations.reduce((sum, conv) => {
      if (conv.isMuted) return sum;
      return sum + (conv.unreadCount || 0);
    }, 0);
    setUnreadCount(prev => (prev === totalUnread ? prev : totalUnread));
  }, [conversations]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      // Thử lấy từ cache trước
      const cachedConversations = getConversationsCache()
      const normalizeUnread = (list: Conversation[]) =>
        list.map(conv =>
          conv.participantId === user?.id
            ? { ...conv, unreadCount: 0 }
            : conv
        )

      if (cachedConversations) {
        const normalizedCache = normalizeUnread(cachedConversations)
        setConversations(normalizedCache)
        
        // Đếm tin nhắn chưa đọc từ cache (loại trừ conversations bị mute)
        const count = normalizedCache.reduce((sum, conv) => !conv.isMuted ? sum + conv.unreadCount : sum, 0)
        setUnreadCount(count)
      }

      // Vẫn fetch từ API để cập nhật dữ liệu mới nhất
      const data = await chatService.getConversations()
      const normalizedData = normalizeUnread(data)
      setConversations(normalizedData)
      
      // Lưu vào cache
      saveConversationsCache(normalizedData)
      
      // Đếm tin nhắn chưa đọc (loại trừ conversations bị mute)
      const count = normalizedData.reduce((sum, conv) => !conv.isMuted ? sum + conv.unreadCount : sum, 0)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }, [user?.id])

  // Log unreadCount changes for debugging
  useEffect(() => {
    console.log('[ChatContext] unreadCount state =>', unreadCount);
  }, [unreadCount]);

  // Má»Ÿ chat window
  const openChatWindow = useCallback((user: User) => {
    setChatWindows(prev => {
  // If this window already exists just un-minimize it
      const existing = prev.find(w => w.userId === user.id);
      if (existing) {
        return prev.map(w => 
          w.userId === user.id ? { ...w, isMinimized: false } : w
        );
      }
      
  // Limit to maximum of 3 chat windows
      if (prev.length >= 3) {
        return [...prev.slice(1), { userId: user.id, user, isMinimized: false }];
      }
      
      return [...prev, { userId: user.id, user, isMinimized: false }];
    });
    
    setIsPopupOpen(false);
  }, []);

  // ÄÃ³ng chat window
  const closeChatWindow = useCallback((userId: string) => {
    setChatWindows(prev => prev.filter(w => w.userId !== userId));
  }, []);

  // Thu nhá» chat window
  const minimizeChatWindow = useCallback((userId: string) => {
    setChatWindows(prev =>
      prev.map(w => (w.userId === userId ? { ...w, isMinimized: !w.isMinimized } : w))
    );
  }, []);

  // Close all chat windows
  const closeAllChatWindows = useCallback(() => {
    setChatWindows([]);
  }, []);

  // Minimize all currently open chat windows
  const minimizeAllOpenChats = useCallback(() => {
    setChatWindows(prev => prev.map(w => ({ ...w, isMinimized: true })));
  }, []);

  // Toggle popup
  const togglePopup = useCallback(() => {
    setIsPopupOpen(prev => !prev);
  }, []);

  // Close popup
  const closePopup = useCallback(() => {
    setIsPopupOpen(false);
  }, []);

  // Send message
  const sendMessage = useCallback(async ({ receiverId, content, imageUrl, videoUrl, audioUrl, replyToId }: SendMessageData) => {
    try {
      console.log('[ChatContext] sendMessage called', { receiverId, content, imageUrl, videoUrl, audioUrl, replyToId });
      const message = await chatService.sendMessage({ receiverId, content, imageUrl, videoUrl, audioUrl, replyToId });

      let shouldReload = false;
      let unreadReduction = 0;

      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c.participantId === receiverId);
        const updated = [...prev];

        if (existingIndex >= 0) {
          const conv = updated[existingIndex];

          if (!conv.isMuted && conv.unreadCount > 0) {
            unreadReduction = conv.unreadCount;
          }

          updated[existingIndex] = {
            ...conv,
            lastMessage: message,
            unreadCount: 0,
            updatedAt: message.createdAt,
          };

          const [moved] = updated.splice(existingIndex, 1);
          updated.unshift(moved);
        } else {
          const participant = (message.receiver as User | undefined);

          if (!participant) {
            shouldReload = true;
            return prev;
          }

          const newConversation: Conversation = {
            id: `${message.senderId}-${receiverId}`,
            participantId: receiverId,
            participant,
            lastMessage: message,
            unreadCount: 0,
            isMuted: false,
            updatedAt: message.createdAt,
          };

          updated.unshift(newConversation);
        }

        saveConversationsCache(updated);
        return updated;
      });

      if (unreadReduction > 0) {
        setUnreadCount(prev => {
          const next = Math.max(0, prev - unreadReduction);
          console.log('[ChatContext] sendMessage reducing unreadCount', prev, '->', next, { receiverId, unreadReduction });
          return next;
        });
      }

      if (shouldReload) {
        void loadConversations();
      }

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [loadConversations]);

  // Mark as read
  const markAsRead = useCallback(async (userId: string) => {
    try {
      // Throttle: skip if called within 1500ms for same userId
      const now = Date.now();
      const last = lastMarkRef.current.get(userId) || 0;
      if (now - last < 1500) {
        return;
      }
      lastMarkRef.current.set(userId, now);

  // Get current unread count BEFORE updating conversations
  const conv = conversations.find(c => c.participantId === userId);
  const previousUnreadCount = conv?.unreadCount || 0;
  const isMuted = conv?.isMuted || false;
  console.log('[ChatContext] markAsRead called for', userId, { previousUnreadCount, isMuted });

      await chatService.markAsRead(userId);

      setConversations(prev =>
        prev.map(c =>
          c.participantId === userId ? { ...c, unreadCount: 0 } : c
        )
      );

      // Update total unread count - only decrease if conversation is not muted
      if (!isMuted && previousUnreadCount > 0) {
        setUnreadCount(prev => Math.max(0, prev - previousUnreadCount));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [conversations]);

  // Set typing status
  const setTyping = useCallback((receiverId: string, isTyping: boolean) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('typing', { receiverId, isTyping });
    }
  }, []);

  // Restore chat windows from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const key = 'chat:windows:' + user.id;
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as PersistedChatWindow[];
        setChatWindows(saved.map(w => ({ ...w, user: w.user as unknown as User })));
      }
    } catch (e) {
      console.error('Failed to restore chat windows:', e);
    }
  }, [user]);

  // Persist chat windows to localStorage
  useEffect(() => {
    if (!user) return;
    const key = 'chat:windows:' + user.id;
    const data: PersistedChatWindow[] = chatWindows.map(w => ({
      userId: w.userId,
      user: { id: w.user.id, name: w.user.name, username: w.user.username, avatar: w.user.avatar },
      isMinimized: w.isMinimized,
    }));
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist chat windows:', e);
    }
  }, [chatWindows, user]);  // Socket events
  useEffect(() => {
    if (!user) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Debug: Listen to ALL events
    socket.onAny((eventName, ...args) => {
      console.log('📨 [Socket]', eventName, args);
    });

    console.log('[ChatContext] socket effect mounted for user:', user?.id);

    const handleNewMessage = (message: Message) => {
      console.log('[ChatContext] handleNewMessage received:', message);
      let unreadCountDelta = 0; // Track the change in total unread count
      let shouldReloadConversations = false;

      // Cập nhật conversation
      setConversations(prev => {
        const senderId = message.senderId === user.id ? message.receiverId : message.senderId;
        const existingIndex = prev.findIndex(c => c.participantId === senderId);
        const updated = [...prev];
        console.log('[ChatContext] updating conversations (senderId, existingIndex):', senderId, existingIndex);
        if (existingIndex >= 0) {
          const conv = updated[existingIndex];
          const isIncomingMessage = message.senderId !== user.id;
          
          // Only increase unreadCount if it's an incoming message
          let newUnreadCount = conv.unreadCount;
          if (isIncomingMessage) {
            newUnreadCount = conv.unreadCount + 1;
            // Only count towards global unreadCount if not muted
            if (!conv.isMuted) {
              unreadCountDelta = 1;
            }
          }
          
          updated[existingIndex] = {
            ...conv,
            lastMessage: message,
            unreadCount: newUnreadCount,
            updatedAt: message.createdAt,
          };
          console.log('[ChatContext] conversation updated:', {
            participantId: conv.participantId,
            prevUnread: conv.unreadCount,
            newUnread: newUnreadCount,
            isMuted: conv.isMuted,
          });
          // Di chuyển lên đầu
          const [movedConv] = updated.splice(existingIndex, 1);
          updated.unshift(movedConv);
        }

        if (existingIndex === -1) {
          if (!senderId) {
            shouldReloadConversations = true;
            return prev;
          }

          const isIncoming = message.senderId !== user.id;

          // If user is sending message (outgoing), don't create conversation with unread
          // Just reload to get fresh data from backend
          if (!isIncoming) {
            shouldReloadConversations = true;
            return prev;
          }

          const participant = message.sender as User | undefined;

          if (!participant) {
            shouldReloadConversations = true;
            return prev;
          }

          const newConversation: Conversation = {
            id: `${user.id}-${senderId}`,
            participantId: senderId,
            participant,
            lastMessage: message,
            unreadCount: 1,
            isMuted: false,
            updatedAt: message.createdAt,
          };

          updated.unshift(newConversation);
          unreadCountDelta = 1;
        }

        // Lưu vào cache
        saveConversationsCache(updated);
        return updated;
      });

      // Apply unread count change to global state
      if (unreadCountDelta !== 0) {
        setUnreadCount(prevCount => Math.max(0, prevCount + unreadCountDelta));
      }

      if (shouldReloadConversations) {
        void loadConversations();
      }

      // Show browser notification for incoming messages
      if (message.senderId !== user.id && 'Notification' in window && Notification.permission === 'granted') {
        const sender = message.sender as User | undefined;
        const senderName = sender?.name || 'Someone';
        const messagePreview = message.content?.substring(0, 50) || '📷 Photo';
        
        new Notification(`New message from ${senderName}`, {
          body: messagePreview,
          icon: sender?.avatar || undefined,
          tag: `message-${message.senderId}`,
          requireInteraction: false,
        });
      }
    };

    const handleOnlineUsersUpdated = (data: { userIds: string[] }) => {
      setOnlineUsers(new Set(data.userIds));
    };

    const handleTyping = (data: { senderId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        if (data.isTyping) {
          newMap.set(data.senderId, true);
        } else {
          newMap.delete(data.senderId);
        }
        return newMap;
      });
    };

    const handleMessagesDelivered = (data: { messageIds: string[]; deliveredAt: string }) => {
      console.log('📨 [messages_delivered]', data);
      window.dispatchEvent(new CustomEvent('messages_delivered', { detail: data }));
    };

    const handleMessagesRead = (data: { messageIds: string[]; readAt: string }) => {
      console.log('📨 [messages_read]', data);
      window.dispatchEvent(new CustomEvent('messages_read', { detail: data }));
    };

    const handleReactionAdded = (data: {
      messageId: string;
      reaction: { id: string; userId: string; emoji: string; createdAt: string };
    }) => {
      console.log('👍 [reaction_added]', data);
      window.dispatchEvent(new CustomEvent('reaction_added', { detail: data }));
    };

    const handleReactionRemoved = (data: { messageId: string; userId: string }) => {
      console.log('👎 [reaction_removed]', data);
      window.dispatchEvent(new CustomEvent('reaction_removed', { detail: data }));
    };

    const handleMessageUnsent = (data: { messageId: string }) => {
      console.log('🔄 [message_unsent]', data);
      window.dispatchEvent(new CustomEvent('message_unsent', { detail: data }));
    };

    const handleMessagePinned = (data: { message: Message }) => {
      console.log('📌 [message_pinned]', data);
      window.dispatchEvent(new CustomEvent('message_pinned', { detail: data }));
    };

    const handleMessageUnpinned = (data: { message: Message }) => {
      console.log('📌 [message_unpinned]', data);
      window.dispatchEvent(new CustomEvent('message_unpinned', { detail: data }));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('online_users_updated', handleOnlineUsersUpdated);
    socket.on('typing', handleTyping);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('messages_read', handleMessagesRead);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);
    socket.on('message_unsent', handleMessageUnsent);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('message_unpinned', handleMessageUnpinned);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('online_users_updated', handleOnlineUsersUpdated);
      socket.off('typing', handleTyping);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('messages_read', handleMessagesRead);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
      socket.off('message_unsent', handleMessageUnsent);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('message_unpinned', handleMessageUnpinned);
    };
  }, [user, loadConversations]);

  // Load conversations khi mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        chatWindows,
        isPopupOpen,
        unreadCount,
        onlineUsers,
        typingUsers,
        openChatWindow,
        closeChatWindow,
        minimizeChatWindow,
        closeAllChatWindows,
        minimizeAllOpenChats,
        togglePopup,
        closePopup,
        loadConversations,
        sendMessage,
        markAsRead,
        setTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};




