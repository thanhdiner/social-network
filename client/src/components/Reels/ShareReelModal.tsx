import { useState } from 'react';
import { X, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { ReelSummary } from '../../types';
import { shareReel, type ShareReelResponse } from '../../services/reelService';

interface ShareReelModalProps {
  reel: ReelSummary;
  open: boolean;
  onClose: () => void;
  onShared: (response: ShareReelResponse) => void;
  currentUserName: string;
  currentUserAvatar?: string | null;
}

export function ShareReelModal({
  reel,
  open,
  onClose,
  onShared,
  currentUserName,
  currentUserAvatar,
}: ShareReelModalProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    setContent('');
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await shareReel(reel.id, {
        content: content.trim() || undefined,
      });
      onShared(response);
      handleClose();
    } catch (error) {
      console.error('Failed to share reel:', error);
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response
          ? ((error.response as Record<string, unknown>).data as Record<string, unknown>)?.message
          : 'Failed to share reel. Please try again.';
      alert((message as string) || 'Failed to share reel. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ownerAvatar =
    reel.user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(reel.user?.name || 'User')}&background=fb923c&color=fff`;

  const sharerAvatar =
    currentUserAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=fb923c&color=fff`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800">Share Reel</h2>
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-full p-2 text-gray-500 hover:bg-gray-100 transition"
            aria-label="Close share reel modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
            <div className="flex gap-3">
              <img
                src={sharerAvatar}
                alt={currentUserName}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{currentUserName}</div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Globe className="h-3 w-3" />
                  <span>Public</span>
                </div>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Say something about this reel..."
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
            />

            <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
              <div className="mb-3 flex items-start gap-3">
                <img
                  src={ownerAvatar}
                  alt={reel.user?.name || 'User'}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-800">{reel.user?.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true, locale: enUS })}
                  </div>
                </div>
              </div>

              {reel.description ? (
                <p className="mb-3 whitespace-pre-wrap text-sm text-gray-700">{reel.description}</p>
              ) : null}

              <div className="overflow-hidden rounded-lg bg-black">
                <video src={reel.videoUrl} controls className="max-h-64 w-full object-contain" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 p-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-lg bg-orange-600 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Sharing...' : 'Share Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
