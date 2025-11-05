import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo } from 'react';
import type { MouseEvent as ReactMouseEvent, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Send,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  Info,
  Lock,
  ChevronDown,
  User as UserIcon,
  Trash2,
  Ban,
  ShieldOff,
  Bell,
  BellOff,
  MoreVertical,
  Paperclip,
  X,
  Reply,
  Copy,
  Play,
  Pause,
  Pin,
  PinOff
} from 'lucide-react';
import RecordRTC from 'recordrtc';
import clsx from 'clsx';
import { useChat } from '../../contexts/ChatContext';
import { chatService } from '../../services/chatService';
import socketService from '../../services/socketService';
import type { Message, User, Conversation, ConversationCustomization as ConversationCustomizationDTO } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import uploadService from '../../services/uploadService';
import { ImageViewer } from '../../components/shared/ImageViewer';
import { Avatar } from '../../components/shared/Avatar';
import {
  saveMessagesCache,
  getMessagesCache,
  clearMessagesCache,
  clearConversationsCache,
  getCustomizationCache,
  saveCustomizationCache,
  clearCustomizationCache
} from '../../utils/chatCache';
import { ChatMessageSkeleton } from '../../components/shared/ChatMessageSkeleton';
import userService from '../../services/userService';
import { MessageStatus } from '../../components/shared/MessageStatus';
import voiceCallService from '../../services/voiceCallService';
import videoCallService from '../../services/videoCallService';
import { EmojiPicker } from '../../components/shared/EmojiPicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ChatThemeConfig {
  id: string;
  name: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentSoftHover: string;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
  reactionActive: string;
  ownBubble: string;
  ownText: string;
  otherBubble: string;
  otherText: string;
  replyOwnBg: string;
  replyOwnHover: string;
  replyOwnBorder: string;
  previewGradient: string;
}

interface ChatCustomizationState {
  themeId: string;
  emoji: string;
  nicknameMe: string;
  nicknameThem: string;
  updatedAt?: string;
  updatedById?: string | null;
  changeSummary?: string;
}

const CHAT_THEMES: ChatThemeConfig[] = [
  {
    id: 'sunset',
    name: 'Sunset',
    accent: '#f97316',
    accentHover: '#ea580c',
    accentSoft: '#fff7ed',
    accentSoftHover: '#ffedd5',
    accentBorder: '#fed7aa',
    badgeBg: '#fff7ed',
    badgeText: '#ea580c',
    reactionActive: '#ffedd5',
    ownBubble: '#f97316',
    ownText: '#ffffff',
    otherBubble: '#ffffff',
    otherText: '#111827',
    replyOwnBg: 'rgba(249, 115, 22, 0.18)',
    replyOwnHover: 'rgba(249, 115, 22, 0.28)',
    replyOwnBorder: '#fdba74',
    previewGradient: 'from-orange-400 to-orange-600'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSoft: '#e0f2fe',
    accentSoftHover: '#bae6fd',
    accentBorder: '#bae6fd',
    badgeBg: '#e0f2fe',
    badgeText: '#0284c7',
    reactionActive: '#bae6fd',
    ownBubble: '#0ea5e9',
    ownText: '#ffffff',
    otherBubble: '#ffffff',
    otherText: '#0f172a',
    replyOwnBg: 'rgba(14, 165, 233, 0.16)',
    replyOwnHover: 'rgba(14, 165, 233, 0.28)',
    replyOwnBorder: '#7dd3fc',
    previewGradient: 'from-sky-400 to-indigo-500'
  },
  {
    id: 'blossom',
    name: 'Blossom',
    accent: '#f472b6',
    accentHover: '#ec4899',
    accentSoft: '#fdf2f8',
    accentSoftHover: '#fce7f3',
    accentBorder: '#fbcfe8',
    badgeBg: '#fdf2f8',
    badgeText: '#db2777',
    reactionActive: '#fce7f3',
    ownBubble: '#f472b6',
    ownText: '#ffffff',
    otherBubble: '#ffffff',
    otherText: '#111827',
    replyOwnBg: 'rgba(244, 114, 182, 0.16)',
    replyOwnHover: 'rgba(244, 114, 182, 0.28)',
    replyOwnBorder: '#f9a8d4',
    previewGradient: 'from-pink-400 to-rose-500'
  },
  {
    id: 'forest',
    name: 'Forest',
    accent: '#10b981',
    accentHover: '#059669',
    accentSoft: '#ecfdf5',
    accentSoftHover: '#d1fae5',
    accentBorder: '#a7f3d0',
    badgeBg: '#ecfdf5',
    badgeText: '#047857',
    reactionActive: '#d1fae5',
    ownBubble: '#10b981',
    ownText: '#ffffff',
    otherBubble: '#ffffff',
    otherText: '#0f172a',
    replyOwnBg: 'rgba(16, 185, 129, 0.16)',
    replyOwnHover: 'rgba(16, 185, 129, 0.28)',
    replyOwnBorder: '#6ee7b7',
    previewGradient: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'midnight',
    name: 'Midnight',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    accentSoft: '#eef2ff',
    accentSoftHover: '#e0e7ff',
    accentBorder: '#c7d2fe',
    badgeBg: '#eef2ff',
    badgeText: '#4338ca',
    reactionActive: '#e0e7ff',
    ownBubble: '#6366f1',
    ownText: '#ffffff',
    otherBubble: '#ffffff',
    otherText: '#0f172a',
    replyOwnBg: 'rgba(99, 102, 241, 0.16)',
    replyOwnHover: 'rgba(99, 102, 241, 0.3)',
    replyOwnBorder: '#a5b4fc',
    previewGradient: 'from-indigo-400 to-violet-500'
  }
];

const DEFAULT_CUSTOMIZATION: ChatCustomizationState = {
  themeId: 'sunset',
  emoji: '👍',
  nicknameMe: '',
  nicknameThem: ''
};

const DEFAULT_EMOJI_OPTIONS = ['👍', '❤️', '😂', '😍', '🔥', '👏', '🙏', '😮', '😎', '🎉', '🤩', '🤗', '😢', '😡', '💯', '🤝', '🥳', '🤙', '💡', '✨'];

const getThemeById = (id: string): ChatThemeConfig => CHAT_THEMES.find(theme => theme.id === id) ?? CHAT_THEMES[0];

type AudioRecorder = {
  startRecording: () => void;
  stopRecording: (callback?: () => void) => void;
  getBlob: () => Blob;
};

interface AudioPlayerProps {
  audioUrl: string;
  isOwn: boolean;
}

