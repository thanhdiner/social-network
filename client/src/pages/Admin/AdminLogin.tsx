import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
  CircleAlert,
  LifeBuoy,
} from 'lucide-react'
import adminAuthService from '@/services/adminAuthService'
import { toast } from 'sonner'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (adminAuthService.isAuthenticated()) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin')
      return
    }

    setLoading(true)
    try {
      const result = await adminAuthService.login(username, password)

      if (!rememberMe) sessionStorage.setItem('admin.session.login', '1')
      toast.success(`Chào mừng, ${result.admin.name}!`)
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      const maybeMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = Array.isArray(maybeMessage) ? maybeMessage[0] : maybeMessage || 'Tên đăng nhập hoặc mật khẩu không đúng'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-mesh" />

      <main className="admin-login-main">
        <div className="admin-login-shell">
          <section className="admin-login-card">
            <div className="admin-login-topline" />

            <div className="admin-login-brand">
              <div className="admin-login-logo">
                <Shield size={34} />
              </div>
              <h1>Social Network</h1>
              <div className="admin-login-brand-line">
                <span />
                <strong>Admin Console</strong>
                <span />
              </div>
            </div>

            <div className="admin-login-intro">
              <h2>Admin Login</h2>
              <p>Welcome back! Please enter your credentials.</p>
            </div>

            <form className="admin-login-form" onSubmit={handleLogin}>
              {error && (
                <div className="admin-login-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="admin-login-field">
                <label htmlFor="admin-username" className="admin-login-label">Email Address</label>
                <div className="admin-login-input-wrap">
                  <span className="admin-login-input-icon"><Mail size={17} /></span>
                  <input
                    id="admin-username"
                    type="text"
                    className="admin-login-input"
                    placeholder="admin@socialnetwork.com"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="admin-login-field">
                <label htmlFor="admin-password" className="admin-login-label">Password</label>
                <div className="admin-login-input-wrap">
                  <span className="admin-login-input-icon"><Lock size={17} /></span>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    className="admin-login-input password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="admin-login-show-pass-btn"
                    onClick={() => setShowPassword(v => !v)}
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="admin-login-options">
                <label className="admin-login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="admin-login-forgot-btn"
                  onClick={() => toast.info('Tính năng quên mật khẩu admin sẽ được mở trong bước tiếp theo')}
                >
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="admin-login-submit-btn" disabled={loading}>
                {loading ? <span className="login-spinner" /> : (
                  <><span>Login to Admin Console</span><ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="admin-login-security-note">
              <CircleAlert size={17} />
              <p>
                <strong>AUTHORIZED ACCESS ONLY:</strong> This system is for authorized users only. Unauthorized
                access may result in administrative action and legal prosecution.
              </p>
            </div>
          </section>

          <div className="admin-login-support">
            Need assistance?{' '}
            <button
              type="button"
              onClick={() => toast.info('Liên hệ hỗ trợ hệ thống qua kênh nội bộ của đội vận hành')}
            >
              <LifeBuoy size={15} />
              Contact System Support
            </button>
          </div>
        </div>
      </main>

      <footer className="admin-login-footer">
        <div className="admin-login-footer-inner">
          <span className="admin-login-footer-brand">Social Network</span>
          <div className="admin-login-footer-links">
            <button type="button">Privacy Policy</button>
            <button type="button">Terms of Service</button>
            <button type="button">Help Center</button>
            <button type="button">System Status</button>
          </div>
          <span className="admin-login-footer-copy">© 2026 Social Network Admin Console</span>
        </div>
      </footer>
    </div>
  )
}

export default AdminLogin
