import api from './api';
import type { Comment, ReactionType } from '../types';

export interface CreateCommentData {
  content: string;
  imageUrl?: string; // URL cá»§a áº£nh Ä‘Ã­nh kÃ¨m
  imageIndex?: number; // Index cá»§a áº£nh trong post (optional)
  parentId?: string; // ID cá»§a comment cha (náº¿u lÃ  reply)
}

export interface CommentResponse {
  comments: Comment[];
  total: number;
  page: number;
  totalPages: number;
}

export const commentService = {
  // Táº¡o comment má»›i
  async createComment(postId: string, data: CreateCommentData): Promise<Comment> {
    const response = await api.post(`/comments/post/${postId}`, data);
    return response.data;
  },

  // Láº¥y danh sÃ¡ch comments cá»§a post (hoáº·c cá»§a má»™t áº£nh cá»¥ thá»ƒ)
  async getCommentsByPostId(
    postId: string,
    page = 1,
    limit = 20,
    imageIndex?: number
  ): Promise<CommentResponse> {
    const params: any = { page, limit };
    if (imageIndex !== undefined) {
      params.imageIndex = imageIndex;
    }
    const response = await api.get(`/comments/post/${postId}`, { params });
    return response.data;
  },

  // Láº¥y má»™t comment
  async getComment(commentId: string): Promise<Comment> {
    const response = await api.get(`/comments/${commentId}`);
    return response.data;
  },

  // Cáº­p nháº­t comment
  async updateComment(commentId: string, data: CreateCommentData): Promise<Comment> {
    const response = await api.patch(`/comments/${commentId}`, data);
    return response.data;
  },

  // XÃ³a comment
  async deleteComment(commentId: string): Promise<{ message: string }> {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },

  // Like/Unlike comment hoáº·c thay Ä‘á»•i reaction
  async toggleLike(commentId: string, type: ReactionType = 'like'): Promise<{ liked: boolean; type: ReactionType | null }> {
    const response = await api.post(`/comments/${commentId}/like`, { type });
    return response.data;
  },

  // Láº¥y thÃ´ng tin likes cá»§a comment
  async getCommentLikes(commentId: string): Promise<{
    likes: { type: ReactionType; count: number }[];
    userLike: ReactionType | null;
  }> {
    const response = await api.get(`/comments/${commentId}/likes`);
    return response.data;
  },
};

