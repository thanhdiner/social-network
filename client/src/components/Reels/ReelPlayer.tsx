import { useState, useRef, useEffect } from 'react';
import type { Reel } from '../../types';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, MoreVertical } from 'lucide-react';
import { toggleLikeReel, shareReel, deleteReel } from '../../services/reelService';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  onCommentClick: () => void;
  onDelete?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  isMuted?: boolean;
  onToggleGlobalMute?: () => void;
}

export default function ReelPlayer({ reel, isActive, onCommentClick, onDelete, onTouchStart, onTouchMove, onTouchEnd, isMuted = true, onToggleGlobalMute }: ReelPlayerProps) {
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel._count?.likes || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user: currentUser } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {
          // Autoplay was prevented
        });
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleLike = async () => {
    try {
      const result = await toggleLikeReel(reel.id);
      setIsLiked(result.liked);
      setLikesCount((prev) => (result.liked ? prev + 1 : prev - 1));
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  const handleShare = async () => {
    try {
      await shareReel(reel.id);
      alert('Đã chia sẻ reel!');
    } catch (error) {
      console.error('Error sharing reel:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Bạn có chắc muốn xóa reel này?')) {
      try {
        await deleteReel(reel.id);
        onDelete?.();
      } catch (error) {
        console.error('Error deleting reel:', error);
      }
    }
  };

  const toggleMute = () => {
    // Toggle global mute via parent
    onToggleGlobalMute?.();
  };

  // Reflect external mute prop on the video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !!isMuted;
    }
  }, [isMuted]);

  // time / progress state for seeking UI
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => setCurrentTime(v.currentTime);
    const onLoaded = () => setDuration(v.duration || 0);

    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onLoaded);

    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onLoaded);
    };
  }, []);

  // Double-click: left half -> rewind 10s, right half -> forward 10s
  const handleDoubleClick = (e: React.MouseEvent) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = rect.width / 2;
    const delta = half && x < half ? -10 : 10;
    v.currentTime = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta));
    setCurrentTime(v.currentTime);
  };

  // Keyboard seek when active
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v || !isActive) return;
      if (e.key === 'ArrowRight') {
        v.currentTime = Math.min((v.duration || 0), v.currentTime + 5);
      } else if (e.key === 'ArrowLeft') {
        v.currentTime = Math.max(0, v.currentTime - 5);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive]);

  // Click on progress bar to seek
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    // Use currentTarget so clicks on the fill element still measure against the full bar
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    v.currentTime = pct * duration;
    setCurrentTime(v.currentTime);
  };

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Video (portrait box on desktop, full-screen on small screens) */}
      <div className="w-full h-full flex items-center justify-center">
        {/*
          Layout strategy:
          - Mobile/small screens: full-bleed experience (object-cover)
          - Desktop (md and up): fixed portrait container but preserve full video (object-contain)
        */}
        <div className="w-full h-full md:w-[420px] md:h-[720px] flex items-center justify-center relative">
          <video
            ref={videoRef}
            src={reel.videoUrl}
            className="w-full h-full object-cover md:object-contain cursor-pointer rounded-sm"
            loop
            playsInline
            muted={isMuted}
            onClick={handleVideoClick}
            onDoubleClick={handleDoubleClick}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />

          {/* small clickable progress bar (larger hit area) */}
          <div className="absolute left-0 right-0 bottom-2 px-6">
            <div className="h-9 flex items-center cursor-pointer" onClick={handleProgressClick}>
              <div className="w-full">
                <div className="h-1 bg-white/20 rounded-full pointer-events-none">
                  <div
                    className="h-1 bg-orange-500 rounded-full pointer-events-none"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top progress bar constrained to video width */}
        {/* Top progress bar constrained to video width. Larger hit area for easier clicks. */}
        <div className="absolute left-0 right-0 top-3 flex justify-center z-50 pointer-events-auto">
          <div className="w-full md:w-[420px] px-4">
            <div className="h-9 flex items-center cursor-pointer" onClick={handleProgressClick} role="progressbar" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime}>
              <div className="w-full">
                <div className="h-1 bg-white/20 rounded-full pointer-events-none">
                  <div
                    className="h-1 bg-orange-500 rounded-full pointer-events-none"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top-right menu (owner actions) */}
        {currentUser?.id === reel.userId && (
          <div className="absolute top-4 right-4 pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-white">
                <MoreVertical className="w-6 h-6" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 cursor-pointer">
                  Xóa reel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Right-side vertical action buttons centered (moved left to avoid nav buttons) */}
        <div className="absolute right-20 top-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="flex flex-col items-center gap-6">
            <button onClick={handleLike} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className="bg-black/40 rounded-full p-2">
                <Heart
                  className={`w-8 h-8 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`}
                />
              </div>
              <span className="text-white text-xs mt-1">{likesCount}</span>
            </button>

            <button onClick={onCommentClick} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className="bg-black/40 rounded-full p-2">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <span className="text-white text-xs mt-1">{reel._count?.comments || 0}</span>
            </button>

            <button onClick={handleShare} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className="bg-black/40 rounded-full p-2">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <span className="text-white text-xs mt-1">{reel._count?.shares || 0}</span>
            </button>

            <button onClick={toggleMute} className="flex flex-col items-center gap-1 cursor-pointer">
              <div className="bg-black/40 rounded-full p-2">
                {isMuted ? (
                  <VolumeX className="w-8 h-8 text-white" />
                ) : (
                  <Volume2 className="w-8 h-8 text-white" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Bottom-left profile + description (constrained to video width) */}
        <div className="absolute left-6 bottom-6 pointer-events-auto max-w-[420px] w-[calc(100%-96px)]">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${reel.user?.username}`)}>
            <img
              src={reel.user?.avatar || '/default-avatar.png'}
              alt={reel.user?.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="text-white font-semibold">{reel.user?.name}</h3>
              <p className="text-white/80 text-sm">
                {formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true, locale: vi })}
              </p>
            </div>
          </div>

          {reel.description && (
            <p className="text-white mt-2 line-clamp-3">{reel.description}</p>
          )}
          <p className="text-white/60 text-sm mt-1">{reel.views.toLocaleString()} lượt xem</p>
        </div>
      </div>
    </div>
  );
}
