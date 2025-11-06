import { useState, useEffect, useRef, useCallback } from 'react';
import type { Reel } from '../../types';
import { getReels, getReel } from '../../services/reelService';
import ReelPlayer from '../../components/Reels/ReelPlayer';
import ReelComments from '../../components/Reels/ReelComments';
import { ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { useTitle } from '../../hooks/useTitle';
import { useNavigate, useParams } from 'react-router-dom';

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
  const [skipTransition, setSkipTransition] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelAt = useRef<number>(0);

  const loadReels = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const data = await getReels(page, 10);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setReels((prev) => [...prev, ...data]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error loading reels:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  useEffect(() => {
    loadReels();
  }, [loadReels]);

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
        loadReels();
      }
    }
  }, [currentIndex, reels.length, loadReels]);

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

  if (reels.length === 0 && !loading && !paramReelId) {
    return (
      <div className="relative h-screen bg-black">
        {/* Create Reel Button - still show when no reels */}
        <button
          onClick={() => navigate('/reels/create')}
          className="fixed top-20 right-4 z-30 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-lg transition-colors cursor-pointer"
          title="Tạo Reel mới"
        >
          <Plus className="w-6 h-6" />
        </button>

        <div className="h-full flex items-center justify-center">
          <p className="text-white text-xl">Không có reels nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Create Reel Button */}
      <button
        onClick={() => navigate('/reels/create')}
        className="fixed top-20 right-4 z-30 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-lg transition-colors cursor-pointer"
        title="Tạo Reel mới"
      >
        <Plus className="w-6 h-6" />
      </button>

      <div
        ref={containerRef}
        className="h-full w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            className={`absolute inset-0 ${!skipTransition ? 'transition-transform duration-300' : ''} ${
              index === currentIndex
                ? 'translate-y-0'
                : index < currentIndex
                  ? '-translate-y-full'
                  : 'translate-y-full'
            }`}
            style={{ zIndex: index === currentIndex ? 10 : 1 }}
          >
            <ReelPlayer
              reel={reel}
                isActive={index === currentIndex}
                onCommentClick={() => setShowComments(true)}
                onDelete={handleReelDelete}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />
          </div>
        ))}
      </div>

      {/* Navigation Buttons (moved further right so action icons sit left of them) */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
        {currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="bg-black/40 hover:bg-black/50 backdrop-blur-sm rounded-full p-3 transition-colors cursor-pointer border border-white/10"
          >
            <ChevronUp className="w-6 h-6 text-white" />
          </button>
        )}
        {currentIndex < reels.length - 1 && (
          <button
            onClick={handleNext}
            className="bg-black/40 hover:bg-black/50 backdrop-blur-sm rounded-full p-3 transition-colors cursor-pointer border border-white/10"
          >
            <ChevronDown className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
          <p className="text-white text-sm">Đang tải...</p>
        </div>
      )}

      {/* Comments Modal */}
      {showComments && reels[currentIndex] && (
        <ReelComments
          reelId={reels[currentIndex].id}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
