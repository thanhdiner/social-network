import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Mail,
  Lock,
  ArrowRight,
  CircleAlert,
  LifeBuoy,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'
import adminAuthService from '@/services/adminAuthService'
import { toast } from 'sonner'

type AuthView = 'login' | 'twofactor' | 'forgot' | 'reset' | 'success'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()

  // ─── Login state ────────────────────────────────────────────────────────────
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorExpiresAt, setTwoFactorExpiresAt] = useState<number | null>(null)
  const [twoFactorDebugCode, setTwoFactorDebugCode] = useState<string | null>(null)

  // ─── Forgot / Reset state ────────────────────────────────────────────────────
  const [view, setView] = useState<AuthView>('login')
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    if (adminAuthService.isAuthenticated()) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  // ─── Login ───────────────────────────────────────────────────────────────────
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

      if (result.requiresTwoFactor) {
        setChallengeToken(result.challengeToken)
        setTwoFactorCode('')
        setTwoFactorExpiresAt(result.expiresAt)
        setTwoFactorDebugCode(result.debugCode || null)
        setView('twofactor')
        toast.success(result.message || 'Mã xác thực đã được gửi qua email admin')
        return
      }

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

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const normalizedCode = twoFactorCode.trim()
    if (!normalizedCode || normalizedCode.length < 6) {
      setError('Vui lòng nhập mã xác thực 6 chữ số')
      return
    }

    setLoading(true)
    try {
      const result = await adminAuthService.verifyTwoFactor(challengeToken, normalizedCode)
      if (!rememberMe) sessionStorage.setItem('admin.session.login', '1')
      toast.success(`Chào mừng, ${result.admin.name}!`)
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      const maybeMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = Array.isArray(maybeMessage)
        ? maybeMessage[0]
        : maybeMessage || 'Mã xác thực không đúng hoặc đã hết hạn'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResendTwoFactor = async () => {
    if (!challengeToken) return

    setError('')
    setResending(true)
    try {
      const result = await adminAuthService.resendTwoFactor(challengeToken)
      setTwoFactorExpiresAt(result.expiresAt)
      setTwoFactorDebugCode(result.debugCode || null)
      toast.success('Đã gửi lại mã xác thực')
    } catch (err: unknown) {
      const maybeMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = Array.isArray(maybeMessage)
        ? maybeMessage[0]
        : maybeMessage || 'Không thể gửi lại mã xác thực'
      setError(msg)
    } finally {
      setResending(false)
    }
  }

  // ─── Forgot Password (Step 1) ─────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    if (!forgotEmail.trim()) {
      setForgotError('Vui lòng nhập địa chỉ email')
      return
    }
    setForgotLoading(true)
    try {
      const res = await adminAuthService.forgotPassword(forgotEmail.trim())
      if (res.debugCode) {
        setDebugCode(res.debugCode)
        toast.info(`[Dev] Mã reset: ${res.debugCode}`, { duration: 30000 })
      }
      setView('reset')
      toast.success('Kiểm tra email để lấy mã xác nhận')
    } catch (err: unknown) {
      const maybeMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = Array.isArray(maybeMessage) ? maybeMessage[0] : maybeMessage || 'Có lỗi xảy ra, vui lòng thử lại'
      setForgotError(msg)
    } finally {
      setForgotLoading(false)
    }
  }

  // ─── Reset Password (Step 2) ──────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    if (!resetCode.trim() || !newPassword || !confirmPassword) {
      setResetError('Vui lòng điền đầy đủ thông tin')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError('Mật khẩu xác nhận không khớp')
      return
    }
    if (newPassword.length < 8) {
      setResetError('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }
    setResetLoading(true)
    try {
      await adminAuthService.resetPassword({
        email: forgotEmail.trim(),
        code: resetCode.trim(),
        newPassword,
        confirmPassword,
      })
      setView('success')
    } catch (err: unknown) {
      const maybeMessage = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = Array.isArray(maybeMessage) ? maybeMessage[0] : maybeMessage || 'Mã xác nhận không đúng hoặc đã hết hạn'
      setResetError(msg)
    } finally {
      setResetLoading(false)
    }
  }

  const goBackToLogin = () => {
    setView('login')
    setChallengeToken('')
    setTwoFactorCode('')
    setTwoFactorExpiresAt(null)
    setTwoFactorDebugCode(null)
    setForgotEmail('')
    setResetCode('')
    setNewPassword('')
    setConfirmPassword('')
    setForgotError('')
    setResetError('')
    setDebugCode(null)
    setError('')
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
              <h1>Indigo Nexus</h1>
              <div className="admin-login-brand-line">
                <span />
                <strong>Management Suite</strong>
                <span />
              </div>
            </div>

            {/* ─── LOGIN ──────────────────────────────────────────────────── */}
            {view === 'login' && (
              <>
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
                        placeholder="admin@indigonexus.com"
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
                      onClick={() => { setView('forgot'); setError('') }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button type="submit" className="admin-login-submit-btn" disabled={loading}>
                    {loading ? <span className="login-spinner" /> : (
                      <><span>Login to Admin Suite</span><ArrowRight size={18} /></>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ─── TWO FACTOR ─────────────────────────────────────────────── */}
            {view === 'twofactor' && (
              <>
                <div className="admin-login-intro">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <KeyRound size={22} />
                    Xác thực 2 lớp
                  </h2>
                  <p>Nhập mã OTP được gửi vào email admin để hoàn tất đăng nhập.</p>
                </div>

                <form className="admin-login-form" onSubmit={handleVerifyTwoFactor}>
                  {error && (
                    <div className="admin-login-error">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="admin-login-twofactor-note">
                    <KeyRound size={16} />
                    <span>
                      Mã có hiệu lực đến{' '}
                      <strong>{twoFactorExpiresAt ? new Date(twoFactorExpiresAt).toLocaleTimeString('vi-VN') : '--:--:--'}</strong>
                    </span>
                  </div>

                  {twoFactorDebugCode && (
                    <div className="admin-login-twofactor-debug">
                      Mã dev: <strong>{twoFactorDebugCode}</strong>
                    </div>
                  )}

                  <div className="admin-login-field">
                    <label htmlFor="admin-otp" className="admin-login-label">Mã xác thực (6 chữ số)</label>
                    <div className="admin-login-input-wrap">
                      <span className="admin-login-input-icon"><KeyRound size={17} /></span>
                      <input
                        id="admin-otp"
                        type="text"
                        className="admin-login-input"
                        placeholder="123456"
                        value={twoFactorCode}
                        onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="admin-login-twofactor-actions">
                    <button
                      type="button"
                      className="admin-login-secondary-btn"
                      onClick={goBackToLogin}
                      disabled={loading}
                    >
                      <ArrowLeft size={14} />
                      Quay về đăng nhập
                    </button>

                    <button
                      type="button"
                      className="admin-login-secondary-btn"
                      onClick={handleResendTwoFactor}
                      disabled={resending || loading}
                    >
                      <RotateCcw size={14} />
                      {resending ? 'Đang gửi...' : 'Gửi lại mã'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="admin-login-submit-btn"
                    disabled={loading || twoFactorCode.trim().length < 6}
                  >
                    {loading ? <span className="login-spinner" /> : (
                      <><span>Xác nhận đăng nhập</span><ArrowRight size={18} /></>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ─── FORGOT PASSWORD ─────────────────────────────────────────── */}
            {view === 'forgot' && (
              <>
                <div className="admin-login-intro">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <KeyRound size={22} />
                    Quên mật khẩu
                  </h2>
                  <p>Nhập email tài khoản admin để nhận mã đặt lại mật khẩu.</p>
                </div>

                <form className="admin-login-form" onSubmit={handleForgotPassword}>
                  {forgotError && (
                    <div className="admin-login-error">
                      <AlertCircle size={16} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="admin-login-field">
                    <label htmlFor="forgot-email" className="admin-login-label">Email Admin</label>
                    <div className="admin-login-input-wrap">
                      <span className="admin-login-input-icon"><Mail size={17} /></span>
                      <input
                        id="forgot-email"
                        type="email"
                        className="admin-login-input"
                        placeholder="admin@indigonexus.com"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button type="submit" className="admin-login-submit-btn" disabled={forgotLoading}>
                    {forgotLoading ? <span className="login-spinner" /> : (
                      <><span>Gửi mã xác nhận</span><ArrowRight size={18} /></>
                    )}
                  </button>

                  <button type="button" className="admin-login-forgot-btn" style={{ width: '100%', textAlign: 'center', marginTop: 8 }} onClick={goBackToLogin}>
                    <ArrowLeft size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Quay về đăng nhập
                  </button>
                </form>
              </>
            )}

            {/* ─── RESET PASSWORD ──────────────────────────────────────────── */}
            {view === 'reset' && (
              <>
                <div className="admin-login-intro">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <RotateCcw size={22} />
                    Đặt lại mật khẩu
                  </h2>
                  <p>
                    Nhập mã đã gửi tới <strong>{forgotEmail}</strong> và mật khẩu mới.
                  </p>
                  {debugCode && (
                    <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 13, color: '#854d0e' }}>
                      🛠 <strong>[Dev mode]</strong> Mã: <code style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 2 }}>{debugCode}</code>
                    </div>
                  )}
                </div>

                <form className="admin-login-form" onSubmit={handleResetPassword}>
                  {resetError && (
                    <div className="admin-login-error">
                      <AlertCircle size={16} />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <div className="admin-login-field">
                    <label htmlFor="reset-code" className="admin-login-label">Mã xác nhận (6 chữ số)</label>
                    <div className="admin-login-input-wrap">
                      <span className="admin-login-input-icon"><KeyRound size={17} /></span>
                      <input
                        id="reset-code"
                        type="text"
                        className="admin-login-input"
                        placeholder="123456"
                        value={resetCode}
                        onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="admin-login-field">
                    <label htmlFor="new-password" className="admin-login-label">Mật khẩu mới (tối thiểu 8 ký tự)</label>
                    <div className="admin-login-input-wrap">
                      <span className="admin-login-input-icon"><Lock size={17} /></span>
                      <input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        className="admin-login-input password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <button type="button" className="admin-login-show-pass-btn" onClick={() => setShowNewPassword(v => !v)}>
                        {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <div className="admin-login-field">
                    <label htmlFor="confirm-password" className="admin-login-label">Xác nhận mật khẩu mới</label>
                    <div className="admin-login-input-wrap">
                      <span className="admin-login-input-icon"><Lock size={17} /></span>
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="admin-login-input password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                      <button type="button" className="admin-login-show-pass-btn" onClick={() => setShowConfirmPassword(v => !v)}>
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="admin-login-submit-btn" disabled={resetLoading}>
                    {resetLoading ? <span className="login-spinner" /> : (
                      <><span>Đặt lại mật khẩu</span><ArrowRight size={18} /></>
                    )}
                  </button>

                  <button
                    type="button"
                    className="admin-login-forgot-btn"
                    style={{ width: '100%', textAlign: 'center', marginTop: 8 }}
                    onClick={() => setView('forgot')}
                  >
                    <ArrowLeft size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Gửi lại mã mới
                  </button>
                </form>
              </>
            )}

            {/* ─── SUCCESS ─────────────────────────────────────────────────── */}
            {view === 'success' && (
              <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
                <CheckCircle2 size={56} style={{ color: '#22c55e', margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                  Đặt lại mật khẩu thành công!
                </h2>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                  Mật khẩu của bạn đã được cập nhật. Tất cả các phiên đăng nhập cũ đã bị thu hồi.
                </p>
                <button
                  type="button"
                  className="admin-login-submit-btn"
                  onClick={goBackToLogin}
                >
                  <LogIn size={18} />
                  <span>Đăng nhập ngay</span>
                </button>
              </div>
            )}

            <div className="admin-login-security-note">
              <CircleAlert size={17} />
              <p>
                <strong>AUTHORIZED ACCESS ONLY:</strong> This system is for authorized users only. Unauthorized
                access may result in administrative action and legal prosecution.
              </p>
            </div>
          </section>

          <div className="admin-login-support">
            Need assistance?
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
          <span className="admin-login-footer-brand">Indigo Nexus</span>
          <div className="admin-login-footer-links">
            <button type="button">Privacy Policy</button>
            <button type="button">Terms of Service</button>
            <button type="button">Help Center</button>
            <button type="button">System Status</button>
          </div>
          <span className="admin-login-footer-copy">© 2026 Indigo Nexus Management Suite</span>
        </div>
      </footer>
    </div>
  )
}

export default AdminLogin
