import { useState } from 'react'
import {
  Image as ImageIcon,
  UserPlus,
  Smile,
  MoreHorizontal,
  MapPin,
  Video,
  Tv,
  Gamepad2,
  ImagePlay,
  X,
  Globe,
  Users,
  UserX,
  Lock
} from 'lucide-react'
import { useTitle } from '@/hooks/useTitle'

export default function Home() {
  useTitle('Home • Diner')
  const [open, setOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [privacy, setPrivacy] = useState<'Public' | 'Friends' | 'Friends except' | 'Only Me'>('Friends')

  return (
    <>
      {/* PHẦN NỘI DUNG CHÍNH */}
      <div className="space-y-4">
        {/* CREATE POST CARD */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-3">Create Post</h2>

          <div className="flex gap-3">
            <img src="https://i.pravatar.cc/40" alt="avatar" className="w-10 h-10 rounded-full" />
            <button
              onClick={() => setOpen(true)}
              className="flex-1 text-left text-gray-500 bg-gray-50 hover:bg-gray-100 border rounded-full px-4 py-2"
            >
              Write something here...
            </button>
          </div>

          <div className="flex justify-between mt-4 border-t pt-3">
            <div className="flex gap-2 flex-wrap relative">
              <button className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-xl text-sm font-medium">
                <ImageIcon className="w-4 h-4" /> Photo/Video
              </button>
              <button className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-xl text-sm font-medium">
                <UserPlus className="w-4 h-4" /> Tag Friend
              </button>
              <button className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-yellow-600 px-3 py-2 rounded-xl text-sm font-medium">
                <Smile className="w-4 h-4" /> Feeling/Activity
              </button>

              {/* Three-dot menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 mt-2 w-44 bg-white shadow-lg border rounded-lg py-2 z-50"
                    onMouseLeave={() => setShowMenu(false)}
                  >
                    <MenuItem icon={<MapPin className="w-4 h-4 text-pink-500" />} text="Check in" />
                    <MenuItem icon={<Video className="w-4 h-4 text-red-500" />} text="Live Video" />
                    <MenuItem icon={<ImagePlay className="w-4 h-4 text-green-500" />} text="Gif" />
                    <MenuItem icon={<Tv className="w-4 h-4 text-purple-500" />} text="Watch Party" />
                    <MenuItem icon={<Gamepad2 className="w-4 h-4 text-indigo-500" />} text="Play with Friend" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SAMPLE POST */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <h2 className="font-semibold">Anna Sthesia</h2>
          <p className="text-gray-700 mt-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit. 😄</p>
        </div>
      </div>

      {/* MODAL — tách riêng hẳn khỏi space-y */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-lg relative p-6 space-y-4 animate-scaleIn">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold">Create Post</h2>

            <div className="flex gap-3">
              <img src="https://i.pravatar.cc/40" alt="avatar" className="w-10 h-10 rounded-full" width={40} height={40} />
              <textarea
                placeholder="Write something here..."
                className="w-full h-24 resize-none rounded-xl border p-3 focus:ring focus:ring-blue-100 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              <Button icon={<ImageIcon />} text="Photo/Video" color="text-blue-600" />
              <Button icon={<UserPlus />} text="Tag Friend" color="text-blue-600" />
              <Button icon={<Smile />} text="Feeling/Activity" color="text-yellow-600" />
              <Button icon={<MapPin />} text="Check in" color="text-pink-600" />
              <Button icon={<Video />} text="Live Video" color="text-red-600" />
              <Button icon={<Tv />} text="Watch Party" color="text-purple-600" />
              <Button icon={<Gamepad2 />} text="Play with Friends" color="text-indigo-600" />
            </div>

            <div className="flex items-center justify-between pt-4 border-t relative">
              <div className="flex items-center gap-2">
                <img src="https://i.pravatar.cc/40" alt="avatar" className="w-8 h-8 rounded-full" />
                <span className="text-gray-700 text-sm">Your Story</span>
              </div>

              {/* Privacy dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPrivacyOpen(!privacyOpen)}
                  className="bg-gray-100 text-sm px-3 py-1 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                >
                  <Users className="w-4 h-4" />
                  {privacy}
                </button>

                {privacyOpen && (
                  <div
                    className="absolute right-0 bottom-full mb-2 w-56 bg-white shadow-lg border rounded-lg py-2 z-50"
                    onMouseLeave={() => setPrivacyOpen(false)}
                  >
                    <PrivacyItem
                      icon={<Globe className="w-5 h-5 text-blue-500" />}
                      title="Public"
                      desc="Anyone on or off Facebook"
                      active={privacy === 'Public'}
                      onClick={() => {
                        setPrivacy('Public')
                        setPrivacyOpen(false)
                      }}
                    />
                    <PrivacyItem
                      icon={<Users className="w-5 h-5 text-green-500" />}
                      title="Friends"
                      desc="Your friends on Facebook"
                      active={privacy === 'Friends'}
                      onClick={() => {
                        setPrivacy('Friends')
                        setPrivacyOpen(false)
                      }}
                    />
                    <PrivacyItem
                      icon={<UserX className="w-5 h-5 text-yellow-500" />}
                      title="Friends except"
                      desc="Don't show to some friends"
                      active={privacy === 'Friends except'}
                      onClick={() => {
                        setPrivacy('Friends except')
                        setPrivacyOpen(false)
                      }}
                    />
                    <PrivacyItem
                      icon={<Lock className="w-5 h-5 text-gray-500" />}
                      title="Only Me"
                      desc="Only you can see this post"
                      active={privacy === 'Only Me'}
                      onClick={() => {
                        setPrivacy('Only Me')
                        setPrivacyOpen(false)
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <button className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition">
              Post
            </button>
          </div>
        </div>
      )}
    </>
  )
}

const MenuItem = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <button className="flex items-center gap-2 px-3 py-2 w-full hover:bg-gray-50 text-gray-700 text-sm">
    {icon} {text}
  </button>
)

const Button = ({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) => (
  <button className={`flex items-center gap-2 bg-blue-50 hover:bg-blue-100 ${color} px-3 py-2 rounded-xl text-sm font-medium`}>
    {icon} {text}
  </button>
)

const PrivacyItem = ({
  icon,
  title,
  desc,
  active,
  onClick
}: {
  icon: React.ReactNode
  title: string
  desc: string
  active?: boolean
  onClick: () => void
}) => (
  <button onClick={onClick} className={`flex items-start gap-3 px-3 py-2 w-full text-left hover:bg-gray-50 ${active ? 'bg-gray-100' : ''}`}>
    {icon}
    <div>
      <p className="font-medium text-sm text-gray-800">{title}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  </button>
)
