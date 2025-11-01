import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Send, Image as ImageIcon, Smile, Phone, Video, Info, ChevronDown, User as UserIcon, Trash2, Ban, ShieldOff } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { chatService } from '../../services/chatService';
import socketService from '../../services/socketService';
import type { Message, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import uploadService from '../../services/uploadService';
import { ImageViewer } from '../../components/shared/ImageViewer';
import { Avatar } from '../../components/shared/Avatar';
import { saveMessagesCache, getMessagesCache, clearMessagesCache, clearConversationsCache } from '../../utils/chatCache';
import { ChatMessageSkeleton } from '../../components/shared/ChatMessageSkeleton';
import userService from '../../services/userService';
import { MessageStatus } from '../../components/shared/MessageStatus';

export default function Chat() {
  const { user: currentUser } = useAuth();
  const { conversations, loadConversations, typingUsers, setTyping } = useChat();
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true); // Bắt đầu với loading = true
  const [initialLoadDone, setInitialLoadDone] = useState(false); // Track xem đã load xong chưa
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const atBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  
  const typingTimeoutRef = useRef<number | null>(null);
  const isUserTyping = selectedUser ? (typingUsers.get(selectedUser.id) || false) : false;
  const MAX_CACHE = 100;
  const CHUNK = 20;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlocked, setHasBlocked] = useState(false);

  // Load conversations khi mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load user tá»« URL params
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId) {
      const conv = conversations.find(c => c.participantId === userId);
      if (conv) {
        setSelectedUser(conv.participant);
      }
    }
  }, [searchParams, conversations]);

  // TÃ¬m kiáº¿m users
  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await chatService.searchUsers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Fetch when selectedUser changes with caching
  useEffect(() => {
    const run = async () => {
      if (!selectedUser) return;
      
      // Reset initial load state
      setInitialLoadDone(false);
      
      // Thử lấy từ cache trước
      const cachedMessages = getMessagesCache(selectedUser.id);
      if (cachedMessages && cachedMessages.length > 0) {
        // Có cache → Hiển thị ngay, không loading
        setMessages(cachedMessages.slice(-MAX_CACHE));
        setLoading(false);
        setInitialLoadDone(true);
        
        // Fetch API ở background để cập nhật
        try {
          const data = await chatService.getMessages(selectedUser.id);
          const capped = data.slice(-MAX_CACHE);
          setMessages(capped);
          saveMessagesCache(selectedUser.id, capped);
          
          // Delay mark as read to show "Delivered" status first
          setTimeout(() => {
            chatService.markAsRead(selectedUser.id);
          }, 1500);
        } catch (error) {
          console.error('Failed to update messages:', error);
        }
      } else {
        // Không có cache → Hiển thị loading
        try {
          setLoading(true);
          const data = await chatService.getMessages(selectedUser.id);
          const capped = data.slice(-MAX_CACHE);
          setMessages(capped);
          saveMessagesCache(selectedUser.id, capped);
          setLoading(false);
          setInitialLoadDone(true);
          
          // Delay mark as read to show "Delivered" status first
          setTimeout(() => {
            chatService.markAsRead(selectedUser.id);
          }, 1500);
        } catch (error) {
          console.error('Failed to load messages:', error);
          setLoading(false);
          setInitialLoadDone(true);
        }
      }
    };
    run();
  }, [selectedUser]);

  // Socket event for new messages
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const handleNewMessage = (message: Message) => {
      // Chỉ nhận tin nhắn liên quan đến cuộc trò chuyện này
      if (
        (message.senderId === selectedUser.id && message.receiverId === currentUser.id) ||
        (message.senderId === currentUser.id && message.receiverId === selectedUser.id)
      ) {
        setMessages((prev) => {
          // Tránh duplicate - kiểm tra tin nhắn đã tồn tại chưa
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          const next = [...prev, message];
          const capped = next.slice(-MAX_CACHE);
          
          // Lưu vào cache
          saveMessagesCache(selectedUser.id, capped);
          
          return capped;
        });
        
        if (message.senderId === selectedUser.id) {
          chatService.markAsRead(selectedUser.id);
        }
      }
    };

    const handleMessagesDelivered = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { messageIds, deliveredAt } = customEvent.detail;
      
      setMessages((prev) => {
        const updated = prev.map(msg => 
          messageIds.includes(msg.id) 
            ? { ...msg, deliveredAt } 
            : msg
        );
        saveMessagesCache(selectedUser.id, updated);
        return updated;
      });
    };

    const handleMessagesRead = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { messageIds, readAt } = customEvent.detail;
      
      setMessages((prev) => {
        const updated = prev.map(msg => 
          messageIds.includes(msg.id) 
            ? { ...msg, readAt, read: true } 
            : msg
        );
        saveMessagesCache(selectedUser.id, updated);
        return updated;
      });
    };

    socketService.getSocket()?.on('new_message', handleNewMessage);
    window.addEventListener('messages_delivered', handleMessagesDelivered);
    window.addEventListener('messages_read', handleMessagesRead);

    return () => {
      socketService.getSocket()?.off('new_message', handleNewMessage);
      window.removeEventListener('messages_delivered', handleMessagesDelivered);
      window.removeEventListener('messages_read', handleMessagesRead);
    };
  }, [selectedUser, currentUser]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    requestAnimationFrame(() => {
      const el2 = messagesContainerRef.current;
      if (el2) el2.scrollTop = el2.scrollHeight;
    });
    window.setTimeout(() => {
      const el3 = messagesContainerRef.current;
      if (el3) el3.scrollTop = el3.scrollHeight;
    }, 80);
  };

  // Auto scroll to bottom when new messages or typing (smooth)
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, isUserTyping]);

  // After initial load, jump to bottom without animation
  useEffect(() => {
    if (!loading) {
      scrollToBottom('auto');
    }
  }, [loading]);

  // Caching disabled
  // Block feature removed

  const handleDeleteLocal = async () => {
    if (!selectedUser) return;
    if (confirm(`Delete all messages with ${selectedUser.name}? This action cannot be undone.`)) {
      try {
        // Delete on server (mark as deleted for current user)
        await chatService.deleteConversation(selectedUser.id);
        // Clear local state and cache
        setMessages([]);
        clearMessagesCache(selectedUser.id);
        clearConversationsCache(); // Clear conversations cache to refresh list
        setMenuOpen(false);
        setSelectedUser(null); // Close the conversation
        // Reload conversations to remove from list
        loadConversations();
        alert('All messages deleted');
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        alert('An error occurred, please try again');
      }
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    try {
      if (isBlocked) {
        await userService.unblockUser(selectedUser.id);
        setIsBlocked(false);
        alert('User unblocked');
      } else {
        if (confirm(`Are you sure you want to block ${selectedUser.name}? You will not be able to message this person.`)) {
          await userService.blockUser(selectedUser.id);
          setIsBlocked(true);
          setMenuOpen(false);
          setSelectedUser(null);
          alert('User blocked');
        }
      }
    } catch (error) {
      console.error('Failed to block/unblock user:', error);
      alert('An error occurred, please try again');
    }
  };

  // Check block status when selectedUser changes
  useEffect(() => {
    if (!selectedUser) return;
    const checkBlock = async () => {
      try {
        const status = await userService.checkBlockStatus(selectedUser.id);
        setIsBlocked(status.isBlocked);
        setHasBlocked(status.hasBlocked);
      } catch (error) {
        console.error('Failed to check block status:', error);
      }
    };
    checkBlock();
  }, [selectedUser]);

  // Close menu when clicking outside (use 'click' to avoid mousedown/click race)
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpen]);

  // Track bottom state + lazy reveal older messages
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // Lazy show more when nearing top
    if (el.scrollTop < 40) {
      setVisibleCount((c) => Math.min(c + CHUNK, messages.length));
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    atBottomRef.current = atBottom;
    setShowScrollToLatest(!atBottom);
  };

  // Keep pinned to bottom when new messages if user is at bottom
  useEffect(() => {
    if (atBottomRef.current) {
      scrollToBottom('auto');
    }
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (selectedUser) {
      inputRef.current?.focus();
    }
  }, [selectedUser]);

  const handleSendMessage = async () => {
    if (!selectedUser) return;
    if (!newMessage.trim() && selectedImages.length === 0) return;

    const content = newMessage.trim() || '📷 Photo';
    setNewMessage('');

    if (selectedUser) { setTyping(selectedUser.id, false); }

    try {
      let imageUrl: string | undefined;
      if (selectedImages.length > 0) {
        setUploading(true);
        const urls: string[] = [];
        for (const file of selectedImages) {
          const url = await uploadService.uploadImage(file);
          urls.push(url);
        }
        imageUrl = urls.join(',');
        setSelectedImages([]);
        setImagePreviews([]);
        setUploading(false);
      }
      // Send tin
      await chatService.sendMessage({ receiverId: selectedUser.id, content, imageUrl });
      // Scroll to bottom immediately while waiting for socket echo
      scrollToBottom('auto');
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(content);
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const validation = uploadService.validateImage(file);
      if (!validation.valid) {
        alert(validation.error || 'Invalid image');
        continue;
      }
      newFiles.push(file);
    }

    if (newFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const combined = [...selectedImages, ...newFiles].slice(0, 10);
    setSelectedImages(combined);

    const readers: Promise<string>[] = combined.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    void Promise.all(readers).then((results) => setImagePreviews(results));
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = [...selectedImages];
    newFiles.splice(index, 1);
    setSelectedImages(newFiles);
    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US');
  };

  const displayList = searchQuery.trim() ? searchResults : conversations;

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar - Danh sÃ¡ch chat */}
      <div className="w-96 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold mb-3">Messages</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search on Messenger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : displayList.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery.trim() ? 'No results found' : 'No messages yet'}
            </div>
          ) : (
            <div>
              {searchQuery.trim() ? (
                // Hiá»ƒn thá»‹ káº¿t quáº£ tÃ¬m kiáº¿m
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'bg-orange-50' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Avatar src={user.avatar || undefined} name={user.name} className="w-14 h-14" size="xl" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500 truncate">@{user.username || user.email}</div>
                    </div>
                  </div>
                ))
              ) : (
                // Hiá»ƒn thá»‹ conversations
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectUser(conv.participant)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      selectedUser?.id === conv.participant.id ? 'bg-orange-50' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Avatar src={conv.participant.avatar || undefined} name={conv.participant.name} className="w-14 h-14" size="xl" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-gray-900">{conv.participant.name}</div>
                        {conv.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatLastMessageTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm truncate flex-1 ${
                            conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {conv.lastMessage?.content || 'Start the conversation'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full min-w-5 text-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white relative">
              <div className="flex items-center gap-3">
                <div onClick={() => setMenuOpen((v)=>!v)} className="cursor-pointer">
                  <Avatar src={selectedUser.avatar || undefined} name={selectedUser.name} className="w-10 h-10" size="md" />
                </div>
                <div onClick={() => setMenuOpen((v)=>!v)} className="cursor-pointer hover:opacity-80">
                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <span>{selectedUser.name}</span>
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="text-sm text-gray-500">{typingUsers.get(selectedUser.id) ? "Typing..." : "Active now"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUser?.id !== selectedUser.id && (
                  <>
                    <button 
                      onClick={() => alert('Voice call feature coming soon')}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" 
                      title="Voice call"
                    >
                      <Phone className="w-5 h-5 text-orange-500" />
                    </button>
                    <button 
                      onClick={() => alert('Video call feature coming soon')}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" 
                      title="Video call"
                    >
                      <Video className="w-5 h-5 text-orange-500" />
                    </button>
                  </>
                )}
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer" title="Info">
                  <Info className="w-5 h-5 text-orange-500" />
                </button>
              </div>
              {menuOpen && (
                <div ref={menuRef} className="absolute top-16 left-4 z-40 bg-white rounded-xl border shadow-lg w-56 overflow-hidden">
                  {currentUser?.id !== selectedUser.id && (
                    <>
                      <button className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 cursor-pointer" onClick={() => window.open(`/profile/${selectedUser.username || selectedUser.id}`, '_self')}>
                        <UserIcon className="w-4 h-4 text-orange-500" />
                        <span>View Profile</span>
                      </button>
                      <button 
                        className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 cursor-pointer ${isBlocked ? 'text-orange-600' : 'text-gray-700'}`}
                        onClick={handleBlockUser}
                      >
                        {isBlocked ? (
                          <>
                            <ShieldOff className="w-4 h-4" />
                            <span>Unblock</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4" />
                            <span>Block User</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                  <button className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-red-600 cursor-pointer" onClick={handleDeleteLocal}>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Messages</span>
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {!initialLoadDone || (loading && messages.length === 0) ? (
            <ChatMessageSkeleton />
          ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Avatar src={selectedUser.avatar || undefined} name={selectedUser.name} className="w-20 h-20 mb-3" size="xl" />
                  <p className="font-semibold text-lg">{selectedUser.name}</p>
                  <p className="text-sm">Start the conversation</p>
                </div>
              ) : (
                messages
                  .slice(Math.max(messages.length - visibleCount, 0))
                  .map((message, index, arr) => {
                  const isOwn = message.senderId === currentUser?.id;
                  const showAvatar =
                    index === arr.length - 1 || arr[index + 1]?.senderId !== message.senderId;

                  return (
                    <div key={message.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <div className={isOwn ? "w-0" : "w-8"}>
                        {!isOwn && showAvatar && (
                          <Avatar src={selectedUser.avatar || undefined} name={selectedUser.name} className="w-8 h-8" size="sm" />
                        )}
                      </div>
                      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[60%]`}>
                        <div
                          className={`rounded-2xl ${
                            message.imageUrl ? '' : 'px-4 py-2'
                          } ${
                            isOwn ? 'bg-orange-500 text-white' : 'bg-white text-gray-900 shadow-sm'
                          }`}
                        >
                          {(() => {
                            const imgs = (message.imageUrl || '')
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean);
                            if (imgs.length > 0) {
                              return (
                                <div className={imgs.length === 1 ? '' : 'grid grid-cols-2 gap-1 p-1'}>
                                  {imgs.map((url, i) => (
                                    <div key={i} className={`overflow-hidden ${imgs.length === 1 ? '' : 'aspect-square'} rounded-2xl`}>
                                      <img
                                        src={url}
                                        alt={`Shared image ${i + 1}`}
                                        className={`object-cover cursor-pointer ${imgs.length === 1 ? 'max-w-full max-h-96 rounded-2xl' : 'w-full h-full'}`}
                                        onClick={() => {
                                          setViewerImages(imgs);
                                          setViewerIndex(i);
                                          setViewerOpen(true);
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {message.content && message.content !== '📷 Photo' && (
                            <p className={`text-sm wrap-break-word ${message.imageUrl ? 'px-3 py-2' : ''}`}>{message.content}</p>
                          )}
                        </div>
                        {showAvatar && (
                          <span className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-1">
                            {formatTime(message.createdAt)}
                          </span>
                        )}
                        {/* Show status for sent messages */}
                        {isOwn && (
                          <span className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-1">
                            {formatTime(message.createdAt)}
                            <MessageStatus 
                              isSentByMe={true}
                              delivered={!!message.deliveredAt}
                              read={!!message.readAt}
                            />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {/* Block notice (messages still visible) */}
              
              {/* Typing indicator bubble inside the message area */}
              {isUserTyping && (
                <div className="flex gap-2 animate-in fade-in duration-150">
                  <div className="w-6" />
                  <div className="rounded-2xl bg-gray-100 px-2.5 py-1.5 border border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-gray-500/70 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-500/70 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-500/70 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
              {showScrollToLatest && (
                <button
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-6 right-6 bg-orange-500 text-white rounded-full p-2 shadow-lg hover:bg-orange-600 transition-colors cursor-pointer"
                  title="Scroll to latest"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className={`mb-2 grid gap-2 ${imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-4'}`}>
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative inline-block">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="max-h-40 rounded-lg border-2 border-orange-500 object-cover w-full" />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        type="button"
                      >
                        âœ•
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(isBlocked || hasBlocked) ? (
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  {isBlocked ? (
                    <>
                      <p className="text-gray-700 mb-2">You blocked {selectedUser.name}</p>
                      <button 
                        onClick={handleBlockUser}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
                      >
                        Unblock
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-700">You can't message this user</p>
                  )}
                </div>
              ) : (
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  className="p-2 text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer"
                  title="Attach image"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="w-6 h-6" />
                </button>
                <div className={`flex-1 bg-gray-100 rounded-3xl px-4 py-3 flex items-center`}>
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); if (selectedUser) { setTyping(selectedUser.id, true); if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); } typingTimeoutRef.current = window.setTimeout(() => setTyping(selectedUser.id!, false), 2000); } }}
                    onKeyPress={handleKeyPress}
                    placeholder="Aa"
                    rows={1}
                    className="flex-1 bg-transparent resize-none outline-none text-sm max-h-32"
                    style={{ minHeight: '24px' }}
                  />
                  <button className="p-1 text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer" title="Add emoji">
                    <Smile className="w-6 h-6" />
                  </button>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() && selectedImages.length === 0 || uploading}
                  className={`p-3 rounded-full transition-colors cursor-pointer ${
                    (newMessage.trim() || selectedImages.length > 0) && !uploading
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title="Send"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              )}
              <ImageViewer
                images={viewerImages}
                initialIndex={viewerIndex}
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-xl font-semibold mb-2">Your Messages</p>
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}










