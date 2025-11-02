import { memo } from 'react'
import type { Message, User } from '../../types'
import { Avatar } from './Avatar'

interface ChatMessageItemProps {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  user: User
  currentUserId?: string
  onReactionAdd: (messageId: string, emoji: string) => Promise<void>
  onShowEmojiReactions: (messageId: string) => void
  showEmojiReactions: string | null
  quickReactions: string[]
}

const ChatMessageItemBase = ({
  message,
  isOwn,
  showAvatar,
  user,
  currentUserId,
  onReactionAdd,
  onShowEmojiReactions,
  showEmojiReactions,
  quickReactions
}: ChatMessageItemProps) => {
  return (
    <div
      key={message.id}
      id={`message-${message.id}`}
      className={`flex gap-1 animate-fadeIn group items-center ${isOwn ? 'flex-row-reverse' : ''}`}
      style={{ animation: 'fadeIn 0.3s ease-in' }}
    >
      {/* Only show avatar for the other user */}
      <div className={isOwn ? 'w-0' : 'w-6 shrink-0'}>
        {showAvatar && <Avatar src={user.avatar || undefined} name={user.name} size="xs" className="w-6 h-6" />}
      </div>

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[65%] relative`}>
        {/* Emoji reactions picker - shown above message */}
        {showEmojiReactions === message.id && (
          <div
            onClick={e => e.stopPropagation()}
            className="mb-1 bg-white border border-gray-200 rounded-full shadow-lg px-2 py-2 z-50 flex items-center gap-1"
          >
            {quickReactions.map(emoji => (
              <button
                key={emoji}
                onClick={async () => {
                  await onReactionAdd(message.id, emoji)
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full cursor-pointer transition-transform hover:scale-125"
                title={emoji}
              >
                <span className="text-xl">{emoji}</span>
              </button>
            ))}
          </div>
        )}

        <div
          className={`rounded-2xl transition-all hover:shadow-md ${message.imageUrl || message.videoUrl ? '' : 'px-3 py-2'} ${
            isOwn ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          } ${message.unsent ? 'opacity-60 italic' : ''}`}
        >
          {message.unsent ? (
            <p className={`text-sm italic ${isOwn ? 'text-white/90' : 'text-gray-600'}`}>Message unsent</p>
          ) : (
            <p>{message.content}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export const ChatMessageItem = memo(ChatMessageItemBase, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.reactions?.length === next.message.reactions?.length &&
    prev.showEmojiReactions === next.showEmojiReactions
  )
})

ChatMessageItem.displayName = 'ChatMessageItem'
