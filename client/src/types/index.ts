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
  imageUrl?: string; // URL cá»§a áº£nh Ä‘Ã­nh kÃ¨m
  postId: string;
  userId: string;
  imageIndex?: number; // Index cá»§a áº£nh trong post (null = comment chung)
  parentId?: string; // ID cá»§a comment cha (null = comment gá»‘c)
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
  parentId?: string; // ID cá»§a comment cha náº¿u lÃ  reply
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
  senderId: string;
  receiverId: string;
  replyToId?: string;
  read: boolean;
  deliveredAt?: string;
  readAt?: string;
  unsent?: boolean;
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
    senderId: string;
    sender?: {
      id: string;
      name: string;
      username: string;
    };
  };
}

export interface SendMessageData {
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
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
  updatedAt: string;
}

// Notification Types
export type NotificationType = 'like' | 'comment' | 'follow' | 'message';

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  userId: string;
  read: boolean;
  createdAt: string;
}

