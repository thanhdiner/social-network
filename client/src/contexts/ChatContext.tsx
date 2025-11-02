import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Conversation, Message, User } from '../types';
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
  sendMessage: (receiverId: string, content: string, imageUrl?: string) => Promise<void>;
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

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      // Thử lấy từ cache trước
      const cachedConversations = getConversationsCache()
      if (cachedConversations) {
        setConversations(cachedConversations)
        
        // Đếm tin nhắn chưa đọc từ cache (loại trừ conversations bị mute)
        const count = cachedConversations.reduce((sum, conv) => !conv.isMuted ? sum + conv.unreadCount : sum, 0)
        setUnreadCount(count)
      }

      // Vẫn fetch từ API để cập nhật dữ liệu mới nhất
      const data = await chatService.getConversations()
      setConversations(data)
      
      // Lưu vào cache
      saveConversationsCache(data)
      
      // Đếm tin nhắn chưa đọc (loại trừ conversations bị mute)
      const count = data.reduce((sum, conv) => !conv.isMuted ? sum + conv.unreadCount : sum, 0)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }, [])

  // Má»Ÿ chat window
  const openChatWindow = useCallback((user: User) => {
    setChatWindows(prev => {
      // Náº¿u Ä‘Ã£ cÃ³ window nÃ y rá»“i thÃ¬ chá»‰ má»Ÿ ra (un-minimize)
      const existing = prev.find(w => w.userId === user.id);
      if (existing) {
        return prev.map(w => 
          w.userId === user.id ? { ...w, isMinimized: false } : w
        );
      }
      
      // Giá»›i háº¡n tá»‘i Ä‘a 3 chat windows
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

  // Gá»­i tin nháº¯n
  const sendMessage = useCallback(async (receiverId: string, content: string, imageUrl?: string) => {
    try {
      const message = await chatService.sendMessage({ receiverId, content, imageUrl });

      // Cáº­p nháº­t conversation
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c.participantId === receiverId);
        const updated = [...prev];

        if (existingIndex >= 0) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message,
            updatedAt: message.createdAt,
          };
          // Di chuyá»ƒn lÃªn Ä'áº§u
          const [conv] = updated.splice(existingIndex, 1);
          updated.unshift(conv);
        }

        // Lưu vào cache
        saveConversationsCache(updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, []);

  // ÄÃ¡nh dáº¥u Ä‘Ã£ Ä‘á»c
  const markAsRead = useCallback(async (userId: string) => {
    try {
      // Throttle: skip if called within 1500ms for same userId
      const now = Date.now();
      const last = lastMarkRef.current.get(userId) || 0;
      if (now - last < 1500) {
        return;
      }
      lastMarkRef.current.set(userId, now);

      await chatService.markAsRead(userId);

      setConversations(prev =>
        prev.map(c =>
          c.participantId === userId ? { ...c, unreadCount: 0 } : c
        )
      );

      // Cáº­p nháº­t tá»•ng sá»‘ unread
      setUnreadCount(prev => {
        const conv = conversations.find(c => c.participantId === userId);
        return prev - (conv?.unreadCount || 0);
      });
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

    const handleNewMessage = (message: Message) => {
      // Cập nhật conversation
      setConversations(prev => {
        const senderId = message.senderId === user.id ? message.receiverId : message.senderId;
        const existingIndex = prev.findIndex(c => c.participantId === senderId);
        const updated = [...prev];

        if (existingIndex >= 0) {
          const conv = updated[existingIndex];
          const shouldIncreaseUnread = message.senderId !== user.id && !conv.isMuted;
          
          updated[existingIndex] = {
            ...conv,
            lastMessage: message,
            unreadCount: shouldIncreaseUnread ? conv.unreadCount + 1 : conv.unreadCount,
            updatedAt: message.createdAt,
          };
          // Di chuyển lên đầu
          const [movedConv] = updated.splice(existingIndex, 1);
          updated.unshift(movedConv);
          
          // Tăng unread count trong header nếu cần
          if (shouldIncreaseUnread) {
            setUnreadCount(prevCount => prevCount + 1);
          }
        }

        // Lưu vào cache
        saveConversationsCache(updated);
        return updated;
      });
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

    socket.on('new_message', handleNewMessage);
    socket.on('online_users_updated', handleOnlineUsersUpdated);
    socket.on('typing', handleTyping);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('messages_read', handleMessagesRead);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);
    socket.on('message_unsent', handleMessageUnsent);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('online_users_updated', handleOnlineUsersUpdated);
      socket.off('typing', handleTyping);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('messages_read', handleMessagesRead);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
      socket.off('message_unsent', handleMessageUnsent);
    };
  }, [user]);

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

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};




