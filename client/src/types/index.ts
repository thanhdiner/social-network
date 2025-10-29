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
  postId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface CreateCommentData {
  content: string;
  postId: string;
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
export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  sender?: User;
}

export interface SendMessageData {
  content: string;
  receiverId: string;
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
