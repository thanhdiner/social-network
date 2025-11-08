import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createReel } from '../../services/reelService';
import uploadService from '../../services/uploadService';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import geminiService from '../../services/geminiService';
import { Upload, X, Video } from 'lucide-react';
import { useTitle } from '../../hooks/useTitle';

export default function CreateReelPage() {
  useTitle('Tạo Reel');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    setUploading(true);
    try {
      // Client-side validation
      const validation = uploadService.validateVideo(videoFile);
      if (!validation.valid) {
        alert(validation.error);
        setUploading(false);
        return;
      }
      // Upload video
      const videoUrl = await uploadService.uploadVideo(videoFile);

      // Create reel
      await createReel({
        videoUrl,
        description: description.trim() || undefined,
      });

      navigate('/reels');
    } catch (error) {
      console.error('Error creating reel:', error);
      // Try to show server error message when available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err: any = error;
      const message = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo reel';
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Constrain modal height and enable scrolling when content is tall */}
        <div className="bg-white rounded-lg shadow-md p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-orange-600">Tạo Reel mới</h1>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video <span className="text-red-500">*</span>
              </label>
              {!videoPreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-3">
                    <Video className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">Chọn video để tải lên</p>
                      <p className="text-sm text-gray-500 mt-1">Hoặc kéo và thả video vào đây</p>
                    </div>
                    <Button
                      type="button"
                      className="bg-orange-500 hover:bg-orange-600 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Chọn video
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full max-h-[60vh] rounded-lg object-contain bg-black"
                    style={{ maxHeight: '60vh' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Viết mô tả cho reel của bạn..."
                className="w-full min-h-[100px]"
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-1">
                {description.length}/500 ký tự
              </p>
              {/* AI buttons for description */}
              {description.trim() && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!description.trim()) {
                        alert('Please write something first!');
                        return;
                      }
                      setIsAiProcessing(true);
                      try {
                        const completed = await geminiService.completePost(description);
                        setDescription(completed);
                      } catch (err: unknown) {
                        console.error('Failed to complete with AI:', err);
                        const e = err as { response?: { data?: { message?: string } }; message?: string };
                        const message = e?.response?.data?.message || e?.message || 'Unknown error';
                        alert(`Failed to complete with AI: ${message}`);
                      } finally {
                        setIsAiProcessing(false);
                      }
                    }}
                    disabled={isAiProcessing || uploading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition cursor-pointer"
                  >
                    {isAiProcessing ? 'Processing...' : 'Complete with AI'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!description.trim()) {
                        alert('Please write something first!');
                        return;
                      }
                      setIsAiProcessing(true);
                      try {
                        const improved = await geminiService.improvePost(description);
                        setDescription(improved);
                      } catch (err: unknown) {
                        console.error('Failed to improve with AI:', err);
                        const e = err as { response?: { data?: { message?: string } }; message?: string };
                        const message = e?.response?.data?.message || e?.message || 'Unknown error';
                        alert(`Failed to improve with AI: ${message}`);
                      } finally {
                        setIsAiProcessing(false);
                      }
                    }}
                    disabled={isAiProcessing || uploading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition cursor-pointer"
                  >
                    {isAiProcessing ? 'Processing...' : 'Improve with AI'}
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={uploading}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={!videoFile || uploading}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Đang tải lên...
                  </>
                ) : (
                  'Đăng Reel'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
