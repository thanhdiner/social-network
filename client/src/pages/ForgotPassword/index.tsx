import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { forgotPassword } from '@/services/authService'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Vui lòng nhập email')
      return
    }

    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email không hợp lệ')
      return
    }

    setIsLoading(true)
    try {
      const response = await forgotPassword(email)
      
      toast.success(response.message || 'Mã đặt lại mật khẩu đã được gửi đến email của bạn')
      
      // Navigate to reset password page with email
      navigate('/reset-password', { state: { email, debugCode: response.debugCode } })
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(errorMessage || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-[400px]">
        <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">Quên mật khẩu</h2>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Nhập email của bạn để nhận mã đặt lại mật khẩu
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
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
