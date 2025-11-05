import { useState, useEffect } from 'react';
import type { ReelComment } from '../../types';
import {
  getReelComments,
  createReelComment,
  deleteReelComment,
  getReelCommentReplies,
} from '../../services/reelService';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Send, Trash2, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface ReelCommentsProps {
  reelId: string;
  onClose: () => void;
}

export default function ReelComments({ reelId, onClose }: ReelCommentsProps) {
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [repliesMap, setRepliesMap] = useState<Record<string, ReelComment[]>>({});
  const { user: currentUser } = useCurrentUser();

  useEffect(() => {
    loadComments();
  }, [reelId]);

  const loadComments = async () => {
    try {
      const data = await getReelComments(reelId);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadReplies = async (commentId: string) => {
    try {
      const replies = await getReelCommentReplies(commentId);
      setRepliesMap((prev) => ({ ...prev, [commentId]: replies }));
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const comment = await createReelComment(reelId, { content: newComment });
      setComments([comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      const reply = await createReelComment(reelId, {
        content: replyContent,
        parentId,
      });

      // Add to replies map
      setRepliesMap((prev) => ({
        ...prev,
        [parentId]: [reply, ...(prev[parentId] || [])],
      }));

      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error creating reply:', error);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    if (window.confirm('Bạn có chắc muốn xóa bình luận này?')) {
      try {
        await deleteReelComment(commentId);
        if (parentId) {
          // Remove from replies
          setRepliesMap((prev) => ({
            ...prev,
            [parentId]: (prev[parentId] || []).filter((r) => r.id !== commentId),
          }));
        } else {
          // Remove from main comments
          setComments(comments.filter((c) => c.id !== commentId));
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
      if (!repliesMap[commentId]) {
        loadReplies(commentId);
      }
    }
    setExpandedComments(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Bình luận</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 cursor-pointer">
            ✕
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {comments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Chưa có bình luận nào</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id}>
                  {/* Main Comment */}
                  <div className="flex gap-3">
                    <img
                      src={comment.user?.avatar || '/default-avatar.png'}
                      alt={comment.user?.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-2xl px-3 py-2">
                        <p className="font-semibold text-sm">{comment.user?.name}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 px-3 text-xs text-gray-500">
                        <span>
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="hover:underline cursor-pointer"
                        >
                          Trả lời
                        </button>
                        {currentUser?.id === comment.userId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="hover:underline text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Show replies button */}
                      {comment._count && comment._count.replies > 0 && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="flex items-center gap-1 mt-2 px-3 text-sm text-orange-600 hover:text-orange-700 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {expandedComments.has(comment.id)
                            ? 'Ẩn phản hồi'
                            : `Xem ${comment._count.replies} phản hồi`}
                        </button>
                      )}

                      {/* Replies */}
                      {expandedComments.has(comment.id) && repliesMap[comment.id] && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
                          {repliesMap[comment.id].map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <img
                                src={reply.user?.avatar || '/default-avatar.png'}
                                alt={reply.user?.name}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <div className="bg-gray-100 rounded-2xl px-3 py-2">
                                  <p className="font-semibold text-sm">{reply.user?.name}</p>
                                  <p className="text-sm">{reply.content}</p>
                                </div>
                                <div className="flex items-center gap-3 mt-1 px-3 text-xs text-gray-500">
                                  <span>
                                    {formatDistanceToNow(new Date(reply.createdAt), {
                                      addSuffix: true,
                                      locale: vi,
                                    })}
                                  </span>
                                  {currentUser?.id === reply.userId && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id, comment.id)}
                                      className="hover:underline text-red-500 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <form
                          onSubmit={(e) => handleSubmitReply(e, comment.id)}
                          className="mt-3 flex gap-2"
                        >
                          <img
                            src={currentUser?.avatar || '/default-avatar.png'}
                            alt={currentUser?.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div className="flex-1 flex gap-2">
                            <Textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Viết phản hồi..."
                              className="flex-1 min-h-[60px] resize-none"
                              autoFocus
                            />
                            <div className="flex flex-col gap-2">
                              <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 cursor-pointer">
                                <Send className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent('');
                                }}
                                className="cursor-pointer"
                              >
                                Hủy
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleSubmitComment} className="border-t p-4">
          <div className="flex gap-3">
            <img
              src={currentUser?.avatar || '/default-avatar.png'}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 min-h-[60px] resize-none"
              />
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600 cursor-pointer">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
