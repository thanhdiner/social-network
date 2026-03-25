import React, { useEffect, useMemo, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  Circle,
  Laptop,
  Lock,
  Mail,
  Save,
  Shield,
  Smartphone,
  User,
  UserCog,
  X,
  LogOut,
  Headset,
  Monitor,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import adminService, {
  type AdminAccountProfileData,
  type AdminAccountSecurityData,
  type AdminAccountSession,
} from '@/services/adminService'
import { toast } from 'sonner'

interface SecuritySettings {
  twoFactorEnabled: boolean
  loginAlertsEnabled: boolean
}

const getSessionIcon = (deviceName: string) => {
  const value = String(deviceName || '').toLowerCase()
  if (value.includes('iphone') || value.includes('android') || value.includes('phone')) return Smartphone
  if (value.includes('desktop') || value.includes('windows')) return Monitor
  return Laptop
}

const parseApiError = (error: any, fallbackMessage: string) => {
  const message = error?.response?.data?.message
  if (Array.isArray(message)) return message[0] || fallbackMessage
  if (typeof message === 'string') return message
  if (typeof error?.message === 'string') return error.message
  return fallbackMessage
}

const AdminProfile: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  const [profileData, setProfileData] = useState<AdminAccountProfileData | null>(null)

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    adminId: '',
    avatar: '' as string | null,
  })

  const [initialProfileForm, setInitialProfileForm] = useState({
    fullName: '',
    email: '',
    adminId: '',
    avatar: '' as string | null,
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginAlertsEnabled: true,
  })

  const [initialSecuritySettings, setInitialSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginAlertsEnabled: true,
  })

  const [sessions, setSessions] = useState<AdminAccountSession[]>([])

  const loadAccountProfile = async () => {
    setLoading(true)
    try {
      const data = await adminService.getAccountProfile()
      const nextProfile = {
        fullName: data.profile.name || '',
        email: data.profile.email || '',
        adminId: data.profile.adminId || '',
        avatar: data.profile.avatar || null,
      }

      const nextSecurity = {
        twoFactorEnabled: Boolean(data.security?.twoFactorEnabled),
        loginAlertsEnabled: Boolean(data.security?.loginAlertsEnabled),
      }

      setProfileData(data.profile)
      setProfileForm(nextProfile)
      setInitialProfileForm(nextProfile)
      setSecuritySettings(nextSecurity)
      setInitialSecuritySettings(nextSecurity)
      setSessions(data.sessions || [])
    } catch (error) {
      toast.error(parseApiError(error, 'Khong the tai du lieu tai khoan admin'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccountProfile()
  }, [])

  const passwordChecks = useMemo(() => {
    const value = passwordForm.newPassword
    return {
      minLength: value.length >= 8,
      hasUppercase: /[A-Z]/.test(value),
      hasNumber: /\d/.test(value),
      hasSpecial: /[^A-Za-z0-9]/.test(value),
    }
  }, [passwordForm.newPassword])

  const passwordScore = useMemo(() => {
    return Object.values(passwordChecks).filter(Boolean).length
  }, [passwordChecks])

  const strengthLabel = useMemo(() => {
    if (passwordScore >= 4) return 'MANH'
    if (passwordScore >= 2) return 'TRUNG BINH'
    return 'YEU'
  }, [passwordScore])

  const strengthClass = useMemo(() => {
    if (passwordScore >= 4) return 'strong'
    if (passwordScore >= 2) return 'medium'
    return 'weak'
  }, [passwordScore])

  const handleProfileInputChange = (field: 'fullName' | 'email', value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePasswordInputChange = (
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
    value: string,
  ) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId)
    try {
      await adminService.revokeAccountSession(sessionId)
      const updatedSessions = await adminService.getAccountSessions()
      setSessions(updatedSessions)
      toast.success('Da thu hoi phien dang nhap')
    } catch (error) {
      toast.error(parseApiError(error, 'Khong the thu hoi phien dang nhap'))
    } finally {
      setRevokingSessionId(null)
    }
  }

  const handleReset = () => {
    setProfileForm(initialProfileForm)
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setSecuritySettings(initialSecuritySettings)
    toast.info('Da khoi phuc du lieu ban dau')
  }

  const handleSave = async () => {
    if (!profileForm.fullName.trim()) {
      toast.error('Vui long nhap ho va ten')
      return
    }

    if (!profileForm.email.trim()) {
      toast.error('Vui long nhap dia chi email')
      return
    }

    if (passwordForm.newPassword || passwordForm.confirmPassword || passwordForm.currentPassword) {
      if (!passwordForm.currentPassword) {
        toast.error('Vui long nhap mat khau hien tai')
        return
      }

      if (passwordForm.newPassword.length < 8) {
        toast.error('Mat khau moi phai tu 8 ky tu tro len')
        return
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('Xac nhan mat khau khong trung khop')
        return
      }
    }

    setSaving(true)
    try {
      const updatedProfile = await adminService.updateAccountProfile({
        name: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
        avatar: profileForm.avatar || null,
      })

      const nextProfile = {
        fullName: updatedProfile.name || '',
        email: updatedProfile.email || '',
        adminId: updatedProfile.adminId || '',
        avatar: updatedProfile.avatar || null,
      }

      setProfileData(updatedProfile)
      setProfileForm(nextProfile)
      setInitialProfileForm(nextProfile)

      const hasPasswordChange =
        Boolean(passwordForm.currentPassword) ||
        Boolean(passwordForm.newPassword) ||
        Boolean(passwordForm.confirmPassword)

      if (hasPasswordChange) {
        await adminService.updateAccountPassword({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        })
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }

      const securityChanged =
        securitySettings.twoFactorEnabled !== initialSecuritySettings.twoFactorEnabled ||
        securitySettings.loginAlertsEnabled !== initialSecuritySettings.loginAlertsEnabled

      if (securityChanged) {
        const updatedSecurity: AdminAccountSecurityData = await adminService.updateAccountSecurity({
          twoFactorEnabled: securitySettings.twoFactorEnabled,
          loginAlertsEnabled: securitySettings.loginAlertsEnabled,
        })

        const nextSecurity = {
          twoFactorEnabled: Boolean(updatedSecurity.twoFactorEnabled),
          loginAlertsEnabled: Boolean(updatedSecurity.loginAlertsEnabled),
        }

        setSecuritySettings(nextSecurity)
        setInitialSecuritySettings(nextSecurity)
      }

      const latestSessions = await adminService.getAccountSessions()
      setSessions(latestSessions)

      toast.success('Da luu thay doi tai khoan')
    } catch (error) {
      toast.error(parseApiError(error, 'Khong the luu thay doi tai khoan'))
    } finally {
      setSaving(false)
    }
  }

  const displayName = profileData?.name || profileForm.fullName || 'Administrator'
  const displayAvatar =
    profileForm.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`

  if (loading) {
    return (
      <div className="admin-page admin-profile-page">
        <div className="admin-card">
          <div className="admin-loading">
            <div className="loading-spinner" />
            <span>Dang tai du lieu tai khoan...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page admin-profile-page">
      <header className="admin-profile-header">
        <div>
          <h1 className="admin-profile-title">Cai dat tai khoan</h1>
          <p className="admin-profile-subtitle">
            Quan ly thong tin ca nhan va thiet lap bao mat tai khoan quan tri.
          </p>
        </div>

        <div className="admin-profile-header-actions">
          <button type="button" className="admin-profile-cancel-btn" onClick={handleReset} disabled={saving}>
            <X size={16} />
            Huy bo
          </button>
          <button type="button" className="admin-profile-save-btn" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? 'Dang luu...' : 'Luu thay doi'}
          </button>
        </div>
      </header>

      <div className="admin-profile-grid">
        <div className="admin-profile-main-col">
          <section className="admin-profile-card">
            <div className="admin-profile-card-head">
              <span className="admin-profile-card-icon primary">
                <User size={18} />
              </span>
              <h2>Thong tin ca nhan</h2>
            </div>

            <div className="admin-profile-personal">
              <div className="admin-profile-avatar-wrap">
                <img src={displayAvatar} alt={displayName} className="admin-profile-avatar" />
                <button
                  type="button"
                  className="admin-profile-avatar-edit-btn"
                  title="Cap nhat avatar"
                  onClick={() => toast.info('Cap nhat avatar se duoc bo sung trong buoc tiep theo')}
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="admin-profile-fields-grid">
                <label className="admin-profile-field">
                  <span>Ho va ten</span>
                  <input
                    value={profileForm.fullName}
                    onChange={(event) => handleProfileInputChange('fullName', event.target.value)}
                    placeholder="Nhap ho va ten"
                  />
                </label>

                <label className="admin-profile-field">
                  <span>Admin ID</span>
                  <input value={profileForm.adminId} readOnly className="readonly" />
                </label>

                <label className="admin-profile-field full">
                  <span>Dia chi email</span>
                  <div className="admin-profile-field-with-icon">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => handleProfileInputChange('email', event.target.value)}
                      placeholder="admin@company.com"
                    />
                  </div>
                </label>
              </div>
            </div>
          </section>

          <section className="admin-profile-card">
            <div className="admin-profile-card-head">
              <span className="admin-profile-card-icon tertiary">
                <Lock size={18} />
              </span>
              <h2>Doi mat khau</h2>
            </div>

            <div className="admin-password-form">
              <label className="admin-profile-field">
                <span>Mat khau hien tai</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => handlePasswordInputChange('currentPassword', event.target.value)}
                  placeholder="••••••••"
                />
              </label>

              <div className="admin-password-row">
                <label className="admin-profile-field">
                  <span>Mat khau moi</span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) => handlePasswordInputChange('newPassword', event.target.value)}
                    placeholder="••••••••"
                  />
                </label>

                <label className="admin-profile-field">
                  <span>Xac nhan mat khau</span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => handlePasswordInputChange('confirmPassword', event.target.value)}
                    placeholder="••••••••"
                  />
                </label>
              </div>

              <div className="admin-password-strength-card">
                <div className="admin-password-strength-head">
                  <span>Do manh mat khau</span>
                  <span className={`pill ${strengthClass}`}>{strengthLabel}</span>
                </div>

                <div className="admin-password-strength-bars">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`bar ${step <= passwordScore ? 'active' : ''}`}
                    />
                  ))}
                </div>

                <ul className="admin-password-checklist">
                  <li className={passwordChecks.minLength ? 'ok' : ''}>
                    {passwordChecks.minLength ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    Toi thieu 8 ky tu
                  </li>
                  <li className={passwordChecks.hasSpecial ? 'ok' : ''}>
                    {passwordChecks.hasSpecial ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    Co ky tu dac biet (!@#)
                  </li>
                  <li className={passwordChecks.hasUppercase ? 'ok' : ''}>
                    {passwordChecks.hasUppercase ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    Co chu hoa
                  </li>
                  <li className={passwordChecks.hasNumber ? 'ok' : ''}>
                    {passwordChecks.hasNumber ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    Co chu so
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <aside className="admin-profile-side-col">
          <section className="admin-profile-card">
            <div className="admin-profile-card-head">
              <span className="admin-profile-card-icon secondary">
                <Shield size={18} />
              </span>
              <h2>Cai dat bao mat</h2>
            </div>

            <div className="admin-security-list">
              <div className="admin-security-item">
                <div className="admin-security-copy">
                  <span className="admin-security-item-icon">
                    <UserCog size={16} />
                  </span>
                  <div>
                    <p>Xac thuc 2 yeu to (2FA)</p>
                    <small>Bao ve tai khoan bang ma xac minh OTP.</small>
                  </div>
                </div>
                <button
                  type="button"
                  className={`admin-security-toggle ${securitySettings.twoFactorEnabled ? 'on' : ''}`}
                  onClick={() => setSecuritySettings((prev) => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                  aria-pressed={securitySettings.twoFactorEnabled}
                  disabled={saving}
                >
                  <span />
                </button>
              </div>

              <div className="admin-security-item">
                <div className="admin-security-copy">
                  <span className="admin-security-item-icon">
                    <Mail size={16} />
                  </span>
                  <div>
                    <p>Thong bao dang nhap</p>
                    <small>Nhan email khi dang nhap tren thiet bi moi.</small>
                  </div>
                </div>
                <button
                  type="button"
                  className={`admin-security-toggle ${securitySettings.loginAlertsEnabled ? 'on' : ''}`}
                  onClick={() => setSecuritySettings((prev) => ({ ...prev, loginAlertsEnabled: !prev.loginAlertsEnabled }))}
                  aria-pressed={securitySettings.loginAlertsEnabled}
                  disabled={saving}
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="admin-session-area">
              <div className="admin-session-head">
                <h3>Hoat dong dang nhap</h3>
                <button type="button" onClick={loadAccountProfile}>
                  Lam moi
                </button>
              </div>

              <div className="admin-session-list">
                {sessions.map((session) => {
                  const SessionIcon = getSessionIcon(session.device)
                  const lastSeen = formatDistanceToNow(new Date(session.lastActiveAt), {
                    addSuffix: true,
                    locale: vi,
                  })

                  return (
                    <div key={session.id} className={`admin-session-item ${session.current ? 'current' : ''}`}>
                      <span className="admin-session-icon">
                        <SessionIcon size={16} />
                      </span>

                      <div className="admin-session-copy">
                        <strong>{session.device}</strong>
                        <span>{session.location} • {session.current ? 'Hien tai' : lastSeen}</span>
                      </div>

                      {session.current ? (
                        <span className="admin-session-status">ONLINE</span>
                      ) : (
                        <button
                          type="button"
                          className="admin-session-revoke-btn"
                          onClick={() => handleRevokeSession(session.id)}
                          title="Thu hoi phien"
                          disabled={revokingSessionId === session.id || saving}
                        >
                          <LogOut size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}

                {sessions.length === 0 && (
                  <div className="admin-session-empty">
                    Chua co du lieu phien dang nhap.
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="admin-profile-help-card">
            <div className="admin-profile-help-glow" />
            <div className="admin-profile-help-content">
              <Headset size={28} />
              <h3>Can tro giup bao mat?</h3>
              <p>Doi ky thuat san sang ho tro ban xu ly van de tai khoan quan tri 24/7.</p>
              <button type="button">Lien he Admin Tong</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default AdminProfile
