import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Reel } from '../../types';
import { getReel } from '../../services/reelService';
import ReelPlayer from '../../components/Reels/ReelPlayer';
import ReelComments from '../../components/Reels/ReelComments';
import { X } from 'lucide-react';
import { useTitle } from '../../hooks/useTitle';

export default function ReelDetailPage() {
  const { reelId } = useParams<{ reelId: string }>();
  const navigate = useNavigate();
  const [reel, setReel] = useState<Reel | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useTitle(reel ? `Reel của ${reel.user?.name}` : 'Reel');

  useEffect(() => {
    if (reelId) {
      loadReel();
    }
  }, [reelId]);

  const loadReel = async () => {
    if (!reelId) return;
    
    setLoading(true);
    try {
      const data = await getReel(reelId);
      setReel(data);
    } catch (error) {
      console.error('Error loading reel:', error);
      navigate('/reels');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!reel) {
    return null;
  }

  return (
    <div className="relative h-screen bg-black">
      {/* Close Button */}
      <button
        onClick={() => navigate('/reels')}
        className="fixed top-4 right-4 z-30 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-colors cursor-pointer"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Reel Player */}
      <ReelPlayer
        reel={reel}
        isActive={true}
        onCommentClick={() => setShowComments(true)}
        onDelete={() => navigate('/reels')}
      />

      {/* Comments Modal */}
      {showComments && (
        <ReelComments
          reelId={reel.id}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
