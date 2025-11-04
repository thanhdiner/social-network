import api from './api';
import type { Message, Conversation, SendMessageData, User, ConversationCustomization } from '../types';

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

  async pinMessage(messageId: string): Promise<Message> {
    const response = await api.put(`/chat/messages/${messageId}/pin`);
    return response.data;
  },

  async unpinMessage(messageId: string): Promise<Message> {
    const response = await api.put(`/chat/messages/${messageId}/unpin`);
    return response.data;
  },

  // Delete message (hide for self only)
  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/chat/messages/${messageId}/delete`);
  },

  // Unsend message (remove for both)
  async unsendMessage(messageId: string): Promise<void> {
    await api.put(`/chat/messages/${messageId}/unsend`);
  },

  // Mute conversation
  async muteConversation(userId: string): Promise<void> {
    await api.put(`/chat/conversations/${userId}/mute`);
  },

  // Unmute conversation
  async unmuteConversation(userId: string): Promise<void> {
    await api.delete(`/chat/conversations/${userId}/mute`);
  },

  // Check if conversation is muted
  async checkIfMuted(userId: string): Promise<boolean> {
    const response = await api.get(`/chat/conversations/${userId}/muted`);
    return response.data;
  },

  async getCustomization(userId: string): Promise<ConversationCustomization> {
    const response = await api.get(`/chat/customization/${userId}`);
    return response.data;
  },

  async updateCustomization(
    userId: string,
    data: Partial<Pick<ConversationCustomization, 'themeId' | 'emoji' | 'nicknameMe' | 'nicknameThem'>>
  ): Promise<ConversationCustomization> {
    const response = await api.put(`/chat/customization/${userId}`, data);
    return response.data;
  },

  async resetCustomization(userId: string): Promise<ConversationCustomization> {
    const response = await api.delete(`/chat/customization/${userId}`);
    return response.data;
  },

  // Log call (voice/video call history)
  async logCall(
    receiverId: string,
    callType: 'voice' | 'video',
    callDuration: number,
    callStatus: 'completed' | 'missed' | 'rejected' | 'no-answer'
  ): Promise<Message> {
    const response = await api.post('/chat/call-log', {
      receiverId,
      callType,
      callDuration,
      callStatus,
    });
    return response.data;
  },

  // Blocking APIs removed
};

