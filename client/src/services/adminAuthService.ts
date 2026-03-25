import api from './api'

export interface AdminInfo {
  adminId: string
  username: string
  name: string
  email?: string
  avatar?: string | null
  twoFactorEnabled?: boolean
  loginAlertsEnabled?: boolean
  sessionId?: string | null
  createdAt?: string
  updatedAt?: string
}

interface AdminLoginAdminPayload {
  id: string
  username: string
  name: string
  email: string
}

interface AdminLoginSuccessResponse {
  requiresTwoFactor: false
  token: string
  admin: AdminLoginAdminPayload
  sessionId: string
}

interface AdminLoginTwoFactorResponse {
  requiresTwoFactor: true
  challengeToken: string
  expiresAt: number
  message?: string
  debugCode?: string
}

export type AdminLoginResponse =
  | AdminLoginSuccessResponse
  | AdminLoginTwoFactorResponse

export interface AdminTwoFactorVerifyResponse extends AdminLoginSuccessResponse {}

const ADMIN_TOKEN_KEY = 'adminToken'

const adminAuthService = {
  async login(username: string, password: string): Promise<AdminLoginResponse> {
    const res = await api.post<AdminLoginResponse>('/admin/auth/login', { username, password })
    const payload = res.data

    if (!payload.requiresTwoFactor) {
      localStorage.setItem(ADMIN_TOKEN_KEY, payload.token)
    }

    return payload
  },

  async verifyTwoFactor(challengeToken: string, code: string): Promise<AdminTwoFactorVerifyResponse> {
    const res = await api.post<AdminTwoFactorVerifyResponse>('/admin/auth/verify-2fa', {
      challengeToken,
      code,
    })

    localStorage.setItem(ADMIN_TOKEN_KEY, res.data.token)

    return res.data
  },

  async resendTwoFactor(challengeToken: string): Promise<{ challengeToken: string; expiresAt: number; debugCode?: string }> {
    const res = await api.post<{ challengeToken: string; expiresAt: number; debugCode?: string }>(
      '/admin/auth/resend-2fa',
      { challengeToken },
    )
    return res.data
  },

  async getMe(): Promise<AdminInfo | null> {
    const token = this.getToken()
    if (!token) return null
    try {
      const res = await api.get('/admin/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
    } catch {
      this.logout()
      return null
    }
  },

  logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  },

  getToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY)
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  async forgotPassword(email: string): Promise<{ message: string; debugCode?: string }> {
    const res = await api.post('/admin/auth/forgot-password', { email })
    return res.data
  },

  async resetPassword(payload: {
    email: string
    code: string
    newPassword: string
    confirmPassword: string
  }): Promise<{ message: string }> {
    const res = await api.post('/admin/auth/reset-password', payload)
    return res.data
  },
}

export default adminAuthService
