import { BellOff } from 'lucide-react';
import type { User } from '../../types';
import { Avatar } from './Avatar';

interface ChatListItemProps {
  user: User;
  online?: boolean;
  lastMessage?: { content?: string; createdAt: string };
  unreadCount?: number;
  isMuted?: boolean;
  onClick: () => void;
  formatTime?: (date: string) => string;
}

export const ChatListItem = ({
  user,
  online,
  lastMessage,
  unreadCount = 0,
  isMuted = false,
  onClick,
  formatTime,
}: ChatListItemProps) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 w-full overflow-hidden"
    >
      <div className="relative">
        <Avatar src={user.avatar || undefined} name={user.name} className="w-14 h-14" size="xl" />
        {online && (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="font-semibold text-gray-900">{user.name}</div>
            {isMuted && <BellOff className="w-3.5 h-3.5 text-gray-400" />}
          </div>
          {lastMessage && formatTime && (
            <span className="text-xs text-gray-500">{formatTime(lastMessage.createdAt)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p
            className={`text-sm truncate flex-1 ${
              unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'
            }`}
          >
            {lastMessage?.content || 'Start the conversation'}
          </p>
          {unreadCount > 0 && !isMuted && (
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full min-w-5 text-center">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
