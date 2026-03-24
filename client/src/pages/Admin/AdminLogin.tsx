import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import adminAuthService from '@/services/adminAuthService'
import { toast } from 'sonner'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Nếu đã đăng nhập admin rồi thì redirect thẳng vào dashboard
  useEffect(() => {
    if (adminAuthService.isAuthenticated()) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    setLoading(true)
    try {
      const { admin } = await adminAuthService.login(username, password)
      toast.success(`Chào mừng, ${admin.name}!`)
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Tên đăng nhập hoặc mật khẩu không đúng'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      {/* Background */}
      <div className="admin-login-bg">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />
      </div>

      {/* Card */}
      <div className="admin-login-card">
        {/* Header */}
        <div className="login-card-header">
          <div className="login-logo">
            <Shield size={32} />
          </div>
          <h1 className="login-title">Admin Portal</h1>
          <p className="login-subtitle">Đăng nhập vào bảng quản trị</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <label className="login-label">Tên đăng nhập</label>
            <input
              id="admin-username"
              type="text"
              className="login-input"
              placeholder="Nhập username hoặc email..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label">Mật khẩu</label>
            <div className="login-input-wrap">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="show-pass-btn"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <LogIn size={18} />
                Đăng nhập
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>🔒 Khu vực dành riêng cho quản trị viên</span>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
