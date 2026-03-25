import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Film,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  Search,
  Bell,
  CircleHelp,
  Command,
  ArrowRight,
  CheckCheck,
  UserPlus,
  Loader2,
  UserRound,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import adminAuthService, { type AdminInfo } from '@/services/adminAuthService'
import adminService from '@/services/adminService'

interface AdminLayoutProps {
  children: React.ReactNode
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Người dùng', icon: Users },
  { path: '/admin/posts', label: 'Bài viết', icon: FileText },
  { path: '/admin/reels', label: 'Reels', icon: Film },
  { path: '/admin/comments', label: 'Bình luận', icon: MessageSquare },
]

const searchableItems = [
  { path: '/admin', label: 'Dashboard', keywords: ['dashboard', 'tong quan', 'thong ke'] },
  { path: '/admin/profile', label: 'Tài khoản quản trị', keywords: ['tai khoan', 'profile', 'bao mat', 'doi mat khau'] },
  { path: '/admin/users', label: 'Người dùng', keywords: ['user', 'nguoi dung', 'tai khoan'] },
  { path: '/admin/posts', label: 'Bài viết', keywords: ['post', 'bai viet', 'noi dung'] },
  { path: '/admin/reels', label: 'Reels', keywords: ['reel', 'video ngan'] },
  { path: '/admin/comments', label: 'Bình luận', keywords: ['comment', 'binh luan', 'moderation', 'tu khoa cam'] },
  { path: '/admin/comments?flagged=1', label: 'Bình luận vi phạm', keywords: ['kiem duyet', 'flag', 'vi pham', 'tu khoa cam'] },
  { path: '/admin/posts?period=recent', label: 'Bài viết mới 7 ngày', keywords: ['bai moi', 'recent posts', '7 ngay'] },
  { path: '/admin/posts?period=month', label: 'Bài viết tháng này', keywords: ['bai viet theo thang', 'thang nay', 'month posts'] },
  { path: '/admin/reels?period=recent', label: 'Reels mới 7 ngày', keywords: ['reels moi', 'reels recent', '7 ngay'] },
  { path: '/admin/reels?period=month', label: 'Reels tháng này', keywords: ['reels theo thang', 'reels thang nay', 'month reels'] },
]

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const ADMIN_NOTIF_SEEN_KEY = 'admin.notifications.lastSeenAt'

interface AdminRecentActivityResponse {
  recentUsers: Array<{
    id: string
    name: string
    username: string
    createdAt: string
  }>
  recentPosts: Array<{
    id: string
    content: string
    createdAt: string
    user?: {
      name?: string
      username?: string
    }
  }>
}

interface TopbarNotificationItem {
  id: string
  type: 'user' | 'post'
  title: string
  description: string
  createdAt: string
  path: string
}

interface HeaderSearchOption {
  key: string
  group: string
  kind: 'nav' | 'user' | 'post' | 'reel' | 'comment'
  label: string
  subtitle?: string
  path: string
  query?: string
  entityId?: string
  flaggedOnly?: boolean
}

interface HeaderSearchResultState {
  users: Array<{ id: string; name: string; username: string; email: string }>
  posts: Array<{ id: string; content: string; user: { name: string; username: string } }>
  reels: Array<{ id: string; description?: string; user: { name: string; username: string } }>
  comments: Array<{ id: string; content: string; moderation?: { flagged?: boolean } }>
}

