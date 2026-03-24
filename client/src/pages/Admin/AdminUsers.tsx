import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight, UserX, UserCheck, Eye, UserPlus, TrendingUp, BadgeCheck, Ban, Heart, MessageCircle, Check, ChevronDown } from 'lucide-react'
import adminService, { type AdminUser, type AdminUserDetail } from '@/services/adminService'
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
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [creatingUser, setCreatingUser] = useState(false)
  const [roleSummary, setRoleSummary] = useState({ admins: 0, users: 0 })
  const [isEditingDetail, setIsEditingDetail] = useState(false)
  const [isSavingDetail, setIsSavingDetail] = useState(false)
  const [detailForm, setDetailForm] = useState({
    name: '',
    username: '',
    email: '',
    bio: '',
  })
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
      setDetailForm({
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        bio: data.bio || '',
      })
      setIsEditingDetail(false)
      setShowDetail(true)
    } catch {
      toast.error('Không thể tải thông tin người dùng')
    }
  }

  const closeDetailModal = () => {
    setIsEditingDetail(false)
    setShowDetail(false)
  }

  const handleStartEditDetail = () => {
    if (!selectedUser) return
    setDetailForm({
      name: selectedUser.name || '',
      username: selectedUser.username || '',
      email: selectedUser.email || '',
      bio: selectedUser.bio || '',
    })
    setIsEditingDetail(true)
  }

  const handleCancelEditDetail = () => {
    if (!selectedUser) {
      setIsEditingDetail(false)
      return
    }
    setDetailForm({
      name: selectedUser.name || '',
      username: selectedUser.username || '',
      email: selectedUser.email || '',
      bio: selectedUser.bio || '',
    })
    setIsEditingDetail(false)
  }

  const handleDetailFormChange = (field: 'name' | 'username' | 'email' | 'bio', value: string) => {
    setDetailForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveDetail = async () => {
    if (!selectedUser) return

    const payload = {
      name: detailForm.name.trim(),
      username: detailForm.username.trim(),
      email: detailForm.email.trim(),
      bio: detailForm.bio.trim(),
    }

    if (!payload.username || !payload.email) {
      toast.error('Username và email không được để trống')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(payload.email)) {
      toast.error('Email không hợp lệ')
      return
    }

    setIsSavingDetail(true)
    try {
      const updated = await adminService.updateUser(selectedUser.id, {
        ...payload,
        bio: payload.bio || undefined,
      })

      setSelectedUser(prev => {
        if (!prev) return prev
        return {
          ...prev,
          ...updated,
        }
      })

      setUsers(prev => prev.map(user => (
        user.id === selectedUser.id
          ? {
              ...user,
              name: updated.name,
              username: updated.username,
              email: updated.email,
              avatar: updated.avatar,
            }
          : user
      )))

      setDetailForm({
        name: updated.name || '',
        username: updated.username || '',
        email: updated.email || '',
        bio: updated.bio || '',
      })
      setIsEditingDetail(false)
      toast.success('Đã cập nhật thông tin người dùng')
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật người dùng')
    } finally {
      setIsSavingDetail(false)
    }
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/10 p-4 backdrop-blur-sm" onClick={closeDetailModal}>
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-[#fcfbf8] shadow-[0_20px_40px_rgba(44,42,81,0.06)]" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-headline font-bold tracking-tight text-slate-800">Chi tiết người dùng</h3>
                  <p className="mt-1 text-sm text-slate-500">Thông tin hồ sơ, hoạt động và bài viết gần đây</p>
                </div>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="cursor-pointer rounded-full p-2 text-slate-500 transition-colors hover:bg-orange-100"
                  aria-label="Đóng modal"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-8 pb-8">
              <div className="rounded-3xl bg-orange-50/70 p-6">
                <div className="flex items-start gap-6">
                  <div className="relative shrink-0">
                    <img
                      src={selectedUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.name}`}
                      alt={selectedUser.name}
                      className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white shadow-sm"
                    />
                    <span className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-orange-50 ${selectedUser.isActive ? 'bg-green-500' : 'bg-rose-500'}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {!isEditingDetail ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xl font-headline font-extrabold text-slate-800">@{selectedUser.username}</h4>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${selectedUser.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-700'}`}>
                            {selectedUser.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${selectedUser.isActive ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                            {selectedUser.isActive ? 'Hoạt động' : 'Bị khóa'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-600">{selectedUser.name || 'Chưa cập nhật tên'}</p>
                        <p className="mt-1 text-sm text-slate-500">{selectedUser.email}</p>
                      </>
                    ) : (
                      <div className="grid gap-2">
                        <input
                          className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-orange-400 focus:outline-none"
                          value={detailForm.name}
                          onChange={(e) => handleDetailFormChange('name', e.target.value)}
                          placeholder="Họ và tên"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-500">@</span>
                          <input
                            className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-orange-400 focus:outline-none"
                            value={detailForm.username}
                            onChange={(e) => handleDetailFormChange('username', e.target.value)}
                            placeholder="username"
                          />
                        </div>
                        <input
                          className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-orange-400 focus:outline-none"
                          value={detailForm.email}
                          onChange={(e) => handleDetailFormChange('email', e.target.value)}
                          placeholder="email@example.com"
                          type="email"
                        />
                      </div>
                    )}

                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Tham gia {formatDistanceToNow(new Date(selectedUser.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="cursor-pointer rounded-xl border border-orange-200 bg-white px-4 py-2 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-100"
                    onClick={handleModalToggleActive}
                  >
                    {selectedUser.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer rounded-xl border border-orange-200 bg-white px-4 py-2 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-100"
                    onClick={handleModalToggleRole}
                  >
                    {selectedUser.role === 'admin' ? 'Hạ quyền admin' : 'Nâng quyền admin'}
                  </button>
                  {!isEditingDetail && (
                    <button
                      type="button"
                      className="cursor-pointer rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-600"
                      onClick={handleStartEditDetail}
                    >
                      Chỉnh sửa
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-orange-50 p-4 text-center">
                  <p className="text-2xl font-headline font-bold text-orange-600">{selectedUser._count?.posts ?? 0}</p>
                  <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">Bài viết</p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4 text-center">
                  <p className="text-2xl font-headline font-bold text-orange-600">{selectedUser._count?.followers ?? 0}</p>
                  <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">Followers</p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4 text-center">
                  <p className="text-2xl font-headline font-bold text-orange-600">{selectedUser._count?.following ?? 0}</p>
                  <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">Following</p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4 text-center">
                  <p className="text-2xl font-headline font-bold text-orange-600">{selectedUser._count?.comments ?? 0}</p>
                  <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">Bình luận</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-500">Giới thiệu</h4>
                {isEditingDetail ? (
                  <textarea
                    className="min-h-[100px] w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-orange-400 focus:outline-none"
                    value={detailForm.bio}
                    onChange={(e) => handleDetailFormChange('bio', e.target.value)}
                    placeholder="Giới thiệu ngắn về người dùng"
                  />
                ) : (
                  <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 text-sm italic leading-relaxed text-slate-600">
                    {selectedUser.bio?.trim() || 'Người dùng này chưa cập nhật thông tin giới thiệu bản thân. Một chút thông tin sẽ giúp mọi người kết nối dễ hơn.'}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-500">Bài viết gần đây</h4>
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-bold text-orange-600 hover:underline"
                    onClick={() => toast.info('Danh sách đầy đủ có thể xem ở trang hồ sơ người dùng')}
                  >
                    Xem tất cả
                  </button>
                </div>

                <div className="grid gap-3">
                  {selectedUser.recentPosts?.length > 0 ? (
                    selectedUser.recentPosts.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between rounded-2xl bg-orange-50 p-4 transition-colors hover:bg-orange-100/70">
                        <div className="min-w-0 flex-1">
                          <h5 className="truncate text-sm font-bold text-slate-700">
                            {p.content?.trim() ? p.content.slice(0, 80) : 'Bài viết không có nội dung văn bản'}
                            {p.content?.length > 80 ? '...' : ''}
                          </h5>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi })}
                          </p>
                        </div>
                        <div className="ml-4 flex shrink-0 items-center gap-3 text-xs font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1"><Heart size={13} /> {p._count.likes}</span>
                          <span className="inline-flex items-center gap-1"><MessageCircle size={13} /> {p._count.comments}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50 px-4 py-5 text-center text-sm font-semibold text-orange-700">
                      Người dùng này chưa có bài viết gần đây.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-orange-100 bg-orange-50/60 p-6">
              <button
                type="button"
                className="cursor-pointer rounded-xl px-6 py-2.5 text-sm font-bold text-orange-700 transition-all hover:bg-orange-100"
                onClick={isEditingDetail ? handleCancelEditDetail : closeDetailModal}
                disabled={isSavingDetail}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-xl bg-gradient-to-br from-orange-500 to-orange-400 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-200/40 transition-all hover:brightness-110"
                onClick={isEditingDetail ? handleSaveDetail : handleStartEditDetail}
                disabled={isSavingDetail}
              >
                {isEditingDetail ? (isSavingDetail ? 'Đang lưu...' : 'Lưu thay đổi') : 'Chỉnh sửa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
