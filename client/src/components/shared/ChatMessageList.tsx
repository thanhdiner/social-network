import type { Message, User } from '../../types'
// import { ChatMessageItem } from './ChatMessageItem'

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
  // onlineUsers,
  // typingUsers,
  // user
}: ChatMessageListProps) => {
  const visibleMessages = messages.slice(Math.max(messages.length - visibleCount, 0))

  return (
    <>
      {visibleMessages.map((message, index, arr) => (
        <div
          key={message.id}
          data-message={message.id}
          data-is-own={message.senderId === currentUser?.id}
          data-is-last={index === arr.length - 1}
          data-next-message={arr[index + 1]?.id}
        >
          Message {message.id}
        </div>
      ))}
    </>
  )
}
