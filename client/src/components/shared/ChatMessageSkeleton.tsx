export const ChatMessageSkeleton = () => {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Tin nhắn từ người khác */}
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-gray-300 rounded-full shrink-0" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-300 rounded-2xl w-48" />
          <div className="h-10 bg-gray-300 rounded-2xl w-32" />
        </div>
      </div>

      {/* Tin nhắn của mình */}
      <div className="flex gap-2 justify-end">
        <div className="space-y-2">
          <div className="h-10 bg-orange-200 rounded-2xl w-40" />
          <div className="h-10 bg-orange-200 rounded-2xl w-56" />
        </div>
      </div>

      {/* Tin nhắn từ người khác */}
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-gray-300 rounded-full shrink-0" />
        <div className="h-10 bg-gray-300 rounded-2xl w-52" />
      </div>

      {/* Tin nhắn của mình */}
      <div className="flex gap-2 justify-end">
        <div className="h-10 bg-orange-200 rounded-2xl w-36" />
      </div>

      {/* Tin nhắn từ người khác */}
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-gray-300 rounded-full shrink-0" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-300 rounded-2xl w-44" />
          <div className="h-10 bg-gray-300 rounded-2xl w-36" />
        </div>
      </div>
    </div>
  );
};
