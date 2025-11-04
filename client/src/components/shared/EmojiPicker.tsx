import { useState, useRef, useEffect } from 'react';

// Common emoji set (safe UTF-8 or codepoint escapes to avoid encoding issues)
const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂',
  '🙂','🙃','😉','😊','😍','🤩','😘','😗',
  '😚','😙','☺️','😋','😛','😜','🤪','😝',
  '🤗','🤭','🫢','🫣','🤔','🤐','🤨','😐',
  '😑','😶','😏','😒','🙄','😬','🤥','😌',
  '😔','😪','🤤','😴','😷','🤒','🤕','🤧',
  '🥵','🥶','😎','🤓','🧐','😕','😟','🙁',
  '☹️','😮','😯','😲','😳','🥺','😦','😧',
  '😨','😰','😥','😢','😭','😱','😖','😣',
  '😞','😓','😩','😫','😤','😡','😠','🤬',
  '💀','☠️','💩','🤡','👻','👽','🤖','🎃',
  '❤️','🧡','💛','💚','💙','💜','🖤','👍',
  '👎','👏','✌️','🤞','🤟','👌','💪'
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  const [selectedCategory] = useState('all');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const clickedTrigger = target.closest('[data-emoji-trigger]');
      if (clickedTrigger) return; // allow button to control toggle explicitly

      if (pickerRef.current && !pickerRef.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    // Do not auto-close to allow rapid multi-select
  };

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 right-0 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-3 z-50"
    >
      <div className="text-sm font-semibold text-gray-700 mb-2">Pick emoji</div>
      <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto">
        {EMOJIS.map((emoji, index) => (
          <button
            key={index}
            onClick={() => handleEmojiClick(emoji)}
            className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors cursor-pointer"
            type="button"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

