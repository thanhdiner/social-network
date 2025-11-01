import { Check, CheckCheck } from 'lucide-react';

interface MessageStatusProps {
  isSentByMe: boolean;
  delivered: boolean;
  read: boolean;
}

export const MessageStatus = ({ isSentByMe, delivered, read }: MessageStatusProps) => {
  // Only show status for messages sent by current user
  if (!isSentByMe) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {read ? (
        // Read - with text
        <>
          <CheckCheck className="w-3 h-3 text-orange-500" strokeWidth={2.5} />
          <span className="text-orange-500">Seen</span>
        </>
      ) : delivered ? (
        // Delivered - with text
        <>
          <CheckCheck className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
          <span className="text-gray-400">Delivered</span>
        </>
      ) : (
        // Sent - with text
        <>
          <Check className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
          <span className="text-gray-400">Sent</span>
        </>
      )}
    </span>
  );
};
