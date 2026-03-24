import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight, UserX, UserCheck, Eye, UserPlus, TrendingUp, BadgeCheck, Ban, Heart, MessageCircle, Check, ChevronDown } from 'lucide-react'
import adminService, { type AdminUser } from '@/services/adminService'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [creatingUser, setCreatingUser] = useState(false)
  const [roleSummary, setRoleSummary] = useState({ admins: 0, users: 0 })
  const roleDropdownRef = useRef<HTMLDivElement | null>(null)

  const roleOptions = [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getUsers(page, 10, search || undefined, roleFilter || undefined)
      setUsers(data.users)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      toast.error('Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  useEffect(() => { load() }, [load])

  const loadRoleSummary = useCallback(async () => {
    try {
      const [adminsData, usersData] = await Promise.all([
        adminService.getUsers(1, 1, undefined, 'admin'),
        adminService.getUsers(1, 1, undefined, 'user'),
      ])
      setRoleSummary({ admins: adminsData.total, users: usersData.total })
    } catch {
      // Keep dashboard resilient when summary query fails.
    }
  }, [])

  useEffect(() => {
    loadRoleSummary()
  }, [loadRoleSummary])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!roleDropdownRef.current) return
      if (!roleDropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await adminService.toggleUserActive(user.id)
      toast.success(`Đã ${user.isActive ? 'vô hiệu hoá' : 'kích hoạt'} tài khoản ${user.name}`)
      load()
    } catch {
      toast.error('Thao tác thất bại')
    }
  }

  const handleToggleRole = async (user: AdminUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    try {
      await adminService.updateUserRole(user.id, newRole)
      toast.success(`Đã ${newRole === 'admin' ? 'cấp' : 'thu hồi'} quyền admin cho ${user.name}`)
      load()
      loadRoleSummary()
    } catch {
      toast.error('Thao tác thất bại')
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Bạn chắc chắn muốn xóa tài khoản "${user.name}"? Thao tác này không thể hoàn tác!`)) return
    try {
      await adminService.deleteUser(user.id)
      toast.success('Đã xóa người dùng')
      load()
      loadRoleSummary()
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    const username = newUsername.trim()
    const email = newEmail.trim()
    const password = newPassword

    if (!username || !email || !password) {
      toast.error('Vui lòng điền username, email và mật khẩu')
      return
    }

    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    setCreatingUser(true)
    try {
      await adminService.createUser({ name, username, email, password, role: newRole })
      toast.success('Tạo người dùng thành công')
      setShowAddModal(false)
      setNewName('')
      setNewUsername('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('user')
      setPage(1)
      load()
      loadRoleSummary()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo người dùng')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleViewDetail = async (userId: string) => {
    try {
      const data = await adminService.getUserDetail(userId)
      setSelectedUser(data)
      setShowDetail(true)
    } catch {
      toast.error('Không thể tải thông tin người dùng')
    }
  }

  const closeDetailModal = () => {
    setShowDetail(false)
  }

  const handleModalToggleActive = async () => {
    if (!selectedUser) return
    try {
      await adminService.toggleUserActive(selectedUser.id)
      const nextActive = !selectedUser.isActive
      setSelectedUser((prev: any) => (prev ? { ...prev, isActive: nextActive } : prev))
      toast.success(`Đã ${nextActive ? 'kích hoạt' : 'vô hiệu hoá'} tài khoản ${selectedUser.name}`)
      load()
    } catch {
      toast.error('Thao tác thất bại')
    }
  }

  const handleModalToggleRole = async () => {
    if (!selectedUser) return
    const newRole = selectedUser.role === 'admin' ? 'user' : 'admin'
    try {
      await adminService.updateUserRole(selectedUser.id, newRole)
      setSelectedUser((prev: any) => (prev ? { ...prev, role: newRole } : prev))
      toast.success(`Đã ${newRole === 'admin' ? 'cấp' : 'thu hồi'} quyền admin cho ${selectedUser.name}`)
      load()
      loadRoleSummary()
    } catch {
      toast.error('Thao tác thất bại')
    }
  }

  const applyRoleFilter = (nextRole: string) => {
    setRoleFilter(nextRole)
    setPage(1)
  }

  const currentRoleLabel = roleOptions.find((option) => option.value === roleFilter)?.label ?? 'Tất cả vai trò'

  const handleRoleSelect = (value: string) => {
    applyRoleFilter(value)
    setRoleDropdownOpen(false)
  }

  const activeOnPage = users.filter((user) => user.isActive).length
  const blockedOnPage = users.length - activeOnPage
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const newUsersThisWeekOnPage = users.filter((user) => new Date(user.createdAt).getTime() >= weekAgo).length
  const usersFromSummary = roleSummary.admins + roleSummary.users
  const adminRatio = usersFromSummary === 0 ? 0 : (roleSummary.admins / usersFromSummary) * 100
  const showingCount = users.length

  return (
    <div className="admin-page">
      <div className="page-header users-page-header">
        <div>
          <nav className="users-breadcrumb">
            <span>Console</span>
            <ChevronRight size={12} />
            <span className="current">Quản lý người dùng</span>
          </nav>
          <h1 className="page-title">Quản lý người dùng</h1>
          <p className="page-subtitle users-page-subtitle">
            <span className="users-status-dot" />
            Tổng cộng <strong>{total}</strong> người dùng
          </p>
        </div>

        <div className="users-header-actions">
          <div className="users-role-switch">
            <button
              type="button"
              className={`users-role-btn ${roleFilter === '' ? 'active' : ''}`}
              onClick={() => applyRoleFilter('')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`users-role-btn ${roleFilter === 'admin' ? 'active' : ''}`}
              onClick={() => applyRoleFilter('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              className={`users-role-btn ${roleFilter === 'user' ? 'active' : ''}`}
              onClick={() => applyRoleFilter('user')}
            >
              User
            </button>
          </div>

          <button
            type="button"
            className="users-add-btn"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} />
            Thêm người dùng
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card filters-card">
        <form onSubmit={handleSearch} className="filters-row">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Tìm tên, email hoặc username..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit">Tìm</button>
          </div>
          <div className="role-filter-dropdown" ref={roleDropdownRef}>
            <button
              type="button"
              className={`role-filter-trigger ${roleDropdownOpen ? 'open' : ''}`}
              onClick={() => setRoleDropdownOpen(prev => !prev)}
              aria-haspopup="listbox"
              aria-expanded={roleDropdownOpen}
              aria-label="Chọn vai trò"
            >
              <span>{currentRoleLabel}</span>
              <ChevronDown size={16} className="role-filter-chevron" />
            </button>

            {roleDropdownOpen && (
              <div className="role-filter-menu" role="listbox" aria-label="Vai trò">
                {roleOptions.map((option) => {
                  const isActive = roleFilter === option.value
                  return (
                    <button
                      key={option.value || 'all'}
                      type="button"
                      className={`role-filter-option ${isActive ? 'active' : ''}`}
                      onClick={() => handleRoleSelect(option.value)}
                      role="option"
                      aria-selected={isActive}
                    >
                      <span>{option.label}</span>
                      {isActive && <Check size={14} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="admin-card users-table-card">
        {loading ? (
          <div className="admin-loading"><div className="loading-spinner" /><span>Đang tải...</span></div>
        ) : (
          <div className="posts-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thống kê</th>
                  <th>Ngày tham gia</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="users-empty-row">
                      Không tìm thấy người dùng phù hợp với bộ lọc hiện tại
                    </td>
                  </tr>
                )}
                {users.map(user => (
                  <tr key={user.id} className="users-row">
                    <td>
                      <div className="table-user">
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                          alt={user.name}
                        />
                        <div>
                          <div className="user-name">{user.name}</div>
                          <div className="user-username">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{user.email}</td>
                    <td>
                      {user.role === 'admin'
                        ? <span className="badge badge-purple">Admin</span>
                        : <span className="badge badge-gray">User</span>
                      }
                    </td>
                    <td>
                      {user.isActive
                        ? <span className="badge badge-green">Hoạt động</span>
                        : <span className="badge badge-red">Bị khóa</span>
                      }
                    </td>
                    <td>
                      <div className="stats-mini">
                        <span title="Bài viết">📝 {user._count.posts}</span>
                        <span title="Followers">👥 {user._count.followers}</span>
                      </div>
                    </td>
                    <td className="text-muted">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: vi })}
                    </td>
                    <td>
                      <div className="action-btns users-action-group">
                        <button
                          className="action-btn view"
                          onClick={() => handleViewDetail(user.id)}
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleToggleRole(user)}
                          title={user.role === 'admin' ? 'Thu hồi quyền admin' : 'Cấp quyền admin'}
                        >
                          {user.role === 'admin' ? <ShieldOff size={15} /> : <Shield size={15} />}
                        </button>
                        <button
                          className={`action-btn ${user.isActive ? 'warn' : 'success'}`}
                          onClick={() => handleToggleActive(user)}
                          title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                        >
                          {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={() => handleDelete(user)}
                          title="Xóa người dùng"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="pagination users-pagination-wrap">
          <p className="users-pagination-meta">
            Đang hiển thị <strong>{showingCount}</strong> trên <strong>{total}</strong> người dùng
          </p>
          <div className="users-pagination-controls">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-info">Trang {page} / {totalPages}</span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="users-kpi-grid">
        <article className="users-kpi-card users-kpi-card-primary">
          <div className="users-kpi-icon">
            <TrendingUp size={22} />
          </div>
          <div className="users-kpi-body">
            <p className="users-kpi-label">Người dùng mới (7 ngày, trang hiện tại)</p>
            <p className="users-kpi-value">{newUsersThisWeekOnPage}</p>
          </div>
          <span className="users-kpi-chip">Live</span>
        </article>

        <article className="users-kpi-card">
          <div className="users-kpi-icon soft">
            <BadgeCheck size={22} />
          </div>
          <div className="users-kpi-body">
            <p className="users-kpi-label">Tỷ lệ Admin toàn hệ thống</p>
            <p className="users-kpi-value dark">{adminRatio.toFixed(1)}%</p>
            <div className="users-kpi-progress">
              <span style={{ width: `${Math.max(6, Math.min(adminRatio, 100))}%` }} />
            </div>
          </div>
        </article>

        <article className="users-kpi-card">
          <div className="users-kpi-icon warn">
            <Ban size={22} />
          </div>
          <div className="users-kpi-body">
            <p className="users-kpi-label">Tài khoản bị khóa (trang hiện tại)</p>
            <p className="users-kpi-value dark">{blockedOnPage}</p>
            <button
              type="button"
              className="users-kpi-link"
              onClick={() => toast.info('Dùng bộ lọc và trạng thái trong bảng để kiểm tra chi tiết')}
            >
              Xem hướng dẫn
            </button>
          </div>
        </article>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-[0_20px_40px_rgba(44,42,81,0.12)]">
            <div className="flex items-start justify-between p-8 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold font-headline text-gray-900 dark:text-white">Thêm người dùng</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Tạo tài khoản mới cho người dùng</p>
              </div>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                onClick={() => setShowAddModal(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form className="p-8 pt-4 space-y-5" onSubmit={handleCreateUser}>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-900 dark:text-white ml-1">Họ và tên</label>
                <input
                  className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-gray-400"
                  placeholder="Nhập họ và tên đầy đủ"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-900 dark:text-white ml-1">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">@</span>
                  <input
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3.5 pl-8 text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-gray-400"
                    placeholder="username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-900 dark:text-white ml-1">Email</label>
                <input
                  className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-gray-400"
                  placeholder="example@admin-nexus.com"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-900 dark:text-white ml-1">Mật khẩu</label>
                <input
                  className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-900 dark:text-white ml-1">Vai trò</label>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl">
                  <button
                    type="button"
                    className={`flex-1 ${newRole === 'user' ? 'bg-white dark:bg-slate-900 text-primary font-bold' : 'text-gray-600 dark:text-gray-400 font-medium'} py-2.5 rounded-lg text-sm shadow-sm transition-all flex items-center justify-center gap-2`}
                    onClick={() => setNewRole('user')}
                  >
                    <UserPlus size={18} />
                    User
                  </button>
                  <button
                    type="button"
                    className={`flex-1 ${newRole === 'admin' ? 'bg-white dark:bg-slate-900 text-primary font-bold' : 'text-gray-600 dark:text-gray-400 font-medium'} py-2.5 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2`}
                    onClick={() => setNewRole('admin')}
                  >
                    <Shield size={18} />
                    Admin
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-slate-800 mt-4">
                <button
                  className="flex-1 bg-gray-100 text-primary font-bold py-4 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="flex-[1.5] bg-gradient-to-br from-orange-500 to-orange-400 text-white font-bold py-4 rounded-xl text-sm shadow-lg shadow-orange-200/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  type="submit"
                  disabled={creatingUser}
                >
                  {creatingUser ? 'Đang tạo...' : 'Tạo người dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showDetail && selectedUser && (
        <div className="modal-overlay user-detail-modal" onClick={closeDetailModal}>
          <div className="modal-content user-detail-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Chi tiết người dùng</h3>
                <p className="modal-subtitle">Thông tin hồ sơ, hoạt động và bài viết gần đây</p>
              </div>
              <button onClick={closeDetailModal} className="modal-close" aria-label="Đóng modal">✕</button>
            </div>
            <div className="modal-body">
              <div className="user-detail-header">
                <div className="detail-profile-main">
                  <div className="detail-avatar-wrap">
                    <img
                      src={selectedUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.name}`}
                      alt={selectedUser.name}
                      className="detail-avatar"
                    />
                  </div>
                  <div>
                    <div className="detail-head-main">
                      <div className="detail-name">{selectedUser.name}</div>
                      <span className={`badge detail-role-badge ${selectedUser.role === 'admin' ? 'badge-purple' : 'badge-gray'}`}>
                        {selectedUser.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                    <div className="detail-username">@{selectedUser.username}</div>
                    <div className="detail-email">{selectedUser.email}</div>
                    <div className="detail-status-line">
                      <span className={`status-dot ${selectedUser.isActive ? 'online' : 'offline'}`} />
                      <span>{selectedUser.isActive ? 'Hoạt động' : 'Bị khóa'}</span>
                    </div>
                    <div className="detail-meta-row">
                      Tham gia {formatDistanceToNow(new Date(selectedUser.createdAt), { addSuffix: true, locale: vi })}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="detail-edit-btn"
                  onClick={() => toast.info('Tính năng chỉnh sửa trực tiếp sẽ được bổ sung sau')}
                >
                  Chỉnh sửa
                </button>
              </div>

              <div className="detail-stats-grid">
                <div className="detail-stat">
                  <div className="detail-stat-val">{selectedUser._count?.posts ?? 0}</div>
                  <div className="detail-stat-lbl">Bài viết</div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-val">{selectedUser._count?.followers ?? 0}</div>
                  <div className="detail-stat-lbl">Followers</div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-val">{selectedUser._count?.following ?? 0}</div>
                  <div className="detail-stat-lbl">Following</div>
                </div>
                <div className="detail-stat">
                  <div className="detail-stat-val">{selectedUser._count?.comments ?? 0}</div>
                  <div className="detail-stat-lbl">Bình luận</div>
                </div>
              </div>

              {selectedUser.bio && <p className="detail-bio">{selectedUser.bio}</p>}

              <div className="recent-posts-section">
                <div className="recent-posts-header">
                  <h4>Bài viết gần đây</h4>
                  <button
                    type="button"
                    className="recent-posts-link"
                    onClick={() => toast.info('Danh sách đầy đủ có thể xem ở trang hồ sơ người dùng')}
                  >
                    Xem tất cả
                  </button>
                </div>
                {selectedUser.recentPosts?.length > 0 ? (
                  selectedUser.recentPosts.map((p: any) => (
                    <div key={p.id} className="mini-post">
                      <div className="mini-post-content">
                        {p.content?.trim() ? p.content.slice(0, 120) : 'Bài viết không có nội dung văn bản'}
                        {p.content?.length > 120 ? '...' : ''}
                      </div>
                      <div className="mini-post-meta">
                        <span className="mini-post-meta-item"><Heart size={12} /> {p._count.likes}</span>
                        <span className="mini-post-meta-item"><MessageCircle size={12} /> {p._count.comments}</span>
                        <span className="mini-post-time">
                          {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="recent-post-empty">Người dùng này chưa có bài viết gần đây.</div>
                )}
              </div>
            </div>
            <div className="modal-footer-actions">
              <button
                type="button"
                className="modal-footer-btn subtle"
                onClick={handleModalToggleActive}
              >
                {selectedUser.isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
              </button>
              <button
                type="button"
                className="modal-footer-btn primary"
                onClick={handleModalToggleRole}
              >
                {selectedUser.role === 'admin' ? 'Thu hồi quyền admin' : 'Cấp quyền admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
