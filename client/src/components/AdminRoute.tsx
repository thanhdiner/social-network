import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import adminAuthService from '@/services/adminAuthService'

interface AdminRouteProps {
  children: React.ReactNode
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)

  useEffect(() => {
    const verify = async () => {
      if (!adminAuthService.isAuthenticated()) {
        setValid(false)
        setChecking(false)
        return
      }
      // Verify token với server
      const admin = await adminAuthService.getMe()
      setValid(!!admin)
      setChecking(false)
    }
    verify()
  }, [])

  if (checking) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: '#080812', flexDirection: 'column', gap: 16
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)',
          borderTopColor: '#6366f1', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: '#6b7280', fontSize: 14 }}>Đang xác thực...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!valid) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
