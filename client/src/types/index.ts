// API Error Response
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  isOnline?: boolean;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface UserResponse {
  userId: string;
  email: string;
}

// Post Types
export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  comments?: Comment[];
  likes?: Like[];
  sharedPostId?: string;
  sharedPost?: Post;
  sharedReelId?: string;
  sharedReel?: Reel;
  isLiked?: boolean;
  reactionType?: ReactionType | null;
  isSaved?: boolean;
  _count?: {
    comments: number;
    likes: number;
    shares: number;
  };
}

export interface CreatePostData {
  content: string;
  imageUrl?: string;
}

// Comment Types
export interface Comment {
  id: string;
  content: string;
  imageUrl?: string; // URL của ảnh đính kèm
  postId: string;
  userId: string;
  imageIndex?: number; // Index của ảnh trong post (null = comment chung)
  parentId?: string; // ID của comment cha (null = comment gốc)
  createdAt: string;
  updatedAt: string;
  user?: User;
  replies?: Comment[]; // Danh sÃ¡ch reply
  likes?: CommentLike[]; // Danh sÃ¡ch likes
  _count?: {
    likes: number;
    replies: number;
  };
}

export interface CreateCommentData {
  content: string;
  imageUrl?: string;
  postId?: string;
  imageIndex?: number;
  parentId?: string; // ID của comment cha nếu là reply
}

export interface CommentLike {
  id: string;
  commentId: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
  user?: User;
}

// Like Types
export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface Like {
  id: string;
  postId: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
  user?: User;
}

// Follow Types
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  follower?: User;
  following?: User;
}

// Message Types
export interface MessageReaction {
  id: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  senderId: string;
  receiverId: string;
  replyToId?: string;
  read: boolean;
  deliveredAt?: string;
  readAt?: string;
  unsent?: boolean;
  callType?: 'voice' | 'video';
  callDuration?: number;
  callStatus?: 'completed' | 'missed' | 'rejected' | 'no-answer';
  pinnedById?: string | null;
  pinnedAt?: string | null;
  createdAt: string;
  sender?: User;
  receiver?: User;
  reactions?: MessageReaction[];
  replyTo?: {
    id: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    senderId: string;
    sender?: {
      id: string;
      name: string;
      username: string;
    };
  };
  pinnedBy?: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
  } | null;
  isSystem?: boolean;
}

export interface SendMessageData {
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  receiverId: string;
  replyToId?: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  participantId: string;
  participant: User;
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  updatedAt: string;
}

export interface ConversationCustomization {
  themeId: string;
  emoji: string;
  nicknameMe?: string | null;
  nicknameThem?: string | null;
  updatedAt?: string;
  updatedById?: string | null;
  changeSummary?: string;
}

// Notification Types
export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'unfollow'
  | 'message'
  | 'share'
  | 'announcement';

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  userId: string;
  read: boolean;
  createdAt: string;
}

// Reel Types
export interface ReelStats {
  likes: number;
  comments: number;
  shares: number;
}

export interface ReelSummary {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  shareContent?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  _count?: ReelStats;
}

export interface Reel extends ReelSummary {
  views: number;
  isLiked?: boolean;
  sharedFrom?: ReelSummary | null;
}

export interface CreateReelData {
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
}

export interface UpdateReelData {
  description?: string;
}

export interface ReelComment {
  id: string;
  content: string;
  reelId: string;
  userId: string;
  parentId?: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  replies?: ReelComment[];
  _count?: {
    replies: number;
  };
}

export interface CreateReelCommentData {
  content: string;
  parentId?: string;
  imageUrl?: string;
}
