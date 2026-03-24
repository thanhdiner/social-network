import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Film,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  Search,
  Bell,
  CircleHelp,
} from 'lucide-react'
import adminAuthService, { type AdminInfo } from '@/services/adminAuthService'

interface AdminLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Người dùng', icon: Users },
  { path: '/admin/posts', label: 'Bài viết', icon: FileText },
  { path: '/admin/reels', label: 'Reels', icon: Film },
]

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)

  useEffect(() => {
    adminAuthService.getMe().then(setAdminInfo)
  }, [])

  const handleLogout = () => {
    adminAuthService.logout()
    navigate('/admin/login')
  }

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  const currentLabel = navItems.find(n => isActive(n))?.label || 'Admin'
  const adminName = adminInfo?.name || 'Administrator'
  const adminInitial = adminName.trim().charAt(0).toUpperCase()

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <Shield size={22} />
            </div>
            {sidebarOpen && (
              <div className="brand-copy">
                <span className="brand-text">Admin Console</span>
                <span className="brand-subtext">Management Suite</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${active ? 'active' : ''}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
                {sidebarOpen && active && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={18} />
            {sidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <div className="topbar-search">
              <Search size={16} />
              <input
                type="text"
                placeholder={`Tìm nhanh trong ${currentLabel.toLowerCase()}...`}
                aria-label="Admin search"
              />
            </div>
          </div>
          <div className="topbar-right">
            <button type="button" className="topbar-btn" aria-label="Thông báo">
              <Bell size={18} />
              <span className="notif-dot" />
            </button>
            <button type="button" className="topbar-btn" aria-label="Trợ giúp">
              <CircleHelp size={18} />
            </button>
            <div className="topbar-divider" />
            <div className="topbar-profile">
              <div className="topbar-profile-copy">
                <p className="topbar-profile-name">{adminName}</p>
                <p className="topbar-profile-role">Super Admin</p>
              </div>
              <div className="topbar-profile-avatar">{adminInitial}</div>
            </div>
            <Link to="/" className="back-to-app" target="_blank">
              Về trang chính →
            </Link>
          </div>
        </header>

        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  )
}
