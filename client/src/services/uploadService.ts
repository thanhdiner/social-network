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
   * Validate image file
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)'
      };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Kích thước file không được vượt quá 5MB'
      };
    }

    return { valid: true };
  }
}

export default new UploadService();
