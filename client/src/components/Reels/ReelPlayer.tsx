import { useState, useRef, useEffect } from 'react';
import type { Reel } from '../../types';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { toggleLikeReel, shareReel, deleteReel, viewReel } from '../../services/reelService';
import { notificationSound } from '../../utils/notificationSound';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useVolumeSettings } from '../../hooks/useVolumeSettings';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
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
  showComments?: boolean;
}

export default function ReelPlayer({ reel, isActive, onCommentClick, onDelete, onTouchStart, onTouchMove, onTouchEnd, showComments }: ReelPlayerProps) {
  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel._count?.likes || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  // Use volume settings from localStorage
  const { isMuted, volume, setIsMuted, setVolume } = useVolumeSettings();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useCurrentUser();
  const navigate = useNavigate();

  // views tracking state
  const [viewsCount, setViewsCount] = useState<number>(reel.views || 0);
  const [hasCountedView, setHasCountedView] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        // Try to play; only set isPlaying when play() actually succeeds.
        const p = videoRef.current.play();
        if (p && typeof p.then === 'function') {
          p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          // Non-promise play (old browsers) - assume playing
          setIsPlaying(true);
        }
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  // keep isPlaying in sync with actual video element events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

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
      // Play feedback sound: positive on like, negative on unlike
      try {
        if (result.liked) notificationSound.playPositive();
        else notificationSound.playNegative();
      } catch {
        // ignore audio errors
      }
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  const handleShare = async () => {
    try {
      await shareReel(reel.id);
      alert('Reel shared!');
    } catch (error) {
      console.error('Error sharing reel:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this reel?')) {
      try {
        await deleteReel(reel.id);
        onDelete?.();
      } catch (error) {
        console.error('Error deleting reel:', error);
      }
    }
  };

  // Reflect volume settings on the video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  // time / progress state for seeking UI
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  // Track actual rendered video size so progress bar matches visible video (handles letterboxing)
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number; offsetTop: number } | null>(null);
  const [actionLeft, setActionLeft] = useState<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // update on window resize and when metadata loads
    const updateAll = () => {
      // if we have both intrinsic and container, compute displayed size
      const cSize = containerRef.current?.getBoundingClientRect();
      if (cSize && v.videoWidth && v.videoHeight) {
        const scale = Math.min(cSize.width / v.videoWidth, cSize.height / v.videoHeight);
        const dispW = Math.round(v.videoWidth * scale);
        const dispH = Math.round(v.videoHeight * scale);
        const offsetTop = Math.round((cSize.height - dispH) / 2);
        setDisplayedSize({ width: dispW, height: dispH, offsetTop });
      }
    };

  window.addEventListener('resize', updateAll);
    const onLoaded = () => updateAll();
    v.addEventListener('loadedmetadata', onLoaded);

    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      window.removeEventListener('resize', updateAll);
    };
  }, [reel.videoUrl]);

  // compute action buttons left position so they sit right of the displayed video (outside video area)
  useEffect(() => {
    const computePos = () => {
      const c = containerRef.current;
      if (!c || !displayedSize) {
        setActionLeft(null);
        return;
      }

      const rect = c.getBoundingClientRect();
      // left offset of displayed video inside container
      const innerLeft = Math.max(0, Math.round((rect.width - displayedSize.width) / 2));
      const videoRight = rect.left + innerLeft + displayedSize.width;
      const viewportGap =
        typeof window !== 'undefined'
          ? window.innerWidth >= 1280
            ? 56
            : window.innerWidth >= 1024
              ? 48
              : 32
          : 32;
      const gap = showComments ? 8 : Math.max(24, viewportGap);
      // place actions just to the right of video
      setActionLeft(Math.round(videoRight + gap));
    };

    computePos();
    window.addEventListener('resize', computePos);
    const ro = new ResizeObserver(computePos);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', computePos);
      try {
        ro.disconnect();
      } catch {
        // ignore
      }
    };
  }, [displayedSize, showComments]);

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

  // Reset view-tracking when reel changes
  useEffect(() => {
    setHasCountedView(false);
    setViewsCount(reel.views || 0);
  }, [reel.id, reel.views]);

  // When user watches >= 3 seconds, count a view (once per reel per session)
  useEffect(() => {
    if (!isActive) return;
    if (hasCountedView) return;
    if (currentTime >= 3) {
      setHasCountedView(true);
      // optimistic UI
      setViewsCount((v) => v + 1);
      // fire-and-forget API call
      (async () => {
        try {
          const res = await viewReel(reel.id);
          if (res && typeof res.views === 'number') {
            setViewsCount(res.views);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [currentTime, isActive, hasCountedView, reel.id]);

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVolume = Math.max(0, Math.min(1, Number(e.target.value) / 100));
    setVolume(newVolume);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
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
      className={`relative w-full h-full bg-black flex items-center justify-center ${
        showComments ? 'sm:justify-end' : ''
      }`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Video (portrait box on desktop, full-screen on small screens) */}
      <div
        className={`w-full h-full flex items-center justify-center ${
          showComments ? 'sm:justify-center sm:pr-20' : ''
        }`}
      >
        {/*
          Layout strategy:
          - Mobile/small screens: full-bleed experience (object-cover)
          - Desktop (md and up): fixed portrait container but preserve full video (object-contain)
        */}
        {/* Make desktop container max-width/max-height so video can scale without cropping */}
        <div
          ref={containerRef}
          className={`w-full h-full md:max-w-[880px] md:max-h-[500px] flex items-center justify-center relative ${
            showComments ? 'sm:w-auto sm:mr-12' : ''
          }`}
        >
          <video
            ref={videoRef}
            src={reel.videoUrl}
            // use object-contain and full both width+height so video is never cropped
            className="w-full h-full object-contain cursor-pointer rounded-sm"
            loop
            playsInline
            muted={isMuted}
            onClick={handleVideoClick}
            onDoubleClick={handleDoubleClick}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />

          {/* progress bar placed flush under displayed video content (computed) */}

          {displayedSize ? (
            <div
              onClick={handleProgressClick}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime}
              className="absolute z-50"
              style={{
                top: `${displayedSize.offsetTop + displayedSize.height}px`,
                left: `${Math.max(0, Math.round(((containerRef.current?.clientWidth || displayedSize.width) - displayedSize.width) / 2))}px`,
                width: `${displayedSize.width}px`,
              }}
            >
              <div className="h-9 flex items-center cursor-pointer">
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
          ) : null}

          {/* Play/Pause button at top-left + Volume control */}
          {displayedSize ? (
            <div
              className="absolute pointer-events-auto flex items-center gap-2"
              style={{
                top: `${displayedSize.offsetTop + 12}px`,
                left: `${Math.max(0, Math.round(((containerRef.current?.clientWidth || displayedSize.width) - displayedSize.width) / 2)) + 12}px`,
              }}
            >
              {/* Play/Pause button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoClick();
                }}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-black/60 hover:bg-black/75 transition-colors cursor-pointer shrink-0"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white fill-white" />
                ) : (
                  <Play className="w-6 h-6 text-white fill-white" />
                )}
              </button>

              {/* Volume control (compact by default, expands on hover) */}
              <div
                className="flex items-center gap-0 rounded-full bg-black/60 py-2 pl-2 transition-all duration-200"
                style={{
                  paddingRight: showVolumeSlider ? '12px' : '8px',
                }}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                {/* Mute/Unmute button (circular like play/pause) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-black/40 transition-colors cursor-pointer shrink-0 -m-2 p-2"
                  aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-6 h-6 text-white" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-white" />
                  )}
                </button>

                {/* Volume slider (visible only on hover) */}
                {showVolumeSlider && (
                  <div className="relative w-24 h-6 ml-1">
                    {/* Visual track (thin, centered) */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-white/20 rounded-full pointer-events-none" />
                    {/* Filled track */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-orange-400 rounded-full pointer-events-none"
                      style={{ width: `${isMuted ? 0 : Math.round(volume * 100)}%` }}
                    />
                    {/* Input range */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : Math.round(volume * 100)}
                      onChange={handleVolumeChange}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
                      style={{ accentColor: '#fb923c' }}
                      aria-label="Volume"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Bottom-left profile + description (constrained to displayed video area) + volume control */}
          {displayedSize ? (
            <div
              className="absolute"
              style={{
                left: `${Math.max(0, Math.round(((containerRef.current?.clientWidth || displayedSize.width) - displayedSize.width) / 2) ) + 24}px`,
                bottom: '24px',
                width: `${Math.max(0, Math.round((displayedSize.width - 48) * 0.66))}px`,
                pointerEvents: 'none' as const,
              }}
            >
              <div className="pointer-events-auto" style={{ display: 'flex', gap: 12, alignItems: 'center' }} onClick={() => navigate(`/profile/${reel.user?.username}`)}>
                <img
                  src={reel.user?.avatar || '/default-avatar.png'}
                  alt={reel.user?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-white font-semibold">{reel.user?.name}</h3>
                  <p className="text-white/80 text-sm">{formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true, locale: enUS })}</p>
                </div>
              </div>

              {reel.description && (
                <div className="pointer-events-auto mt-2">
                  <p className={`text-white ${descExpanded ? '' : 'line-clamp-3'} max-w-full wrap-break-word whitespace-normal`}>{reel.description}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDescExpanded((s) => !s); }}
                    className="text-white/80 text-sm mt-1 cursor-pointer"
                  >
                    {descExpanded ? 'Show less' : 'See more'}
                  </button>
                </div>
              )}
              <p className="text-white/60 text-sm mt-1 pointer-events-none">{viewsCount.toLocaleString()} views</p>
            </div>
          ) : null}

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
                  Delete reel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Right-side vertical action buttons centered (fixed to viewport so they don't move when comments open) */}
        <div
          className="fixed top-1/2 -translate-y-1/2 pointer-events-auto z-40"
          style={
            actionLeft
              ? { left: `${actionLeft}px` }
              : {
                  right: showComments
                    ? 'clamp(24px, 6vw, 180px)'
                    : 'clamp(64px, 14vw, 200px)',
                }
          }
        >
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


          </div>
        </div>

        
      </div>
    </div>
  );
}
