import {
  Controller,
  Post,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const url = await this.uploadService.uploadToCloudinary(file);
    return { url };
  }

  @Post('video')
  // Allow larger video uploads (200MB). Client still validates file size before upload.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const url = await this.uploadService.uploadToCloudinary(file);
    return { url };
  }

  @Post('audio')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const url = await this.uploadService.uploadToCloudinary(file);
    return { url };
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Fix encoding for filename (convert from latin1 to utf8)
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    console.log('Upload request received:', {
      originalname: originalName,
      mimetype: file.mimetype,
      size: file.size,
      user: 'current-user-id'
    });

    try {
      // Validate file size (max 10MB - Cloudinary free tier limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`File vượt quá giới hạn ${maxSize / (1024 * 1024)}MB. Vui lòng chọn file nhỏ hơn.`);
      }

      console.log('Starting Cloudinary upload for:', originalName);

      const result = await this.uploadService.uploadToCloudinary(file);
      
      console.log('Upload successful:', {
        url: result,
        originalName: originalName
      });

      return {
        url: result,
        originalName: originalName,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  @Delete('image')
  async deleteImage(@Body('imageUrl') imageUrl: string) {
    if (!imageUrl) {
      throw new Error('No image URL provided');
    }

    await this.uploadService.deleteFromCloudinary(imageUrl);
    return { success: true };
  }

  @Delete('video')
  async deleteVideo(@Body('videoUrl') videoUrl: string) {
    if (!videoUrl) {
      throw new Error('No video URL provided');
    }

    await this.uploadService.deleteFromCloudinary(videoUrl);
    return { success: true };
  }
}
