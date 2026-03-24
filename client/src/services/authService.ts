import api from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  role?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  stats?: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  name: string;
}

export interface LoginData {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface UserResponse {
  userId: string;
  email: string;
}

class AuthService {
  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
    }
  }

  /**
   * Refresh access token
   */
  async refresh(): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/refresh');
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    return response.data;
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/users/me');
    return response.data;
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<User> {
    const response = await api.get<User>('/users/profile');
    return response.data;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Request password reset code
   */
  async forgotPassword(email: string): Promise<{ message: string; mailSent: boolean; expiresAt?: number; debugCode?: string }> {
    const response = await api.post<{ message: string; mailSent: boolean; expiresAt?: number; debugCode?: string }>('/auth/forgot-password', { email });
    return response.data;
  }

  /**
   * Reset password with code
   */
  async resetPassword(code: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', { code, newPassword });
    return response.data;
  }
}

const authServiceInstance = new AuthService();

export default authServiceInstance;

// Export individual methods for convenience
export const forgotPassword = (email: string) => authServiceInstance.forgotPassword(email);
export const resetPassword = (code: string, newPassword: string) => authServiceInstance.resetPassword(code, newPassword);

