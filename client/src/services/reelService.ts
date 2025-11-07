import api from './api';
import type {
  Reel,
  CreateReelData,
  UpdateReelData,
  ReelComment,
  CreateReelCommentData,
  Post,
} from '../types';

export interface ShareReelResponse {
  share: Reel;
  shares: number;
  reelId: string;
  post: Post;
  message: string;
}

// Lấy danh sách reels
export const getReels = async (page = 1, limit = 10): Promise<Reel[]> => {
  const response = await api.get(`/reels?page=${page}&limit=${limit}`);
  return response.data;
};

// Lấy reels của một user
export const getReelsByUser = async (
  userId: string,
  page = 1,
  limit = 10,
): Promise<Reel[]> => {
  const response = await api.get(`/reels/user/${userId}?page=${page}&limit=${limit}`);
  return response.data;
};

// Lấy một reel theo ID
export const getReel = async (id: string): Promise<Reel> => {
  const response = await api.get(`/reels/${id}`);
  return response.data;
};

// Tạo reel mới
export const createReel = async (data: CreateReelData): Promise<Reel> => {
  const response = await api.post('/reels', data);
  return response.data;
};

// Cập nhật reel
export const updateReel = async (
  id: string,
  data: UpdateReelData,
): Promise<Reel> => {
  const response = await api.patch(`/reels/${id}`, data);
  return response.data;
};

// Xóa reel
export const deleteReel = async (id: string): Promise<void> => {
  await api.delete(`/reels/${id}`);
};

// Like/Unlike reel
export const toggleLikeReel = async (
  id: string,
): Promise<{ liked: boolean }> => {
  const response = await api.post(`/reels/${id}/like`);
  return response.data;
};

// Lấy comments của reel
export const getReelComments = async (
  reelId: string,
  page = 1,
  limit = 20,
): Promise<ReelComment[]> => {
  const response = await api.get(`/reels/${reelId}/comments?page=${page}&limit=${limit}`);
  return response.data;
};

// Lấy replies của một comment
export const getReelCommentReplies = async (
  commentId: string,
  page = 1,
  limit = 20,
): Promise<ReelComment[]> => {
  const response = await api.get(
    `/reels/comments/${commentId}/replies?page=${page}&limit=${limit}`,
  );
  return response.data;
};

// Tạo comment
export const createReelComment = async (
  reelId: string,
  data: CreateReelCommentData,
): Promise<ReelComment> => {
  const response = await api.post(`/reels/${reelId}/comments`, data);
  return response.data;
};

// Xóa comment
export const deleteReelComment = async (commentId: string): Promise<void> => {
  await api.delete(`/reels/comments/${commentId}`);
};

// Share reel
export const shareReel = async (
  id: string,
  data?: { content?: string },
): Promise<ShareReelResponse> => {
  const response = await api.post(`/reels/${id}/share`, data ?? {});
  return response.data as ShareReelResponse;
};

// Increment view count for a reel (called when user watched enough)
export const viewReel = async (id: string): Promise<{ views: number } | void> => {
  try {
    const response = await api.post(`/reels/${id}/view`);
    return response.data;
  } catch (err) {
    // non-fatal
    console.error('Error incrementing reel view:', err);
  }
};