const AudioPlayer = memo(({ audioUrl, isOwn }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const formatTime = (time: number) => {
    if (Number.isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="px-2 py-2">
      <div
        className={clsx(
          'flex items-center gap-2 rounded-full px-2 py-2 w-[146px]',
          isOwn ? 'bg-white/20 text-white' : 'text-white'
        )}
        data-chat-accent-bg={isOwn ? undefined : 'true'}
      >
        <button onClick={togglePlay} className="shrink-0 cursor-pointer">
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white" />
          )}
        </button>
        <div className="flex-1 relative h-6 flex items-center">
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-[10px] font-medium text-white min-w-7">
          {formatTime(currentTime > 0 ? currentTime : duration)}
        </span>
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      </div>
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

export default function Chat() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { conversations, loadConversations, typingUsers, setTyping, onlineUsers, markAsRead, sendMessage } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true); // start with loading = true
  const [initialLoadDone, setInitialLoadDone] = useState(false); // track whether initial load finished
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const [emojiPickerStyle, setEmojiPickerStyle] = useState<React.CSSProperties | null>(null);
  
  
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [recording, setRecording] = useState(false);
  // Quick emoji press-and-hold state for button preview
  const [quickEmojiPressing, setQuickEmojiPressing] = useState(false);
  const [quickEmojiExpanded, setQuickEmojiExpanded] = useState(false);
  const quickEmojiExpandTimerRef = useRef<number | null>(null);
  const quickEmojiSendingRef = useRef(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const atBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [customization, setCustomization] = useState<ChatCustomizationState>(DEFAULT_CUSTOMIZATION);
  const [customizationMap, setCustomizationMap] = useState<Record<string, ChatCustomizationState>>({});
  const customizationFetchRef = useRef<Set<string>>(new Set());
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [emojiDialogOpen, setEmojiDialogOpen] = useState(false);
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState({ me: '', them: '' });
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const messageMenuRef = useRef<HTMLDivElement>(null);
  const [showEmojiReactions, setShowEmojiReactions] = useState<string | null>(null);
  const emojiReactionsRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pendingUserIdRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  const systemEventKeysRef = useRef<Set<string>>(new Set());
  const customizationEventCacheRef = useRef<Map<string, Message[]>>(new Map());
  const MAX_CACHE = 100;
  const CHUNK = 20;

  const normalizeCustomization = useCallback(
    (raw?: ConversationCustomizationDTO | ChatCustomizationState | null): ChatCustomizationState => ({
      themeId: raw?.themeId || DEFAULT_CUSTOMIZATION.themeId,
      emoji: raw?.emoji || DEFAULT_CUSTOMIZATION.emoji,
      nicknameMe: raw?.nicknameMe?.trim?.() || '',
      nicknameThem: raw?.nicknameThem?.trim?.() || '',
      updatedAt: raw?.updatedAt,
      updatedById: raw?.updatedById ?? null,
      changeSummary:
        raw && typeof raw === 'object' && 'changeSummary' in raw
          ? (raw.changeSummary as string | undefined)
          : undefined,
    }),
    []
  );

  const mapStateToCustomization = useCallback(
    (state: ChatCustomizationState): ConversationCustomizationDTO => ({
      themeId: state.themeId,
      emoji: state.emoji,
      nicknameMe: state.nicknameMe,
      nicknameThem: state.nicknameThem,
      updatedAt: state.updatedAt,
      updatedById: state.updatedById ?? null,
      changeSummary: state.changeSummary,
    }),
    []
  );

  const hydrateSystemEvents = useCallback((userId: string, source: Message[]) => {
    if (!userId || !source || source.length === 0) {
      return;
    }

    const incoming = source.filter(item => item.isSystem && item.id && item.createdAt);
    if (incoming.length === 0) {
      return;
    }

    const existing = customizationEventCacheRef.current.get(userId) ?? [];
    const mergedMap = new Map<string, Message>();
    existing.forEach(evt => {
      if (evt.id) {
        mergedMap.set(evt.id, evt);
      }
    });
    incoming.forEach(evt => {
      mergedMap.set(evt.id, evt);
    });

    const sorted = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    customizationEventCacheRef.current.set(userId, sorted);

    sorted.forEach(evt => {
      if (evt.content && evt.createdAt) {
        const key = `${userId}:${evt.createdAt}:${evt.content}`;
        systemEventKeysRef.current.add(key);
      }
    });
  }, []);


  const mergeMessagesWithEvents = useCallback(
    (list: Message[], userId: string) => {
      const base = [...list];
      hydrateSystemEvents(userId, base);
      const events = customizationEventCacheRef.current.get(userId) ?? [];

      if (events.length === 0) {
        return base.slice(-MAX_CACHE);
      }

      const seen = new Set(base.map(item => item.id));
      events.forEach(event => {
        if (!seen.has(event.id)) {
          base.push(event);
        }
      });

      base.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return base.slice(-MAX_CACHE);
    },
    [hydrateSystemEvents]
  );

  const appendSystemEvent = useCallback(
    (partnerId: string, summary: string, timestamp?: string) => {
      if (!summary) {
        return;
      }

      const iso = timestamp || new Date().toISOString();
      const key = `${partnerId}:${iso}:${summary}`;
      if (systemEventKeysRef.current.has(key)) {
        return;
      }
      systemEventKeysRef.current.add(key);

      const event: Message = {
        id: `system-${partnerId}-${iso}`,
        senderId: partnerId,
        receiverId: partnerId,
        content: summary,
        createdAt: iso,
        read: true,
        reactions: [],
        isSystem: true,
      };

      const existingEvents = customizationEventCacheRef.current.get(partnerId) ?? [];
      const updatedEvents = [...existingEvents.filter(evt => evt.id !== event.id), event].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      customizationEventCacheRef.current.set(partnerId, updatedEvents);

      if (selectedUser?.id === partnerId) {
        setMessages(prev => {
          const merged = mergeMessagesWithEvents(prev, partnerId);
          saveMessagesCache(partnerId, merged);
          return merged;
        });
      } else {
        const cached = getMessagesCache(partnerId) ?? [];
        const merged = mergeMessagesWithEvents(cached, partnerId);
        if (merged.length > 0) {
          saveMessagesCache(partnerId, merged);
        }
      }
    },
    [mergeMessagesWithEvents, selectedUser?.id]
  );

  const storeCustomization = useCallback(
    (userId: string, raw: ConversationCustomizationDTO | ChatCustomizationState) => {
      const normalized = normalizeCustomization(raw);
      saveCustomizationCache(userId, mapStateToCustomization(normalized));

      setCustomizationMap(prev => {
        const existing = prev[userId];
        if (
          existing &&
          existing.themeId === normalized.themeId &&
          existing.emoji === normalized.emoji &&
          existing.nicknameMe === normalized.nicknameMe &&
          existing.nicknameThem === normalized.nicknameThem &&
          existing.updatedAt === normalized.updatedAt
        ) {
          return prev;
        }
        return { ...prev, [userId]: normalized };
      });

      if (selectedUser?.id === userId) {
        setCustomization(normalized);
      }

      if (normalized.changeSummary) {
        appendSystemEvent(userId, normalized.changeSummary, normalized.updatedAt);
      }
    },
    [normalizeCustomization, selectedUser?.id, appendSystemEvent, mapStateToCustomization]
  );

  const fetchCustomization = useCallback(
    async (userId: string) => {
      if (!userId || customizationFetchRef.current.has(userId) || !currentUser) {
        return;
      }

      customizationFetchRef.current.add(userId);
      try {
        const response = await chatService.getCustomization(userId);
        storeCustomization(userId, response);
      } catch (error) {
        console.error('Failed to load chat customization:', error);
      } finally {
        customizationFetchRef.current.delete(userId);
      }
    },
    [currentUser, storeCustomization]
  );

  useLayoutEffect(() => {
    if (!selectedUser) {
      setCustomization(DEFAULT_CUSTOMIZATION);
      return;
    }

    const cached = customizationMap[selectedUser.id];
    if (cached) {
      setCustomization(cached);
      return;
    }

    const cachedLocal = getCustomizationCache(selectedUser.id);
    if (cachedLocal) {
      const normalized = normalizeCustomization(cachedLocal);
      setCustomization(normalized);
      setCustomizationMap(prev => ({ ...prev, [selectedUser.id]: normalized }));
      return;
    }

    void fetchCustomization(selectedUser.id);
  }, [selectedUser, customizationMap, fetchCustomization, normalizeCustomization]);

  useEffect(() => {
    const missing = conversations
      .map(conv => conv.participantId)
      .filter(participantId => participantId && !customizationMap[participantId]);

    missing.forEach(participantId => {
      void fetchCustomization(participantId);
    });
  }, [conversations, customizationMap, fetchCustomization]);

  useEffect(() => {
    setNicknameDraft({
      me: customization.nicknameMe,
      them: customization.nicknameThem
    });
  }, [customization.nicknameMe, customization.nicknameThem]);

  useEffect(() => {
    customizationFetchRef.current.clear();
    setCustomizationMap({});
    setCustomization(DEFAULT_CUSTOMIZATION);
    systemEventKeysRef.current.clear();
    customizationEventCacheRef.current.clear();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;

    const handleCustomizationUpdated = (payload: {
      userAId: string;
      userBId: string;
      themeId: string;
      emoji: string;
      nicknameForUserA?: string | null;
      nicknameForUserB?: string | null;
      updatedById?: string | null;
      updatedAt?: string;
      summary?: string;
    }) => {
      const { userAId, userBId } = payload;
      if (currentUser.id !== userAId && currentUser.id !== userBId) {
        return;
      }

      const isCurrentUserA = currentUser.id === userAId;
      const partnerId = isCurrentUserA ? userBId : userAId;

      storeCustomization(partnerId, {
        themeId: payload.themeId,
        emoji: payload.emoji,
        nicknameMe: isCurrentUserA ? payload.nicknameForUserA ?? '' : payload.nicknameForUserB ?? '',
        nicknameThem: isCurrentUserA ? payload.nicknameForUserB ?? '' : payload.nicknameForUserA ?? '',
        updatedAt: payload.updatedAt,
        updatedById: payload.updatedById ?? null,
        changeSummary: payload.summary,
      });
    };

    socketService.onChatCustomizationUpdated(handleCustomizationUpdated);
    return () => {
      socketService.offChatCustomizationUpdated(handleCustomizationUpdated);
    };
  }, [currentUser, storeCustomization]);

  const updateCustomizationOnServer = useCallback(
    async (partial: Partial<{ themeId: string; emoji: string; nicknameMe: string; nicknameThem: string }>) => {
      if (!selectedUser) return;
      try {
        const response = await chatService.updateCustomization(selectedUser.id, partial);
        storeCustomization(selectedUser.id, response);
      } catch (error) {
        console.error('Failed to update chat customization:', error);
      }
    },
    [selectedUser, storeCustomization]
  );

  const handleResetCustomization = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const response = await chatService.resetCustomization(selectedUser.id);
      storeCustomization(selectedUser.id, response);
      setCustomEmojiInput('');
    } catch (error) {
      console.error('Failed to reset chat customization:', error);
    }
  }, [selectedUser, storeCustomization]);
  
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const isUserTyping = selectedUser ? (typingUsers.get(selectedUser.id) || false) : false;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [conversationMenuOpen, setConversationMenuOpen] = useState<string | null>(null);
  const [conversationMenuPosition, setConversationMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const conversationMenuRef = useRef<HTMLDivElement>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [infoSectionsOpen, setInfoSectionsOpen] = useState<Record<string, boolean>>({
    customization: false,
    media: false,
    privacy: false,
    pinned: false
  });
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlocked, setHasBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const activeTheme = useMemo(() => getThemeById(customization.themeId), [customization.themeId]);
  const themeStyleVars = useMemo<CSSProperties>(() => ({
    '--chat-accent': activeTheme.accent,
    '--chat-accent-hover': activeTheme.accentHover,
    '--chat-accent-soft': activeTheme.accentSoft,
    '--chat-accent-soft-hover': activeTheme.accentSoftHover,
    '--chat-accent-border': activeTheme.accentBorder,
    '--chat-badge-bg': activeTheme.badgeBg,
    '--chat-badge-text': activeTheme.badgeText,
    '--chat-reaction-active-bg': activeTheme.reactionActive,
    '--chat-own-bubble-bg': activeTheme.ownBubble,
    '--chat-own-bubble-text': activeTheme.ownText,
    '--chat-other-bubble-bg': activeTheme.otherBubble,
    '--chat-other-bubble-text': activeTheme.otherText,
    '--chat-reply-own-bg': activeTheme.replyOwnBg,
    '--chat-reply-own-hover': activeTheme.replyOwnHover,
    '--chat-reply-own-border': activeTheme.replyOwnBorder
  }) as CSSProperties, [activeTheme]);
  const activeEmoji = customization.emoji || DEFAULT_CUSTOMIZATION.emoji;
  const quickReactions = useMemo(() => {
    const base = ['❤️', '😂', '😮', '😢', '😡', '👍'];
    const filtered = base.filter(item => item !== activeEmoji);
    return [activeEmoji, ...filtered];
  }, [activeEmoji]);
  const emojiOptions = useMemo(() => {
    const unique = Array.from(new Set([activeEmoji, ...DEFAULT_EMOJI_OPTIONS]));
    return unique;
  }, [activeEmoji]);
  const displayName = useMemo(() => {
    if (!selectedUser) return '';
    const alias = customization.nicknameThem.trim();
    return alias || selectedUser.name;
  }, [selectedUser, customization.nicknameThem]);
  const myNickname = useMemo(() => {
    const alias = customization.nicknameMe.trim();
    return alias || currentUser?.name || 'You';
  }, [customization.nicknameMe, currentUser?.name]);
  const partnerNicknameLine = useMemo(() => {
    if (!selectedUser) return '';
    const alias = customization.nicknameThem.trim();
    if (alias) {
      return `${alias} (${selectedUser.name})`;
    }
    return selectedUser.name;
  }, [customization.nicknameThem, selectedUser]);

  useEffect(() => {
    if (!currentUser?.id || !selectedUser || selectedUser.id !== currentUser.id) {
      return;
    }

    const cached = normalizeCustomization(getCustomizationCache(selectedUser.id));
    const matches =
      customization.themeId === cached.themeId &&
      customization.emoji === cached.emoji &&
      customization.nicknameMe === cached.nicknameMe &&
      customization.nicknameThem === cached.nicknameThem;

    if (!matches) {
      setCustomization(cached);
      setCustomizationMap(prev => ({ ...prev, [selectedUser.id]: cached }));
    }
  }, [
    currentUser?.id,
    selectedUser,
    customization.themeId,
    customization.emoji,
    customization.nicknameMe,
    customization.nicknameThem,
    normalizeCustomization
  ]);
  const getDisplayNameForUser = useCallback(
    (user: User) => {
      const stored = customizationMap[user.id];
      const alias = stored?.nicknameThem.trim();
      return alias || user.name;
    },
    [customizationMap]
  );
  const isCustomizationDefault = useMemo(() => {
    const hasOwnNickname = Boolean(customization.nicknameMe.trim());
    const hasTheirNickname = Boolean(customization.nicknameThem.trim());
    return (
      customization.themeId === DEFAULT_CUSTOMIZATION.themeId &&
      activeEmoji === DEFAULT_CUSTOMIZATION.emoji &&
      !hasOwnNickname &&
      !hasTheirNickname
    );
  }, [customization.nicknameMe, customization.nicknameThem, customization.themeId, activeEmoji]);
  const isSelectedOnline = selectedUser ? onlineUsers.has(selectedUser.id) : false;
  const activeConversation = conversationMenuOpen
    ? conversations.find(conv => conv.id === conversationMenuOpen) || null
    : null;
  const handleThemeSelect = useCallback(
    async (themeId: string) => {
      await updateCustomizationOnServer({ themeId });
      setThemeDialogOpen(false);
    },
    [updateCustomizationOnServer]
  );
  const handleEmojiSelect = useCallback(
    async (emoji: string) => {
      await updateCustomizationOnServer({ emoji });
      setEmojiDialogOpen(false);
      setCustomEmojiInput('');
    },
    [updateCustomizationOnServer]
  );
  const handleCustomEmojiInputChange = useCallback((value: string) => {
    const trimmed = value.trim();
    const graphemes = Array.from(trimmed);
    const next = graphemes.slice(0, 2).join('');
    setCustomEmojiInput(next);
  }, []);
  const handleApplyCustomEmoji = useCallback(async () => {
    if (!customEmojiInput.trim()) return;
    await updateCustomizationOnServer({ emoji: customEmojiInput });
    setEmojiDialogOpen(false);
    setCustomEmojiInput('');
  }, [customEmojiInput, updateCustomizationOnServer]);
  const handleNicknameSave = useCallback(async () => {
    const next = {
      me: nicknameDraft.me.trim(),
      them: nicknameDraft.them.trim()
    };
    await updateCustomizationOnServer({
      nicknameMe: next.me,
      nicknameThem: next.them
    });
    setNicknameDialogOpen(false);
  }, [nicknameDraft.me, nicknameDraft.them, updateCustomizationOnServer]);
  const handleNicknameDialogToggle = useCallback(
    (open: boolean) => {
      setNicknameDialogOpen(open);
      if (!open) {
        setNicknameDraft({
          me: customization.nicknameMe,
          them: customization.nicknameThem
        });
      }
    },
    [customization.nicknameMe, customization.nicknameThem]
  );
  const handleEmojiDialogToggle = useCallback(
    (open: boolean) => {
      setEmojiDialogOpen(open);
      if (!open) {
        setCustomEmojiInput('');
      }
    },
    []
  );

  // compute and update emoji picker position based on the emoji button rect
  const updateEmojiPickerPosition = useCallback(() => {
    const btn = emojiButtonRef.current;
    const pickerW = 300;
    const pickerH = 20;
    if (!btn) {
      // fallback: keep it bottom-right but avoid overlapping the info panel
      const rightOffset = showInfoPanel ? 360 + 16 : 16;
      setEmojiPickerStyle({ position: 'fixed', bottom: '5rem', right: `${rightOffset}px` });
      return;
    }
    const rect = btn.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Prefer to place the picker below the button if space allows, otherwise above.
    const preferredBottom = rect.bottom + 8;
    const preferredTop = rect.top - pickerH - 8;

    let top = preferredBottom;
    // if bottom placement would overflow vertically, try above
    if (preferredBottom + pickerH > viewportH - 8) {
      top = Math.max(preferredTop, 8);
    }

    // Align right edge of picker with button right edge if possible but never overlap info panel
    let left = rect.right - pickerW;
    const sideReserved = showInfoPanel ? 360 + 8 : 8;
    const maxLeft = Math.max(8, viewportW - pickerW - sideReserved);
    if (left < 8) left = 8;
    if (left > maxLeft) left = maxLeft;

    setEmojiPickerStyle({ position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${pickerW}px`, zIndex: 99999 });
  }, [showInfoPanel]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    updateEmojiPickerPosition();
    const onResize = () => updateEmojiPickerPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [showEmojiPicker, updateEmojiPickerPosition]);

  const closeConversationMenu = useCallback(() => {
    setConversationMenuOpen(null);
    setConversationMenuPosition(null);
  }, []);

  const handleOpenConversationMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    conversation: Conversation
  ) => {
    event.stopPropagation();
    // Toggle: if already open for this conversation, close it
    if (conversationMenuOpen === conversation.id) {
      closeConversationMenu();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 220;
    const left = Math.max(rect.right + window.scrollX - menuWidth, 16);
    const top = rect.bottom + window.scrollY + 6;
    setConversationMenuPosition({ top, left });
    setConversationMenuOpen(conversation.id);
  };

  const handleConversationViewProfile = () => {
    const participant = activeConversation?.participant || selectedUser;
    if (!participant) return;
    const url = participant.username ? `/profile/${participant.username}` : `/profile/${participant.id}`;
    closeConversationMenu();
    setShowInfoPanel(false);
    window.open(url, '_self');
  };

  const navigateToProfile = (user?: User | null) => {
    if (!user) return;
    const url = user.username ? `/profile/${user.username}` : `/profile/${user.id}`;
    window.open(url, '_self');
  };

  const handleConversationToggleMute = async () => {
    const conversationTarget = activeConversation || (selectedUser ? conversations.find(c => c.participantId === selectedUser.id) || null : null);
    const participantId = conversationTarget?.participantId || selectedUser?.id;
    if (!participantId) return;

    const currentlyMuted = conversationTarget ? conversationTarget.isMuted : isMuted;

    try {
      if (currentlyMuted) {
        await chatService.unmuteConversation(participantId);
        alert('Notifications unmuted');
      } else {
        await chatService.muteConversation(participantId);
        alert('Notifications muted');
      }
      if (selectedUser?.id === participantId) {
        setIsMuted(!currentlyMuted);
      }
      closeConversationMenu();
      setShowInfoPanel(false);
      loadConversations();
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      alert('An error occurred, please try again');
    }
  };

  const handleConversationDelete = async () => {
    const conversationTarget = activeConversation || (selectedUser ? conversations.find(c => c.participantId === selectedUser.id) || null : null);
    const participantId = conversationTarget?.participantId || selectedUser?.id;
    if (!participantId) return;
    const targetName = conversationTarget?.participant.name || selectedUser?.name || 'this user';
    if (!confirm(`Delete all messages with ${targetName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await chatService.deleteConversation(participantId);
      clearMessagesCache(participantId);
      clearConversationsCache();
      clearCustomizationCache(participantId);
      if (selectedUser?.id === participantId) {
        setSelectedUser(null);
        setMessages([]);
        setIsBlocked(false);
        setHasBlocked(false);
      }
      closeConversationMenu();
      setShowInfoPanel(false);
      loadConversations();
      alert('All messages deleted');
      navigate('/chat');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('An error occurred, please try again');
    }
  };

  const handleConversationBlock = async () => {
    const participant = activeConversation?.participant || selectedUser;
    if (!participant) return;
    if (!confirm(`Are you sure you want to block ${participant.name}? You will not be able to message this person.`)) {
      return;
    }

    try {
      await userService.blockUser(participant.id);
      clearMessagesCache(participant.id);
      clearConversationsCache();
      clearCustomizationCache(participant.id);
      if (selectedUser?.id === participant.id) {
        setIsBlocked(true);
        setSelectedUser(null);
        setMessages([]);
        setMenuOpen(false);
        setHasBlocked(false);
        setIsMuted(false);
      }
      closeConversationMenu();
      setShowInfoPanel(false);
      loadConversations();
      alert('User blocked');
    } catch (error) {
      console.error('Failed to block user:', error);
      alert('An error occurred, please try again');
    }
  };

  const handleTypingChange = useCallback(
    (typing: boolean) => {
      if (!selectedUser) return;
      if (isTypingRef.current === typing) return;
      isTypingRef.current = typing;
      setTyping(selectedUser.id, typing);
    },
    [selectedUser, setTyping]
  );

  const handleStartVoiceCall = async () => {
    if (!selectedUser) {
      return;
    }

    if (!currentUser) {
      console.error('Voice call unavailable without authenticated user');
      return;
    }

    try {
      await voiceCallService.startCall(
        selectedUser.id,
        selectedUser.name,
        selectedUser.avatar ?? null
      );
    } catch (error) {
      console.error('Failed to start voice call:', error);
      alert('Unable to start voice call. Please try again!');
    }
  };

  const handleStartVideoCall = async () => {
    if (!selectedUser) {
      return;
    }

    if (!currentUser) {
      console.error('Video call unavailable without authenticated user');
      return;
    }

    try {
      await videoCallService.startCall(
        selectedUser.id,
        selectedUser.name,
        selectedUser.avatar ?? null
      );
    } catch (error) {
      console.error('Failed to start video call:', error);
      alert('Unable to start video call. Please try again!');
    }
  };

  const highlightMessageById = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('highlight-message');
    window.setTimeout(() => {
      element.classList.remove('highlight-message');
    }, 2000);
  }, []);

  // Track locally pending pin/unpin actions to ignore immediate server echoes
  const pendingPinActionsRef = useRef<Map<string, number>>(new Map());

  const markPendingPinAction = (messageId: string) => {
    pendingPinActionsRef.current.set(messageId, Date.now());
    // remove after 1.5s
    setTimeout(() => pendingPinActionsRef.current.delete(messageId), 1500);
  };

  // Track locally pending reaction actions to avoid flicker when server echoes back
  const pendingReactionActionsRef = useRef<Map<string, number>>(new Map());

  const markPendingReactionAction = (messageId: string) => {
    pendingReactionActionsRef.current.set(messageId, Date.now());
    setTimeout(() => pendingReactionActionsRef.current.delete(messageId), 1500);
  };

  // Track local optimistic sends so we can de-duplicate when the server echoes back
  const pendingLocalSendsRef = useRef<Map<string, string>>(new Map());

  const ensureConversationReady = useCallback(() => {
    setInitialLoadDone(prev => (prev ? prev : true));
    setLoading(false);
  }, []);

  const upsertMessageInState = useCallback(
    (incoming: Message) => {
      setMessages(prev => {
        const existingIndex = prev.findIndex(msg => msg.id === incoming.id);
        let updated: Message[];

        if (existingIndex >= 0) {
          updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...incoming };
        } else {
          updated = [...prev, incoming];
          updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }

        if (selectedUser?.id) {
          saveMessagesCache(selectedUser.id, updated);
        }

        return updated;
      });
    },
    [selectedUser?.id]
  );

  const handlePinMessage = useCallback(
    async (message: Message) => {
      // optimistic: immediately mark message as pinned locally to avoid UI flicker
      markPendingPinAction(message.id);
      const prev = message;
      const optimistic: Message = {
        ...message,
        pinnedAt: new Date().toISOString(),
        pinnedById: currentUser?.id || message.pinnedById || null,
        pinnedBy: currentUser
          ? { id: currentUser.id, name: currentUser.name, username: currentUser.username }
          : message.pinnedBy || null
      } as Message;

      setMessages(prevMsgs => {
        const idx = prevMsgs.findIndex(m => m.id === optimistic.id);
        let next: Message[];
        if (idx >= 0) {
          next = [...prevMsgs];
          next[idx] = { ...next[idx], ...optimistic };
        } else {
          next = [...prevMsgs, optimistic];
          next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        if (selectedUser?.id) saveMessagesCache(selectedUser.id, next);
        return next;
      });

      try {
        const updated = await chatService.pinMessage(message.id);
        upsertMessageInState(updated);
      } catch (error) {
        console.error('Failed to pin message:', error);
        // revert optimistic change
        upsertMessageInState(prev);
        alert('Unable to pin message. Please try again!');
      } finally {
        setMessageMenuOpen(null);
      }
    },
    [upsertMessageInState, currentUser, selectedUser?.id]
  );

  const handleUnpinMessage = useCallback(
    async (message: Message) => {
      // optimistic: remove pinned state locally first
      markPendingPinAction(message.id);
      const prev = message;
      const optimistic: Message = { ...message, pinnedAt: null, pinnedById: null, pinnedBy: null } as Message;

      setMessages(prevMsgs => {
        const idx = prevMsgs.findIndex(m => m.id === optimistic.id);
        let next: Message[];
        if (idx >= 0) {
          next = [...prevMsgs];
          next[idx] = { ...next[idx], ...optimistic };
        } else {
          next = [...prevMsgs, optimistic];
          next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        if (selectedUser?.id) saveMessagesCache(selectedUser.id, next);
        return next;
      });

      try {
        const updated = await chatService.unpinMessage(message.id);
        upsertMessageInState(updated);
      } catch (error) {
        console.error('Failed to unpin message:', error);
        // revert optimistic change
        upsertMessageInState(prev);
        alert('Unable to unpin message. Please try again!');
      } finally {
        setMessageMenuOpen(null);
      }
    },
    [upsertMessageInState, selectedUser?.id]
  );

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Sync conversation from query string
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (!userId) {
      pendingUserIdRef.current = null;
      if (selectedUser) {
        setSelectedUser(null);
      }
      return;
    }

    // If we're waiting for URL to update after a selection, don't override with old id
    if (pendingUserIdRef.current && pendingUserIdRef.current !== userId) {
      return;
    }

    pendingUserIdRef.current = null;

    if (selectedUser?.id === userId) {
      return;
    }

    const conv = conversations.find(c => c.participantId === userId);
    if (conv) {
      setSelectedUser(conv.participant);
    }
  }, [searchParams, conversations, selectedUser]);

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

  useEffect(() => {
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setSelectedImages([]);
    setImagePreviews([]);
    setSelectedVideo(null);
    setVideoPreview('');
    setRecording(false);
    setShowAttachmentMenu(false);
    setMessageMenuOpen(null);
    setShowEmojiReactions(null);
    isTypingRef.current = false;
    initialLoadDoneRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    recorderRef.current = null;
    setVisibleCount(CHUNK);

    if (!selectedUser?.id) {
      setCustomization(DEFAULT_CUSTOMIZATION);
      setNicknameDraft({ me: '', them: '' });
      setCustomEmojiInput('');
    }
  }, [selectedUser?.id]);

  // Fetch when selectedUser changes with caching
  useEffect(() => {
    let timeoutId: number | undefined;
    let cancelled = false;

    const scheduleMarkAsRead = (userId: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          markAsRead(userId);
        }
      }, 1500);
    };

    const run = async () => {
      if (!selectedUser) {
        setMessages([]);
        setLoading(false);
        setInitialLoadDone(false);
        initialLoadDoneRef.current = false;
        return;
      }

      const userId = selectedUser.id;
      
      // If already initialized this user, skip reload
      if (initialLoadDoneRef.current) {
        return;
      }

      // Try cache first
      const cachedMessages = getMessagesCache(userId);
      if (cachedMessages && cachedMessages.length > 0) {
        // Have cache → show immediately, not loading
        const cappedCache = cachedMessages.slice(-MAX_CACHE);
        const withEventsCache = mergeMessagesWithEvents(cappedCache, userId);
        setMessages(withEventsCache);
        setLoading(false);
        setInitialLoadDone(true);
        initialLoadDoneRef.current = true;

        // Fetch API ở background để cập nhật
        try {
          const data = await chatService.getMessages(userId);
          if (cancelled) {
            return;
          }
          const capped = data.slice(-MAX_CACHE);
          // Preserve any optimistic local temp messages (ids starting with 'tmp-')
          setMessages(prev => {
            const tempMsgs = (prev || []).filter(m => typeof m.id === 'string' && m.id.startsWith('tmp-') && m.receiverId === userId);
            const merged = [...capped];
            for (const t of tempMsgs) {
              if (!merged.some(m => m.id === t.id)) merged.push(t);
            }
            const final = merged.slice(-MAX_CACHE);
            const withEvents = mergeMessagesWithEvents(final, userId);
            saveMessagesCache(userId, withEvents);
            return withEvents;
          });
          scheduleMarkAsRead(userId);
        } catch (error) {
          if (!cancelled) {
            console.error('Failed to update messages:', error);
          }
        }
        return;
      }

      // No cache → show loading and clear old data to avoid flicker
      setMessages([]);
      setLoading(true);
      setInitialLoadDone(false);
      try {
        const data = await chatService.getMessages(userId);
        if (cancelled) {
          return;
        }
        const capped = data.slice(-MAX_CACHE);
        // Preserve optimistic temporary messages if present
        setMessages(prev => {
          const tempMsgs = (prev || []).filter(m => typeof m.id === 'string' && m.id.startsWith('tmp-') && m.receiverId === userId);
          const merged = [...capped];
          for (const t of tempMsgs) {
            if (!merged.some(m => m.id === t.id)) merged.push(t);
          }
          const final = merged.slice(-MAX_CACHE);
          const withEvents = mergeMessagesWithEvents(final, userId);
          saveMessagesCache(userId, withEvents);
          return withEvents;
        });
        setLoading(false);
        setInitialLoadDone(true);
        initialLoadDoneRef.current = true;
        scheduleMarkAsRead(userId);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load messages:', error);
          setLoading(false);
          setInitialLoadDone(true);
          initialLoadDoneRef.current = true;
        }
      }
    };
    run();
    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedUser, markAsRead, mergeMessagesWithEvents]);

  // Socket event for new messages
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const handleNewMessage = (message: Message) => {
      if (
        (message.senderId === selectedUser.id && message.receiverId === currentUser.id) ||
        (message.senderId === currentUser.id && message.receiverId === selectedUser.id)
      ) {
        // If we recently optimistically added a local temp message for this send,
        // replace it instead of appending a duplicate. We use a simple signature
        // based on sender|receiver|content|createdAt_seconds to correlate.
        try {
          const seconds = Math.floor(new Date(message.createdAt).getTime() / 1000);
          const signature = `${message.senderId}|${message.receiverId}|${message.content}|${seconds}`;
          const tempId = pendingLocalSendsRef.current.get(signature);
          if (tempId) {
            setMessages(prev => prev.map(m => (m.id === tempId ? message : m)));
            pendingLocalSendsRef.current.delete(signature);
            // ensure cache is updated
            if (selectedUser) {
              const capped = (getMessagesCache(selectedUser.id) || []).slice(-MAX_CACHE);
              saveMessagesCache(selectedUser.id, capped);
            }
            return;
          }

          // Fallback: try to find any optimistic temp message (id starts with 'tmp-')
          // that matches sender/content and is recent — replace it to avoid duplicates.
          let handled = false;
          setMessages(prev => {
            const serverTime = new Date(message.createdAt).getTime();
            for (let i = prev.length - 1; i >= 0; i--) {
              const m = prev[i];
              if (m.id && m.id.startsWith('tmp-') && m.senderId === message.senderId && m.content === message.content) {
                const localTime = new Date(m.createdAt).getTime();
                if (Math.abs(serverTime - localTime) < 10000) { // within 10s
                  handled = true;
                  return prev.map(x => (x.id === m.id ? message : x));
                }
              }
            }
            return prev;
          });
          if (handled) {
            if (selectedUser) {
              const capped = (getMessagesCache(selectedUser.id) || []).slice(-MAX_CACHE);
              saveMessagesCache(selectedUser.id, capped);
            }
            return;
          }

          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) {
              return prev;
            }
            const next = [...prev, message];
            const capped = next.slice(-MAX_CACHE);
            saveMessagesCache(selectedUser.id, capped);
            return capped;
          });
        } catch {
          // fallback to normal append behavior if anything goes wrong
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) {
              return prev;
            }
            const next = [...prev, message];
            const capped = next.slice(-MAX_CACHE);
            saveMessagesCache(selectedUser.id, capped);
            return capped;
          });
        }

        if (message.senderId === selectedUser.id) {
          markAsRead(selectedUser.id);
        }
      }
    };

    const handleMessagesDelivered = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageIds: string[]; deliveredAt: string }>;
      const { messageIds, deliveredAt } = customEvent.detail;

      setMessages(prev => {
        const updated = prev.map(msg => (messageIds.includes(msg.id) ? { ...msg, deliveredAt } : msg));
        saveMessagesCache(selectedUser.id, updated);
        return updated;
      });
    };

    const handleMessagesRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageIds: string[]; readAt: string }>;
      const { messageIds, readAt } = customEvent.detail;

      setMessages(prev => {
        const updated = prev.map(msg => (messageIds.includes(msg.id) ? { ...msg, readAt, read: true } : msg));
        saveMessagesCache(selectedUser.id, updated);
        return updated;
      });
    };

    const handleReactionAdded = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageId: string; reaction: { id: string; userId: string; emoji: string; createdAt: string } }>;
      const { messageId, reaction } = customEvent.detail;

      // Ignore server echo if we recently initiated a reaction for this message
      const rts = pendingReactionActionsRef.current.get(messageId);
      if (rts && Date.now() - rts < 1500) return;

      setMessages(prev => {
        const updated = prev.map(msg => {
          if (msg.id === messageId) {
            const filtered = (msg.reactions || []).filter(r => r.userId !== reaction.userId);
            return { ...msg, reactions: [...filtered, reaction] };
          }
          return msg;
        });
        saveMessagesCache(selectedUser.id, updated);
        return updated;
      });
    };

    const handleReactionRemoved = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageId: string; userId: string }>;
      const { messageId, userId } = customEvent.detail;

      // Ignore server echo if we recently removed a reaction for this message
      const rts2 = pendingReactionActionsRef.current.get(messageId);
      if (rts2 && Date.now() - rts2 < 1500) return;

      setMessages(prev => {
        const updated = prev.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, reactions: (msg.reactions || []).filter(r => r.userId !== userId) };
          }
          return msg;
        });
        saveMessagesCache(selectedUser.id, updated);
        return updated;
      });
    };

    const handleMessageUnsent = (event: Event) => {
      const customEvent = event as CustomEvent<{ messageId: string }>;
      const { messageId } = customEvent.detail;

      setMessages(prev => {
        const updated = prev.map(msg =>
          msg.id === messageId
            ? { ...msg, unsent: true, pinnedAt: null, pinnedById: null, pinnedBy: null }
            : msg
        );
        saveMessagesCache(selectedUser.id, updated);
        return updated;
      });
    };

    const handleMessagePinned = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: Message }>;
      const { message } = customEvent.detail;
      if (!message) return;
      if (!selectedUser) return;
      const relatedIds = [message.senderId, message.receiverId];
      if (!relatedIds.includes(selectedUser.id)) return;
      // Ignore server echo if we recently initiated a pin/unpin for this message
      const ts = pendingPinActionsRef.current.get(message.id);
      if (ts && Date.now() - ts < 1500) return;
      upsertMessageInState(message);
    };

    const handleMessageUnpinned = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: Message }>;
      const { message } = customEvent.detail;
      if (!message) return;
      if (!selectedUser) return;
      const relatedIds = [message.senderId, message.receiverId];
      if (!relatedIds.includes(selectedUser.id)) return;
      const ts = pendingPinActionsRef.current.get(message.id);
      if (ts && Date.now() - ts < 1500) return;
      upsertMessageInState(message);
    };

    socketService.getSocket()?.on('new_message', handleNewMessage);
    window.addEventListener('messages_delivered', handleMessagesDelivered);
    window.addEventListener('messages_read', handleMessagesRead);
    window.addEventListener('reaction_added', handleReactionAdded);
    window.addEventListener('reaction_removed', handleReactionRemoved);
    window.addEventListener('message_unsent', handleMessageUnsent);
    window.addEventListener('message_pinned', handleMessagePinned);
    window.addEventListener('message_unpinned', handleMessageUnpinned);

    return () => {
      socketService.getSocket()?.off('new_message', handleNewMessage);
      window.removeEventListener('messages_delivered', handleMessagesDelivered);
      window.removeEventListener('messages_read', handleMessagesRead);
      window.removeEventListener('reaction_added', handleReactionAdded);
      window.removeEventListener('reaction_removed', handleReactionRemoved);
      window.removeEventListener('message_unsent', handleMessageUnsent);
      window.removeEventListener('message_pinned', handleMessagePinned);
      window.removeEventListener('message_unpinned', handleMessageUnpinned);
    };
  }, [selectedUser, currentUser, markAsRead, upsertMessageInState]);

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

  // Auto scroll to bottom when new messages if user stays at bottom
  useEffect(() => {
    if (atBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  // Follow typing indicator only when already at bottom
  useEffect(() => {
    if (isUserTyping && atBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [isUserTyping]);

  // After initial load, jump to bottom without animation
  useEffect(() => {
    if (!loading) {
      scrollToBottom('auto');
    }
  }, [loading]);

  const handleDeleteLocal = async () => {
    if (!selectedUser) return;
  if (confirm(`Delete all messages with ${displayName}? This action cannot be undone.`)) {
      try {
        // Delete on server (mark as deleted for current user)
        await chatService.deleteConversation(selectedUser.id);
        // Clear local state and cache
        setMessages([]);
        clearMessagesCache(selectedUser.id);
        clearConversationsCache(); // Clear conversations cache to refresh list
        clearCustomizationCache(selectedUser.id);
        setMenuOpen(false);
        setSelectedUser(null); // Close the conversation
    setShowInfoPanel(false);
    const params = new URLSearchParams(searchParams);
    params.delete('userId');
    setSearchParams(params);
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
        loadConversations();
        setShowInfoPanel(false);
        alert('User unblocked');
      } else {
  if (confirm(`Are you sure you want to block ${displayName}? You will not be able to message this person.`)) {
          await userService.blockUser(selectedUser.id);
          setIsBlocked(true);
          setMenuOpen(false);
          setSelectedUser(null);
          clearCustomizationCache(selectedUser.id);
          const params = new URLSearchParams(searchParams);
          params.delete('userId');
          setSearchParams(params);
          loadConversations();
          setShowInfoPanel(false);
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

  const handleToggleMute = async () => {
    if (!selectedUser) return;
    try {
      if (isMuted) {
        await chatService.unmuteConversation(selectedUser.id);
        setIsMuted(false);
      } else {
        await chatService.muteConversation(selectedUser.id);
        setIsMuted(true);
      }
      setMenuOpen(false);
      setShowInfoPanel(false);
      loadConversations();
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      alert('An error occurred, please try again');
    }
  };

  useEffect(() => {
    if (!selectedUser) return;
    const checkMute = async () => {
      try {
        const muted = await chatService.checkIfMuted(selectedUser.id);
        setIsMuted(muted);
      } catch (error) {
        console.error('Failed to check mute status:', error);
      }
    };
    checkMute();
  }, [selectedUser]);

  // Close menu when clicking outside (use 'click' to avoid mousedown/click race)
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (messageMenuRef.current && !messageMenuRef.current.contains(e.target as Node)) {
        setMessageMenuOpen(null);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
      if (conversationMenuRef.current && !conversationMenuRef.current.contains(e.target as Node)) {
        const target = e.target as Element;
        if (!target.closest('[data-conversation-menu-trigger]')) {
          closeConversationMenu();
        }
      }
    };
    if (menuOpen || messageMenuOpen || showAttachmentMenu || conversationMenuOpen) {
      document.addEventListener('click', onDocClick);
      return () => document.removeEventListener('click', onDocClick);
    }
    return undefined;
  }, [menuOpen, messageMenuOpen, showAttachmentMenu, conversationMenuOpen, closeConversationMenu]);

  useEffect(() => {
    if (!showEmojiReactions) return;
    const onEmojiClickOutside = (e: MouseEvent) => {
      if (emojiReactionsRef.current && !emojiReactionsRef.current.contains(e.target as Node)) {
        setShowEmojiReactions(null);
      }
    };
    // Delay listener to avoid closing immediately after opening
    const timerId = window.setTimeout(() => {
      document.addEventListener('click', onEmojiClickOutside);
    }, 50);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener('click', onEmojiClickOutside);
    };
  }, [showEmojiReactions]);

  // Load persisted info panel state for the selected conversation (per-user)
  useEffect(() => {
    if (!selectedUser) return;
    try {
      const sv = localStorage.getItem(`chat:showInfoPanel:${selectedUser.id}`);
      setShowInfoPanel(sv === '1');
      const sec = localStorage.getItem(`chat:infoSections:${selectedUser.id}`);
      if (sec) {
        setInfoSectionsOpen(JSON.parse(sec));
      } else {
        setInfoSectionsOpen({ customization: false, media: false, privacy: false, pinned: false });
      }
    } catch {
      setInfoSectionsOpen({ customization: false, media: false, privacy: false, pinned: false });
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!showInfoPanel) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowInfoPanel(false);
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [showInfoPanel]);

  // Persist info panel open state and which sections are open per selected user
  useEffect(() => {
    if (!selectedUser) return;
    try {
      localStorage.setItem(`chat:showInfoPanel:${selectedUser.id}`, showInfoPanel ? '1' : '0');
      localStorage.setItem(`chat:infoSections:${selectedUser.id}`, JSON.stringify(infoSectionsOpen));
    } catch {
      // ignore storage errors
    }
  }, [showInfoPanel, infoSectionsOpen, selectedUser]);

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

  const toggleInfoSection = useCallback((sectionId: string) => {
    setInfoSectionsOpen(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  const handleInfoSearch = useCallback(() => {
    setShowInfoPanel(false);
    alert('Search within conversation is under development.');
  }, []);

  const handleComingSoon = useCallback((feature: string) => {
    alert(`${feature} is under development.`);
  }, []);

  // Focus input
  useEffect(() => {
    if (selectedUser) {
      inputRef.current?.focus();
    }
  }, [selectedUser]);

  const handleSendMessage = async () => {
    if (!selectedUser) return;
    if (!newMessage.trim() && selectedImages.length === 0 && !selectedVideo && selectedFiles.length === 0) return;

    const hadConversation = conversations.some(conv => conv.participantId === selectedUser.id);
    const content = newMessage.trim() || (selectedFiles.length > 0 ? '📎 File' : selectedVideo ? '🎥 Video' : '📷 Photo');
    const replyToId = replyingTo?.id;
    setNewMessage('');
    setReplyingTo(null);
    handleTypingChange(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    ensureConversationReady();

    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let fileType: string | undefined;

      setUploading(true);

      if (selectedFiles.length > 0) {
        const uploadedFiles: string[] = [];
        const fileNames: string[] = [];
        let totalSize = 0;
        
        for (const file of selectedFiles) {
          const uploadResult = await uploadService.uploadFile(file);
          uploadedFiles.push(uploadResult.url);
          fileNames.push(uploadResult.originalName);
          totalSize += uploadResult.size;
        }
        
        fileUrl = uploadedFiles.join(',');
        fileName = fileNames.join(',');
        fileSize = totalSize;
        fileType = selectedFiles[0].type;
        setSelectedFiles([]);
        if (docFileInputRef.current) {
          docFileInputRef.current.value = '';
        }
      } else if (selectedVideo) {
        videoUrl = await uploadService.uploadVideo(selectedVideo);
        if (videoPreview) {
          URL.revokeObjectURL(videoPreview);
        }
        setSelectedVideo(null);
        setVideoPreview('');
        if (videoInputRef.current) {
          videoInputRef.current.value = '';
        }
      } else if (selectedImages.length > 0) {
        const urls: string[] = [];
        for (const file of selectedImages) {
          const url = await uploadService.uploadImage(file);
          urls.push(url);
        }
        imageUrl = urls.join(',');
        setSelectedImages([]);
        setImagePreviews([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      const sentMessage = await sendMessage({
        receiverId: selectedUser.id,
        content,
        imageUrl,
        videoUrl,
        fileUrl,
        fileName,
        fileSize,
        fileType,
        replyToId
      });

      setUploading(false);

      if (sentMessage) {
        setMessages(prev => {
          if (prev.some(m => m.id === sentMessage.id)) {
            return prev;
          }
          const next = [...prev, sentMessage];
          const capped = next.slice(-MAX_CACHE);
          saveMessagesCache(selectedUser.id, capped);
          return capped;
        });
        setVisibleCount(prev => prev + 1);
        if (!hadConversation) {
          void loadConversations();
        }

        // Mark conversation as read when sending a message
        markAsRead(selectedUser.id);
      }

      setShowAttachmentMenu(false);
      scrollToBottom('auto');
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(content);
      setUploading(false);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      if (errorMessage.includes('File size exceeds') || errorMessage.includes('exceed')) {
        alert('❌ File too large! Maximum file size is 10MB per file.');
      } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        alert('❌ Upload limit reached. Please try again later or use smaller files.');
      } else {
        alert(`❌ Failed to send message: ${errorMessage}`);
      }
    }
  };

  const handleSendQuickEmoji = async () => {
    if (!selectedUser) return;
    if (quickEmojiSendingRef.current) return;
    quickEmojiSendingRef.current = true;

    const emojiToSend = activeEmoji || DEFAULT_CUSTOMIZATION.emoji;
    const hadConversation = conversations.some(conv => conv.participantId === selectedUser.id);
    ensureConversationReady();

    const tempId = 'tmp-' + Date.now().toString();
    const optimistic = {
      id: tempId,
      senderId: currentUser?.id || '',
      receiverId: selectedUser.id,
      content: emojiToSend,
      createdAt: new Date().toISOString(),
      reactions: [],
    } as unknown as Message;

    const seconds = Math.floor(Date.now() / 1000);
    const signature = `${currentUser?.id}|${selectedUser.id}|${emojiToSend}|${seconds}`;
    pendingLocalSendsRef.current.set(signature, tempId);

    setMessages(prev => {
      if (prev.some(m => m.id === tempId)) return prev;
      const next = [...prev, optimistic];
      const capped = next.slice(-MAX_CACHE);
      saveMessagesCache(selectedUser.id, capped);
      return capped;
    });

    setVisibleCount(prev => prev + 1);
    scrollToBottom('auto');

    try {
      const sent = await sendMessage({ receiverId: selectedUser.id, content: emojiToSend });
      if (sent) {
        let replaced = false;
        try {
          const serverSeconds = Math.floor(new Date(sent.createdAt).getTime() / 1000);
          const serverSig = `${sent.senderId}|${sent.receiverId}|${sent.content}|${serverSeconds}`;
          const mappedTemp = pendingLocalSendsRef.current.get(serverSig);
          if (mappedTemp) {
            setMessages(prev => prev.map(m => (m.id === mappedTemp ? sent : m)));
            pendingLocalSendsRef.current.delete(serverSig);
            replaced = true;
          }
        } catch {
          // ignore signature fallback
        }

        if (!replaced) {
          setMessages(prev => prev.map(m => (m.id === tempId ? sent : m)));
        }
        if (!hadConversation) {
          void loadConversations();
        }
        markAsRead(selectedUser.id);
      }
      scrollToBottom('auto');
    } catch (error) {
      console.error('Failed to send quick emoji:', error);
      setMessages(prev => {
        const updated = prev.filter(m => m.id !== tempId);
        saveMessagesCache(selectedUser.id, updated);
        return updated;
      });
      alert('Unable to send. Please try again.');
    } finally {
      quickEmojiSendingRef.current = false;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectUser = (user: User) => {
    if (selectedUser?.id === user.id) {
      return;
    }

    pendingUserIdRef.current = user.id;

    // Let useEffect handle the loading and initialLoadDone logic
    // Just clear the message view temporarily
    setMessages([]);

    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    closeConversationMenu();
    const params = new URLSearchParams(searchParams);
    params.set('userId', user.id);
    setSearchParams(params);
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

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    const validation = uploadService.validateVideo(file);
    if (!validation.valid) {
      alert(validation.error || 'Invalid video');
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setSelectedVideo(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setSelectedVideo(null);
    setVideoPreview('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      const validation = uploadService.validateFile(file);
      if (!validation.valid) {
        alert(`${file.name}: ${validation.error || 'Invalid file'}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      if (docFileInputRef.current) docFileInputRef.current.value = '';
      return;
    }

    // Clear other attachments if files are selected
    setSelectedImages([]);
    setImagePreviews([]);
    setSelectedVideo(null);
    setVideoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';

    // Limit to max 10 files per message
    const combined = [...selectedFiles, ...validFiles].slice(0, 10);
    setSelectedFiles(combined);
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

  const getPinnedPreview = useCallback((message: Message) => {
    if (message.unsent) return 'Message unsent';
    if (message.content) return message.content;
    if (message.imageUrl) return 'Sent photo';
    if (message.videoUrl) return 'Sent video';
    if (message.audioUrl) return 'Sent voice message';
    if (message.callType === 'voice') return 'Voice call';
    if (message.callType === 'video') return 'Video call';
    return 'Message';
  }, []);

  const pinnedMessages = useMemo((): Message[] => {
    return messages
      .filter(message => Boolean(message.pinnedAt))
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.pinnedAt ?? a.createdAt).getTime();
        const bTime = new Date(b.pinnedAt ?? b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [messages]);

  const quickActions = selectedUser
    ? [
        {
          id: 'profile',
          label: 'Profile',
          icon: UserIcon,
          onClick: handleConversationViewProfile
        },
        {
          id: 'mute',
          label: isMuted ? 'Unmute notifications' : 'Mute notifications',
          icon: isMuted ? Bell : BellOff,
          onClick: handleConversationToggleMute
        },
        {
          id: 'search',
          label: 'Search',
          icon: Search,
          onClick: handleInfoSearch
        }
      ]
    : [];

  const infoPanelSections = selectedUser
    ? [
        {
          id: 'pinned',
          title: 'Pinned messages',
          content: (
            <div className="space-y-3">
              {pinnedMessages.length === 0 ? (
                <p className="text-sm text-gray-500">No pinned messages.</p>
              ) : (
                pinnedMessages.map(message => (
                  <div
                    key={message.id}
                    className="flex items-start gap-2 rounded-lg border border-orange-100 bg-white px-3 py-2 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        highlightMessageById(message.id);
                        setShowInfoPanel(false);
                      }}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <p className="text-sm font-medium text-gray-700">
                        {message.senderId === currentUser?.id ? myNickname : displayName || 'User'}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">{getPinnedPreview(message)}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatTime(message.pinnedAt ?? message.createdAt)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnpinMessage(message)}
                      className="p-2 text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                      title="Unpin"
                    >
                      <PinOff className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )
        },
        {
          id: 'customization',
          title: 'Customize chat',
          content: (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Theme</p>
                  <p className="text-xs text-gray-500">{activeTheme.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setThemeDialogOpen(true)}
                  className="px-3 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer"
                  data-chat-accent-soft="true"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Quick emoji</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-base">{activeEmoji}</span>
                    <span>Current</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleEmojiDialogToggle(true)}
                  className="px-3 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer"
                  data-chat-accent-soft="true"
                >
                  Change
                </button>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-800">Nicknames</p>
                    <p className="text-xs text-gray-500">You: {myNickname}</p>
                    <p className="text-xs text-gray-500">Partner: {partnerNicknameLine}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNicknameDraft({
                        me: customization.nicknameMe ?? '',
                        them: customization.nicknameThem ?? ''
                      });
                      handleNicknameDialogToggle(true);
                    }}
                    className="px-3 py-1.5 text-sm font-medium rounded-full transition-colors cursor-pointer"
                    data-chat-accent-soft="true"
                  >
                    Edit
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleResetCustomization}
                  disabled={isCustomizationDefault}
                  className={clsx(
                    'w-full rounded-full px-3 py-2 text-sm transition-colors',
                    isCustomizationDefault
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                  )}
                >
                  Reset to default
                </button>
              </div>
            </div>
          )
        },
        {
          id: 'media',
          title: 'Media & files',
          content: (
            <div className="space-y-3 text-sm text-gray-600">
              <p>Quick access to photos, videos and files shared in this conversation.</p>
              <button
                type="button"
                onClick={() => handleComingSoon('Media library')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer"
              >
                Open gallery
              </button>
            </div>
          )
        },
        {
          id: 'privacy',
          title: 'Privacy & support',
          content: (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBlockUser}
                className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-orange-50 text-sm text-gray-700 transition-colors cursor-pointer"
              >
                {isBlocked ? 'Unblock user' : 'Block user'}
              </button>
              <button
                type="button"
                onClick={handleConversationDelete}
                className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-orange-50 text-sm text-gray-700 transition-colors cursor-pointer"
              >
                Delete conversation
              </button>
              <button
                type="button"
                onClick={() => handleComingSoon('Report an issue')}
                className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-orange-50 text-sm text-gray-700 transition-colors cursor-pointer"
              >
                Report an issue
              </button>
            </div>
          )
        }
      ]
    : [];

  const infoPanelContent = selectedUser
    ? (
        <>
          <div className="flex items-start justify-between px-6 py-5 border-b">
            <div className="space-y-3">
              <div className="relative inline-block">
                <Avatar src={selectedUser.avatar || undefined} name={displayName} className="w-20 h-20" size="xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="w-3.5 h-3.5 text-orange-500" />
                  <span>End-to-end encrypted</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowInfoPanel(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="px-6 py-4 border-b">
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map(action => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 px-3 py-3 rounded-2xl bg-gray-50 hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-gray-50">
            {infoPanelSections.map(section => {
              const open = infoSectionsOpen[section.id];
              return (
                <div key={section.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleInfoSection(section.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-orange-50 transition-colors cursor-pointer"
                  >
                    <span>{section.title}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[400px]' : 'max-h-0'}`}>
                    <div className={`px-4 pb-4 pt-1 space-y-3 ${open ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
                      {section.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )
    : null;

  const displayList = searchQuery.trim() ? searchResults : conversations;

  return (
    <div className="flex h-full bg-white overflow-hidden">
  {/* Sidebar - Conversations list */}
      <div className="w-96 border-r border-gray-200 flex flex-col h-full overflow-hidden">
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
                searchResults.map((user) => {
                  const userDisplayName = getDisplayNameForUser(user);
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        selectedUser?.id === user.id ? 'bg-orange-50' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div onClick={e => { e.stopPropagation(); navigateToProfile(user); }} className="cursor-pointer">
                        <Avatar src={user.avatar || undefined} name={userDisplayName} className="w-14 h-14" size="xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div onClick={e => { e.stopPropagation(); navigateToProfile(user); }} className="font-semibold text-gray-900 cursor-pointer">{userDisplayName}</div>
                        <div className="text-sm text-gray-500 truncate">@{user.username || user.email}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Hiá»ƒn thá»‹ conversations
                conversations.map((conv) => {
                  const participantDisplayName = getDisplayNameForUser(conv.participant);
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectUser(conv.participant)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors group ${
                        selectedUser?.id === conv.participant.id ? 'bg-orange-50' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div onClick={e => { e.stopPropagation(); }} className="cursor-pointer">
                        <Avatar src={conv.participant.avatar || undefined} name={participantDisplayName} className="w-14 h-14" size="xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div onClick={e => { e.stopPropagation(); }} className="font-semibold text-gray-900 cursor-pointer">{participantDisplayName}</div>
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
                          {conv.unreadCount > 0 && !conv.isMuted && (
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full min-w-5 text-center">
                              {conv.unreadCount}
                            </span>
                          )}
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-orange-50 cursor-pointer"
                            title="More options"
                            type="button"
                            data-conversation-menu-trigger
                            onClick={e => handleOpenConversationMenu(e, conv)}
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        {conversationMenuOpen && conversationMenuPosition && activeConversation &&
          createPortal(
            <div
              ref={conversationMenuRef}
              style={{
                position: 'fixed',
                top: `${conversationMenuPosition.top}px`,
                left: `${conversationMenuPosition.left}px`,
                zIndex: 9999
              }}
              className="bg-white rounded-xl border border-gray-200 shadow-xl w-56 overflow-hidden"
            >
              <button
                type="button"
                onClick={handleConversationViewProfile}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-orange-500" />
                <span>View Profile</span>
              </button>
              <button
                type="button"
                onClick={handleConversationToggleMute}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                {activeConversation.isMuted ? (
                  <>
                    <Bell className="w-4 h-4 text-orange-500" />
                    <span>Unmute Notifications</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 text-orange-500" />
                    <span>Mute Notifications</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleConversationBlock}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-orange-600 cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                <span>Block User</span>
              </button>
              <div className="border-t border-gray-200" />
              <button
                type="button"
                onClick={handleConversationDelete}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All Messages</span>
              </button>
            </div>,
            document.body
          )}
      </div>

      {/* Main chat area */}
  <div
        className={clsx('flex-1 flex flex-col h-full overflow-hidden', selectedUser ? 'chat-theme' : undefined)}
        style={selectedUser ? themeStyleVars : undefined}
      >
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white relative">
              <div className="flex items-center gap-3">
                <div className="relative cursor-pointer" onClick={() => navigateToProfile(selectedUser)}>
                  <Avatar src={selectedUser.avatar || undefined} name={displayName} className="w-10 h-10" size="md" />
                  {isSelectedOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div onClick={() => navigateToProfile(selectedUser)} className="cursor-pointer hover:opacity-80">
                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <span>{displayName}</span>
                    {isMuted && (
                      <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                        Muted
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {typingUsers.get(selectedUser.id)
                      ? 'Typing...'
                      : isSelectedOnline
                      ? 'Active now'
                      : 'Offline'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUser?.id !== selectedUser.id && (
                  <>
                    <button
                      onClick={handleStartVoiceCall}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                      title="Voice call"
                    >
                      <Phone className="w-5 h-5 text-orange-500" />
                    </button>
                    <button
                      onClick={handleStartVideoCall}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                      title="Video call"
                    >
                      <Video className="w-5 h-5 text-orange-500" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowInfoPanel((v) => !v)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  title="Info"
                >
                  <Info className="w-5 h-5 text-orange-500" />
                </button>
              </div>
              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute top-16 left-4 z-40 bg-white rounded-xl border shadow-lg w-56 overflow-hidden"
                >
                  {currentUser?.id !== selectedUser.id && (
                    <>
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.open(`/profile/${selectedUser.username || selectedUser.id}`, '_self')}
                      >
                        <UserIcon className="w-4 h-4 text-orange-500" />
                        <span>View Profile</span>
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                        onClick={handleToggleMute}
                      >
                        {isMuted ? (
                          <>
                            <Bell className="w-4 h-4 text-orange-500" />
                            <span>Unmute Notifications</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="w-4 h-4 text-orange-500" />
                            <span>Mute Notifications</span>
                          </>
                        )}
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
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-red-600 cursor-pointer"
                    onClick={handleDeleteLocal}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All Messages</span>
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="relative flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
            >
              {!initialLoadDone || (loading && messages.length === 0) ? (
                <ChatMessageSkeleton />
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Avatar src={selectedUser.avatar || undefined} name={displayName} className="w-20 h-20 mb-3" size="xl" />
                  <p className="font-semibold text-lg">{displayName}</p>
                  <p className="text-sm">Start the conversation</p>
                </div>
              ) : (
                messages
                  .slice(Math.max(messages.length - visibleCount, 0))
                  .map((message, index, arr) => {
                    if (message.isSystem) {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full shadow-sm">
                            {message.content}
                          </div>
                        </div>
                      );
                    }
                    const isOwn = message.senderId === currentUser?.id;
                    const showAvatar = !isOwn && (index === arr.length - 1 || arr[index + 1]?.senderId !== message.senderId);

                    return (
                      <div
                        key={message.id}
                        id={`message-${message.id}`}
                        className={`flex gap-2 group items-center ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={isOwn ? 'w-0' : 'w-8'}>
                          {showAvatar && (
                            <Avatar src={selectedUser.avatar || undefined} name={displayName} className="w-8 h-8" size="sm" />
                          )}
                        </div>
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[60%] relative`}>
                          {showEmojiReactions === message.id && (
                            <div
                              ref={emojiReactionsRef}
                              onClick={e => e.stopPropagation()}
                              className="mb-1 bg-white border border-gray-200 rounded-full shadow-lg px-2 py-2 z-40 flex items-center gap-1"
                            >
                              {quickReactions.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={async () => {
                                    // optimistic + pending guard
                                    markPendingReactionAction(message.id);
                                    const tempReaction = {
                                      id: Date.now().toString(),
                                      userId: currentUser?.id || '',
                                      emoji,
                                      createdAt: new Date().toISOString()
                                    };

                                    setMessages(prev =>
                                      prev.map(msg =>
                                        msg.id === message.id
                                          ? {
                                              ...msg,
                                              reactions: [
                                                ...(msg.reactions || []).filter(r => r.userId !== currentUser?.id),
                                                tempReaction
                                              ]
                                            }
                                          : msg
                                      )
                                    );
                                    setShowEmojiReactions(null);

                                    try {
                                      await chatService.addReaction(message.id, emoji);
                                      // server echo will be ignored while pending
                                    } catch (error) {
                                      console.error('Failed to add reaction:', error);
                                      // revert optimistic reaction
                                      setMessages(prev =>
                                        prev.map(msg =>
                                          msg.id === message.id
                                            ? { ...msg, reactions: (msg.reactions || []).filter(r => r.id !== tempReaction.id) }
                                            : msg
                                        )
                                      );
                                      alert('Unable to add reaction. Please try again.');
                                    }
                                  }}
                                  className="p-1.5 hover:bg-gray-100 rounded-full cursor-pointer transition-transform hover:scale-125"
                                >
                                  <span className="text-xl">{emoji}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div
                            className={clsx(
                              'rounded-2xl',
                              message.imageUrl || message.videoUrl || message.audioUrl ? '' : 'px-4 py-2',
                              !isOwn && 'shadow-sm',
                              message.unsent && 'opacity-60 italic'
                            )}
                            data-chat-own-bubble={isOwn ? 'true' : undefined}
                            data-chat-other-bubble={!isOwn ? 'true' : undefined}
                          >
                            {/* Pinned badge */}
                            {message.pinnedAt && (
                              <div
                                className="absolute -top-2 right-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shadow-sm pointer-events-none"
                                data-chat-badge="true"
                              >
                                <Pin className="w-3 h-3" />
                                <span>Pinned</span>
                              </div>
                            )}
                            {message.unsent ? (
                              <p className={`text-sm italic ${isOwn ? 'text-white/90' : 'text-gray-600'}`}>Message unsent</p>
                            ) : (
                              <>
                                {message.replyTo && (
                                  <div
                                    onClick={() => {
                                      if (message.replyTo?.id) {
                                        const element = document.getElementById(`message-${message.replyTo.id}`);
                                        if (element) {
                                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          element.classList.add('highlight-message');
                                          window.setTimeout(() => {
                                            element.classList.remove('highlight-message');
                                          }, 2000);
                                        }
                                      }
                                    }}
                                    className={`px-3 py-2 border-l-4 ${
                                      isOwn
                                        ? 'border-orange-300 bg-orange-400/30 hover:bg-orange-400/50'
                                        : 'border-gray-400 bg-gray-200/50 hover:bg-gray-300/70'
                                    } mx-2 mt-2 rounded cursor-pointer transition-colors`}
                                  >
                                    <p className={`text-xs font-semibold ${isOwn ? 'text-orange-100' : 'text-gray-700'}`}>
                                      {message.replyTo.sender?.name || 'Unknown'}
                                    </p>
                                    <p className={`text-xs truncate ${isOwn ? 'text-orange-50' : 'text-gray-600'}`}>
                                      {message.replyTo.audioUrl
                                        ? '🎤 Voice message'
                                        : message.replyTo.videoUrl
                                        ? '🎥 Video'
                                        : message.replyTo.imageUrl
                                        ? '📷 Photo'
                                        : message.replyTo.fileUrl
                                        ? `📎 ${message.replyTo.fileName || 'File'}`
                                        : message.replyTo.content}
                                    </p>
                                  </div>
                                )}

                                {(() => {
                                  const imgs = (message.imageUrl || '')
                                    .split(',')
                                    .map(s => s.trim())
                                    .filter(Boolean);
                                  if (imgs.length > 0) {
                                    return (
                                      <div className={imgs.length === 1 ? '' : 'grid grid-cols-2 gap-1 p-1'}>
                                        {imgs.map((url, i) => (
                                          <div key={i} className={`overflow-hidden ${imgs.length === 1 ? '' : 'aspect-square'} rounded-2xl`}>
                                            <img
                                              src={url}
                                              alt={`Shared image ${i + 1}`}
                                              className={`object-cover cursor-pointer ${
                                                imgs.length === 1 ? 'max-w-full max-h-96 rounded-2xl' : 'w-full h-full'
                                              }`}
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

                                {message.videoUrl && (
                                  <div className="rounded-2xl overflow-hidden">
                                    <video src={message.videoUrl} className="max-w-full max-h-72 w-full" controls />
                                  </div>
                                )}

                                {message.audioUrl && <AudioPlayer audioUrl={message.audioUrl} isOwn={isOwn} />}

                                {/* File Attachments */}
                                {message.fileUrl && (() => {
                                  const fileUrls = message.fileUrl.split(',').map(s => s.trim()).filter(Boolean);
                                  const fileNames = (message.fileName || '').split(',').map(s => s.trim()).filter(Boolean);
                                  
                                  return (
                                    <div className={`${fileUrls.length > 1 ? 'space-y-1' : ''}`}>
                                      {fileUrls.map((url, idx) => (
                                        <a
                                          key={idx}
                                          href={url}
                                          download={fileNames[idx] || 'file'}
                                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                            isOwn ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                                          }`}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            // Download file with proper name
                                            fetch(url)
                                              .then(response => response.blob())
                                              .then(blob => {
                                                const downloadUrl = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = downloadUrl;
                                                a.download = fileNames[idx] || 'file';
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(downloadUrl);
                                                document.body.removeChild(a);
                                              })
                                              .catch(err => console.error('Download failed:', err));
                                          }}
                                        >
                                          <Paperclip size={16} className={isOwn ? 'text-white' : 'text-gray-600'} />
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-gray-900'}`}>
                                              {fileNames[idx] || 'file'}
                                            </p>
                                            {message.fileSize && fileUrls.length === 1 && (
                                              <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                                {message.fileSize >= 1024 * 1024
                                                  ? `${(message.fileSize / (1024 * 1024)).toFixed(2)} MB`
                                                  : `${(message.fileSize / 1024).toFixed(2)} KB`}
                                              </p>
                                            )}
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {message.content &&
                                  !['📷 Photo', '🎥 Video', '🎤 Voice message', '📎 File'].includes(message.content) && (
                                    <p
                                      className={`text-sm wrap-break-word ${
                                        message.imageUrl || message.videoUrl || message.audioUrl || message.fileUrl ? 'px-3 py-2' : ''
                                      }`}
                                    >
                                      {message.content}
                                    </p>
                                  )}
                              </>
                            )}
                          </div>

                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex items-center gap-0.5 mt-1 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm">
                              {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
                                const count = message.reactions?.filter(r => r.emoji === emoji).length || 0;
                                const hasMyReaction = message.reactions?.some(
                                  r => r.emoji === emoji && r.userId === currentUser?.id
                                );
                                return (
                                  <button
                                    key={emoji}
                                      onClick={async () => {
                                        // optimistic + pending guard
                                        markPendingReactionAction(message.id);

                                        if (hasMyReaction) {
                                          // optimistic remove
                                          const prevReactions = message.reactions || [];
                                          setMessages(prev =>
                                            prev.map(msg =>
                                              msg.id === message.id ? { ...msg, reactions: (msg.reactions || []).filter(r => r.userId !== currentUser?.id) } : msg
                                            )
                                          );
                                          try {
                                            await chatService.removeReaction(message.id);
                                          } catch (error) {
                                            console.error('Failed to remove reaction:', error);
                                            // revert
                                            setMessages(prev =>
                                              prev.map(msg =>
                                                msg.id === message.id ? { ...msg, reactions: prevReactions } : msg
                                              )
                                            );
                                            alert('Unable to remove reaction. Please try again.');
                                          }
                                        } else {
                                          const tempReaction = {
                                            id: Date.now().toString(),
                                            userId: currentUser?.id || '',
                                            emoji,
                                            createdAt: new Date().toISOString()
                                          };
                                          // optimistic add
                                          setMessages(prev =>
                                            prev.map(msg =>
                                              msg.id === message.id
                                                ? { ...msg, reactions: [ ...(msg.reactions || []).filter(r => r.userId !== currentUser?.id), tempReaction ] }
                                                : msg
                                            )
                                          );
                                          try {
                                            await chatService.addReaction(message.id, emoji);
                                          } catch (error) {
                                            console.error('Failed to add reaction:', error);
                                            // revert optimistic
                                            setMessages(prev =>
                                              prev.map(msg =>
                                                msg.id === message.id ? { ...msg, reactions: (msg.reactions || []).filter(r => r.id !== tempReaction.id) } : msg
                                              )
                                            );
                                            alert('Unable to add reaction. Please try again.');
                                          }
                                        }
                                      }}
                                    className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full cursor-pointer transition-colors ${
                                      hasMyReaction ? 'bg-orange-100' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <span className="text-sm">{emoji}</span>
                                    {count > 1 && <span className="text-xs text-gray-600">{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {showAvatar && (
                            <span className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-1">
                              {formatTime(message.createdAt)}
                            </span>
                          )}
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

                        {!message.unsent && showEmojiReactions !== message.id && (
                          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1">
                            <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-md px-1 py-1">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setShowEmojiReactions(showEmojiReactions === message.id ? null : message.id);
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                                title="React"
                              >
                                <span className="text-sm">❤️</span>
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setReplyingTo(message);
                                  setMessageMenuOpen(null);
                                  setShowEmojiReactions(null);
                                  inputRef.current?.focus();
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                                title="Reply"
                              >
                                <Reply size={14} className="text-gray-600" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuPosition({
                                    top: rect.bottom + window.scrollY + 6,
                                    left: isOwn ? rect.right + window.scrollX - 160 : rect.left + window.scrollX
                                  });
                                  setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id);
                                  setShowEmojiReactions(null);
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                                title="More"
                              >
                                <MoreVertical size={14} className="text-gray-600" />
                              </button>
                            </div>
                          </div>
                        )}

                        {message.unsent && (
                          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1">
                            <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-md px-1 py-1">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuPosition({
                                    top: rect.bottom + window.scrollY + 6,
                                    left: isOwn ? rect.right + window.scrollX - 160 : rect.left + window.scrollX
                                  });
                                  setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id);
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
                                title="More"
                              >
                                <MoreVertical size={14} className="text-gray-600" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
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
              {videoPreview && (
                <div className="mb-2">
                  <div className="relative inline-block max-w-md">
                    <video src={videoPreview} className="max-h-48 rounded-lg border-2 border-orange-500 w-full" controls />
                    <button
                      onClick={handleRemoveVideo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div className={`mb-2 grid gap-2 ${imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-4'}`}>
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative inline-block">
                      <img
                        src={preview}
                        alt={`Preview ${idx + 1}`}
                        className="max-h-40 rounded-lg border-2 border-orange-500 object-cover w-full"
                      />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* File Previews */}
              {selectedFiles.length > 0 && (
                <div className="mb-2">
                  <div className={`grid gap-2 ${selectedFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="relative">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border-2 border-orange-500">
                          <Paperclip size={20} className="text-orange-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {file.size >= 1024 * 1024
                                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                                : `${(file.size / 1024).toFixed(2)} KB`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newFiles = [...selectedFiles];
                            newFiles.splice(idx, 1);
                            setSelectedFiles(newFiles);
                            if (newFiles.length === 0 && docFileInputRef.current) {
                              docFileInputRef.current.value = '';
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                          type="button"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isBlocked || hasBlocked ? (
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  {isBlocked ? (
                    <>
                      <p className="text-gray-700 mb-2">You blocked {displayName}</p>
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
                <>
                  {replyingTo && (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg mb-2 flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Reply size={14} className="text-gray-500 shrink-0" />
                          <p className="text-xs text-gray-600 font-medium">
                            Replying to {replyingTo.sender?.name || 'Unknown'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5 ml-5">
                          {replyingTo.audioUrl
                            ? '🎤 Voice message'
                            : replyingTo.videoUrl
                            ? '🎥 Video'
                            : replyingTo.imageUrl
                            ? '📷 Photo'
                            : replyingTo.fileUrl
                            ? `📎 ${replyingTo.fileName || 'File'}`
                            : replyingTo.content}
                        </p>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1">
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    <input
                      ref={docFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                      multiple
                      onChange={handleDocumentSelect}
                      className="hidden"
                    />

                    <div className="relative" ref={attachmentMenuRef}>
                      <button
                        onClick={() => setShowAttachmentMenu(v => !v)}
                        className="p-2 rounded-full transition-colors cursor-pointer"
                        type="button"
                        disabled={uploading}
                        data-chat-icon-button={!uploading ? 'true' : undefined}
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      {showAttachmentMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-40 z-40">
                          <button
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                          >
                            <ImageIcon size={16} data-chat-accent-text="true" />
                            <span>Photo</span>
                          </button>
                          <button
                            onClick={() => {
                              videoInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                          >
                            <Video size={16} data-chat-accent-text="true" />
                            <span>Video</span>
                          </button>
                          <button
                            onClick={() => {
                              docFileInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                          >
                            <Paperclip size={16} className="text-blue-500" />
                            <span>File</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onMouseDown={async e => {
                        e.preventDefault();
                        setRecording(true);
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                          mediaStreamRef.current = stream;

                          const recorder = new RecordRTC(stream, {
                            type: 'audio',
                            mimeType: 'audio/webm',
                            recorderType: RecordRTC.StereoAudioRecorder,
                            numberOfAudioChannels: 1,
                            desiredSampRate: 16000
                          });

                          recorderRef.current = recorder;
                          recorder.startRecording();
                        } catch (err) {
                          setRecording(false);
                          console.error('Microphone access error:', err);
                          alert('Unable to access microphone! Please allow microphone permission.');
                        }
                      }}
                      onMouseUp={async () => {
                        const recorderInstance = recorderRef.current;
                        if (recorderInstance && recording && selectedUser) {
                          recorderInstance.stopRecording(async () => {
                            const blob = recorderInstance.getBlob();

                            if (mediaStreamRef.current) {
                              mediaStreamRef.current.getTracks().forEach(track => track.stop());
                              mediaStreamRef.current = null;
                            }

                            setRecording(false);

                            try {
                              setUploading(true);
                              const audioUrl = await uploadService.uploadAudio(blob);

                              const sentMessage = await sendMessage({
                                receiverId: selectedUser.id,
                                content: '🎤 Voice message',
                                audioUrl
                              });

                              if (sentMessage) {
                                setMessages(prev => {
                                  if (prev.some(m => m.id === sentMessage.id)) {
                                    return prev;
                                  }
                                  const next = [...prev, sentMessage];
                                  const capped = next.slice(-MAX_CACHE);
                                  saveMessagesCache(selectedUser.id, capped);
                                  return capped;
                                });
                                setVisibleCount(prev => prev + 1);

                                // Mark conversation as read when sending a message
                                markAsRead(selectedUser.id);
                              }

                              scrollToBottom('auto');
                              setUploading(false);
                            } catch (error) {
                              console.error('Failed to send voice message:', error);
                              alert('Unable to send voice message. Please try again!');
                              setUploading(false);
                            }
                          });
                        }
                      }}
                      onMouseLeave={async () => {
                        const recorderInstance = recorderRef.current;
                        if (recorderInstance && recording && selectedUser) {
                          recorderInstance.stopRecording(async () => {
                            const blob = recorderInstance.getBlob();

                            if (mediaStreamRef.current) {
                              mediaStreamRef.current.getTracks().forEach(track => track.stop());
                              mediaStreamRef.current = null;
                            }

                            setRecording(false);

                            try {
                              setUploading(true);
                              const audioUrl = await uploadService.uploadAudio(blob);

                              const sentMessage = await sendMessage({
                                receiverId: selectedUser.id,
                                content: '🎤 Voice message',
                                audioUrl
                              });

                              if (sentMessage) {
                                setMessages(prev => {
                                  if (prev.some(m => m.id === sentMessage.id)) {
                                    return prev;
                                  }
                                  const next = [...prev, sentMessage];
                                  const capped = next.slice(-MAX_CACHE);
                                  saveMessagesCache(selectedUser.id, capped);
                                  return capped;
                                });
                                setVisibleCount(prev => prev + 1);
                              }

                              scrollToBottom('auto');
                              setUploading(false);
                            } catch (error) {
                              console.error('Failed to send voice message:', error);
                              setUploading(false);
                            }
                          });
                        }
                      }}
                      className={clsx(
                        'p-2 rounded-full transition-all cursor-pointer',
                        recording
                          ? 'bg-red-500 text-white animate-pulse'
                          : uploading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : undefined
                      )}
                      type="button"
                      disabled={uploading}
                      data-chat-icon-button={!recording && !uploading ? 'true' : undefined}
                      title={recording ? 'Recording... Release to send' : uploading ? 'Uploading...' : 'Hold to record'}
                    >
                      {uploading && !recording ? (
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-3 flex items-center">
                      <textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={e => {
                          const value = e.target.value;
                          setNewMessage(value);
                          if (value.length > 0) {
                            handleTypingChange(true);
                            if (typingTimeoutRef.current) {
                              clearTimeout(typingTimeoutRef.current);
                            }
                            typingTimeoutRef.current = window.setTimeout(() => handleTypingChange(false), 2000);
                          } else {
                            handleTypingChange(false);
                          }
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Aa"
                        rows={1}
                        className="flex-1 bg-transparent resize-none outline-none text-sm max-h-32"
                        style={{ minHeight: '24px' }}
                      />
                      <button
                        ref={emojiButtonRef}
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className="p-1 rounded-full transition-colors cursor-pointer"
                        data-chat-icon-button="true"
                        title="Add emoji"
                        type="button"
                      >
                        <Smile className="w-6 h-6" />
                      </button>
                    </div>

                    {(!newMessage.trim() && selectedImages.length === 0 && !selectedVideo && selectedFiles.length === 0) ? (
                      <div className="relative">
                        <button
                          onMouseDown={e => {
                            e.preventDefault();
                            if (uploading || quickEmojiSendingRef.current) return;
                            setQuickEmojiPressing(true);
                            quickEmojiExpandTimerRef.current = window.setTimeout(() => setQuickEmojiExpanded(true), 300);
                          }}
                          onMouseUp={async e => {
                            e.preventDefault();
                            if (quickEmojiExpandTimerRef.current) {
                              clearTimeout(quickEmojiExpandTimerRef.current);
                              quickEmojiExpandTimerRef.current = null;
                            }
                            if (quickEmojiSendingRef.current) {
                              setQuickEmojiExpanded(false);
                              setQuickEmojiPressing(false);
                              return;
                            }
                            try {
                              await handleSendQuickEmoji();
                            } finally {
                              setQuickEmojiExpanded(false);
                              setQuickEmojiPressing(false);
                            }
                          }}
                          onMouseLeave={() => {
                            if (quickEmojiExpandTimerRef.current) {
                              clearTimeout(quickEmojiExpandTimerRef.current);
                              quickEmojiExpandTimerRef.current = null;
                            }
                            setQuickEmojiExpanded(false);
                            setQuickEmojiPressing(false);
                          }}
                          disabled={uploading}
                          className={clsx(
                            'p-3 rounded-full transition-transform duration-150 cursor-pointer',
                            uploading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'text-white'
                          )}
                          data-chat-accent-bg={!uploading ? 'true' : undefined}
                          title={`Send ${activeEmoji}`}
                        >
                          {uploading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span
                              className={clsx(
                                'inline-flex items-center justify-center text-2xl leading-none transition-transform',
                                quickEmojiPressing ? 'scale-110' : 'scale-100'
                              )}
                            >
                              {activeEmoji}
                            </span>
                          )}
                        </button>

                        {quickEmojiExpanded && (
                          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                            <div
                              className="w-14 h-14 flex items-center justify-center rounded-full shadow-xl transform motion-reduce:transform-none animate-scale-up"
                              style={{
                                backgroundColor: activeTheme.accentSoft,
                                color: activeTheme.accent,
                                border: `2px solid ${activeTheme.accent}`
                              }}
                            >
                              <span className="text-3xl leading-none">{activeEmoji}</span>
                            </div>
                          </div>
                        )}
                        <style>{`
                          @keyframes scale-up { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
                          .animate-scale-up { animation: scale-up 120ms ease-out forwards; }
                        `}</style>
                      </div>
                    ) : (
                      <button
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && selectedImages.length === 0 && !selectedVideo && selectedFiles.length === 0) || uploading}
                        className={clsx(
                          'p-3 rounded-full transition-colors cursor-pointer',
                          (newMessage.trim() || selectedImages.length > 0 || selectedVideo || selectedFiles.length > 0) && !uploading
                            ? 'text-white'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        )}
                        data-chat-accent-bg={(newMessage.trim() || selectedImages.length > 0 || selectedVideo || selectedFiles.length > 0) && !uploading ? 'true' : undefined}
                        title="Send"
                      >
                        {uploading && !recording ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
              <ImageViewer
                images={viewerImages}
                initialIndex={viewerIndex}
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
              />
            </div>

            {showInfoPanel && selectedUser &&
              createPortal(
                <div className="fixed inset-0 z-50 lg:hidden">
                  <div
                    className="absolute inset-0 bg-black/40 cursor-pointer"
                    onClick={() => setShowInfoPanel(false)}
                  />
                  <aside className="absolute top-0 right-0 bottom-0 w-full sm:w-[360px] bg-white shadow-2xl flex flex-col">
                    {infoPanelContent}
                  </aside>
                </div>,
                document.body
              )}

            {showEmojiPicker &&
              createPortal(
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowEmojiPicker(false)}
                />,
                document.body
              )}

            {showEmojiPicker &&
              createPortal(
                <div style={emojiPickerStyle || undefined} className="z-50">
                  <EmojiPicker
                    onSelect={emoji => {
                      setNewMessage(prev => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>,
                document.body
              )}

            {messageMenuOpen && menuPosition &&
              createPortal(
                <div
                  ref={messageMenuRef}
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'fixed',
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                    zIndex: 9999
                  }}
                  className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-40"
                >
                  {(() => {
                    const msg = messages.find(m => m.id === messageMenuOpen);
                    if (msg && !msg.unsent && msg.content) {
                      return (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content || '');
                            setMessageMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                        >
                          <Copy size={14} />
                          <span>Copy</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                  {(() => {
                    const msg = messages.find(m => m.id === messageMenuOpen);
                    if (!msg || msg.unsent) return null;

                    // Show Pin or Unpin depending on message state
                    if (msg.pinnedAt) {
                      return (
                        <>
                          <div className="border-t border-gray-200 my-1" />
                          <button
                            onClick={() => {
                              handleUnpinMessage(msg);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                          >
                            <PinOff size={14} />
                            <span>Unpin</span>
                          </button>
                        </>
                      );
                    }

                    return (
                      <>
                        <div className="border-t border-gray-200 my-1" />
                        <button
                          onClick={() => {
                            handlePinMessage(msg);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                        >
                          <Pin size={14} />
                          <span>Pin</span>
                        </button>
                      </>
                    );
                  })()}
                  {(() => {
                    const msg = messages.find(m => m.id === messageMenuOpen);
                    return msg && !msg.unsent && msg.senderId === currentUser?.id;
                  })() && (
                    <>
                      <div className="border-t border-gray-200 my-1" />
                      <button
                        onClick={async () => {
                          try {
                            await chatService.unsendMessage(messageMenuOpen);
                            setMessages(prev => {
                              const updated = prev.map(msg => (msg.id === messageMenuOpen ? { ...msg, unsent: true } : msg));
                              if (selectedUser) {
                                saveMessagesCache(selectedUser.id, updated);
                              }
                              return updated;
                            });
                            setMessageMenuOpen(null);
                          } catch (error) {
                            console.error('Error unsending message:', error);
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-red-600"
                      >
                        <Ban size={14} />
                        <span>Unsend</span>
                      </button>
                    </>
                  )}
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={async () => {
                      try {
                        await chatService.deleteMessage(messageMenuOpen);
                        setMessages(prev => {
                          const updated = prev.filter(msg => msg.id !== messageMenuOpen);
                          if (selectedUser) {
                            saveMessagesCache(selectedUser.id, updated);
                          }
                          return updated;
                        });
                        setMessageMenuOpen(null);
                      } catch (error) {
                        console.error('Error deleting message:', error);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-red-600"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>,
                document.body
              )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-xl font-semibold mb-2">Your Messages</p>
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
      {showInfoPanel && selectedUser && (
        <aside className="hidden lg:flex w-[360px] flex-col h-full border-l border-gray-200 bg-white shadow-lg animate-in slide-in-from-right">
          {infoPanelContent}
        </aside>
      )}

      <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a theme</DialogTitle>
            <DialogDescription>Select a color style for this conversation.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CHAT_THEMES.map(theme => {
              const isActive = theme.id === customization.themeId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeSelect(theme.id)}
                  className={clsx(
                    'w-full rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer',
                    isActive ? 'shadow-lg' : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'
                  )}
                  style={isActive ? { borderColor: theme.accent, boxShadow: `0 0 0 2px ${theme.accent}33` } : undefined}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{theme.name}</p>
                      <p className="text-xs text-gray-500">{isActive ? 'Currently applied' : 'Tap to switch'}</p>
                    </div>
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>
                  <div
                    className={clsx(
                      'h-12 w-full rounded-xl bg-linear-to-r shadow-inner',
                      theme.previewGradient
                    )}
                  />
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setThemeDialogOpen(false)}
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emojiDialogOpen} onOpenChange={handleEmojiDialogToggle}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pick a quick emoji</DialogTitle>
            <DialogDescription>Choose the emoji you want to send with a single tap.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-2">
            {emojiOptions.map(emoji => {
              const isActive = emoji === activeEmoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className={clsx(
                    'flex items-center justify-center rounded-xl border text-2xl py-2 transition-colors cursor-pointer',
                    isActive ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-100'
                  )}
                  aria-pressed={isActive}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Use your own emoji</p>
            <Input
              value={customEmojiInput}
              onChange={e => handleCustomEmojiInputChange(e.target.value)}
              placeholder={activeEmoji}
              maxLength={4}
            />
            <p className="text-xs text-gray-500">Enter up to two emoji characters.</p>
          </div>
          <DialogFooter className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleEmojiDialogToggle(false)}
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCustomEmoji}
              disabled={!customEmojiInput.trim()}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
                customEmojiInput.trim()
                  ? 'text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
              data-chat-accent-bg={customEmojiInput.trim() ? 'true' : undefined}
            >
              Use this emoji
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nicknameDialogOpen} onOpenChange={handleNicknameDialogToggle}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit nicknames</DialogTitle>
            <DialogDescription>Personalize how names appear in this chat.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="nickname-me">Your nickname</label>
              <Input
                id="nickname-me"
                value={nicknameDraft.me}
                onChange={e => setNicknameDraft(draft => ({ ...draft, me: e.target.value }))}
                placeholder={currentUser?.name || 'You'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700" htmlFor="nickname-them">Their nickname</label>
              <Input
                id="nickname-them"
                value={nicknameDraft.them}
                onChange={e => setNicknameDraft(draft => ({ ...draft, them: e.target.value }))}
                placeholder={selectedUser?.name || 'Friend'}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => handleNicknameDialogToggle(false)}
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNicknameSave}
              className="rounded-full px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer"
              data-chat-accent-bg="true"
            >
              Save changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}










