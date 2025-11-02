import { Message, User } from '../../types'
import { ChatMessage } from './ChatMessage'

interface ChatMessageListProps {
  messages: Message[]
  visibleCount: number
  currentUser: User | null
  onlineUsers: Set<string>
  typingUsers: Map<string, boolean>
  user: User
}

export const ChatMessageList = ({
  messages,
  visibleCount,
  currentUser,
  onlineUsers,
  typingUsers,
  user
}: ChatMessageListProps) => {
  const visibleMessages = messages.slice(Math.max(messages.length - visibleCount, 0))

  return (
    <>
      {visibleMessages.map((message, index, arr) => (
        <ChatMessage
          key={message.id}
          message={message}
          isOwn={message.senderId === currentUser?.id}
          isLast={index === arr.length - 1}
          nextMessage={arr[index + 1]}
        />
      ))}
    </>
  )
}
