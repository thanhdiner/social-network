# Install Cloudinary & Upload Dependencies

# Navigate to server directory
cd server

# Install runtime dependencies
npm install cloudinary streamifier @nestjs/platform-express

# Install dev dependencies for TypeScript types
npm install -D @types/multer @types/streamifier

echo "Installation complete! Please configure .env file with Cloudinary credentials."
