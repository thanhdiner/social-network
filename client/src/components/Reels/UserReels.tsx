import { useState, useEffect } from 'react';
import type { Reel } from '../../types';
import { getReelsByUser } from '../../services/reelService';
import { Video, Play, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserReelsProps {
  userId: string;
}

export default function UserReels({ userId }: UserReelsProps) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadReels();
  }, [userId]);

  const loadReels = async () => {
    setLoading(true);
    try {
      const data = await getReelsByUser(userId, 1, 20);
      setReels(data);
    } catch (error) {
      console.error('Error loading reels:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Chưa có reel nào</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {reels.map((reel) => (
        <div
          key={reel.id}
          className="relative aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden group cursor-pointer"
          onClick={() => navigate('/reels')}
        >
          {/* Thumbnail or video preview */}
          {reel.thumbnailUrl ? (
            <img
              src={reel.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={reel.videoUrl}
              className="w-full h-full object-cover"
              muted
            />
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-12 h-12 text-white" />
          </div>

          {/* Stats */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center gap-3 text-white text-sm">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{reel.views.toLocaleString()}</span>
              </div>
              {reel._count && (
                <>
                  <div className="flex items-center gap-1">
                    <span>❤️</span>
                    <span>{reel._count.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>💬</span>
                    <span>{reel._count.comments}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
