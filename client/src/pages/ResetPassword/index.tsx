import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { resetPassword } from '@/services/authService'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const emailFromState = (location.state as { email?: string; debugCode?: string })?.email
  const debugCode = (location.state as { email?: string; debugCode?: string })?.debugCode

  const [formData, setFormData] = useState({
    code: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!emailFromState) {
      toast.error('Vui lòng yêu cầu mã đặt lại mật khẩu trước')
      navigate('/forgot-password')
    }
  }, [emailFromState, navigate])

  useEffect(() => {
    if (debugCode) {
      console.log('Debug code:', debugCode)
      toast.info(`Mã xác nhận (dev): ${debugCode}`)
    }
  }, [debugCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (formData.newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }

    setIsLoading(true)
    try {
      const response = await resetPassword(formData.code, formData.newPassword)
      
      toast.success(response.message || 'Đặt lại mật khẩu thành công')
      
      // Navigate to login page
      navigate('/login')
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMessage || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-[400px]">
        <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">Đặt lại mật khẩu</h2>
        <p className="text-sm text-gray-600 mb-6 text-center">
          {emailFromState && `Mã xác nhận đã được gửi đến ${emailFromState}`}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Mã xác nhận
            </label>
            <Input
              id="code"
              name="code"
              type="text"
              placeholder="Nhập mã 6 chữ số"
              value={formData.code}
              onChange={handleChange}
              required
              maxLength={6}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu mới
            </label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                value={formData.newPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu
            </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium cursor-pointer">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}
