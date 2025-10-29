import api from './api';
import type { Comment, ReactionType } from '../types';

export interface CreateCommentData {
  content: string;
  imageUrl?: string; // URL của ảnh đính kèm
  imageIndex?: number; // Index của ảnh trong post (optional)
  parentId?: string; // ID của comment cha (nếu là reply)
}

export interface CommentResponse {
  comments: Comment[];
  total: number;
  page: number;
  totalPages: number;
}

export const commentService = {
  // Tạo comment mới
  async createComment(postId: string, data: CreateCommentData): Promise<Comment> {
    const response = await api.post(`/comments/post/${postId}`, data);
    return response.data;
  },

  // Lấy danh sách comments của post (hoặc của một ảnh cụ thể)
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

  // Lấy một comment
  async getComment(commentId: string): Promise<Comment> {
    const response = await api.get(`/comments/${commentId}`);
    return response.data;
  },

  // Cập nhật comment
  async updateComment(commentId: string, data: CreateCommentData): Promise<Comment> {
    const response = await api.patch(`/comments/${commentId}`, data);
    return response.data;
  },

  // Xóa comment
  async deleteComment(commentId: string): Promise<{ message: string }> {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },

  // Like/Unlike comment hoặc thay đổi reaction
  async toggleLike(commentId: string, type: ReactionType = 'like'): Promise<{ liked: boolean; type: ReactionType | null }> {
    const response = await api.post(`/comments/${commentId}/like`, { type });
    return response.data;
  },

  // Lấy thông tin likes của comment
  async getCommentLikes(commentId: string): Promise<{
    likes: { type: ReactionType; count: number }[];
    userLike: ReactionType | null;
  }> {
    const response = await api.get(`/comments/${commentId}/likes`);
    return response.data;
  },
};
