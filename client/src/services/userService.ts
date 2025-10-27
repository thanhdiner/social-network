import api from './api';
import type { User } from './authService';

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  mutualFriends?: number;
}

class UserService {
  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User> {
    const response = await api.get<User>(`/users/${username}`);
    return response.data;
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await api.put<User>('/users/profile', data);
    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await api.put<{ message: string }>('/users/change-password', data);
    return response.data;
  }

  /**
   * Get suggested users to follow
   */
  async getSuggestedUsers(): Promise<SuggestedUser[]> {
    const response = await api.get<SuggestedUser[]>('/users/suggestions');
    return response.data;
  }

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/users/${userId}/follow`);
    return response.data;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/users/${userId}/follow`);
    return response.data;
  }

  /**
   * Check if following a user
   */
  async checkFollowStatus(userId: string): Promise<{ isFollowing: boolean; followsMe: boolean }> {
    const response = await api.get<{ isFollowing: boolean; followsMe: boolean }>(`/users/${userId}/follow-status`);
    return response.data;
  }
}

export default new UserService()

