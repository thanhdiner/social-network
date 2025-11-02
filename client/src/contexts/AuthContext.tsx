import React, { createContext, useState, useEffect, useContext } from 'react'
import type { ReactNode } from 'react'
import authService from '../services/authService'
import socketService from '../services/socketService'
import voiceCallService from '../services/voiceCallService'
import type { User, LoginData, RegisterData } from '../services/authService'
import { clearAllChatCache } from '../utils/chatCache'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user on mount
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      if (authService.isAuthenticated()) {
        const userData = await authService.getProfile()
        setUser(userData)

        // Connect to Socket.IO when user is loaded
        if (userData?.id) {
          socketService.connect(userData.id)
          // Setup voice call listeners after socket connects
          setTimeout(() => {
            voiceCallService.ensureSocketListeners()
          }, 500)
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      localStorage.removeItem('accessToken')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (data: LoginData) => {
    setIsLoading(true)
    try {
      await authService.login(data)
      await loadUser()
      // Setup voice call listeners after login
      setTimeout(() => {
        voiceCallService.ensureSocketListeners()
      }, 500)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    try {
      await authService.register(data)
      await loadUser()
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()
      setUser(null)

      // Disconnect socket on logout
      socketService.disconnect()

      // Xóa cache chat khi logout
      clearAllChatCache()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    await loadUser()
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
