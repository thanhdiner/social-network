import { useState, useEffect } from 'react';
import type { Reel, ReelComment } from '../../types';
import { getReelsByUser, type ShareReelResponse } from '../../services/reelService';
import { Video, Play, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import socketService from '../../services/socketService';

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

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleCommentCreated = (comment: ReelComment) => {
      if (!comment?.reelId) return;
      setReels((prev) =>
        prev.map((item) => {
          if (item.id !== comment.reelId) return item;
          const nextCount = item._count
            ? { ...item._count, comments: (item._count.comments ?? 0) + 1 }
            : { likes: 0, comments: 1, shares: 0 };
          return {
            ...item,
            _count: nextCount,
          };
        }),
      );
    };

    const handleCommentDeleted = (payload: {
      reelId: string;
      removedCount?: number;
    }) => {
      if (!payload?.reelId) return;
      const removed = Math.max(payload.removedCount ?? 1, 1);
      setReels((prev) =>
        prev.map((item) => {
          if (item.id !== payload.reelId) return item;
          const current = item._count?.comments ?? 0;
          const nextCount = item._count
            ? { ...item._count, comments: Math.max(current - removed, 0) }
            : { likes: 0, comments: Math.max(current - removed, 0), shares: 0 };
          return {
            ...item,
            _count: nextCount,
          };
        }),
      );
    };

    socket.on('reel_comment_created', handleCommentCreated);
    socket.on('reel_comment_deleted', handleCommentDeleted);

    const handleShareCreatedSocket = (payload: ShareReelResponse) => {
      if (!payload?.share) return;
      const { share, shares, reelId } = payload;
      setReels((prev) => {
        let updatedList = prev;
        if (share.userId === userId) {
          const withoutDuplicate = prev.filter((item) => item.id !== share.id);
          updatedList = [share, ...withoutDuplicate];
        }
        return updatedList.map((item) => {
          if (item.id === reelId) {
            const baseCount = item._count ?? { likes: 0, comments: 0, shares: 0 };
            return {
              ...item,
              _count: {
                ...baseCount,
                shares,
              },
            };
          }
          if (item.sharedFrom && item.sharedFrom.id === reelId) {
            return {
              ...item,
              sharedFrom: {
                ...item.sharedFrom,
                _count: {
                  ...(item.sharedFrom._count ?? { likes: 0, comments: 0, shares: 0 }),
                  shares,
                },
              },
            };
          }
          return item;
        });
      });
    };

    socket.on('reel_share_created', handleShareCreatedSocket);

    return () => {
      socket.off('reel_comment_created', handleCommentCreated);
      socket.off('reel_comment_deleted', handleCommentDeleted);
      socket.off('reel_share_created', handleShareCreatedSocket);
    };
  }, [userId]);

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
        <p className="text-gray-500">No reels yet</p>
      </div>
    );
  }


  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {reels.map((reel) => {
        const contentReel = reel.sharedFrom ?? reel;
        const shareOwner = reel.sharedFrom ? reel.user : null;
        const shareMessage = reel.shareContent;
        const shareCount = contentReel._count?.shares ?? 0;

        return (
          <div
            key={reel.id}
            className="relative aspect-[9/16] bg-gray-200 rounded-lg overflow-hidden group cursor-pointer"
            onClick={() => navigate('/reels')}
          >
            {contentReel.thumbnailUrl ? (
              <img src={contentReel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <video src={contentReel.videoUrl} className="w-full h-full object-cover" muted />
            )}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-12 h-12 text-white" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/70 to-transparent">
              <div className="flex flex-wrap items-center gap-3 text-white text-sm">
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
                    <div className="flex items-center gap-1">
                      <span>↻</span>
                      <span>{shareCount}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
