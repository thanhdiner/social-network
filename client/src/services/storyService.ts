import api from './api';

export interface Story {
  id: string;
  userId: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt: string;
  expiresAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  views?: StoryView[];
  _count: {
    views: number;
  };
}

export interface StoryView {
  id: string;
  storyId: string;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

export interface GroupedStories {
  userId: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  hasUnviewed: boolean;
  stories: Story[];
}

export interface CreateStoryData {
  imageUrl?: string;
  videoUrl?: string;
}

class StoryService {
  async createStory(data: CreateStoryData): Promise<Story> {
    const response = await api.post('/stories', data);
    return response.data;
  }

  async getAllStories(): Promise<GroupedStories[]> {
    const response = await api.get('/stories');
    return response.data;
  }

  async getStory(id: string): Promise<Story> {
    const response = await api.get(`/stories/${id}`);
    return response.data;
  }

  async getUserStories(username: string): Promise<Story[]> {
    const response = await api.get(`/stories/user/${username}`);
    return response.data;
  }

  async addView(storyId: string): Promise<StoryView> {
    const response = await api.post(`/stories/${storyId}/view`);
    return response.data;
  }

  async deleteStory(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/stories/${id}`);
    return response.data;
  }
}

export default new StoryService();
