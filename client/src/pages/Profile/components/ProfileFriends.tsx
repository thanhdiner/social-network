const friends = [
  { name: 'Petey Cruiser', friends: 15, img: 'https://i.pravatar.cc/100?img=12' },
  { name: 'Anna Sthesia', friends: 50, img: 'https://i.pravatar.cc/100?img=14' },
  { name: 'Paul Molive', friends: 10, img: 'https://i.pravatar.cc/100?img=20' },
  { name: 'Gail Forcewind', friends: 20, img: 'https://i.pravatar.cc/100?img=22' },
  { name: 'Barb Ackue', friends: 5, img: 'https://i.pravatar.cc/100?img=24' },
  { name: 'Greta Life', friends: 18, img: 'https://i.pravatar.cc/100?img=28' }
]

interface ProfileFriendsProps {
  username?: string
}

export const ProfileFriends = ({ username: _username }: ProfileFriendsProps) => {
  // TODO: Fetch friends based on _username
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <h2 className="text-lg font-semibold mb-4">Friends</h2>

      <div className="flex gap-4 border-b pb-3 text-sm text-gray-600 mb-4">
        <button className="text-orange-500 font-medium">All Friends</button>
        <button className="hover:text-orange-500">Recently Added</button>
        <button className="hover:text-orange-500">Close Friends</button>
        <button className="hover:text-orange-500">Home/Town</button>
        <button className="hover:text-orange-500">Following</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {friends.map((f, i) => (
          <div key={i} className="flex items-center justify-between border rounded-xl p-3 hover:shadow transition">
            <div className="flex items-center gap-3">
              <img src={f.img} alt={f.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <p className="font-medium text-gray-800">{f.name}</p>
                <p className="text-sm text-gray-500">{f.friends} friends</p>
              </div>
            </div>
            <button className="bg-orange-100 text-orange-600 text-sm px-3 py-1 rounded-lg hover:bg-orange-200">✓ Friend</button>
          </div>
        ))}
      </div>
    </div>
  )
}
