import api from './api';

export interface GeminiCompleteResponse {
  content: string;
}

export interface GeminiImproveResponse {
  content: string;
}

export interface GeminiIdeasResponse {
  ideas: string[];
}

class GeminiService {
  /**
   * Complete a post using AI
   */
  async completePost(content: string): Promise<string> {
    try {
      const response = await api.post<GeminiCompleteResponse>('/gemini/complete', {
        content,
      });
      return response.data.content;
    } catch (error) {
      console.error('Failed to complete post:', error);
      throw error;
    }
  }

  /**
   * Improve/refine a post using AI
   */
  async improvePost(content: string): Promise<string> {
    try {
      const response = await api.post<GeminiImproveResponse>('/gemini/improve', {
        content,
      });
      return response.data.content;
    } catch (error) {
      console.error('Failed to improve post:', error);
      throw error;
    }
  }

  /**
   * Generate post ideas using AI
   */
  async generateIdeas(topic?: string): Promise<string[]> {
    try {
      const response = await api.post<GeminiIdeasResponse>('/gemini/ideas', {
        topic,
      });
      return response.data.ideas;
    } catch (error) {
      console.error('Failed to generate ideas:', error);
      throw error;
    }
  }
}

export default new GeminiService();
