import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Trash2, ChevronLeft, ChevronRight, MessageSquare, Search, ExternalLink, X } from 'lucide-react'
import adminService, { type AdminComment } from '@/services/adminService'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

const AdminComments: React.FC = () => {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getComments(page, 20, search || undefined)
      setComments(data.comments)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      toast.error('Không thể tải danh sách bình luận')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }

  const handleDelete = async (comment: AdminComment) => {
    const preview = comment.content.length > 60 ? comment.content.slice(0, 60) + '…' : comment.content
    if (!confirm(`Xóa bình luận: "${preview}"?`)) return
    try {
      await adminService.deleteComment(comment.id)
      toast.success('Đã xóa bình luận')
      load()
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Bình luận</h1>
          <p className="page-subtitle">
            Tổng cộng <strong>{total.toLocaleString('vi-VN')}</strong> bình luận
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="admin-card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Tìm theo nội dung hoặc tên người dùng..."
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: searchInput ? 32 : 12,
              paddingTop: 7,
              paddingBottom: 7,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 13,
              outline: 'none',
              background: '#f9fafb',
            }}
          />
          {searchInput && (
            <button onClick={() => handleSearchChange('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner" />
            <span>Đang tải bình luận...</span>
          </div>
        ) : comments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: 12, color: '#9ca3af' }}>
            <MessageSquare size={48} opacity={0.25} />
            <p style={{ margin: 0, fontSize: 14 }}>
              {search ? `Không tìm thấy bình luận nào cho "${search}"` : 'Chưa có bình luận nào'}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Nội dung bình luận</th>
                  <th>Bài viết</th>
                  <th>Thời gian</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {comments.map(comment => (
                  <tr key={comment.id}>
                    {/* User */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
                        <img
                          src={comment.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user.name}`}
                          alt={comment.user.name}
                          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{comment.user.name}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>@{comment.user.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Comment content */}
                    <td style={{ maxWidth: 300 }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {comment.content}
                      </p>
                    </td>

                    {/* Post */}
                    <td style={{ maxWidth: 200 }}>
                      {comment.post ? (
                        <a
                          href={`/post/${comment.post.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#f97316', textDecoration: 'none' }}
                          title={comment.post.content}
                        >
                          <ExternalLink size={12} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                            {comment.post.content || '(Bài viết không có text)'}
                          </span>
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>
                      )}
                    </td>

                    {/* Time */}
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#6b7280' }}>
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="action-btn danger"
                        onClick={() => handleDelete(comment)}
                        title="Xóa bình luận"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="pagination">
          <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span className="page-info">Trang {page} / {totalPages || 1}</span>
          <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminComments
