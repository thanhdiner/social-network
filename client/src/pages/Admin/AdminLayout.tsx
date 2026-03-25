import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Film, MessageSquare,
  LogOut, Menu, X, Shield, ChevronRight, Search, Bell,
  CircleHelp, Settings, Lock, UserCircle, ExternalLink,
  Clock, UserPlus, Newspaper, Keyboard, AlertCircle,
  ChevronDown,
} from 'lucide-react'
import adminAuthService, { type AdminInfo } from '@/services/adminAuthService'
import adminService from '@/services/adminService'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface AdminLayoutProps { children: React.ReactNode }

const navItems = [
  { path: '/admin',          label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { path: '/admin/users',    label: 'Người dùng',   icon: Users },
  { path: '/admin/posts',    label: 'Bài viết',     icon: FileText },
  { path: '/admin/reels',    label: 'Reels',        icon: Film },
  { path: '/admin/comments', label: 'Bình luận',    icon: MessageSquare },
]

const SHORTCUTS = [
  { keys: ['G', 'D'],  label: 'Đi tới Dashboard' },
  { keys: ['G', 'U'],  label: 'Đi tới Người dùng' },
  { keys: ['G', 'P'],  label: 'Đi tới Bài viết' },
  { keys: ['G', 'R'],  label: 'Đi tới Reels' },
  { keys: ['G', 'C'],  label: 'Đi tới Bình luận' },
  { keys: ['?'],       label: 'Mở trợ giúp' },
  { keys: ['Esc'],     label: 'Đóng panel' },
]

type ActivityItem = {
  id: string
  type: 'user' | 'post'
  name: string
  username?: string
  avatar?: string | null
  content?: string
  createdAt: string
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location  = useLocation()
  const navigate  = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [adminInfo, setAdminInfo]     = useState<AdminInfo | null>(null)

  // Dropdowns
  const [bellOpen,    setBellOpen]    = useState(false)
  const [helpOpen,    setHelpOpen]    = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  // Bell data
  const [activity,      setActivity]      = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [unreadCount,   setUnreadCount]   = useState(0)
  const lastSeenRef = useRef<string | null>(null)

  // Refs for click-outside
  const bellRef    = useRef<HTMLDivElement>(null)
  const helpRef    = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // ── Load admin info ───────────────────────────────────────────────────────
  useEffect(() => {
    adminAuthService.getMe().then(setAdminInfo)
  }, [])

  // ── Load activity for bell ────────────────────────────────────────────────
  const loadActivity = useCallback(async () => {
    setActivityLoading(true)
    try {
      const data = await adminService.getRecentActivity()
      const users: ActivityItem[] = (data.recentUsers || []).map((u: {id:string;name:string;username:string;avatar?:string|null;createdAt:string}) => ({
        id: u.id, type: 'user' as const,
        name: u.name, username: u.username, avatar: u.avatar,
        createdAt: u.createdAt,
      }))
      const posts: ActivityItem[] = (data.recentPosts || []).map((p: {id:string;user:{name:string};content:string;createdAt:string}) => ({
        id: p.id, type: 'post' as const,
        name: p.user.name, content: p.content,
        createdAt: p.createdAt,
      }))
      const merged = [...users, ...posts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 10)
      setActivity(merged)

      // Count items newer than last seen
      if (lastSeenRef.current) {
        const count = merged.filter(i => new Date(i.createdAt) > new Date(lastSeenRef.current!)).length
        setUnreadCount(count)
      } else {
        setUnreadCount(merged.length)
      }
    } catch {/* ignore */} finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => { loadActivity() }, [loadActivity])

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current    && !bellRef.current.contains(e.target as Node))    setBellOpen(false)
      if (helpRef.current    && !helpRef.current.contains(e.target as Node))    setHelpOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Keyboard shortcut: ? ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setHelpOpen(v => !v)
        setBellOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => { adminAuthService.logout(); navigate('/admin/login') }

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  const adminName    = adminInfo?.name || 'Administrator'
  const adminInitial = adminName.trim().charAt(0).toUpperCase()

  const openBell = () => {
    setBellOpen(v => !v)
    setHelpOpen(false)
    setProfileOpen(false)
    if (!bellOpen) {
      lastSeenRef.current = new Date().toISOString()
      setUnreadCount(0)
    }
  }

  const openHelp = () => {
    setHelpOpen(v => !v)
    setBellOpen(false)
    setProfileOpen(false)
  }

  const openProfile = () => {
    setProfileOpen(v => !v)
    setBellOpen(false)
    setHelpOpen(false)
  }

  return (
    <div className="admin-layout">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon"><Shield size={22} /></div>
            {sidebarOpen && (
              <div className="brand-copy">
                <span className="brand-text">Admin Console</span>
                <span className="brand-subtext">Management Suite</span>
              </div>
            )}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon   = item.icon
            const active = isActive(item)
            return (
              <Link key={item.path} to={item.path}
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

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <div className="topbar-search">
              <Search size={16} />
              <input type="text" placeholder="Tìm kiếm nhanh..." aria-label="Admin search" />
            </div>
          </div>

          <div className="topbar-right">

            {/* ── Bell ───────────────────────────────────────────────────── */}
            <div className="topbar-dropdown-wrap" ref={bellRef}>
              <button
                type="button"
                className={`topbar-btn ${bellOpen ? 'active' : ''}`}
                aria-label="Thông báo hoạt động"
                onClick={openBell}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="topbar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {bellOpen && (
                <div className="topbar-dropdown bell-dropdown">
                  <div className="dropdown-header">
                    <span>Hoạt động gần đây</span>
                    <button className="dropdown-refresh" onClick={loadActivity} title="Tải lại">
                      ↻
                    </button>
                  </div>

                  <div className="dropdown-body">
                    {activityLoading ? (
                      <div className="dropdown-loading">
                        <div className="loading-spinner" style={{ width: 24, height: 24 }} />
                      </div>
                    ) : activity.length === 0 ? (
                      <div className="dropdown-empty">
                        <Clock size={28} opacity={0.3} />
                        <p>Chưa có hoạt động</p>
                      </div>
                    ) : (
                      activity.map(item => (
                        <div key={item.type + item.id} className="activity-item">
                          <div className={`activity-icon-wrap ${item.type}`}>
                            {item.type === 'user'
                              ? (item.avatar
                                  ? <img src={item.avatar} alt={item.name} className="activity-avatar" />
                                  : <UserPlus size={14} />)
                              : <Newspaper size={14} />}
                          </div>
                          <div className="activity-info">
                            <p className="activity-title">
                              {item.type === 'user'
                                ? <><strong>{item.name}</strong> đã đăng ký</>
                                : <><strong>{item.name}</strong> đăng bài mới</>}
                            </p>
                            {item.content && (
                              <p className="activity-sub">{item.content.slice(0, 60)}{item.content.length > 60 ? '…' : ''}</p>
                            )}
                            <p className="activity-time">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="dropdown-footer">
                    <Link to="/admin" onClick={() => setBellOpen(false)} className="dropdown-footer-link">
                      Xem tất cả hoạt động <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── Help ───────────────────────────────────────────────────── */}
            <div className="topbar-dropdown-wrap" ref={helpRef}>
              <button
                type="button"
                className={`topbar-btn ${helpOpen ? 'active' : ''}`}
                aria-label="Trợ giúp"
                onClick={openHelp}
              >
                <CircleHelp size={18} />
              </button>

              {helpOpen && (
                <div className="topbar-dropdown help-dropdown">
                  <div className="dropdown-header">
                    <span>Phím tắt & Trợ giúp</span>
                    <button className="dropdown-close-btn" onClick={() => setHelpOpen(false)}><X size={14} /></button>
                  </div>

                  <div className="dropdown-body">
                    <p className="help-section-label"><Keyboard size={13} /> Phím tắt</p>
                    <div className="shortcuts-list">
                      {SHORTCUTS.map((s, i) => (
                        <div key={i} className="shortcut-row">
                          <div className="shortcut-keys">
                            {s.keys.map((k, ki) => (
                              <React.Fragment key={ki}>
                                <kbd className="kbd">{k}</kbd>
                                {ki < s.keys.length - 1 && <span className="kbd-then">then</span>}
                              </React.Fragment>
                            ))}
                          </div>
                          <span className="shortcut-label">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    <p className="help-section-label" style={{ marginTop: 16 }}><AlertCircle size={13} /> Tài nguyên</p>
                    <div className="help-links">
                      <Link to="/admin" onClick={() => setHelpOpen(false)} className="help-link">
                        <LayoutDashboard size={14} /> Tổng quan hệ thống
                      </Link>
                      <Link to="/admin/users" onClick={() => setHelpOpen(false)} className="help-link">
                        <Users size={14} /> Quản lý người dùng
                      </Link>
                      <Link to="/" target="_blank" className="help-link">
                        <ExternalLink size={14} /> Xem trang chính
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-divider" />

            {/* ── Profile ────────────────────────────────────────────────── */}
            <div className="topbar-dropdown-wrap" ref={profileRef}>
              <button
                type="button"
                className={`topbar-profile-btn ${profileOpen ? 'active' : ''}`}
                onClick={openProfile}
                aria-label="Tài khoản admin"
              >
                <div className="topbar-profile-copy">
                  <p className="topbar-profile-name">{adminName}</p>
                  <p className="topbar-profile-role">Super Admin</p>
                </div>
                <div className="topbar-profile-avatar">{adminInitial}</div>
                <ChevronDown size={14} className={`profile-chevron ${profileOpen ? 'rotated' : ''}`} />
              </button>

              {profileOpen && (
                <div className="topbar-dropdown profile-dropdown">
                  {/* Info header */}
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-avatar">{adminInitial}</div>
                    <div>
                      <p className="profile-dropdown-name">{adminName}</p>
                      <p className="profile-dropdown-role">Super Admin</p>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  <div className="profile-dropdown-menu">
                    <button className="profile-menu-item" onClick={() => { setProfileOpen(false) }}>
                      <UserCircle size={15} /> Thông tin tài khoản
                    </button>
                    <button className="profile-menu-item" onClick={() => { setProfileOpen(false) }}>
                      <Lock size={15} /> Đổi mật khẩu
                    </button>
                    <button className="profile-menu-item" onClick={() => { setProfileOpen(false) }}>
                      <Settings size={15} /> Cài đặt
                    </button>
                  </div>

                  <div className="dropdown-divider" />

                  <div className="profile-dropdown-menu">
                    <Link to="/" target="_blank" className="profile-menu-item" onClick={() => setProfileOpen(false)}>
                      <ExternalLink size={15} /> Về trang chính
                    </Link>
                    <button className="profile-menu-item danger" onClick={handleLogout}>
                      <LogOut size={15} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>

      {/* Backdrops */}
      {(bellOpen || helpOpen || profileOpen) && (
        <div
          className="topbar-backdrop"
          onClick={() => { setBellOpen(false); setHelpOpen(false); setProfileOpen(false) }}
        />
      )}
    </div>
  )
}
