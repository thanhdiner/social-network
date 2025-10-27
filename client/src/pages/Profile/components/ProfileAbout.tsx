import { useEffect, useState } from 'react'
import userService from '@/services/userService'
import type { User } from '@/services/authService'
import { Mail, MapPin, Calendar, User as UserIcon, Phone, Globe, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'

interface ProfileAboutProps {
  username?: string
}

export const ProfileAbout = ({ username }: ProfileAboutProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      if (!username) return
      
      try {
        setIsLoading(true)
        const userData = await userService.getUserByUsername(username)
        setUser(userData)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [username])

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow">
        <p className="text-gray-500">Không tìm thấy thông tin người dùng</p>
      </div>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      {/* Bio */}
      {user.bio && (
        <>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Giới thiệu</h2>
          <p className="text-sm text-gray-700 mb-6">{user.bio}</p>
        </>
      )}

      {/* Contact Information */}
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Thông tin liên hệ</h2>
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-orange-500" />
          <div>
            <span className="font-medium text-gray-500">Email: </span>
            <span>{user.email}</span>
          </div>
        </div>

        {user.phone && (
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-orange-500" />
            <div>
              <span className="font-medium text-gray-500">Điện thoại: </span>
              <span>{user.phone}</span>
            </div>
          </div>
        )}

        {user.address && (
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-orange-500" />
            <div>
              <span className="font-medium text-gray-500">Địa chỉ: </span>
              <span>{user.address}</span>
            </div>
          </div>
        )}

        {user.website && (
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-orange-500" />
            <div>
              <span className="font-medium text-gray-500">Website: </span>
              <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                {user.website}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Basic Information */}
      {(user.dateOfBirth || user.gender) && (
        <>
          <h2 className="text-lg font-semibold mt-6 mb-4 text-gray-800">Thông tin cơ bản</h2>
          <div className="space-y-3 text-sm text-gray-700">
            {user.dateOfBirth && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-orange-500" />
                <div>
                  <span className="font-medium text-gray-500">Ngày sinh: </span>
                  <span>{formatDate(user.dateOfBirth)}</span>
                </div>
              </div>
            )}

            {user.gender && (
              <div className="flex items-center gap-3">
                <UserIcon className="w-4 h-4 text-orange-500" />
                <div>
                  <span className="font-medium text-gray-500">Giới tính: </span>
                  <span>{user.gender}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Social Media */}
      {(user.facebook || user.instagram || user.twitter || user.linkedin) && (
        <>
          <h2 className="text-lg font-semibold mt-6 mb-4 text-gray-800">Mạng xã hội</h2>
          <div className="space-y-3 text-sm text-gray-700">
            {user.facebook && (
              <div className="flex items-center gap-3">
                <Facebook className="w-4 h-4 text-orange-500" />
                <div>
                  <span className="font-medium text-gray-500">Facebook: </span>
                  <a href={user.facebook} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                    {user.facebook}
                  </a>
                </div>
              </div>
            )}

            {user.instagram && (
              <div className="flex items-center gap-3">
                <Instagram className="w-4 h-4 text-orange-500" />
                <div>
                  <span className="font-medium text-gray-500">Instagram: </span>
                  <a href={user.instagram} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                    {user.instagram}
                  </a>
                </div>
              </div>
            )}

            {user.twitter && (
              <div className="flex items-center gap-3">
                <Twitter className="w-4 h-4 text-orange-500" />
                <div>
                  <span className="font-medium text-gray-500">X (Twitter): </span>
                  <a href={user.twitter} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                    {user.twitter}
                  </a>
                </div>
              </div>
            )}

            {user.linkedin && (
              <div className="flex items-center gap-3">
                <Linkedin className="w-4 h-4 text-orange-500" />
                <div>
                  <span className="font-medium text-gray-500">LinkedIn: </span>
                  <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                    {user.linkedin}
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
