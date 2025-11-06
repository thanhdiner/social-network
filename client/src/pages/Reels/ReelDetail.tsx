import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Reel, ReelComment } from '../../types';
import { getReel } from '../../services/reelService';
import ReelPlayer from '../../components/Reels/ReelPlayer';
import ReelComments from '../../components/Reels/ReelComments';
import { X } from 'lucide-react';
import { useTitle } from '../../hooks/useTitle';
import socketService from '../../services/socketService';

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

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleCommentCreated = (comment: ReelComment) => {
      if (!comment?.reelId) return;
      setReel((prev) => {
        if (!prev || prev.id !== comment.reelId) return prev;
        const nextCount = prev._count
          ? { ...prev._count, comments: (prev._count.comments ?? 0) + 1 }
          : { likes: 0, comments: 1, shares: 0 };
        return {
          ...prev,
          _count: nextCount,
        };
      });
    };

    const handleCommentDeleted = (payload: {
      reelId: string;
      removedCount?: number;
    }) => {
      if (!payload?.reelId) return;
      const removed = Math.max(payload.removedCount ?? 1, 1);
      setReel((prev) => {
        if (!prev || prev.id !== payload.reelId) return prev;
        const current = prev._count?.comments ?? 0;
        const nextCount = prev._count
          ? { ...prev._count, comments: Math.max(current - removed, 0) }
          : {
              likes: 0,
              comments: Math.max(current - removed, 0),
              shares: 0,
            };
        return {
          ...prev,
          _count: nextCount,
        };
      });
    };

    socket.on('reel_comment_created', handleCommentCreated);
    socket.on('reel_comment_deleted', handleCommentDeleted);

    return () => {
      socket.off('reel_comment_created', handleCommentCreated);
      socket.off('reel_comment_deleted', handleCommentDeleted);
    };
  }, []);

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
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Close Button */}
      <button
        onClick={() => navigate('/reels')}
        className="fixed top-4 right-4 z-30 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-colors cursor-pointer"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Reel Player */}
      <div className={`h-full w-full transition-[padding] duration-300 ${showComments ? 'sm:pr-[436px]' : ''}`}>
        <ReelPlayer
          reel={reel}
          isActive={true}
          onCommentClick={() => setShowComments((prev) => !prev)}
          onDelete={() => navigate('/reels')}
          showComments={showComments}
        />
      </div>

      {/* Comments Modal */}
      {showComments && (
        <ReelComments
          reelId={reel.id}
          onClose={() => setShowComments(false)}
          isDrawer
        />
      )}
    </div>
  );
}
