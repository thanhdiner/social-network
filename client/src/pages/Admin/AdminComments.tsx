import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Search,
  ExternalLink,
  X,
  Filter,
  Download,
  TrendingUp,
  AlertTriangle,
  MessagesSquare,
  Heart,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react'
import adminService, { type AdminComment, type CommentBannedKeyword } from '@/services/adminService'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useSearchParams } from 'react-router-dom'

const PAGE_SIZE = 20

const escapeCsv = (value: string | number | null | undefined) => {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  const escaped = normalized.replace(/"/g, '""')
  return `"${escaped}"`
}

const AdminComments: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [comments, setComments] = useState<AdminComment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [bannedKeywords, setBannedKeywords] = useState<CommentBannedKeyword[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [keywordLoading, setKeywordLoading] = useState(false)
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null)
  const [selectedCommentIds, setSelectedCommentIds] = useState<Set<string>>(new Set())
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadKeywords = useCallback(async () => {
    setKeywordLoading(true)
    try {
      const data = await adminService.getCommentBannedKeywords()
      setBannedKeywords(data)
    } catch {
      toast.error('Không thể tải danh sách từ khóa cấm')
    } finally {
      setKeywordLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getComments(page, PAGE_SIZE, search || undefined, flaggedOnly)
      setComments(data.comments)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setSelectedCommentIds((prev) => {
        const availableIds = new Set(data.comments.map((comment) => comment.id))
        return new Set([...prev].filter((id) => availableIds.has(id)))
      })

      if (data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages)
      }

      if (data.totalPages === 0 && page !== 1) {
        setPage(1)
      }
    } catch {
      toast.error('Không thể tải danh sách bình luận')
    } finally {
      setLoading(false)
    }
  }, [page, search, flaggedOnly])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadKeywords() }, [loadKeywords])

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [])

  useEffect(() => {
    const urlSearch = (searchParams.get('search') || '').trim()
    const flaggedValue = (searchParams.get('flagged') || '').trim().toLowerCase()
    const urlFlaggedOnly = flaggedValue === '1' || flaggedValue === 'true'

    let shouldResetPage = false

    if (urlSearch !== searchInput) {
      setSearchInput(urlSearch)
    }

    if (urlSearch !== search) {
      setSearch(urlSearch)
      shouldResetPage = true
    }

    if (urlFlaggedOnly !== flaggedOnly) {
      setFlaggedOnly(urlFlaggedOnly)
      shouldResetPage = true
    }

    if (shouldResetPage) {
      setPage(1)
    }
  }, [searchParams])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }

  const clearFilters = () => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setSearchInput('')
    setSearch('')
    setFlaggedOnly(false)
    setPage(1)
  }

  const handleAddKeyword = async () => {
    const keyword = keywordInput.trim()
    if (!keyword) {
      toast.error('Vui lòng nhập từ khóa cấm')
      return
    }

    try {
      await adminService.createCommentBannedKeyword(keyword)
      toast.success('Đã thêm từ khóa cấm')
      setKeywordInput('')
      await Promise.all([loadKeywords(), load()])
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thêm từ khóa cấm')
    }
  }

  const handleDeleteKeyword = async (keywordId: string) => {
    setDeletingKeywordId(keywordId)
    try {
      await adminService.deleteCommentBannedKeyword(keywordId)
      toast.success('Đã xóa từ khóa cấm')
      await Promise.all([loadKeywords(), load()])
    } catch {
      toast.error('Không thể xóa từ khóa cấm')
    } finally {
      setDeletingKeywordId(null)
    }
  }

  const handleDelete = async (comment: AdminComment) => {
    const preview = comment.content.length > 60 ? comment.content.slice(0, 60) + '…' : comment.content
    if (!confirm(`Xóa bình luận: "${preview}"?`)) return
    try {
      await adminService.deleteComment(comment.id)
      setSelectedCommentIds((prev) => {
        const next = new Set(prev)
        next.delete(comment.id)
        return next
      })
      toast.success('Đã xóa bình luận')
      load()
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  const handleExport = () => {
    if (comments.length === 0) {
      toast.info('Không có dữ liệu để xuất')
      return
    }

    const header = ['ID', 'Tác giả', 'Username', 'Nội dung', 'Bài viết', 'Lượt thích', 'Cờ kiểm duyệt', 'Thời gian tạo']
    const rows = comments.map((comment) => ([
      comment.id,
      comment.user.name,
      `@${comment.user.username}`,
      comment.content,
      comment.post?.content || '',
      comment.likesCount,
      comment.moderation.flagged ? `Có (${comment.moderation.matchedKeywords.join(', ')})` : 'Không',
      comment.createdAt,
    ]))

    const csv = [
      header.map((item) => escapeCsv(item)).join(','),
      ...rows.map((row) => row.map((item) => escapeCsv(item)).join(',')),
    ].join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `admin-comments-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success('Đã xuất báo cáo CSV')
  }

  const toggleCommentSelection = (commentId: string) => {
    setSelectedCommentIds((prev) => {
      const next = new Set(prev)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }

  const selectedCommentsOnPage = useMemo(
    () => comments.filter((comment) => selectedCommentIds.has(comment.id)),
    [comments, selectedCommentIds],
  )

  const selectedCount = selectedCommentsOnPage.length
  const allSelectedOnPage = comments.length > 0 && selectedCount === comments.length

  const toggleSelectAllOnPage = () => {
    setSelectedCommentIds((prev) => {
      const next = new Set(prev)

      if (allSelectedOnPage) {
        comments.forEach((comment) => next.delete(comment.id))
      } else {
        comments.forEach((comment) => next.add(comment.id))
      }

      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return

    if (!confirm(`Xóa ${selectedCount} bình luận đã chọn?`)) return

    const results = await Promise.allSettled(
      selectedCommentsOnPage.map((comment) => adminService.deleteComment(comment.id)),
    )

    const successCount = results.filter((result) => result.status === 'fulfilled').length
    const failedCount = results.length - successCount

    if (successCount > 0) {
      toast.success(`Đã xóa ${successCount} bình luận`)
    }

    if (failedCount > 0) {
      toast.error(`${failedCount} bình luận xóa thất bại`)
    }

    setSelectedCommentIds(new Set())
    load()
  }

  const recentInteraction = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return comments.filter((comment) => new Date(comment.createdAt).getTime() >= weekAgo).length
  }, [comments])

  const flaggedCount = useMemo(
    () => comments.filter((comment) => comment.moderation.flagged).length,
    [comments],
  )

  const responseRate = useMemo(() => {
    if (comments.length === 0) return 0
    const validPostCommentCount = comments.filter((comment) => Boolean(comment.post)).length
    return Math.round((validPostCommentCount / comments.length) * 100)
  }, [comments])

  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endIndex = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total)

  return (
    <div className="admin-page comments-page">
      <div className="page-header comments-page-header">
        <div>
          <p className="comments-breadcrumb">Dashboard / Comment Management</p>
          <h1 className="page-title">Quản lý bình luận</h1>
          <p className="page-subtitle comments-page-subtitle">
            <span className="comments-status-dot" />
            Tổng cộng <strong>{total.toLocaleString('vi-VN')}</strong> bình luận
          </p>
        </div>

        <div className="comments-header-actions">
          <div className="comments-violation-filter" role="tablist" aria-label="Bộ lọc vi phạm">
            <button
              type="button"
              className={`comments-filter-pill ${!flaggedOnly ? 'active' : ''}`}
              onClick={() => {
                setFlaggedOnly(false)
                setPage(1)
              }}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`comments-filter-pill ${flaggedOnly ? 'active' : ''}`}
              onClick={() => {
                setFlaggedOnly(true)
                setPage(1)
              }}
            >
              Chỉ vi phạm
            </button>
          </div>

          <button
            type="button"
            className="comments-filter-btn"
            onClick={clearFilters}
            disabled={!search && !searchInput}
            title="Xóa điều kiện lọc"
          >
            <Filter size={16} />
            Lọc dữ liệu
          </button>
          <button
            type="button"
            className="comments-export-btn"
            onClick={handleExport}
          >
            <Download size={16} />
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="comments-kpi-grid">
        <article className="comments-kpi-card comments-kpi-card-primary">
          <div className="comments-kpi-icon">
            <TrendingUp size={20} />
          </div>
          <div className="comments-kpi-body">
            <p className="comments-kpi-label">Tương tác tuần qua</p>
            <p className="comments-kpi-value">+{recentInteraction}</p>
          </div>
        </article>

        <article className="comments-kpi-card">
          <div className="comments-kpi-icon warn">
            <AlertTriangle size={20} />
          </div>
          <div className="comments-kpi-body">
            <p className="comments-kpi-label">Bình luận cần xem xét</p>
            <p className="comments-kpi-value dark">{flaggedCount}</p>
          </div>
        </article>

        <article className="comments-kpi-card">
          <div className="comments-kpi-icon soft">
            <MessagesSquare size={20} />
          </div>
          <div className="comments-kpi-body">
            <p className="comments-kpi-label">Tỷ lệ phản hồi</p>
            <p className="comments-kpi-value dark">{responseRate}%</p>
          </div>
        </article>
      </div>

      <div className="admin-card comments-keywords-card">
        <div className="comments-keywords-head">
          <div>
            <h3>Quản lý từ khóa cấm</h3>
            <p>Dùng để đánh dấu và lọc các bình luận vi phạm theo từ khóa</p>
          </div>
          <span>{bannedKeywords.length} từ khóa</span>
        </div>

        <div className="comments-keywords-add-row">
          <input
            type="text"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Nhập từ khóa cấm..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddKeyword()
              }
            }}
          />
          <button type="button" onClick={handleAddKeyword}>
            <Plus size={15} />
            Thêm từ khóa
          </button>
        </div>

        <div className="comments-keywords-list">
          {keywordLoading ? (
            <p className="comments-keywords-empty">Đang tải từ khóa cấm...</p>
          ) : bannedKeywords.length === 0 ? (
            <p className="comments-keywords-empty">Chưa có từ khóa cấm nào</p>
          ) : (
            bannedKeywords.map((item) => (
              <div key={item.id} className="comments-keyword-chip">
                <span>{item.keyword}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteKeyword(item.id)}
                  disabled={deletingKeywordId === item.id}
                  aria-label={`Xóa từ khóa ${item.keyword}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="admin-card comments-search-card">
        <div className="comments-search-wrap">
          <Search size={16} />
          <input
            type="text"
            className="comments-search-input"
            placeholder="Tìm kiếm nội dung hoặc tác giả..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="comments-clear-btn"
              onClick={clearFilters}
               disabled={!search && !searchInput && !flaggedOnly}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="admin-card comments-table-card">
        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner" />
            <span>Đang tải bình luận...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="comments-empty-state">
            <MessageSquare size={48} opacity={0.25} />
            <p>
              {search ? `Không tìm thấy bình luận nào cho "${search}"` : 'Chưa có bình luận nào'}
            </p>
          </div>
        ) : (
          <div className="posts-table-wrap">
            <table className="admin-table comments-table">
              <thead>
                <tr>
                  <th className="comments-checkbox-col">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAllOnPage}
                      aria-label="Chọn tất cả bình luận trên trang"
                    />
                  </th>
                  <th>Người dùng</th>
                  <th>Nội dung bình luận</th>
                  <th>Bài viết</th>
                  <th>Lượt thích</th>
                  <th>Thời gian</th>
                  <th className="comments-actions-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {comments.map(comment => (
                  <tr
                    key={comment.id}
                    className={`comments-row ${comment.moderation.flagged ? 'is-flagged' : ''}`}
                  >
                    <td className="comments-checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedCommentIds.has(comment.id)}
                        onChange={() => toggleCommentSelection(comment.id)}
                        aria-label={`Chọn bình luận của ${comment.user.name}`}
                      />
                    </td>

                    {/* User */}
                    <td>
                      <div className="table-user">
                        <img
                          src={comment.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user.name}`}
                          alt={comment.user.name}
                        />
                        <div>
                          <div className="user-name">{comment.user.name}</div>
                          <div className="user-username">@{comment.user.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Comment content */}
                    <td className="comments-content-col">
                      <p className="comments-content-text">
                        {comment.content}
                      </p>
                      {comment.moderation.matchedKeywords.length > 0 && (
                        <div className="comments-match-tags">
                          {comment.moderation.matchedKeywords.map((keyword) => (
                            <span key={`${comment.id}-${keyword}`}>{keyword}</span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Post */}
                    <td className="comments-post-col">
                      {comment.post ? (
                        <a
                          href={`/post/${comment.post.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="comments-post-link"
                          title={comment.post.content}
                        >
                          <ExternalLink size={13} />
                          <span>
                            {comment.post.content || '(Bài viết không có text)'}
                          </span>
                        </a>
                      ) : (
                        <span className="comments-post-empty">—</span>
                      )}
                    </td>

                    <td>
                      <span className={`comments-like-pill ${comment.likesCount === 0 ? 'is-zero' : ''}`}>
                        <Heart size={13} />
                        {comment.likesCount}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="comments-time-cell">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                    </td>

                    {/* Actions */}
                    <td className="comments-actions-col">
                      <div className="action-btns comments-action-group">
                        <a
                          href={comment.post ? `/post/${comment.post.id}` : '#'}
                          target="_blank"
                          rel="noreferrer"
                          className={`action-btn view ${comment.post ? '' : 'disabled'}`}
                          aria-label="Xem bài viết chứa bình luận"
                          onClick={(event) => {
                            if (!comment.post) event.preventDefault()
                          }}
                          title="Xem bài viết"
                        >
                          <Eye size={14} />
                        </a>
                        <button
                          type="button"
                          className="action-btn"
                          title="Ẩn bình luận (sắp ra mắt)"
                          disabled
                        >
                          <EyeOff size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn danger"
                          onClick={() => handleDelete(comment)}
                          title="Xóa bình luận"
                        >
                          <Trash2 size={14} />
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
        <div className="pagination comments-pagination-wrap">
          <p className="comments-pagination-meta">
            Đang hiển thị <strong>{startIndex} - {endIndex}</strong> của <strong>{total}</strong> bình luận
          </p>

          <div className="comments-pagination-controls">
            <button
              type="button"
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-info">Trang {page} / {Math.max(totalPages, 1)}</span>
            <button
              type="button"
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <p className="comments-pagination-chip">Trang {page} / {Math.max(totalPages, 1)}</p>
        </div>
      </div>

      <div className="comments-bulk-bar">
        <p>Đã chọn {selectedCount} bình luận</p>
        <div className="comments-bulk-separator" />
        <div className="comments-bulk-actions">
          <button type="button" disabled>
            <EyeOff size={15} />
            Ẩn hàng loạt
          </button>
          <button type="button" onClick={handleBulkDelete} disabled={selectedCount === 0}>
            <Trash2 size={15} />
            Xóa hàng loạt
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminComments
