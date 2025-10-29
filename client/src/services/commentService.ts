import api from './api';
import type { Comment } from '../types';

export interface CreateCommentData {
  content: string;
  imageUrl?: string; // URL của ảnh đính kèm
  imageIndex?: number; // Index của ảnh trong post (optional)
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
};
