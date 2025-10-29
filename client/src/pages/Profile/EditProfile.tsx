import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import userService from '@/services/userService'
import uploadService from '@/services/uploadService'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, Camera, X } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'

export default function EditProfile() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('personal')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state - Khởi tạo từ user data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    phone: '',
    website: '',
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: ''
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Image upload refs and states
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [coverPreview, setCoverPreview] = useState<string>('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Load user data khi component mount
  useEffect(() => {
    if (user) {
      const nameParts = user.name?.split(' ') || []
      // Format dateOfBirth to YYYY-MM-DD for input[type="date"]
      const formattedDate = user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
      setFormData({
        firstName: nameParts[nameParts.length - 1] || '',
        lastName: nameParts.slice(0, -1).join(' ') || '',
        bio: user.bio || '',
        gender: user.gender || '',
        dateOfBirth: formattedDate,
        address: user.address || '',
        phone: user.phone || '',
        website: user.website || '',
        facebook: user.facebook || '',
        instagram: user.instagram || '',
        twitter: user.twitter || '',
        linkedin: user.linkedin || ''
      })
      // Set image previews
      setAvatarPreview(user.avatar || '')
      setCoverPreview(user.coverImage || '')
    }
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = uploadService.validateImage(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    try {
      setUploadingAvatar(true)
      
      // Xóa ảnh cũ trên Cloudinary (nếu có và khác với preview hiện tại)
      if (user?.avatar && user.avatar !== avatarPreview) {
        await uploadService.deleteImage(user.avatar).catch(err => {
          console.warn('Failed to delete old avatar:', err)
        })
      }
      
      // Upload ảnh mới
      const imageUrl = await uploadService.uploadImage(file)
      
      // Update ngay lập tức
      await userService.updateProfile({ avatar: imageUrl })
      
      // Refresh user data
      await refreshUser()
      
      setAvatarPreview(imageUrl)
      
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Upload ảnh thất bại')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = uploadService.validateImage(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    try {
      setUploadingCover(true)
      
      // Xóa ảnh bìa cũ trên Cloudinary (nếu có và khác với preview hiện tại)
      if (user?.coverImage && user.coverImage !== coverPreview) {
        await uploadService.deleteImage(user.coverImage).catch(err => {
          console.warn('Failed to delete old cover:', err)
        })
      }
      
      // Upload ảnh mới
      const imageUrl = await uploadService.uploadImage(file)
      
      // Update ngay lập tức
      await userService.updateProfile({ coverImage: imageUrl })
      
      // Refresh user data
      await refreshUser()
      
      setCoverPreview(imageUrl)
      
      // Reset input
      if (coverInputRef.current) {
        coverInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Upload ảnh thất bại')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Bạn có chắc muốn xóa avatar?')) return
    
    try {
      setUploadingAvatar(true)
      
      // Xóa ảnh trên Cloudinary trước
      if (user?.avatar) {
        await uploadService.deleteImage(user.avatar).catch(err => {
          console.warn('Failed to delete avatar from Cloudinary:', err)
        })
      }
      
      // Xóa trong database
      await userService.updateProfile({ avatar: '' })
      await refreshUser()
      
      setAvatarPreview('')
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Remove avatar error:', err)
      setError('Xóa avatar thất bại')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveCover = async () => {
    if (!confirm('Bạn có chắc muốn xóa ảnh bìa?')) return
    
    try {
      setUploadingCover(true)
      
      // Xóa ảnh trên Cloudinary trước
      if (user?.coverImage) {
        await uploadService.deleteImage(user.coverImage).catch(err => {
          console.warn('Failed to delete cover from Cloudinary:', err)
        })
      }
      
      // Xóa trong database
      await userService.updateProfile({ coverImage: '' })
      await refreshUser()
      
      setCoverPreview('')
      if (coverInputRef.current) {
        coverInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Remove cover error:', err)
      setError('Xóa ảnh bìa thất bại')
    } finally {
      setUploadingCover(false)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Validate
      if (!formData.firstName.trim()) {
        setError('Vui lòng nhập tên')
        return
      }

      const fullName = formData.lastName.trim() ? `${formData.lastName.trim()} ${formData.firstName.trim()}` : formData.firstName.trim()

      // Call API to update profile (không cần update avatar và coverImage vì đã update ngay lập tức)
      await userService.updateProfile({
        name: fullName,
        bio: formData.bio.trim() || undefined,
        gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        facebook: formData.facebook.trim() || undefined,
        instagram: formData.instagram.trim() || undefined,
        twitter: formData.twitter.trim() || undefined,
        linkedin: formData.linkedin.trim() || undefined
      })

      // Refresh user data in context
      await refreshUser()

      alert('Cập nhật profile thành công!')
      navigate(`/profile/${user?.username}`)
    } catch (err) {
      console.error('Update error:', err)
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Cập nhật profile thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async () => {
    setPasswordLoading(true)
    setPasswordError('')

    try {
      // Validate
      if (!passwordData.currentPassword) {
        setPasswordError('Vui lòng nhập mật khẩu hiện tại')
        return
      }

      if (!passwordData.newPassword) {
        setPasswordError('Vui lòng nhập mật khẩu mới')
        return
      }

      if (passwordData.newPassword.length < 6) {
        setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự')
        return
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('Mật khẩu xác nhận không khớp')
        return
      }

      if (passwordData.currentPassword === passwordData.newPassword) {
        setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại')
        return
      }

      // Call API to change password
      await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      alert('Đổi mật khẩu thành công!')
      setActiveTab('personal')
    } catch (err) {
      console.error('Change password error:', err)
      const error = err as { response?: { data?: { message?: string } } }
      setPasswordError(error.response?.data?.message || 'Đổi mật khẩu thất bại')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-white rounded-2xl shadow overflow-hidden">
      {/* Cover Image Section */}
      <div className="relative h-48 bg-linear-to-r from-orange-100 to-orange-200">
        {coverPreview && (
          <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
        )}
        {uploadingCover && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white">Đang upload...</div>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-100 transition"
            title="Thay đổi ảnh bìa"
          >
            <Camera className="text-gray-700" size={18} />
          </button>
          {coverPreview && (
            <button
              onClick={handleRemoveCover}
              className="p-2 bg-white rounded-full shadow hover:bg-red-50 transition"
              title="Xóa ảnh bìa"
            >
              <X className="text-red-500" size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Avatar section */}
        <div className="flex items-center gap-6 mb-10 -mt-20">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full">
                  <Avatar
                    src={user?.avatar || undefined}
                    name={user?.name || 'User'}
                    size="xl"
                  />
                </div>
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                <div className="text-white text-xs">Uploading...</div>
              </div>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div className="absolute bottom-1 right-1 flex gap-1">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="p-2 bg-orange-500 text-white rounded-full shadow hover:bg-orange-600 transition"
                title="Thay đổi avatar"
              >
                <Pencil size={14} />
              </button>
              {avatarPreview && avatarPreview !== user?.avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="p-2 bg-red-500 text-white rounded-full shadow hover:bg-red-600 transition"
                  title="Xóa avatar"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="mt-16">
            <h3 className="text-xl font-semibold text-gray-800">{user?.name || 'User'}</h3>
            <p className="text-sm text-gray-500">@{user?.username}</p>
            <p className="text-xs text-gray-400 mt-1">Update your profile details</p>
          </div>
        </div>

      {error && <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 bg-orange-50 rounded-xl mb-8">
          <TabsTrigger className="cursor-pointer" value="personal">
            Personal Information
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="password">
            Change Password
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="email">
            Email and SMS
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="contact">
            Manage Contact
          </TabsTrigger>
        </TabsList>

        {/* -------- Personal Info -------- */}
        <TabsContent value="personal" className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Họ và tên đệm</Label>
              <Input placeholder="VD: Huỳnh Văn" value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Họ và tên đệm (có thể để trống nếu chỉ có tên)</p>
            </div>
            <div className="col-span-2">
              <Label>Tên *</Label>
              <Input
                placeholder="VD: Thành"
                value={formData.firstName}
                onChange={e => handleInputChange('firstName', e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Tên của bạn (bắt buộc)</p>
            </div>

            <div className="col-span-2">
              <Label>Username</Label>
              <Input placeholder="Username" value={user?.username || ''} disabled className="bg-gray-100 cursor-not-allowed" />
              <p className="text-xs text-gray-500 mt-1">Username không thể thay đổi</p>
            </div>

            <div className="col-span-2">
              <Label>Email</Label>
              <Input type="email" placeholder="Email" value={user?.email || ''} disabled className="bg-gray-100 cursor-not-allowed" />
              <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
            </div>

            <div className="col-span-2">
              <Label>Bio</Label>
              <Textarea
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={e => handleInputChange('bio', e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
            </div>

            <div className="col-span-2">
              <Label>Giới tính</Label>
              <Select value={formData.gender} onValueChange={value => handleInputChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nam">Nam</SelectItem>
                  <SelectItem value="Nữ">Nữ</SelectItem>
                  <SelectItem value="Khác">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Ngày sinh</Label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={e => handleInputChange('dateOfBirth', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label>Địa chỉ</Label>
              <Input
                placeholder="VD: Hồ Chí Minh, Việt Nam"
                value={formData.address}
                onChange={e => handleInputChange('address', e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">Địa chỉ hiện tại của bạn</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(`/profile/${user?.username}`)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </TabsContent>

        {/* -------- Change Password -------- */}
        <TabsContent value="password" className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>

          {passwordError && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{passwordError}</div>}

          <div className="space-y-4">
            <div>
              <Label>Current Password *</Label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={e => handlePasswordChange('currentPassword', e.target.value)}
                disabled={passwordLoading}
              />
            </div>
            <div>
              <Label>New Password *</Label>
              <Input
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={passwordData.newPassword}
                onChange={e => handlePasswordChange('newPassword', e.target.value)}
                disabled={passwordLoading}
              />
            </div>
            <div>
              <Label>Confirm New Password *</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={passwordData.confirmPassword}
                onChange={e => handlePasswordChange('confirmPassword', e.target.value)}
                disabled={passwordLoading}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                })
                setPasswordError('')
              }}
              disabled={passwordLoading}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordSubmit} disabled={passwordLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </TabsContent>

        {/* -------- Email and SMS -------- */}
        <TabsContent value="email" className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Email and SMS</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Email Notification</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>SMS Notification</Label>
              <Switch defaultChecked />
            </div>

            <div className="mt-6 space-y-2">
              <Label>When To Email</Label>
              <div className="flex flex-col gap-2 pl-2">
                <label>
                  <input type="checkbox" /> You have new notifications
                </label>
                <label>
                  <input type="checkbox" /> Someone adds you as a connection
                </label>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label>When To Escalate Emails</Label>
              <div className="flex flex-col gap-2 pl-2">
                <label>
                  <input type="checkbox" /> New membership approval
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> Member registration
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Submit</Button>
          </div>
        </TabsContent>

        {/* -------- Manage Contact -------- */}
        <TabsContent value="contact" className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">Quản lý liên hệ</h2>
          <div className="space-y-4">
            <div>
              <Label>Số điện thoại</Label>
              <Input
                placeholder="VD: 0901234567"
                value={formData.phone}
                onChange={e => handleInputChange('phone', e.target.value)}
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">Số điện thoại liên hệ của bạn</p>
            </div>
            <div>
              <Label>Website</Label>
              <Input
                placeholder="VD: https://yourwebsite.com"
                value={formData.website}
                onChange={e => handleInputChange('website', e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">Website cá nhân hoặc công ty</p>
            </div>

            <div className="pt-4">
              <h3 className="text-md font-semibold text-gray-800 mb-4">Mạng xã hội</h3>
              <div className="space-y-4">
                <div>
                  <Label>Facebook</Label>
                  <Input
                    placeholder="VD: https://facebook.com/yourprofile"
                    value={formData.facebook}
                    onChange={e => handleInputChange('facebook', e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input
                    placeholder="VD: https://instagram.com/yourprofile"
                    value={formData.instagram}
                    onChange={e => handleInputChange('instagram', e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label>X (Twitter)</Label>
                  <Input
                    placeholder="VD: https://x.com/yourprofile"
                    value={formData.twitter}
                    onChange={e => handleInputChange('twitter', e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input
                    placeholder="VD: https://linkedin.com/in/yourprofile"
                    value={formData.linkedin}
                    onChange={e => handleInputChange('linkedin', e.target.value)}
                    maxLength={200}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(`/profile/${user?.username}`)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
