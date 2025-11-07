import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Reel } from '@/types';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';

interface SharedReelPreviewProps {
  reel: Reel;
  className?: string;
}

export function SharedReelPreview({ reel, className }: SharedReelPreviewProps) {
  const owner = reel.user;
  const ownerName = owner?.name ?? 'User';
  const ownerUsername = owner?.username ?? owner?.id ?? '';
  const ownerAvatar =
    owner?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=fb923c&color=fff`;
  const profileHref = ownerUsername ? `/profile/${ownerUsername}` : undefined;
  const reelHref = `/reels/${reel.id}`;

  return (
    <div className={cn('border border-gray-200 rounded-xl p-4 mb-4 bg-white/60', className)}>
      <div className="flex gap-3 mb-3">
        {profileHref ? (
          <Link to={profileHref} className="cursor-pointer">
            <Avatar src={ownerAvatar} name={ownerName} size="md" />
          </Link>
        ) : (
          <Avatar src={ownerAvatar} name={ownerName} size="md" />
        )}
        <div>
          {profileHref ? (
            <Link
              to={profileHref}
              className="font-semibold text-gray-800 hover:text-orange-600 transition cursor-pointer"
            >
              {ownerName}
            </Link>
          ) : (
            <p className="font-semibold text-gray-800">{ownerName}</p>
          )}
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {reel.shareContent ? (
        <p className="text-sm text-gray-600 italic mb-2 whitespace-pre-wrap">
          {reel.shareContent}
        </p>
      ) : null}

      {reel.description ? (
        <p className="text-gray-800 mb-3 whitespace-pre-wrap text-sm">{reel.description}</p>
      ) : null}

      <Link
        to={reelHref}
        className="relative mt-2 block overflow-hidden rounded-lg bg-black/80 group cursor-pointer"
      >
        {reel.thumbnailUrl ? (
          <img
            src={reel.thumbnailUrl}
            alt={reel.description || 'Reel preview'}
            className="w-full max-h-[420px] object-cover"
          />
        ) : (
          <video
            src={reel.videoUrl}
            muted
            loop
            playsInline
            className="w-full max-h-[420px] object-contain bg-black"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <Play className="h-12 w-12 text-white drop-shadow" />
        </div>
      </Link>

      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span>{reel._count?.likes ?? 0} likes</span>
        <span>{reel._count?.comments ?? 0} comments</span>
        <span>{reel._count?.shares ?? 0} shares</span>
      </div>
    </div>
  );
}
