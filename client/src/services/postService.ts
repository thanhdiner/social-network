import api from './api';

export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  _count: {
    comments: number;
    likes: number;
  };
  isLiked?: boolean;
}

export interface CreatePostData {
  content: string;
  imageUrl?: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Photo {
  imageUrl: string;
  postId: string;
  createdAt: string;
}

export interface PhotosResponse {
  photos: Photo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class PostService {
  /**
   * Create a new post
   */
  async createPost(data: CreatePostData): Promise<Post> {
    const response = await api.post<Post>('/posts', data);
    return response.data;
  }

  /**
   * Get all posts (feed)
   */
  async getAllPosts(page = 1, limit = 10): Promise<PostsResponse> {
    const response = await api.get<PostsResponse>('/posts', {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Get posts by user ID
   */
  async getUserPosts(userId: string, currentUserId?: string, page = 1, limit = 10): Promise<PostsResponse> {
    const response = await api.get<PostsResponse>(`/posts/user/${userId}`, {
      params: { currentUserId, page, limit },
    });
    return response.data;
  }

  /**
   * Get a single post
   */
  async getPost(postId: string): Promise<Post> {
    const response = await api.get<Post>(`/posts/${postId}`);
    return response.data;
  }

  /**
   * Toggle like on a post
   */
  async toggleLike(postId: string): Promise<{ liked: boolean; message: string }> {
    const response = await api.post<{ liked: boolean; message: string }>(`/posts/${postId}/like`);
    return response.data;
  }

  /**
   * Update a post
   */
  async updatePost(postId: string, data: CreatePostData): Promise<Post> {
    const response = await api.patch<Post>(`/posts/${postId}`, data);
    return response.data;
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    await api.delete(`/posts/${postId}`);
  }

  /**
   * Get user photos
   */
  async getUserPhotos(userId: string, page = 1, limit = 9): Promise<PhotosResponse> {
    const response = await api.get<PhotosResponse>(`/posts/user/${userId}/photos`, {
      params: { page, limit },
    });
    return response.data;
  }
}

export default new PostService();