interface AdminHelpContext {
  title: string
  goal: string
  checklist: string[]
  actions: Array<{ label: string; path?: string; action?: 'openSearch' | 'openModeration' }>
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [headerSearchLoading, setHeaderSearchLoading] = useState(false)
  const [headerSearchResults, setHeaderSearchResults] = useState<HeaderSearchResultState>({
    users: [],
    posts: [],
    reels: [],
    comments: [],
  })
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notifications, setNotifications] = useState<TopbarNotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [quickGuideOpen, setQuickGuideOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchBoxRef = useRef<HTMLDivElement | null>(null)
  const notificationBoxRef = useRef<HTMLDivElement | null>(null)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const helpBoxRef = useRef<HTMLDivElement | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRequestIdRef = useRef(0)

  const loadNotifications = async () => {
    setNotificationsLoading(true)
    try {
      const activity = await adminService.getRecentActivity() as AdminRecentActivityResponse

      const userItems: TopbarNotificationItem[] = (activity.recentUsers || []).map((user) => ({
        id: `user-${user.id}`,
        type: 'user',
        title: 'Người dùng mới',
        description: `${user.name || 'Người dùng'} (@${user.username || 'unknown'}) vừa tham gia`,
        createdAt: user.createdAt,
        path: '/admin/users',
      }))

      const postItems: TopbarNotificationItem[] = (activity.recentPosts || []).map((post) => ({
        id: `post-${post.id}`,
        type: 'post',
        title: 'Bài viết mới',
        description: `${post.user?.name || 'Người dùng'} đăng bài mới`,
        createdAt: post.createdAt,
        path: '/admin/posts',
      }))

      const merged = [...userItems, ...postItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)

      setNotifications(merged)

      const lastSeenRaw = localStorage.getItem(ADMIN_NOTIF_SEEN_KEY)
      const lastSeen = Number(lastSeenRaw || 0)
      const nextUnreadCount = merged.filter((item) => new Date(item.createdAt).getTime() > lastSeen).length
      setUnreadCount(nextUnreadCount)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    adminAuthService.getMe().then(setAdminInfo)
    loadNotifications()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (!searchBoxRef.current?.contains(target)) {
        setSearchOpen(false)
      }

      if (!notificationBoxRef.current?.contains(target)) {
        setNotificationsOpen(false)
      }

      if (!profileMenuRef.current?.contains(target)) {
        setProfileMenuOpen(false)
      }

      if (!helpBoxRef.current?.contains(target)) {
        setHelpOpen(false)
      }
    }

    const handleShortcut = (event: KeyboardEvent) => {
      const pressedShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
      if (!pressedShortcut) return
      event.preventDefault()
      searchInputRef.current?.focus()
      setSearchOpen(true)

      if (notificationsOpen) {
        setNotificationsOpen(false)
      }

      if (profileMenuOpen) {
        setProfileMenuOpen(false)
      }

      if (helpOpen) {
        setHelpOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleShortcut)

    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [helpOpen, notificationsOpen, profileMenuOpen])

  const commandSuggestions = useMemo(() => {
    const keyword = normalizeText(searchQuery)

    if (!keyword) {
      return searchableItems
    }

    return searchableItems.filter((item) => {
      const haystack = [item.label, ...item.keywords].map(normalizeText)
      return haystack.some((value) => value.includes(keyword))
    })
  }, [searchQuery])

  const loadHeaderSearchResults = useCallback(async (query: string) => {
    const normalizedQuery = normalizeText(query)

    if (normalizedQuery.length < 2) {
      setHeaderSearchResults({ users: [], posts: [], reels: [], comments: [] })
      setHeaderSearchLoading(false)
      return
    }

    const requestId = ++searchRequestIdRef.current
    setHeaderSearchLoading(true)

    try {
      const [usersRes, postsRes, commentsRes, reelsRes] = await Promise.all([
        adminService.getUsers(1, 5, query),
        adminService.getPosts(1, 5, query, 'all'),
        adminService.getComments(1, 5, query),
        adminService.getReels(1, 5, query),
      ])

      if (requestId !== searchRequestIdRef.current) return

      setHeaderSearchResults({
        users: (usersRes.users || []).slice(0, 5),
        posts: (postsRes.posts || []).slice(0, 5),
        reels: (reelsRes.reels || []).slice(0, 5),
        comments: (commentsRes.comments || []).slice(0, 5),
      })
    } catch {
      if (requestId !== searchRequestIdRef.current) return
      setHeaderSearchResults({ users: [], posts: [], reels: [], comments: [] })
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setHeaderSearchLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!searchOpen) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadHeaderSearchResults(searchQuery)
    }, 260)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchOpen, loadHeaderSearchResults])

  const searchOptions = useMemo<HeaderSearchOption[]>(() => {
    const options: HeaderSearchOption[] = []
    const keyword = searchQuery.trim()

    commandSuggestions.forEach((item) => {
      options.push({
        key: `nav-${item.path}`,
        group: 'Điều hướng nhanh',
        kind: 'nav',
        label: item.label,
        subtitle: item.path,
        path: item.path,
      })
    })

    if (keyword) {
      headerSearchResults.users.forEach((user) => {
        options.push({
          key: `user-${user.id}`,
          group: 'Người dùng',
          kind: 'user',
          label: user.name,
          subtitle: `@${user.username} · ${user.email}`,
          path: '/admin/users',
          query: keyword,
          entityId: user.id,
        })
      })

      headerSearchResults.posts.forEach((post) => {
        const contentPreview = (post.content || '').trim() || '(Bài viết không có nội dung)'
        options.push({
          key: `post-${post.id}`,
          group: 'Bài viết',
          kind: 'post',
          label: contentPreview.length > 48 ? `${contentPreview.slice(0, 48)}...` : contentPreview,
          subtitle: `${post.user?.name || 'Unknown'} (@${post.user?.username || 'unknown'})`,
          path: '/admin/posts',
          query: keyword,
          entityId: post.id,
        })
      })

      headerSearchResults.reels.forEach((reel) => {
        const descriptionPreview = (reel.description || '').trim() || '(Reel không có mô tả)'
        options.push({
          key: `reel-${reel.id}`,
          group: 'Reels',
          kind: 'reel',
          label: descriptionPreview.length > 48 ? `${descriptionPreview.slice(0, 48)}...` : descriptionPreview,
          subtitle: `${reel.user?.name || 'Unknown'} (@${reel.user?.username || 'unknown'})`,
          path: '/admin/reels',
          query: keyword,
          entityId: reel.id,
        })
      })

      headerSearchResults.comments.forEach((comment) => {
        const contentPreview = (comment.content || '').trim() || '(Bình luận trống)'
        options.push({
          key: `comment-${comment.id}`,
          group: 'Bình luận',
          kind: 'comment',
          label: contentPreview.length > 54 ? `${contentPreview.slice(0, 54)}...` : contentPreview,
          subtitle: comment.moderation?.flagged ? 'Có cờ vi phạm' : 'Không có cờ vi phạm',
          path: '/admin/comments',
          query: keyword,
          entityId: comment.id,
          flaggedOnly: Boolean(comment.moderation?.flagged),
        })
      })
    }

    return options
  }, [commandSuggestions, headerSearchResults, searchQuery])

  const groupedSearchOptions = useMemo(() => {
    const groups: Array<{ title: string; items: HeaderSearchOption[] }> = []

    searchOptions.forEach((option) => {
      const existing = groups.find((group) => group.title === option.group)
      if (existing) {
        existing.items.push(option)
      } else {
        groups.push({ title: option.group, items: [option] })
      }
    })

    return groups
  }, [searchOptions])

  useEffect(() => {
    setActiveSuggestionIndex(0)
  }, [searchQuery, headerSearchResults])

  const executeSearchOption = (option: HeaderSearchOption) => {
    if (option.kind === 'nav') {
      navigate(option.path)
      setSearchOpen(false)
      setSearchQuery('')
      return
    }

    if (option.kind === 'user') {
      const params = new URLSearchParams()
      if (option.query) params.set('search', option.query)
      if (option.entityId) params.set('openUser', option.entityId)
      navigate(`/admin/users?${params.toString()}`)
    } else if (option.kind === 'post') {
      const params = new URLSearchParams()
      if (option.query) params.set('search', option.query)
      if (option.entityId) params.set('openPost', option.entityId)
      navigate(`/admin/posts?${params.toString()}`)
    } else if (option.kind === 'reel') {
      const params = new URLSearchParams()
      if (option.query) params.set('search', option.query)
      navigate(`/admin/reels?${params.toString()}`)
    } else {
      const params = new URLSearchParams()
      if (option.query) params.set('search', option.query)
      if (option.flaggedOnly) {
        params.set('flagged', '1')
      }
      navigate(`/admin/comments?${params.toString()}`)
    }

    setSearchOpen(false)
    setSearchQuery('')
  }

  const handleNotificationOpen = () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)

    if (nextOpen) {
      setSearchOpen(false)
      setHelpOpen(false)
      if (unreadCount > 0) {
        localStorage.setItem(ADMIN_NOTIF_SEEN_KEY, String(Date.now()))
        setUnreadCount(0)
      }
    }
  }

  const handleNotificationNavigate = (path: string) => {
    navigate(path)
    setNotificationsOpen(false)
  }

  const handleHelpOpen = () => {
    const nextOpen = !helpOpen
    setHelpOpen(nextOpen)

    if (nextOpen) {
      setSearchOpen(false)
      setNotificationsOpen(false)
      setProfileMenuOpen(false)
    }
  }

  const handleHelpAction = (item: { label: string; path?: string; action?: 'openSearch' | 'openModeration' }) => {
    if (item.path) {
      navigate(item.path)
      setHelpOpen(false)
      return
    }

    if (item.action === 'openSearch') {
      searchInputRef.current?.focus()
      setSearchOpen(true)
      setHelpOpen(false)
      return
    }

    if (item.action === 'openModeration') {
      navigate('/admin/comments?flagged=1')
      setHelpOpen(false)
    }
  }

  const handleProfileMenuAction = (action: 'account' | 'logout') => {
    setProfileMenuOpen(false)

    if (action === 'logout') {
      handleLogout()
      return
    }

    navigate('/admin/profile')
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setSearchOpen(true)
      return
    }

    if (event.key === 'Escape') {
      setSearchOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (searchOptions.length === 0) return
      setActiveSuggestionIndex((prev) => (prev + 1) % searchOptions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (searchOptions.length === 0) return
      setActiveSuggestionIndex((prev) => (prev - 1 + searchOptions.length) % searchOptions.length)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (searchOptions.length === 0) return
      const selected = searchOptions[activeSuggestionIndex] || searchOptions[0]
      executeSearchOption(selected)
    }
  }

  const handleLogout = () => {
    adminAuthService.logout()
    navigate('/admin/login')
  }

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  }

  const currentLabel = location.pathname.startsWith('/admin/profile')
    ? 'Tài khoản'
    : navItems.find(n => isActive(n))?.label || 'Admin'
  const adminName = adminInfo?.name || 'Administrator'
  const adminInitial = adminName.trim().charAt(0).toUpperCase()

  const helpContext = useMemo<AdminHelpContext>(() => {
    if (location.pathname.startsWith('/admin/profile')) {
      return {
        title: 'Tài khoản quản trị',
        goal: 'Cập nhật thông tin cá nhân, đổi mật khẩu và thiết lập bảo mật cho tài khoản admin.',
        checklist: [
          'Kiểm tra thông tin cá nhân trước khi lưu thay đổi.',
          'Sử dụng mật khẩu mạnh và xác nhận chính xác mật khẩu mới.',
          'Bật các lớp bảo mật như 2FA và thông báo đăng nhập.',
        ],
        actions: [
          { label: 'Đi tới trang Tài khoản', path: '/admin/profile' },
          { label: 'Mở tìm kiếm nhanh', action: 'openSearch' },
        ],
      }
    }

    if (location.pathname.startsWith('/admin/users')) {
      return {
        title: 'Quản lý người dùng',
        goal: 'Tìm user theo tên, email, username hoặc ID để xem chi tiết và xử lý tài khoản nhanh.',
        checklist: [
          'Dùng ô search để lọc theo tên, username, email hoặc ID.',
          'Mở chi tiết user để xem hoạt động và chỉnh thông tin.',
          'Khóa/mở tài khoản và phân quyền đúng vai trò.',
        ],
        actions: [
          { label: 'Mở tìm kiếm nhanh', action: 'openSearch' },
          { label: 'Đi tới module Người dùng', path: '/admin/users' },
        ],
      }
    }

    if (location.pathname.startsWith('/admin/posts')) {
      return {
        title: 'Quản lý bài viết',
        goal: 'Kiểm tra bài mới, tìm bài theo nội dung hoặc ID và xử lý nội dung vi phạm.',
        checklist: [
          'Lọc theo media hoặc kỳ thời gian để thấy bài mới.',
          'Tìm bài theo keyword, nội dung hoặc post ID.',
          'Mở chi tiết trước khi chỉnh sửa/xóa.',
        ],
        actions: [
          { label: 'Bài viết mới 7 ngày', path: '/admin/posts?period=recent' },
          { label: 'Mở tìm kiếm nhanh', action: 'openSearch' },
        ],
      }
    }

    if (location.pathname.startsWith('/admin/reels')) {
      return {
        title: 'Quản lý reels',
        goal: 'Theo dõi reels mới, tìm reel theo mô tả hoặc ID để kiểm duyệt nội dung nhanh.',
        checklist: [
          'Dùng search để lọc theo mô tả, user hoặc reel ID.',
          'Ưu tiên kiểm tra reels mới trong 7 ngày gần nhất.',
          'Xóa reels vi phạm sau khi đối chiếu nội dung.',
        ],
        actions: [
          { label: 'Reels mới 7 ngày', path: '/admin/reels?period=recent' },
          { label: 'Mở tìm kiếm nhanh', action: 'openSearch' },
        ],
      }
    }

    if (location.pathname.startsWith('/admin/comments')) {
      return {
        title: 'Kiểm duyệt bình luận',
        goal: 'Tìm comment theo keyword hoặc ID và lọc nhanh bình luận có dấu hiệu vi phạm.',
        checklist: [
          'Bật lọc vi phạm để tập trung comment cần xử lý.',
          'Quản lý từ khóa cấm để nâng chất lượng moderation.',
          'Dùng bulk delete khi cần dọn dữ liệu hàng loạt.',
        ],
        actions: [
          { label: 'Mở bình luận vi phạm', action: 'openModeration' },
          { label: 'Mở tìm kiếm nhanh', action: 'openSearch' },
        ],
      }
    }

    return {
      title: 'Dashboard quản trị',
      goal: 'Theo dõi biến động hệ thống và điều hướng nhanh đến module cần xử lý.',
      checklist: [
        'Quan sát số liệu chính và cảnh báo gần nhất.',
        'Dùng search nhanh để vào thẳng user/post/reel/comment.',
        'Theo dõi thông báo mới để phản ứng kịp thời.',
      ],
      actions: [
        { label: 'Mở tìm kiếm nhanh', action: 'openSearch' },
        { label: 'Đi tới Dashboard', path: '/admin' },
      ],
    }
  }, [location.pathname])

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
            <div className="topbar-search" ref={searchBoxRef}>
              <Search size={16} />
              <input
                type="text"
                placeholder={`Tìm nhanh trong ${currentLabel.toLowerCase()}...`}
                aria-label="Admin search"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setSearchOpen(true)
                  setProfileMenuOpen(false)
                  setNotificationsOpen(false)
                  setHelpOpen(false)
                }}
                onFocus={() => {
                  setSearchOpen(true)
                  setHelpOpen(false)
                }}
                onKeyDown={handleSearchKeyDown}
              />
              <span className="topbar-search-shortcut">
                <Command size={12} />K
              </span>

              {searchOpen && (
                <div className="topbar-search-dropdown" role="listbox" aria-label="Admin quick search">
                  {headerSearchLoading && (
                    <div className="topbar-search-loading">
                      <Loader2 size={13} className="spin" />
                      <span>Đang tìm kiếm...</span>
                    </div>
                  )}

                  {!headerSearchLoading && searchOptions.length === 0 ? (
                    <p className="topbar-search-empty">Không tìm thấy kết quả phù hợp</p>
                  ) : (
                    groupedSearchOptions.map((group) => (
                      <div key={group.title} className="topbar-search-group">
                        <p className="topbar-search-group-title">{group.title}</p>
                        {group.items.map((item) => {
                          const index = searchOptions.findIndex((option) => option.key === item.key)
                          const active = index === activeSuggestionIndex
                          return (
                            <button
                              key={item.key}
                              type="button"
                              className={`topbar-search-item ${active ? 'active' : ''}`}
                              onClick={() => executeSearchOption(item)}
                              role="option"
                              aria-selected={active}
                            >
                              <span className="topbar-search-item-copy">
                                <strong>{item.label}</strong>
                                {item.subtitle && <small>{item.subtitle}</small>}
                              </span>
                              <ArrowRight size={14} />
                            </button>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-notif-wrap" ref={notificationBoxRef}>
              <button
                type="button"
                className={`topbar-btn ${notificationsOpen ? 'active' : ''}`}
                aria-label="Thông báo"
                onClick={handleNotificationOpen}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-dot" />}
              </button>

              {notificationsOpen && (
                <div className="topbar-notif-dropdown">
                  <div className="topbar-notif-head">
                    <p>Thông báo quản trị</p>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem(ADMIN_NOTIF_SEEN_KEY, String(Date.now()))
                        setUnreadCount(0)
                        loadNotifications()
                      }}
                      disabled={notificationsLoading}
                    >
                      <CheckCheck size={13} />
                      Làm mới
                    </button>
                  </div>

                  <div className="topbar-notif-list">
                    {notificationsLoading ? (
                      <div className="topbar-notif-empty">
                        <Loader2 size={14} className="spin" />
                        <span>Đang tải thông báo...</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="topbar-notif-empty">
                        <span>Chưa có thông báo mới</span>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="topbar-notif-item"
                          onClick={() => handleNotificationNavigate(item.path)}
                        >
                          <span className={`topbar-notif-item-icon ${item.type}`}>
                            {item.type === 'user' ? <UserPlus size={13} /> : <FileText size={13} />}
                          </span>
                          <span className="topbar-notif-item-copy">
                            <strong>{item.title}</strong>
                            <span>{item.description}</span>
                            <em>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}</em>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="topbar-help-wrap" ref={helpBoxRef}>
              <button
                type="button"
                className={`topbar-btn ${helpOpen ? 'active' : ''}`}
                aria-label="Trợ giúp"
                onClick={handleHelpOpen}
              >
                <CircleHelp size={18} />
              </button>

              {helpOpen && (
                <div className="topbar-help-dropdown" role="dialog" aria-label="Trợ giúp theo ngữ cảnh">
                  <div className="topbar-help-head">
                    <p>Help theo ngữ cảnh</p>
                    <span>{helpContext.title}</span>
                  </div>

                  <div className="topbar-help-section">
                    <p className="topbar-help-label">Mục tiêu</p>
                    <p className="topbar-help-goal">{helpContext.goal}</p>
                  </div>

                  <div className="topbar-help-section">
                    <p className="topbar-help-label">Checklist thao tác</p>
                    <ul className="topbar-help-list">
                      {helpContext.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="topbar-help-actions">
                    {helpContext.actions.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="topbar-help-action-btn"
                        onClick={() => handleHelpAction(item)}
                      >
                        <span>{item.label}</span>
                        <ArrowRight size={13} />
                      </button>
                    ))}
                  </div>

                  <div className="topbar-help-guide">
                    <button
                      type="button"
                      className="topbar-help-guide-toggle"
                      onClick={() => setQuickGuideOpen((prev) => !prev)}
                    >
                      <span>Quick guide cho người mới</span>
                      <ArrowRight size={12} className={quickGuideOpen ? 'open' : ''} />
                    </button>

                    {quickGuideOpen && (
                      <ol className="topbar-help-guide-list">
                        <li>Vào đúng module cần xử lý bằng search nhanh (Ctrl/Cmd + K).</li>
                        <li>Lọc theo từ khóa hoặc thời gian để thu gọn dữ liệu.</li>
                        <li>Mở chi tiết trước khi xóa/chỉnh để tránh thao tác nhầm.</li>
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="topbar-divider" />
            <div className="topbar-profile-wrap" ref={profileMenuRef}>
              <button
                type="button"
                className="topbar-profile"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev)
                  setHelpOpen(false)
                }}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div className="topbar-profile-copy">
                  <p className="topbar-profile-name">{adminName}</p>
                  <p className="topbar-profile-role">Super Admin</p>
                </div>
                <div className="topbar-profile-avatar">{adminInitial}</div>
              </button>

              {profileMenuOpen && (
                <div className="topbar-profile-menu" role="menu" aria-label="Admin profile menu">
                  <button type="button" className="topbar-profile-menu-item" role="menuitem" onClick={() => handleProfileMenuAction('account')}>
                    <UserRound size={14} />
                    <span>Tài khoản</span>
                  </button>
                  <button type="button" className="topbar-profile-menu-item danger" role="menuitem" onClick={() => handleProfileMenuAction('logout')}>
                    <LogOut size={14} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
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
