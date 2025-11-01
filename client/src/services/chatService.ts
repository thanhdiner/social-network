import api from './api';
import type { Message, Conversation, SendMessageData, User } from '../types';

export const chatService = {
  // Láº¥y danh sÃ¡ch conversation
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  // Láº¥y tin nháº¯n cá»§a 1 conversation
  async getMessages(userId: string): Promise<Message[]> {
    const response = await api.get(`/chat/messages/${userId}`);
    return response.data;
  },

  // Gá»­i tin nháº¯n
  async sendMessage(data: SendMessageData): Promise<Message> {
    const response = await api.post('/chat/messages', data);
    return response.data;
  },

  // Đánh dấu đã đọc
  async markAsRead(userId: string): Promise<void> {
    await api.put(`/chat/messages/${userId}/read`);
  },

  // Xóa tất cả tin nhắn với một user
  async deleteConversation(userId: string): Promise<void> {
    await api.delete(`/chat/messages/${userId}`);
  },

  // Tìm kiếm user để chat
  async searchUsers(query: string): Promise<User[]> {
    const response = await api.get(`/search/users?q=${query}`);
    return response.data;
  },

  // Add reaction to message
  async addReaction(messageId: string, emoji: string): Promise<void> {
    await api.post(`/chat/messages/${messageId}/react`, { emoji });
  },

  // Remove reaction from message
  async removeReaction(messageId: string): Promise<void> {
    await api.delete(`/chat/messages/${messageId}/react`);
  },

  // Delete message (hide for self only)
  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/chat/messages/${messageId}/delete`);
  },

  // Unsend message (remove for both)
  async unsendMessage(messageId: string): Promise<void> {
    await api.put(`/chat/messages/${messageId}/unsend`);
  },

  // Blocking APIs removed
};

