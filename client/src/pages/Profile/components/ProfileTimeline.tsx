import { Image as ImageIcon, UserPlus, Smile } from 'lucide-react'

interface ProfileTimelineProps {
  username?: string
}

export const ProfileTimeline = ({ username: _username }: ProfileTimelineProps) => {
  // TODO: Fetch posts based on _username
  
  return (
    <div className="bg-white rounded-2xl p-5 shadow">
      <div className="flex items-start gap-3">
        <img src="https://i.pravatar.cc/40" alt="avatar" className="w-10 h-10 rounded-full" />
        <textarea
          placeholder="Write something here..."
          className="w-full h-20 resize-none border rounded-xl p-3 focus:ring focus:ring-orange-100 outline-none"
        />
      </div>

      <div className="flex justify-between items-center mt-3 border-t pt-3 text-sm">
        <div className="flex gap-3">
          <button className="flex items-center gap-1 text-orange-500 hover:underline">
            <ImageIcon size={16} /> Photo/Video
          </button>
          <button className="flex items-center gap-1 text-orange-500 hover:underline">
            <UserPlus size={16} /> Tag Friend
          </button>
          <button className="flex items-center gap-1 text-orange-500 hover:underline">
            <Smile size={16} /> Feeling/Activity
          </button>
        </div>
        <button className="bg-orange-500 text-white px-4 py-1 rounded-lg">Post</button>
      </div>
    </div>
  )
}
