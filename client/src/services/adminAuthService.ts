import api from './api'

export interface AdminInfo {
  adminId: string
  username: string
  name: string
}

const ADMIN_TOKEN_KEY = 'adminToken'

const adminAuthService = {
  async login(username: string, password: string): Promise<{ token: string; admin: { id: string; username: string; name: string; email: string } }> {
    const res = await api.post('/admin/auth/login', { username, password })
    const { token } = res.data
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
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
}

export default adminAuthService
