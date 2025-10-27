import { useState, useEffect, useCallback } from 'react'
import userService from '@/services/userService'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from '@/services/authService'

export const useUserProfile = (username?: string) => {
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    if (!username) {
      setUser(currentUser)
      setLoading(false)
      return
    }

    // Nếu username trùng với currentUser thì fetch lại để có stats
    if (username === currentUser?.username) {
      try {
        setLoading(true)
        setError(null)
        const userData = await userService.getUserByUsername(username)
        setUser(userData)
      } catch (err) {
        console.error('Error fetching user:', err)
        setError('Không thể tải thông tin người dùng')
        setUser(currentUser) // Fallback to currentUser
      } finally {
        setLoading(false)
      }
      return
    }

    // Fetch user data từ API
    try {
      setLoading(true)
      setError(null)
      const userData = await userService.getUserByUsername(username)
      setUser(userData)
    } catch (err) {
      console.error('Error fetching user:', err)
      setError('Không thể tải thông tin người dùng')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [username, currentUser])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { user, loading, error, refetch: fetchUser }
}
