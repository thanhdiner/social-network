/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
const streamifier = require('streamifier');

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'social-network',
          resource_type: 'auto',
          // Add timeout and chunk size for files up to 10MB
          timeout: 120000, // 2 minutes
          chunk_size: 6000000, // 6MB chunks
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(
              new Error(
                `Upload failed: ${error.message || JSON.stringify(error)}`,
              ),
            );
          }
          if (!result) {
            return reject(new Error('Upload failed: No result returned'));
          }
          resolve(result.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Delete image from Cloudinary
   * @param imageUrl - Full Cloudinary URL
   */
  async deleteFromCloudinary(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from URL
      // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
      const urlParts = imageUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');

      if (uploadIndex === -1) {
        throw new Error('Invalid Cloudinary URL');
      }

      // Get everything after 'upload/v{version}/'
      const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');

      // Remove file extension
      const publicId = publicIdWithExtension.substring(
        0,
        publicIdWithExtension.lastIndexOf('.'),
      );

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      // Don't throw error, just log it - we don't want to break the flow if deletion fails
    }
  }
}
