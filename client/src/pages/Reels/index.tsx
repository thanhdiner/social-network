import { useState, useEffect, useRef, useCallback } from 'react';
import type { Reel, ReelComment, ReelSummary, Post } from '../../types';
import { getReels, getReel, type ShareReelResponse } from '../../services/reelService';
import ReelPlayer from '../../components/Reels/ReelPlayer';
import ReelComments from '../../components/Reels/ReelComments';
import { ShareReelModal } from '../../components/Reels/ShareReelModal';
import { Plus } from 'lucide-react';
import { useTitle } from '../../hooks/useTitle';
import { useNavigate, useParams } from 'react-router-dom';
import socketService from '../../services/socketService';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export default function ReelsPage() {
  useTitle('Reels');
  const navigate = useNavigate();
  const { reelId: paramReelId } = useParams<{ reelId?: string }>();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelAt = useRef<number>(0);
  const { user: currentUser } = useCurrentUser();
  const [sharingReel, setSharingReel] = useState<ReelSummary | null>(null);
  const [mode, setMode] = useState<'default' | 'trending' | 'random'>('default');

  const fetchReelsPage = useCallback(
    async (pageToLoad: number, modeArg: 'default' | 'trending' | 'random' = mode) => {
      setHasAttemptedInitialLoad(true);
      setLoading(true);
      try {
        const data = await getReels(pageToLoad, 10, modeArg);
        if (data.length === 0) {
          setHasMore(false);
          return;
        }

        setReels((prev) => (pageToLoad === 1 ? data : [...prev, ...data]));
        setPage(pageToLoad + 1);
      } catch (error) {
        console.error('Error loading reels:', error);
      } finally {
        setLoading(false);
      }
    },
    [mode],
  );

  useEffect(() => {
    void fetchReelsPage(1, mode);
  }, [fetchReelsPage, mode]);

  const loadMoreReels = useCallback(async () => {
    if (loading || !hasMore) return;
    await fetchReelsPage(page, mode);
  }, [fetchReelsPage, hasMore, loading, page, mode]);

  // when reels change, if there's a param reelId, try to focus it
  useEffect(() => {
    if (!paramReelId || reels.length === 0) return;

    const idx = reels.findIndex((r) => r.id === paramReelId);
    if (idx !== -1) {
      // Jump immediately to the target reel without transition
      setSkipTransition(true);
      setCurrentIndex(idx);
      // allow a tick for DOM to update then re-enable transitions
      requestAnimationFrame(() => requestAnimationFrame(() => setSkipTransition(false)));
      return;
    }

    // if not found in loaded reels, fetch the reel and prepend it
    (async () => {
      try {
        const single = await getReel(paramReelId);
        if (single) {
          // prepend and show immediately without animating through others
          setSkipTransition(true);
          setReels((prev) => [single, ...prev]);
          setCurrentIndex(0);
          requestAnimationFrame(() => requestAnimationFrame(() => setSkipTransition(false)));
        }
      } catch {
        // if not found, ignore
        console.error('Error loading deep-linked reel');
      }
    })();
  }, [paramReelId, reels]);

  

  const handleNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      // Load more when reaching near the end
      if (currentIndex >= reels.length - 3) {
        void loadMoreReels();
      }
    }
  }, [currentIndex, loadMoreReels, reels.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'ArrowUp') {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious]);

  // When currentIndex changes, update URL to deep link to the current reel
  useEffect(() => {
    if (reels[currentIndex]) {
      try {
        navigate(`/reels/${reels[currentIndex].id}`, { replace: true });
      } catch {
        // ignore
      }
    }
  }, [currentIndex, reels, navigate]);

  // Touch handling for mobile swipe
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current;
    const threshold = 50;

    if (diff > threshold) {
      handleNext();
    } else if (diff < -threshold) {
      handlePrevious();
    }
  };

  // Mouse wheel navigation (throttled)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    const THROTTLE = 500; // ms between navigations
    const DELTA_THRESHOLD = 30; // minimal deltaY to consider
    if (now - lastWheelAt.current < THROTTLE) return;

    if (e.deltaY > DELTA_THRESHOLD) {
      handleNext();
      lastWheelAt.current = now;
      e.preventDefault();
    } else if (e.deltaY < -DELTA_THRESHOLD) {
      handlePrevious();
      lastWheelAt.current = now;
      e.preventDefault();
    }
  }, [handleNext, handlePrevious]);

  const handleReelDelete = () => {
    setReels((prev) => prev.filter((_, i) => i !== currentIndex));
    if (currentIndex >= reels.length - 1 && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleShareRequest = useCallback(
    (reelToShare: Reel) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setSharingReel(reelToShare.sharedFrom ?? reelToShare);
    },
    [currentUser, navigate],
  );

  const changeMode = useCallback(
    (newMode: 'default' | 'trending' | 'random') => {
      if (newMode === mode) return;
      setMode(newMode);
      setReels([]);
      setPage(1);
      setHasMore(true);
      void fetchReelsPage(1, newMode);
    },
    [mode, fetchReelsPage],
  );

  const handleShareCreated = useCallback((response: ShareReelResponse) => {
    const { share, shares, reelId, post } = response;
    setReels((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== share.id);
      const withShare = [share, ...withoutDuplicate];
      return withShare.map((item) => {
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
        window.dispatchEvent(
          new CustomEvent<Post>('post:shared-reel-created', { detail: post }),
        );
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
    setSharingReel(null);
  }, []);

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
            : { likes: 0, comments: 0, shares: 0 };
          if (!item._count) {
            nextCount.comments = Math.max(current - removed, 0);
          }
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
      handleShareCreated(payload);
    };

    socket.on('reel_share_created', handleShareCreatedSocket);

    return () => {
      socket.off('reel_comment_created', handleCommentCreated);
      socket.off('reel_comment_deleted', handleCommentDeleted);
      socket.off('reel_share_created', handleShareCreatedSocket);
    };
  }, [handleShareCreated]);

  if (reels.length === 0 && !loading && !paramReelId && hasAttemptedInitialLoad) {
    return (
      <div 
        className="relative h-screen bg-black overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(31, 41, 55, 0.4), rgba(0, 0, 0, 1))',
        }}
      >
        {/* Create Reel Button - still show when no reels */}
        <button
          onClick={() => navigate('/reels/create')}
          className={`fixed md:top-20 top-4 z-30 text-white rounded-full md:p-4 p-3 shadow-2xl transition-all duration-300 cursor-pointer hover:scale-110 hover:shadow-orange-500/50 ${
            showComments ? 'sm:right-[420px] right-4' : 'md:right-4 right-4'
          }`}
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
          }}
          title="Tạo Reel mới"
        >
          <Plus className="md:w-6 md:h-6 w-5 h-5" />
        </button>

        <div className="h-full flex flex-col items-center justify-center gap-4 px-4">
          <div 
            className="md:w-24 md:h-24 w-20 h-20 rounded-full flex items-center justify-center border-2 border-orange-500/30"
            style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.2))',
            }}
          >
            <Plus className="md:w-12 md:h-12 w-10 h-10 text-orange-400" />
          </div>
          <p className="text-white md:text-xl text-lg font-medium text-center">Không có reels nào</p>
          <p className="text-gray-400 md:text-sm text-xs text-center">Hãy tạo reel đầu tiên của bạn!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative h-screen bg-black overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(31, 41, 55, 0.4), rgba(0, 0, 0, 1))',
      }}
    >
      {/* Create Reel Button */}
      <button
        onClick={() => navigate('/reels/create')}
        className={`fixed md:top-20 top-4 z-30 text-white rounded-full md:p-4 p-3 shadow-2xl cursor-pointer hover:scale-110 hover:shadow-orange-500/50 transition-all duration-300 ${
          showComments ? 'sm:right-[420px] right-4' : 'md:right-4 right-4'
        }`}
        style={{
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
        }}
        title="Tạo Reel mới"
      >
        <Plus className="md:w-6 md:h-6 w-5 h-5" />
      </button>

      <div
        ref={containerRef}
        className="h-full w-full transition-transform duration-300"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {reels.map((reel, index) => {
          const vertical = index === currentIndex ? '0%' : index < currentIndex ? '-100%' : '100%';
          const transform = `translateY(${vertical})`;

          return (
            <div
              key={reel.id}
              className={`${!skipTransition ? 'transition-transform duration-300' : ''} absolute top-0 left-0 bottom-0 right-0 ${
                showComments ? 'sm:right-[380px]' : ''
              }`}
              style={{ zIndex: index === currentIndex ? 10 : 1, transform }}
            >
              <ReelPlayer
                reel={reel}
                isActive={index === currentIndex}
                onCommentClick={() => setShowComments((prev) => !prev)}
                showComments={showComments}
                onDelete={handleReelDelete}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onShareClick={handleShareRequest}
                onPrevReel={handlePrevious}
                onNextReel={handleNext}
              />
            </div>
          );
        })}
      </div>

      {/* Feed mode selector */}
      <div
        className={`fixed md:top-20 top-4 z-40 flex gap-1 md:gap-2 bg-black/30 backdrop-blur-md p-1 md:p-1.5 rounded-full border border-white/10 transition-all duration-300 ${
          showComments ? 'sm:right-[520px] md:right-20 right-4' : 'md:right-20 right-4'
        }`}
      >
        <button
          type="button"
          onClick={() => changeMode('default')}
          className={`md:px-4 px-3 md:py-2 py-1.5 rounded-full transition-all duration-300 cursor-pointer md:text-sm text-xs font-semibold ${
            mode === 'default' 
              ? 'text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={mode === 'default' ? {
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
          } : undefined}
        >
          For you
        </button>
        <button
          type="button"
          onClick={() => changeMode('trending')}
          className={`md:px-4 px-3 md:py-2 py-1.5 rounded-full transition-all duration-300 cursor-pointer md:text-sm text-xs font-semibold ${
            mode === 'trending' 
              ? 'text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={mode === 'trending' ? {
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
          } : undefined}
        >
          Trending
        </button>
        <button
          type="button"
          onClick={() => changeMode('random')}
          className={`md:px-4 px-3 md:py-2 py-1.5 rounded-full transition-all duration-300 cursor-pointer md:text-sm text-xs font-semibold ${
            mode === 'random' 
              ? 'text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          style={mode === 'random' ? {
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
          } : undefined}
        >
          Random
        </button>
      </div>

      {/* Navigation buttons removed per request */}

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed md:bottom-8 bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md rounded-full md:px-6 px-4 md:py-3 py-2 border border-orange-500/30 shadow-lg">
          <div className="flex items-center md:gap-3 gap-2">
            <div className="md:w-5 md:h-5 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white md:text-sm text-xs font-medium">Đang tải...</p>
          </div>
        </div>
      )}

      {/* Comments Drawer/Modal */}
      {showComments && reels[currentIndex] && (
        <ReelComments
          reelId={reels[currentIndex].id}
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
