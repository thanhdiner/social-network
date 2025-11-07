import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Reel, ReelComment, ReelSummary, Post } from '../../types';
import { getReel, type ShareReelResponse } from '../../services/reelService';
import ReelPlayer from '../../components/Reels/ReelPlayer';
import ReelComments from '../../components/Reels/ReelComments';
import { ShareReelModal } from '../../components/Reels/ShareReelModal';
import { X } from 'lucide-react';
import { useTitle } from '../../hooks/useTitle';
import socketService from '../../services/socketService';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export default function ReelDetailPage() {
  const { reelId } = useParams<{ reelId: string }>();
  const navigate = useNavigate();
  const [reel, setReel] = useState<Reel | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sharingReel, setSharingReel] = useState<ReelSummary | null>(null);
  const { user: currentUser } = useCurrentUser();
  
  useTitle(reel ? `Reel của ${reel.user?.name}` : 'Reel');

  const loadReel = useCallback(async () => {
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
  }, [navigate, reelId]);

  useEffect(() => {
    if (reelId) {
      loadReel();
    }
  }, [loadReel, reelId]);

  const handleShareCreated = useCallback((response: ShareReelResponse) => {
    const { shares, reelId, post } = response;
    setReel((prev) => {
      if (!prev) return prev;
      if (prev.id === reelId) {
        const baseCount = prev._count ?? { likes: 0, comments: 0, shares: 0 };
        return {
          ...prev,
          _count: {
            ...baseCount,
            shares,
          },
        };
      }
      if (prev.sharedFrom && prev.sharedFrom.id === reelId) {
        return {
          ...prev,
          sharedFrom: {
            ...prev.sharedFrom,
            _count: {
              ...(prev.sharedFrom._count ?? { likes: 0, comments: 0, shares: 0 }),
              shares,
            },
          },
        };
      }
      return prev;
    });
    window.dispatchEvent(
      new CustomEvent<Post>('post:shared-reel-created', { detail: post }),
    );
  }, []);

  const handleShareRequest = useCallback(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (reel) {
      setSharingReel(reel.sharedFrom ?? reel);
    }
  }, [currentUser, navigate, reel]);

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

    const handleShareCreatedSocket = (payload: ShareReelResponse) => {
      if (!payload?.share) return;
      handleShareCreated(payload);
    };

    socket.on('reel_share_created', handleShareCreatedSocket);

    return () => {
      socket.off('reel_comment_created', handleCommentCreated);
      socket.off('reel_comment_deleted', handleCommentDeleted);
      socket.off('reel_share_created', handleShareCreatedSocket);
    };
  }, [handleShareCreated]);

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
          onShareClick={handleShareRequest}
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

      {sharingReel && currentUser && (
        <ShareReelModal
          reel={sharingReel}
          open={!!sharingReel}
          onClose={() => setSharingReel(null)}
          onShared={(response) => {
            handleShareCreated(response);
          }}
          currentUserName={currentUser.name}
          currentUserAvatar={currentUser.avatar}
        />
      )}
    </div>
  );
}
