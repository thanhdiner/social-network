import React, { useEffect, useState, useCallback } from 'react'
import { Search, Trash2, ChevronLeft, ChevronRight, Image } from 'lucide-react'
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

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">Quản lý bài viết</h1>
        <p className="page-subtitle">Tổng cộng <strong>{total}</strong> bài viết</p>
      </div>

      {/* Filters */}
      <div className="admin-card filters-card">
        <form onSubmit={handleSearch} className="filters-row">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung bài viết..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit">Tìm</button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-loading"><div className="loading-spinner" /><span>Đang tải...</span></div>
        ) : (
          <div className="posts-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tác giả</th>
                  <th>Nội dung</th>
                  <th>Media</th>
                  <th>Lượt thích</th>
                  <th>Bình luận</th>
                  <th>Chia sẻ</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id}>
                    <td>
                      <div className="table-user">
                        <img
                          src={post.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${post.user.name}`}
                          alt={post.user.name}
                        />
                        <div>
                          <div className="user-name">{post.user.name}</div>
                          <div className="user-username">@{post.user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="content-preview">
                        {post.content.slice(0, 100)}{post.content.length > 100 ? '...' : ''}
                      </div>
                    </td>
                    <td>
                      {post.imageUrl
                        ? <span className="badge badge-blue"><Image size={12} /> Ảnh</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td><span className="badge badge-pink">❤ {post._count.likes}</span></td>
                    <td><span className="badge badge-blue">💬 {post._count.comments}</span></td>
                    <td><span className="badge badge-gray">🔄 {post._count.shares}</span></td>
                    <td className="text-muted">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="action-btn danger"
                          onClick={() => handleDelete(post)}
                          title="Xóa bài viết"
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
        <div className="pagination">
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
  )
}

export default AdminPosts
