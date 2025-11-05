import api from './api';

class UploadService {
  /**
   * Upload image to Cloudinary via backend
   */
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ url: string }>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url;
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(imageUrl: string): Promise<void> {
    await api.delete('/upload/image', {
      data: { imageUrl }
    });
  }

  /**
   * Upload video to Cloudinary via backend
   */
  async uploadVideo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ url: string }>('/upload/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url;
  }

  /**
   * Delete video from Cloudinary
   */
  async deleteVideo(videoUrl: string): Promise<void> {
    await api.delete('/upload/video', {
      data: { videoUrl }
    });
  }

  /**
   * Upload audio to Cloudinary via backend
   */
  async uploadAudio(file: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', file, 'audio.webm');

    const response = await api.post<{ url: string }>('/upload/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url;
  }

  /**
   * Upload generic file to Cloudinary via backend
   */
  async uploadFile(
    file: File
  ): Promise<{ url: string; originalName: string; size: number; mimeType: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{
      url: string;
      originalName: string;
      size: number;
      mimeType: string;
    }>('/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Validate image file
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only image files are allowed (JPEG, PNG, GIF, WebP)'
      };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must not exceed 5MB'
      };
    }

    return { valid: true };
  }

  /**
   * Validate video file
   */
  validateVideo(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only video files are allowed (MP4, WebM, OGG, MOV)'
      };
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Video size must not exceed 50MB'
      };
    }

    return { valid: true };
  }

  /**
   * Validate generic file upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Limit size to 10MB (Cloudinary free tier)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Kích thước file vượt quá 10MB. Vui lòng chọn file nhỏ hơn.',
      };
    }

    return { valid: true };
  }
}

export default new UploadService();


