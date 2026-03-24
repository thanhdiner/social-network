import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { X, Send, MessageCircle, Loader2, Trash2, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import socketService from '../../services/socketService';
import type { Notification } from '../../services/notificationService';
import type { ReelComment } from '../../types';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  createReelComment,
  deleteReelComment,
  getReelCommentReplies,
  getReelComments,
} from '../../services/reelService';
import { Avatar } from '../shared/Avatar';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import uploadService from '../../services/uploadService';
import geminiService from '../../services/geminiService';

interface ReelCommentsProps {
  reelId: string;
  onClose: () => void;
  isDrawer?: boolean;
}

type ReplyCacheEntry = {
  items: ReelComment[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
};

type ReelCommentDeletedPayload = {
  reelId: string;
  commentId: string;
  parentId?: string | null;
  removedCount?: number;
  removedReplies?: number;
};

const COMMENTS_PAGE_SIZE = 10;
const REPLIES_PAGE_SIZE = 10;

export default function ReelComments({ reelId, onClose, isDrawer }: ReelCommentsProps) {
  const { user: currentUser } = useCurrentUser();
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; mention?: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [repliesState, setRepliesState] = useState<Record<string, ReplyCacheEntry>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(() => new Set());
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const commentImageInputRef = useRef<HTMLInputElement>(null);
  const replyImageInputRef = useRef<HTMLInputElement>(null);
  const [commentImageUrl, setCommentImageUrl] = useState<string | null>(null);
  const [replyImageUrl, setReplyImageUrl] = useState<string | null>(null);
  const [isUploadingCommentImage, setIsUploadingCommentImage] = useState(false);
  const [isUploadingReplyImage, setIsUploadingReplyImage] = useState(false);
  const [isAiProcessingComment, setIsAiProcessingComment] = useState(false);
  const [isAiProcessingReply, setIsAiProcessingReply] = useState(false);

  const loadComments = useCallback(
    async (pageToLoad = 1) => {
      if (pageToLoad === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const data = await getReelComments(reelId, pageToLoad, COMMENTS_PAGE_SIZE);
        setComments((prev) => (pageToLoad === 1 ? data : [...prev, ...data]));
        setHasMore(data.length === COMMENTS_PAGE_SIZE);
        setPage(pageToLoad);
      } catch (error) {
        console.error('Failed to load reel comments', error);
        if (pageToLoad === 1) {
          setComments([]);
          setHasMore(false);
        }
      } finally {
        if (pageToLoad === 1) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [reelId],
  );

  const loadReplies = useCallback(async (commentId: string, pageToLoad = 1) => {
    setRepliesState((prev) => {
      const current =
        prev[commentId] ?? {
          items: [],
          page: 0,
          hasMore: false,
          isLoading: false,
          isLoadingMore: false,
        };

      return {
        ...prev,
        [commentId]: {
          ...current,
          isLoading: pageToLoad === 1,
          isLoadingMore: pageToLoad > 1,
        },
      };
    });

    try {
      const data = await getReelCommentReplies(commentId, pageToLoad, REPLIES_PAGE_SIZE);
      setRepliesState((prev) => {
        const current =
          prev[commentId] ?? {
            items: [],
            page: 0,
            hasMore: false,
            isLoading: false,
            isLoadingMore: false,
          };
        const items = pageToLoad === 1 ? data : [...current.items, ...data];

        return {
          ...prev,
          [commentId]: {
            items,
            page: pageToLoad,
            hasMore: data.length === REPLIES_PAGE_SIZE,
            isLoading: false,
            isLoadingMore: false,
          },
        };
      });
    } catch (error) {
      console.error('Failed to load reel comment replies', error);
      setRepliesState((prev) => {
        const current =
          prev[commentId] ?? {
            items: [],
            page: 0,
            hasMore: false,
            isLoading: false,
            isLoadingMore: false,
          };

        return {
          ...prev,
          [commentId]: {
            ...current,
            isLoading: false,
            isLoadingMore: false,
          },
        };
      });
    }
  }, []);

  useEffect(() => {
    setRepliesState({});
    setExpandedComments(() => new Set());
    setReplyTarget(null);
    setReplyContent('');
    setNewComment('');
    loadComments(1);

    // Realtime: listen for socket events for new comments/replies or notifications
    const socket = socketService.getSocket();

    const onNewNotification = (notif: Notification) => {
      try {
        if (!notif) return;
        // If notification references this reel and is a comment, refresh comments
        if (notif.type === 'comment' && notif.relatedId === reelId) {
          void loadComments(1);
        }
      } catch (err) {
        console.error('Error handling incoming notification', err);
      }
    };

    const onReelCommentCreated = (payload: ReelComment) => {
      try {
        if (!payload) return;
        if (payload.reelId !== reelId) return;

        // If it's a root comment, prepend
        if (!payload.parentId) {
          setComments((prev) => {
            if (prev.some((comment) => comment.id === payload.id)) {
              return prev;
            }
            return [payload, ...prev];
          });
        } else {
          // It's a reply — ensure we add to replies cache and increment count
          const parentId = payload.parentId as string;
          let inserted = false;
          setRepliesState((prev) => {
            const current = prev[parentId] ?? { items: [], page: 0, hasMore: false, isLoading: false, isLoadingMore: false };
            if (current.items.some((reply) => reply.id === payload.id)) {
              return prev;
            }
            inserted = true;
            return {
              ...prev,
              [parentId]: {
                ...current,
                items: [...current.items, payload],
              },
            };
          });

          if (inserted) {
            setComments((prev) =>
              prev.map((c) =>
                c.id === parentId
                  ? {
                      ...c,
                      _count: {
                        replies: (c._count?.replies || 0) + 1,
                      },
                    }
                  : c,
              ),
            );
          }
        }
      } catch (err) {
        console.error('Failed to apply realtime reel comment', err);
      }
    };

    socket?.on('new_notification', onNewNotification);
    socket?.on('reel_comment_created', onReelCommentCreated);
    const onReelCommentDeleted = (payload: ReelCommentDeletedPayload) => {
      try {
        if (!payload || payload.reelId !== reelId) return;

        if (!payload.parentId) {
          setComments((prev) => prev.filter((comment) => comment.id !== payload.commentId));
          setRepliesState((prev) => {
            if (!(payload.commentId in prev)) {
              return prev;
            }
            const next = { ...prev };
            delete next[payload.commentId];
            return next;
          });
          setExpandedComments((prev) => {
            if (!prev.has(payload.commentId)) return prev;
            const next = new Set(prev);
            next.delete(payload.commentId);
            return next;
          });
        } else {
          const parentId = payload.parentId;
          setRepliesState((prev) => {
            const current = prev[parentId];
            if (!current) return prev;
            return {
              ...prev,
              [parentId]: {
                ...current,
                items: current.items.filter((reply) => reply.id !== payload.commentId),
              },
            };
          });

          setComments((prev) =>
            prev.map((comment) =>
              comment.id === parentId
                ? {
                    ...comment,
                    _count: {
                      replies: Math.max(
                        (comment._count?.replies || 1) - Math.max(payload.removedCount ?? 1, 1),
                        0,
                      ),
                    },
                  }
                : comment,
            ),
          );
        }
      } catch (err) {
        console.error('Failed to apply realtime reel comment deletion', err);
      }
    };
    socket?.on('reel_comment_deleted', onReelCommentDeleted);

    return () => {
      socket?.off('new_notification', onNewNotification);
      socket?.off('reel_comment_created', onReelCommentCreated);
      socket?.off('reel_comment_deleted', onReelCommentDeleted);
    };
  }, [loadComments, reelId]);

  useEffect(() => {
    if (replyTarget) {
      const handle = window.setTimeout(() => replyInputRef.current?.focus(), 120);
      return () => window.clearTimeout(handle);
    }
    return undefined;
  }, [replyTarget]);

  const handleLoadMoreComments = async () => {
    if (!hasMore || isLoadingMore) return;
    await loadComments(page + 1);
  };

  const handleStartReply = (parentId: string, mention?: string | null) => {
    const alreadyExpanded = expandedComments.has(parentId);
    const trimmedMention = mention?.trim() || undefined;
    setReplyTarget({ parentId, mention: trimmedMention });
    setReplyContent(trimmedMention ? `@${trimmedMention} ` : '');
    setReplyImageUrl(null);
    if (replyImageInputRef.current) {
      replyImageInputRef.current.value = '';
    }

    if (!alreadyExpanded) {
      setExpandedComments((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });
      if (!repliesState[parentId] || (repliesState[parentId]?.page ?? 0) < 1) {
        void loadReplies(parentId, 1);
      }
    }
  };

  const handleCompleteCommentWithAI = async () => {
    if (!newComment.trim()) return;
    setIsAiProcessingComment(true);
    try {
      const completed = await geminiService.completePost(newComment);
      setNewComment(completed);
    } catch (err) {
      console.error('Failed to complete comment with AI:', err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'Unknown error';
      alert(`Failed to complete with AI: ${msg}`);
    } finally {
      setIsAiProcessingComment(false);
    }
  };

  const handleImproveCommentWithAI = async () => {
    if (!newComment.trim()) return;
    setIsAiProcessingComment(true);
    try {
      const improved = await geminiService.improvePost(newComment);
      setNewComment(improved);
    } catch (err) {
      console.error('Failed to improve comment with AI:', err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'Unknown error';
      alert(`Failed to improve with AI: ${msg}`);
    } finally {
      setIsAiProcessingComment(false);
    }
  };

  const handleCompleteReplyWithAI = async () => {
    if (!replyContent.trim()) return;
    setIsAiProcessingReply(true);
    try {
      const completed = await geminiService.completePost(replyContent);
      setReplyContent(completed);
    } catch (err) {
      console.error('Failed to complete reply with AI:', err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'Unknown error';
      alert(`Failed to complete with AI: ${msg}`);
    } finally {
      setIsAiProcessingReply(false);
    }
  };

  const handleImproveReplyWithAI = async () => {
    if (!replyContent.trim()) return;
    setIsAiProcessingReply(true);
    try {
      const improved = await geminiService.improvePost(replyContent);
      setReplyContent(improved);
    } catch (err) {
      console.error('Failed to improve reply with AI:', err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'Unknown error';
      alert(`Failed to improve with AI: ${msg}`);
    } finally {
      setIsAiProcessingReply(false);
    }
  };

  const handleToggleReplies = (commentId: string) => {
    const alreadyExpanded = expandedComments.has(commentId);
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (alreadyExpanded) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });

    if (
      !alreadyExpanded &&
      (!repliesState[commentId] || (repliesState[commentId]?.page ?? 0) < 1)
    ) {
      void loadReplies(commentId, 1);
    }
  };

  const handleSelectCommentImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = uploadService.validateImage(file);
    if (!validation.valid) {
      alert(validation.error || 'Invalid image file');
      input.value = '';
      return;
    }

    setIsUploadingCommentImage(true);
    try {
      const url = await uploadService.uploadImage(file);
      setCommentImageUrl(url);
    } catch (error) {
      console.error('Failed to upload comment image', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingCommentImage(false);
      input.value = '';
    }
  };

  const handleRemoveCommentImage = () => {
    setCommentImageUrl(null);
    if (commentImageInputRef.current) {
      commentImageInputRef.current.value = '';
    }
  };

  const handleSelectReplyImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = uploadService.validateImage(file);
    if (!validation.valid) {
      alert(validation.error || 'Invalid image file');
      input.value = '';
      return;
    }

    setIsUploadingReplyImage(true);
    try {
      const url = await uploadService.uploadImage(file);
      setReplyImageUrl(url);
    } catch (error) {
      console.error('Failed to upload reply image', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingReplyImage(false);
      input.value = '';
    }
  };

  const handleRemoveReplyImage = () => {
    setReplyImageUrl(null);
    if (replyImageInputRef.current) {
      replyImageInputRef.current.value = '';
    }
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmittingComment || isUploadingCommentImage) return;
    if (!newComment.trim() && !commentImageUrl) return;

    setIsSubmittingComment(true);
    try {
      const payload = {
        content: newComment.trim(),
        imageUrl: commentImageUrl ?? undefined,
      };
      const created = await createReelComment(reelId, payload);
      setComments((prev) => {
        if (prev.some((comment) => comment.id === created.id)) {
          return prev;
        }
        return [created, ...prev];
      });
      setNewComment('');
      setCommentImageUrl(null);
      if (commentImageInputRef.current) {
        commentImageInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to post comment', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!replyTarget || isSubmittingReply || isUploadingReplyImage) return;
    if (!replyContent.trim() && !replyImageUrl) return;

    setIsSubmittingReply(true);
    try {
      const trimmedContent = replyContent.trim();
      const mentionName = replyTarget.mention;

      // Preserve the user's typed content. Only ensure the intended mention is
      // present as a prefix — do not try to strip mentions with a greedy regex
      // which can accidentally remove words. Behavior:
      // - If the user already started the reply with the exact mention (e.g.
      //   "@Name ..."), keep the content as-is.
      // - If the user started with a different @-mention, keep as-is (respect
      //   user's choice).
      // - Otherwise, prefix the intended mention (if provided).
      let contentToSend = trimmedContent;
      if (mentionName) {
        const wantedPrefix = `@${mentionName}`;
        if (trimmedContent.startsWith(wantedPrefix)) {
          // already has the correct mention at start, keep as-is
          contentToSend = trimmedContent;
        } else if (trimmedContent.startsWith('@')) {
          // starts with some other mention, don't overwrite user's text
          contentToSend = trimmedContent;
        } else {
          contentToSend = `${wantedPrefix} ${trimmedContent}`.trim();
        }
      }

      const created = await createReelComment(reelId, {
        content: contentToSend,
        parentId: replyTarget.parentId,
        imageUrl: replyImageUrl ?? undefined,
      });

      let inserted = false;
      setRepliesState((prev) => {
        const current =
          prev[replyTarget.parentId] ?? {
            items: [],
            page: 0,
            hasMore: false,
            isLoading: false,
            isLoadingMore: false,
          };
        if (current.items.some((reply) => reply.id === created.id)) {
          return prev;
        }
        inserted = true;
        return {
          ...prev,
          [replyTarget.parentId]: {
            ...current,
            items: [...current.items, created],
            hasMore: current.hasMore,
            isLoading: false,
            isLoadingMore: false,
          },
        };
      });

      if (inserted) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === replyTarget.parentId
              ? {
                  ...comment,
                  _count: {
                    replies: (comment._count?.replies || 0) + 1,
                  },
                }
              : comment,
          ),
        );
      }

      setReplyTarget(null);
      setReplyContent('');
      setReplyImageUrl(null);
      if (replyImageInputRef.current) {
        replyImageInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to post reply', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await deleteReelComment(commentId);

      if (parentId) {
        setRepliesState((prev) => {
          const current = prev[parentId];
          if (!current) return prev;
          return {
            ...prev,
            [parentId]: {
              ...current,
              items: current.items.filter((reply) => reply.id !== commentId),
            },
          };
        });
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === parentId
              ? {
                  ...comment,
                  _count: {
                    replies: Math.max((comment._count?.replies || 1) - 1, 0),
                  },
                }
              : comment,
          ),
        );
      } else {
        setComments((prev) => prev.filter((comment) => comment.id !== commentId));
        setRepliesState((prev) => {
          const rest = { ...prev };
          delete rest[commentId];
          return rest;
        });
        setExpandedComments((prev) => {
          if (!prev.has(commentId)) return prev;
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to delete comment', error);
    }
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
    setReplyContent('');
    setReplyImageUrl(null);
    if (replyImageInputRef.current) {
      replyImageInputRef.current.value = '';
    }
  };

  const findUserByName = (name: string) => {
    const target = name.trim();
    for (const commentItem of comments) {
      if (commentItem.user?.name?.trim() === target) {
        return commentItem.user;
      }

      const replyPool = repliesState[commentItem.id]?.items ?? commentItem.replies ?? [];
      for (const reply of replyPool) {
        if (reply.user?.name?.trim() === target) {
          return reply.user;
        }
      }
    }
    return undefined;
  };

  const renderContentWithMention = (content: string) => {
    // If content doesn't start with '@' just render raw
    if (!content || !content.trim().startsWith('@')) return content;

    // Try to parse a multi-word mention by comparing progressive tokens
    // against known users (prefer longest match). This avoids greedy
    // regex that can accidentally swallow parts of the message.
    const afterAt = content.trim().slice(1);
    const tokens = afterAt.split(/\s+/);

    let foundName: string | null = null;
    let foundUser: ReturnType<typeof findUserByName> | undefined;
    let consumedTokens = 0;

    // Try longest-first to capture full multi-word names
    for (let i = tokens.length; i >= 1; i--) {
      const candidate = tokens.slice(0, i).join(' ').trim();
      const user = findUserByName(candidate);
      if (user) {
        foundName = candidate;
        foundUser = user;
        consumedTokens = i;
        break;
      }
    }

    // Fallback: use the first token as mention name if no user matched
    if (!foundName) {
      foundName = tokens[0] || null;
      consumedTokens = 1;
    }

    if (!foundName) return content;

    const remaining = tokens.slice(consumedTokens).join(' ');

    const mentionElement = foundUser?.username ? (
      <Link
        to={`/profile/${foundUser.username}`}
        className="mr-1 font-semibold text-orange-500 hover:underline cursor-pointer"
      >
        @{foundName}
      </Link>
    ) : (
      <span className="mr-1 font-semibold text-orange-500">@{foundName}</span>
    );

    return (
      <>
        {mentionElement}
        {remaining ? <span> {remaining}</span> : null}
      </>
    );
  };

  const drawer = Boolean(isDrawer);
  const alignmentClasses = drawer
    ? 'items-start justify-end'
    : 'items-end justify-center sm:items-center';
  const overlayClasses = drawer
    ? 'bg-black/50 sm:bg-transparent pointer-events-auto sm:pointer-events-none'
    : 'bg-black/50 pointer-events-auto';

  const renderReplies = (comment: ReelComment) => {
    const entry = repliesState[comment.id];
    const isExpanded = expandedComments.has(comment.id);
    const replies = entry?.items ?? comment.replies ?? [];

    if (!isExpanded) {
      return null;
    }

    return (
      <div className="md:mt-3 mt-2 md:space-y-3 space-y-2 border-l border-orange-500/30 md:pl-4 pl-3">
        {entry?.isLoading ? (
          <div className="flex items-center gap-2 md:text-sm text-xs text-gray-400">
            <Loader2 className="md:h-4 md:w-4 h-3 w-3 animate-spin text-orange-400" />
            Loading replies...
          </div>
        ) : replies.length === 0 ? (
          <p className="md:text-sm text-xs text-gray-500">No replies yet.</p>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="flex md:gap-3 gap-2">
              <Link to={reply.user?.username ? `/profile/${reply.user.username}` : '#'} className="cursor-pointer">
                <Avatar
                  src={reply.user?.avatar || undefined}
                  name={reply.user?.name || 'User'}
                  size="sm"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="inline-block max-w-full rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 md:px-3 md:py-2 px-2.5 py-1.5">
                  <Link
                    to={reply.user?.username ? `/profile/${reply.user.username}` : '#'}
                    className="md:text-sm text-xs font-semibold text-white hover:text-orange-400 cursor-pointer transition-colors"
                  >
                    {reply.user?.name}
                  </Link>
                {reply.content?.trim() ? (
                  <p className="md:text-sm text-xs text-gray-300 whitespace-pre-wrap wrap-break-word">
                    {renderContentWithMention(reply.content)}
                  </p>
                ) : null}
                {reply.imageUrl ? (
                  <img
                    src={reply.imageUrl}
                    alt="Reply attachment"
                    className="mt-2 md:max-h-52 max-h-40 w-auto rounded-xl border border-orange-500/30 object-cover shadow-lg"
                  />
                ) : null}
              </div>
                <div className="mt-1 flex flex-wrap items-center md:gap-3 gap-2 md:px-2 px-1 md:text-xs text-[10px] text-gray-500">
                  <span className="text-gray-400">{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: enUS })}</span>
                  <button
                    type="button"
                    onClick={() => handleStartReply(comment.id, reply.user?.name)}
                    className="font-semibold text-gray-400 hover:text-orange-400 cursor-pointer transition-colors"
                  >
                    Reply
                  </button>
                  {currentUser?.id === reply.userId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(reply.id, comment.id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-red-400 cursor-pointer transition-colors"
                    >
                      <Trash2 className="md:h-3 md:w-3 h-2.5 w-2.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {entry && entry.hasMore && !entry.isLoading && (
          <button
            type="button"
            onClick={() => loadReplies(comment.id, entry.page + 1)}
            className="flex items-center gap-2 md:text-sm text-xs text-orange-400 hover:text-orange-300 cursor-pointer font-semibold transition-colors"
            disabled={entry.isLoadingMore}
          >
            {entry.isLoadingMore && <Loader2 className="md:h-4 md:w-4 h-3 w-3 animate-spin" />}
            Load more replies
          </button>
        )}
      </div>
    );
  };

  return (
  <div className={`fixed inset-0 z-50 flex ${alignmentClasses} ${overlayClasses}`}>
      <div
        className={
          drawer
            ? 'pointer-events-auto fixed right-0 top-[65px] bottom-0 flex w-full flex-col overflow-y-auto shadow-2xl sm:top-[65px] sm:w-[380px] border-l border-gray-800'
            : 'pointer-events-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-gray-800'
        }
        style={{
          background: 'linear-gradient(to bottom, #111827, #000000)',
        }}
      >
        <div className="flex items-center justify-between border-b border-gray-800/50 md:p-4 p-3 bg-black/40 backdrop-blur-md">
          <div className="flex items-center md:gap-2 gap-1.5">
            <MessageCircle className="md:w-5 md:h-5 w-4 h-4 text-orange-500" />
            <h2 className="md:text-lg text-base font-semibold text-white">Comments</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-full md:p-1.5 p-1 cursor-pointer transition-colors"
            aria-label="Close comments"
          >
            <X className="md:h-5 md:w-5 h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto md:p-4 p-3">
          {isLoading ? (
            <div className="md:space-y-4 space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex md:gap-3 gap-2">
                  <div className="md:h-10 md:w-10 h-8 w-8 animate-pulse rounded-full bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/4 animate-pulse rounded bg-gray-700" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="md:py-16 py-12 text-center px-4">
              <MessageCircle className="md:w-12 md:h-12 w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="md:text-sm text-xs text-gray-400">No comments yet. Be the first to say something!</p>
            </div>
          ) : (
            <div className="md:space-y-5 space-y-4">
              {comments.map((comment) => {
                const isExpanded = expandedComments.has(comment.id);
                const repliesCount = comment._count?.replies || repliesState[comment.id]?.items.length || 0;

                return (
                  <div key={comment.id} className="flex md:gap-3 gap-2">
            <Link to={comment.user?.username ? `/profile/${comment.user.username}` : '#'} className="cursor-pointer">
              <Avatar
                src={comment.user?.avatar || undefined}
                name={comment.user?.name || 'User'}
                size="md"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="inline-block max-w-full rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 md:px-3 md:py-2 px-2.5 py-1.5">
                <Link
                  to={comment.user?.username ? `/profile/${comment.user.username}` : '#'}
                  className="md:text-sm text-xs font-semibold text-white hover:text-orange-400 cursor-pointer transition-colors"
                >
                  {comment.user?.name}
                </Link>
                        {comment.content?.trim() ? (
                          <p className="md:text-sm text-xs text-gray-300 whitespace-pre-wrap wrap-break-word">
                            {renderContentWithMention(comment.content)}
                          </p>
                        ) : null}
                        {comment.imageUrl ? (
                          <img
                            src={comment.imageUrl}
                            alt="Comment attachment"
                            className="mt-2 md:max-h-64 max-h-48 w-auto rounded-xl border border-orange-500/30 object-cover shadow-lg"
                          />
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center md:gap-3 gap-2 md:px-2 px-1 md:text-xs text-[10px] text-gray-500">
                        <span className="text-gray-400">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: enUS })}</span>
                        <button
                          type="button"
                          onClick={() => handleStartReply(comment.id, comment.user?.name)}
                          className="font-semibold text-gray-400 hover:text-orange-400 cursor-pointer transition-colors"
                        >
                          Reply
                        </button>
                        {currentUser?.id === comment.userId && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="flex items-center gap-1 text-gray-400 hover:text-red-400 cursor-pointer transition-colors"
                          >
                            <Trash2 className="md:h-3 md:w-3 h-2.5 w-2.5" />
                            Delete
                          </button>
                        )}
                        {repliesCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleToggleReplies(comment.id)}
                            className="flex items-center gap-1 text-gray-400 hover:text-orange-400 cursor-pointer transition-colors font-semibold"
                          >
                            <MessageCircle className="md:h-3 md:w-3 h-2.5 w-2.5" />
                            {isExpanded ? 'Hide replies' : `View replies (${repliesCount})`}
                          </button>
                        )}
                      </div>

                      {replyTarget?.parentId === comment.id && (
                        <form onSubmit={handleSubmitReply} className="md:mt-3 mt-2 md:space-y-3 space-y-2 bg-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-lg md:p-3 p-2">
                          {replyImageUrl && (
                            <div className="relative inline-block">
                              <img
                                src={replyImageUrl}
                                alt="Reply attachment"
                                className="md:max-h-40 max-h-32 w-auto rounded-xl border border-orange-500/30 object-cover shadow-lg"
                              />
                              <button
                                type="button"
                                onClick={handleRemoveReplyImage}
                                className="absolute -right-2 -top-2 rounded-full bg-orange-500 md:p-1.5 p-1 text-white hover:bg-orange-600 cursor-pointer shadow-lg transition-colors"
                                aria-label="Remove attached image"
                              >
                                <X className="md:h-4 md:w-4 h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <Textarea
                            ref={replyInputRef}
                            value={replyContent}
                            onChange={(event) => setReplyContent(event.target.value)}
                            placeholder={replyTarget.mention ? `Reply to ${replyTarget.mention}...` : 'Write a reply...'}
                            className="md:min-h-20 min-h-16 resize-none bg-gray-900/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-orange-500/50 focus:ring-orange-500/30 md:text-base text-sm"
                            disabled={isUploadingReplyImage}
                            onFocus={(e) => {
                              // Ensure caret is placed after the prefilled mention when focused
                              const el = e.currentTarget as HTMLTextAreaElement;
                              const len = el.value.length;
                              // schedule after default focus/click handling
                              setTimeout(() => {
                                try {
                                  el.setSelectionRange(len, len);
                                } catch {
                                  /* ignore */
                                }
                              }, 0);
                            }}
                            onMouseUp={(e) => {
                              // Override mouse selection to keep caret at end when clicking into the textarea
                              const el = e.currentTarget as HTMLTextAreaElement;
                              const len = el.value.length;
                              setTimeout(() => {
                                try {
                                  el.setSelectionRange(len, len);
                                } catch {
                                  /* ignore */
                                }
                              }, 0);
                            }}
                          />
                          <input
                            ref={replyImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleSelectReplyImage}
                            className="hidden"
                          />
                          <div className="flex items-center justify-between md:gap-2 gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => replyImageInputRef.current?.click()}
                              disabled={!currentUser || isSubmittingReply || isUploadingReplyImage}
                              className="flex items-center md:gap-2 gap-1 cursor-pointer text-gray-300 hover:text-orange-400 hover:bg-orange-500/10 md:text-sm text-xs md:px-4 px-2"
                            >
                              {isUploadingReplyImage ? (
                                <Loader2 className="md:h-4 md:w-4 h-3 w-3 animate-spin" />
                              ) : (
                                <ImageIcon className="md:h-4 md:w-4 h-3 w-3" />
                              )}
                              <span className="hidden sm:inline">Image</span>
                            </Button>
                            <div className="flex items-center justify-end md:gap-2 gap-1">
                              {/* AI buttons for reply (icon-only) */}
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCompleteReplyWithAI}
                                disabled={isAiProcessingReply || isUploadingReplyImage}
                                className="md:p-2 p-1.5 text-orange-400 hover:bg-orange-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-full"
                                title={isAiProcessingReply ? 'Processing...' : 'Complete with AI'}
                              >
                                <Sparkles className={`md:h-4 md:w-4 h-3 w-3 ${isAiProcessingReply ? 'text-gray-400' : 'text-orange-400'}`} />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                onClick={handleImproveReplyWithAI}
                                disabled={isAiProcessingReply || isUploadingReplyImage}
                                className="md:p-2 p-1.5 text-orange-400 hover:bg-orange-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-full"
                                title={isAiProcessingReply ? 'Processing...' : 'Improve with AI'}
                              >
                                <Wand2 className={`md:h-4 md:w-4 h-3 w-3 ${isAiProcessingReply ? 'text-gray-400' : 'text-orange-400'}`} />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCancelReply}
                                className="cursor-pointer text-gray-400 hover:text-white hover:bg-gray-800 md:text-sm text-xs md:px-4 px-2"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={
                                  !currentUser ||
                                  isSubmittingReply ||
                                  isUploadingReplyImage ||
                                  (!replyContent.trim() && !replyImageUrl)
                                }
                                className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white transition-colors md:text-sm text-xs md:px-4 px-3"
                              >
                                {(isSubmittingReply || isUploadingReplyImage) && (
                                  <Loader2 className="mr-2 md:h-4 md:w-4 h-3 w-3 animate-spin" />
                                )}
                                Send
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}

                      {renderReplies(comment)}
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMoreComments}
                  className="flex items-center gap-2 w-full justify-center rounded-full border border-orange-500/50 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-400 hover:bg-orange-500/20 hover:border-orange-500 cursor-pointer transition-all duration-200"
                  disabled={isLoadingMore}
                >
                  {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load more comments
                </button>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmitComment} className="border-t border-gray-700/30 bg-black/40 backdrop-blur-md md:p-4 p-3">
          <div className="flex items-start md:gap-3 gap-2">
            <Avatar
              src={currentUser?.avatar || undefined}
              name={currentUser?.name || 'User'}
              size="sm"
            />
            <div className="flex-1 md:space-y-3 space-y-2">
              {commentImageUrl && (
                <div className="relative inline-block">
                  <img
                    src={commentImageUrl}
                    alt="Comment attachment"
                    className="md:max-h-48 max-h-32 w-auto rounded-xl border border-orange-500/30 object-cover shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCommentImage}
                    className="absolute -right-2 -top-2 rounded-full bg-orange-500 md:p-1.5 p-1 text-white hover:bg-orange-600 cursor-pointer shadow-lg transition-colors"
                    aria-label="Remove attached image"
                  >
                    <X className="md:h-4 md:w-4 h-3 w-3" />
                  </button>
                </div>
              )}
              <Textarea
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder={currentUser ? 'Share your thoughts...' : 'You need to sign in to comment.'}
                disabled={!currentUser || isUploadingCommentImage}
                className="md:min-h-24 min-h-20 resize-none bg-gray-900/50 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-orange-500/50 focus:ring-orange-500/30 md:text-base text-sm"
              />
              <input
                ref={commentImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectCommentImage}
                className="hidden"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center md:gap-2 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => commentImageInputRef.current?.click()}
                    disabled={!currentUser || isSubmittingComment || isUploadingCommentImage}
                    className="flex items-center md:gap-2 gap-1 cursor-pointer text-gray-300 hover:text-orange-400 hover:bg-orange-500/10 md:text-sm text-xs md:px-4 px-2"
                  >
                    {isUploadingCommentImage ? (
                      <Loader2 className="md:h-4 md:w-4 h-3 w-3 animate-spin" />
                    ) : (
                      <ImageIcon className="md:h-4 md:w-4 h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">Image</span>
                  </Button>

                  {/* AI buttons for comment (icon-only) */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCompleteCommentWithAI}
                    disabled={isAiProcessingComment || isUploadingCommentImage}
                    className="md:p-2 p-1.5 text-orange-400 hover:bg-orange-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-full"
                    title={isAiProcessingComment ? 'Processing...' : 'Complete with AI'}
                  >
                    <Sparkles className={`md:h-4 md:w-4 h-3 w-3 ${isAiProcessingComment ? 'text-gray-400' : 'text-orange-400'}`} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleImproveCommentWithAI}
                    disabled={isAiProcessingComment || isUploadingCommentImage}
                    className="md:p-2 p-1.5 text-orange-400 hover:bg-orange-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-full"
                    title={isAiProcessingComment ? 'Processing...' : 'Improve with AI'}
                  >
                    <Wand2 className={`md:h-4 md:w-4 h-3 w-3 ${isAiProcessingComment ? 'text-gray-400' : 'text-orange-400'}`} />
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={
                    !currentUser ||
                    (isSubmittingComment || isUploadingCommentImage) ||
                    (!newComment.trim() && !commentImageUrl)
                  }
                  className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white transition-colors md:px-4 px-3"
                >
                  {(isSubmittingComment || isUploadingCommentImage) && (
                    <Loader2 className="mr-2 md:h-4 md:w-4 h-3 w-3 animate-spin" />
                  )}
                  <Send className="md:h-4 md:w-4 h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">Comment</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
