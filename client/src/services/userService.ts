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

export interface ActiveUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
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
   * Request email change - server will (in dev) return a token. In prod it should send an email.
   */
  async requestEmailChange(newEmail: string): Promise<{ message: string; mailSent: boolean; expiresAt: number; debugToken?: string }> {
    const response = await api.post<{ message: string; mailSent: boolean; expiresAt: number; debugToken?: string }>('/users/request-email-change', { newEmail });
    return response.data;
  }

  async confirmEmailChange(token: string): Promise<User> {
    const response = await api.post<User>('/users/confirm-email-change', { token });
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
   * Get active/online users
   */
  async getActiveUsers(): Promise<ActiveUser[]> {
    const response = await api.get<ActiveUser[]>('/users/active');
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

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string): Promise<ActiveUser[]> {
    const response = await api.get<ActiveUser[]>(`/users/${userId}/followers`);
    return response.data;
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string): Promise<ActiveUser[]> {
    const response = await api.get<ActiveUser[]>(`/users/${userId}/following`);
    return response.data;
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/users/${userId}/block`);
    return response.data;
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/users/${userId}/block`);
    return response.data;
  }

  /**
   * Check if user is blocked
   */
  async checkBlockStatus(userId: string): Promise<{ isBlocked: boolean; hasBlocked: boolean }> {
    const response = await api.get<{ isBlocked: boolean; hasBlocked: boolean }>(`/users/${userId}/block-status`);
    return response.data;
  }
}

export default new UserService()
