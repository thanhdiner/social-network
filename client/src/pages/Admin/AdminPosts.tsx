import React, { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Plus,
} from 'lucide-react'
import adminService, { type AdminPost } from '@/services/adminService'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getPosts(page, 10, search || undefined)
      setPosts(data.posts)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      toast.error('Không thể tải danh sách bài viết')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleDelete = async (post: AdminPost) => {
    if (!confirm('Bạn chắc chắn muốn xóa bài viết này?')) return
    try {
      await adminService.deletePost(post.id)
      toast.success('Đã xóa bài viết')
      load()
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const postsThisWeek = posts.filter(p => new Date(p.createdAt).getTime() >= weekAgo).length
  const mediaCount = posts.filter(p => !!p.imageUrl).length
  const likesTotal = posts.reduce((s, p) => s + (p._count?.likes || 0), 0)

  return (
    <div className="admin-page posts-page">
      <div className="editorial-header">
        <div>
          <h2 className="text-3xl font-extrabold">Quản lý bài viết</h2>
          <div className="editorial-sub">
            <span className="status-dot" />
            <span className="text-muted">Tổng cộng <strong>{total}</strong> bài viết</span>
          </div>
        </div>

        <div className="editorial-actions">
          <button className="posts-filter-btn" onClick={() => toast.info('Hiện chưa có bộ lọc nâng cao') }>
            <Search size={16} />
            <span>Bộ lọc</span>
          </button>
          <button className="posts-export-btn" onClick={() => toast.success('Xuất báo cáo (mock)')}>
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="posts-kpi-grid">
        <div className="posts-kpi-card">
          <div className="posts-kpi-icon">
            <TrendingUp size={18} />
          </div>
          <div className="posts-kpi-body">
            <div className="posts-kpi-label">Tương tác tuần</div>
            <div className="posts-kpi-value">{likesTotal}</div>
          </div>
          <div className="posts-kpi-chip">+{postsThisWeek}%</div>
        </div>

        <div className="posts-kpi-card">
          <div className="posts-kpi-icon soft">
            <Image size={18} />
          </div>
          <div className="posts-kpi-body">
            <div className="posts-kpi-label">Media tải lên</div>
            <div className="posts-kpi-value dark">{mediaCount}</div>
          </div>
        </div>

        <div className="posts-kpi-card posts-kpi-card-primary col-span-2">
          <div className="users-kpi-body">
            <h4 className="posts-system-title">Hệ thống ổn định</h4>
            <p className="posts-system-sub">Tất cả dịch vụ đang hoạt động bình thường.</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm posts-table-section">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse posts-table">
            <thead>
              <tr className="posts-table-head">
                <th className="px-6 py-5">Tác giả</th>
                <th className="px-6 py-5">Nội dung</th>
                <th className="px-6 py-5">Media</th>
                <th className="px-6 py-5 text-center">Tương tác</th>
                <th className="px-6 py-5">Thời gian</th>
                <th className="px-6 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="users-empty-row">Không có bài viết phù hợp</td>
                </tr>
              )}

              {posts.map(post => (
                <tr key={post.id} className="hover-row">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <img src={post.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user.name}`} alt={post.user.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold">{post.user.name}</div>
                        <div className="text-xs text-muted">@{post.user.username}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5 max-w-xs">
                    <p className="text-sm text-muted line-clamp-2">{post.content}</p>
                  </td>

                  <td className="px-6 py-5">
                    {post.imageUrl ? (
                      <div className="inline-flex items-center gap-2 bg-surface-container-lowest px-3 py-1 rounded-lg text-primary">
                        <Image size={14} />
                        <span className="text-xs font-bold uppercase">Ảnh</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-6">
                      <div className="group flex items-center gap-2">
                        <Heart className="interaction-icon" size={16} />
                        <span className="text-xs font-bold">{post._count.likes}</span>
                      </div>
                      <div className="group flex items-center gap-2">
                        <MessageCircle className="interaction-icon" size={16} />
                        <span className="text-xs font-bold">{post._count.comments}</span>
                      </div>
                      <div className="group flex items-center gap-2">
                        <Share2 className="interaction-icon" size={16} />
                        <span className="text-xs font-bold">{post._count.shares}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="text-xs text-muted">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}</div>
                  </td>

                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Xem chi tiết">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Ẩn bài viết">
                        <ChevronLeft size={16} />
                      </button>
                      <button className="p-2 text-error hover:bg-error/5 rounded-lg transition-colors" title="Xóa bài viết" onClick={() => handleDelete(post)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-5 flex items-center justify-between bg-surface-container-lowest border-t border-surface-container">
          <p className="text-xs font-bold text-slate-500">Trang {page} / {totalPages}</p>
          <div className="flex space-x-2">
            <button className="p-2 rounded-lg bg-slate-100 text-slate-300" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95 transition-all" onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <button className="floating-add-btn" title="Tạo bài mới">
        <Plus size={20} />
      </button>
    </div>
  )
}

export default AdminPosts
