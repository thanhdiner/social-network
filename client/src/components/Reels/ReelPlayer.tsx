import { useState, useRef, useEffect } from 'react';
import type { Reel } from '../../types';
import { Heart, MessageCircle, Share2, MoreVertical, Play, Pause, Volume2, VolumeX, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { toggleLikeReel, deleteReel, viewReel } from '../../services/reelService';
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
  onShareClick?: (reel: Reel) => void;
  /** Optional handlers to navigate reels (previous/next). Provided by parent page. */
  onPrevReel?: () => void;
  onNextReel?: () => void;
}

export default function ReelPlayer({
  reel,
  isActive,
  onCommentClick,
  onDelete,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  showComments,
  onShareClick,
  onPrevReel,
  onNextReel,
}: ReelPlayerProps) {
  const contentReel = reel.sharedFrom ?? reel;

  const [isLiked, setIsLiked] = useState(reel.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel._count?.likes || 0);
  const [sharesCount, setSharesCount] = useState(contentReel._count?.shares || 0);
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
  
  // aspect ratio detection
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setIsLiked(!!reel.isLiked);
  }, [reel.isLiked]);

  useEffect(() => {
    setLikesCount(reel._count?.likes || 0);
  }, [reel._count?.likes]);

  useEffect(() => {
    const nextShares =
      reel.sharedFrom?._count?.shares ?? contentReel._count?.shares ?? 0;
    setSharesCount(nextShares);
  }, [contentReel._count?.shares, reel.sharedFrom?._count?.shares, reel.sharedFrom?.id]);

  useEffect(() => {
    setViewsCount(reel.views || 0);
    setHasCountedView(false);
  }, [reel.id, reel.views]);

  useEffect(() => {
    setDescExpanded(false);
  }, [reel.id]);

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

  const handleShareClick = () => {
    onShareClick?.(reel);
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
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number; offsetTop: number; offsetLeft: number } | null>(null);
  const [actionLeft, setActionLeft] = useState<number | null>(null);
  // When true, hide overlay UI elements so video isn't covered
  const [overlaysHidden, setOverlaysHidden] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // update on window resize and when metadata loads
    const updateAll = () => {
      // if we have both intrinsic and container, compute displayed size
      const cSize = containerRef.current?.getBoundingClientRect();
      if (cSize && v.videoWidth && v.videoHeight) {
        const ratio = v.videoWidth / v.videoHeight;
        setAspectRatio(ratio);
        
        const scale = Math.min(cSize.width / v.videoWidth, cSize.height / v.videoHeight);
        const dispW = Math.round(v.videoWidth * scale);
        const dispH = Math.round(v.videoHeight * scale);
        const offsetTop = Math.round((cSize.height - dispH) / 2);
        const offsetLeft = Math.round((cSize.width - dispW) / 2);
        setDisplayedSize({ width: dispW, height: dispH, offsetTop, offsetLeft });
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
      // Use the calculated offsetLeft from displayedSize
      const videoRight = rect.left + displayedSize.offsetLeft + displayedSize.width;
      
      // Gap between video and action buttons
      const gap = 24;
      
      // Calculate desired position
      const desiredLeft = videoRight + gap;
      
      // When comments are open, drawer is 380px on desktop (sm breakpoint)
      // Leave space for drawer + some margin
      const commentsDrawerWidth = window.innerWidth >= 640 ? 380 : 0;
      const maxLeft = showComments 
        ? window.innerWidth - commentsDrawerWidth - 100 // Leave 100px for buttons
        : window.innerWidth - 100;
      
      // Use the smaller value to keep buttons in viewport
      setActionLeft(Math.round(Math.min(desiredLeft, maxLeft)));
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

  // Precompute style for the action column to keep JSX cleaner and avoid inline boolean expressions
  const actionStyle: React.CSSProperties =
    actionLeft && actionLeft < (showComments && window.innerWidth >= 640 ? window.innerWidth - 580 : window.innerWidth - 80)
      ? { left: `${actionLeft}px` }
      : {
          right:
            showComments && window.innerWidth >= 640
              ? '8px'
              : showComments
              ? '-100px'
              : '80px',
        };

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
        showComments ? 'sm:justify-center' : ''
      }`}
      style={{
        background: 'radial-gradient(ellipse at top, rgba(31, 41, 55, 0.6), rgba(0, 0, 0, 1))',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Video (portrait box on desktop, full-screen on small screens) */}
      <div
        className="w-full h-full flex items-center justify-center"
      >
        {/*
          Layout strategy:
          - Mobile/small screens: full-bleed experience (object-cover)
          - Desktop (md and up): fixed portrait container but preserve full video (object-contain)
        */}
        {/* Make desktop container max-width/max-height so video can scale without cropping */}
        <div
          ref={containerRef}
          className={`w-full h-full flex items-center justify-center relative ${
            showComments ? 'sm:mr-0' : ''
          }`}
          style={{
            maxWidth: aspectRatio && aspectRatio > 1.5 ? '880px' : '880px',
            maxHeight: '500px',
            // If comments are open and this is a wide (16:9+) video,
            // shift the video slightly left so it moves toward the
            // comments panel (user requested left shift).
            transform:
              showComments && aspectRatio && aspectRatio > 1.5
                ? 'translateX(-10px)'
                : undefined,
          }}
        >
          <video
            ref={videoRef}
            src={contentReel.videoUrl}
            // use object-contain and full both width+height so video is never cropped
            className="w-full h-full object-contain cursor-pointer rounded-lg shadow-2xl"
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

          {displayedSize && !overlaysHidden ? (
            <div
              onClick={handleProgressClick}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime}
              className="absolute z-50 group"
              style={{
                top: `${displayedSize.offsetTop + displayedSize.height}px`,
                left: `${displayedSize.offsetLeft}px`,
                width: `${displayedSize.width}px`,
              }}
            >
              <div className="h-9 flex items-center cursor-pointer px-2">
                <div className="w-full relative">
                  <div className="h-1 bg-white/20 rounded-full pointer-events-none overflow-hidden">
                    <div
                      className="h-1 rounded-full pointer-events-none transition-all duration-300"
                      style={{ 
                        width: duration ? `${(currentTime / duration) * 100}%` : '0%',
                        background: 'linear-gradient(to right, #fb923c, #f97316, #ea580c)',
                        boxShadow: '0 0 8px rgba(251, 146, 60, 0.6)',
                      }}
                    />
                  </div>
                  {/* Hover indicator */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none"
                    style={{ 
                      left: duration ? `calc(${(currentTime / duration) * 100}% - 6px)` : '0',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Top-right menu (owner actions) - render inside the displayed video area (top-right of video) */}
          {currentUser?.id === reel.userId && displayedSize && (
            <div
              // position relative to the computed displayedSize so the menu sits inside the video
              className="absolute pointer-events-auto z-50"
              style={{
                top: `${displayedSize.offsetTop + 12}px`,
                // place near the right edge of displayed video; subtract width approx (48px) to keep inside
                left: `${displayedSize.offsetLeft + displayedSize.width - 56}px`,
              }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger className="text-white flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm shadow-lg hover:bg-orange-500/20 transition-all duration-200 cursor-pointer">
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

          {/* Play/Pause button at top-left + Volume control */}
          {displayedSize ? (
            <div
              className="absolute pointer-events-auto flex items-center gap-2"
              style={{
                top: `${displayedSize.offsetTop + 12}px`,
                left: `${displayedSize.offsetLeft + 12}px`,
              }}
            >
              {/* Play/Pause button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoClick();
                }}
                className="flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-sm transition-all duration-300 cursor-pointer shrink-0 shadow-lg hover:shadow-orange-500/50 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(234, 88, 12, 0.9))',
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white fill-white" />
                ) : (
                  <Play className="w-6 h-6 text-white fill-white" />
                )}
              </button>

              {/* Toggle overlays (hide/show) - always present in this control area so user can unhide */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOverlaysHidden((s) => !s);
                }}
                className="flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-sm transition-all duration-200 cursor-pointer shrink-0 shadow-lg hover:bg-orange-500/20"
                style={{ zIndex: 60 }}
                aria-label={overlaysHidden ? 'Show overlays' : 'Hide overlays'}
                title={overlaysHidden ? 'Show overlays' : 'Hide overlays'}
              >
                {overlaysHidden ? (
                  <Eye className="w-5 h-5 text-white" />
                ) : (
                  <EyeOff className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Volume control (compact by default, expands on hover) */}
              <div
                className="flex items-center gap-0 rounded-full bg-black/40 backdrop-blur-md py-2 pl-2 transition-all duration-200 border border-white/10"
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
                  className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-orange-500/20 transition-all duration-200 cursor-pointer shrink-0 -m-2 p-2"
                  aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-6 h-6 text-white" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-orange-400" />
                  )}
                </button>

                {/* Volume slider (visible only on hover) */}
                {showVolumeSlider && (
                  <div className="relative w-24 h-6 ml-1 animate-in fade-in slide-in-from-left-2 duration-200">
                    {/* Visual track (thin, centered) */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-white/20 rounded-full pointer-events-none" />
                    {/* Filled track */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none transition-all duration-150"
                      style={{ 
                        width: `${isMuted ? 0 : Math.round(volume * 100)}%`,
                        background: 'linear-gradient(to right, #fb923c, #f97316)',
                        boxShadow: '0 0 6px rgba(251, 146, 60, 0.5)',
                      }}
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
          {displayedSize && !overlaysHidden ? (() => {
            const contentWidth = Math.max(0, Math.round((displayedSize.width - 48) * 0.66));
            return (
              <>
                {/* Share owner notification removed */}

                <div
                  className="absolute"
                  style={{
                    left: `${displayedSize.offsetLeft + 24}px`,
                    bottom: '24px',
                    width: `${contentWidth}px`,
                    pointerEvents: 'none' as const,
                  }}
                >
                  <div
                    className="pointer-events-auto flex items-center gap-3 cursor-pointer group"
                    onClick={() => {
                      if (contentReel.user?.username) {
                        navigate(`/profile/${contentReel.user.username}?tab=reels`);
                      }
                    }}
                  >
                    <div className="relative">
                      {/* wrapper enforces circular crop and keeps border separate from image pixels */}
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500/50 group-hover:border-orange-500 transition-all duration-300 shadow-lg bg-transparent">
                        <img
                          src={contentReel.user?.avatar || '/default-avatar.png'}
                          alt={contentReel.user?.name || 'User'}
                          className="w-full h-full object-cover block"
                        />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-orange-500/0 group-hover:bg-orange-500/20 transition-all duration-300"></div>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold group-hover:text-orange-400 transition-colors duration-200">{contentReel.user?.name}</h3>
                      <p className="text-white/70 text-sm">
                        {formatDistanceToNow(new Date(contentReel.createdAt), { addSuffix: true, locale: enUS })}
                      </p>
                    </div>
                  </div>

                  {contentReel.description ? (
                    <div className="pointer-events-auto mt-3 bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                      <p className={`text-white ${descExpanded ? '' : 'line-clamp-3'} max-w-full wrap-break-word whitespace-normal`}>
                        {contentReel.description}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDescExpanded((s) => !s);
                        }}
                        className="text-orange-400 hover:text-orange-300 text-sm mt-2 cursor-pointer font-medium transition-colors duration-200"
                      >
                        {descExpanded ? 'Show less' : 'See more'}
                      </button>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 mt-2 pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-orange-500/30">
                      <p className="text-orange-400 text-sm font-medium">{viewsCount.toLocaleString()} views</p>
                    </div>
                  </div>
                </div>
              </>
            );
          })() : null}

        </div>

        

        {/* Right-side vertical action buttons centered (fixed to viewport so they don't move when comments open) */}
        <div
          className="fixed top-1/2 -translate-y-1/2 pointer-events-auto z-40 transition-all duration-300"
          style={actionStyle}
        >
          <div className="flex flex-col items-center gap-5 bg-black/20 backdrop-blur-md rounded-full p-3 border border-white/10 shadow-xl">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevReel?.();
              }}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm p-2 hover:bg-orange-500/20 transition-colors duration-200 cursor-pointer"
              aria-label="Previous reel"
              title="Up"
            >
              <ArrowUp className="w-5 h-5 text-white" />
            </button>

            <button 
              onClick={handleLike} 
              className="flex flex-col items-center gap-1 cursor-pointer group transition-transform duration-200 hover:scale-110"
            >
              <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 group-hover:bg-orange-500/20 transition-all duration-300 border border-white/10 group-hover:border-orange-500/50">
                <Heart
                  className={`w-7 h-7 transition-all duration-300 ${isLiked ? 'fill-orange-500 text-orange-500 animate-pulse' : 'text-white group-hover:text-orange-400'}`}
                />
              </div>
              <span className={`text-xs mt-1 font-semibold ${isLiked ? 'text-orange-400' : 'text-white'}`}>{likesCount}</span>
            </button>

            <button 
              onClick={onCommentClick} 
              className="flex flex-col items-center gap-1 cursor-pointer group transition-transform duration-200 hover:scale-110"
            >
              <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 group-hover:bg-orange-500/20 transition-all duration-300 border border-white/10 group-hover:border-orange-500/50">
                <MessageCircle className="w-7 h-7 text-white group-hover:text-orange-400 transition-colors duration-300" />
              </div>
              <span className="text-white text-xs mt-1 font-semibold">{reel._count?.comments || 0}</span>
            </button>

            <button
              onClick={handleShareClick}
              className="flex flex-col items-center gap-1 cursor-pointer group transition-transform duration-200 hover:scale-110"
            >
              <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 group-hover:bg-orange-500/20 transition-all duration-300 border border-white/10 group-hover:border-orange-500/50">
                <Share2 className="w-7 h-7 text-white group-hover:text-orange-400 transition-colors duration-300" />
              </div>
              <span className="text-white text-xs mt-1 font-semibold">{sharesCount}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onNextReel?.();
              }}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm p-2 hover:bg-orange-500/20 transition-colors duration-200 cursor-pointer"
              aria-label="Next reel"
              title="Down"
            >
              <ArrowDown className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        
      </div>
    </div>
  );
}
