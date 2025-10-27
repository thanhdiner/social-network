import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.identifier || !formData.password) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    try {
      await login(formData)
      navigate('/')
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(errorMessage || 'Đăng nhập thất bại. Vui lòng kiểm tra lại username/email và mật khẩu.')
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
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Đăng nhập</h2>

        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
              Username hoặc Email
            </label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="username hoặc email@example.com"
              value={formData.identifier}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-blue-500 hover:text-blue-600 font-medium">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  )
}
