import { Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreateReelButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/reels/create')}
      className="fixed bottom-20 right-6 z-40 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
      title="Create Reel"
    >
      <Video className="w-6 h-6" />
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Create Reel
      </span>
    </button>
  );
}
