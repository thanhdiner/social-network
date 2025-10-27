const photos = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=300',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=300',
  'https://images.unsplash.com/photo-1531256379411-0b7b8c7de9e8?w=300',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300'
]

interface ProfilePhotosProps {
  username?: string
}

export const ProfilePhotos = ({ username: _username }: ProfilePhotosProps) => {
  // TODO: Fetch photos based on _username
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <h2 className="text-lg font-semibold mb-4">Photos</h2>

      <div className="flex gap-6 border-b pb-3 text-sm text-gray-600 mb-4">
        <button className="text-orange-500 font-medium">Photos of You</button>
        <button className="hover:text-orange-500">Your Photos</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((p, i) => (
          <div key={i} className="overflow-hidden rounded-xl shadow-sm">
            <img src={p} alt={`photo-${i}`} className="w-full h-40 object-cover hover:scale-110 transition-transform duration-300" />
          </div>
        ))}
      </div>
    </div>
  )
}
