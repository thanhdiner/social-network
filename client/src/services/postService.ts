import api from './api';

export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  userId: string;
  sharedPostId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  sharedPost?: Post;
  _count: {
    comments: number;
    likes: number;
    shares?: number;
  };
  isLiked?: boolean;
  reactionType?: string | null;
  isSaved?: boolean;
}

export interface CreatePostData {
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
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
  imageIndex: number;
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
   * Toggle like on a post or specific image
   */
  async toggleLike(
    postId: string,
    type: string = 'like',
    imageIndex?: number,
  ): Promise<{ liked: boolean; type: string | null; message: string }> {
    const response = await api.post<{ liked: boolean; type: string | null; message: string }>(
      `/posts/${postId}/like`,
      { type, imageIndex },
    );
    return response.data;
  }

  /**
   * Get likes for all images in a post
   */
  async getImageLikes(
    postId: string,
    imageCount: number,
  ): Promise<Record<number, { isLiked: boolean; reactionType: string | null; count: number }>> {
    const response = await api.get<Record<number, { isLiked: boolean; reactionType: string | null; count: number }>>(
      `/posts/${postId}/image-likes`,
      { params: { imageCount } },
    );
    return response.data;
  }

  /**
   * Get list of users who liked a post or specific image
   */
  async getLikeList(
    postId: string,
    imageIndex?: number,
  ): Promise<Array<{ id: string; name: string; username: string; avatar: string | null; type: string }>> {
    const response = await api.get(
      `/posts/${postId}/like-list`,
      imageIndex !== undefined ? { params: { imageIndex } } : undefined,
    );
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

  /**
   * Share a post
   */
  async sharePost(postId: string, content?: string): Promise<Post> {
    const response = await api.post<Post>(`/posts/${postId}/share`, { content });
    return response.data;
  }

  /**
   * Toggle save post
   */
  async toggleSavePost(postId: string): Promise<{ saved: boolean; message: string }> {
    const response = await api.post<{ saved: boolean; message: string }>(`/posts/${postId}/save`);
    return response.data;
  }

  /**
   * Get saved posts
   */
  async getSavedPosts(page = 1, limit = 10): Promise<{ posts: Post[]; total: number; page: number; totalPages: number }> {
    const response = await api.get<{ posts: Post[]; total: number; page: number; totalPages: number }>('/posts/saved', {
      params: { page, limit },
    });
    return response.data;
  }
}

export default new PostService();
