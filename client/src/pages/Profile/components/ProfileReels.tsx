import UserReels from '@/components/Reels/UserReels'

interface ProfileReelsProps {
  userId: string
}

export const ProfileReels = ({ userId }: ProfileReelsProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <h2 className="text-lg font-semibold mb-4">Reels</h2>
      <UserReels userId={userId} />
    </div>
  )
}
