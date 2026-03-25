import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image,
  Video,
  Filter,
  Download,
  Pencil,
  X,
  Loader2,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Plus,
} from 'lucide-react'
import adminService, { type AdminPost, type AdminPostDetail, type AdminUser } from '@/services/adminService'
import CustomSelect from '@/components/shared/CustomSelect'
import { EditPostModal } from '@/components/shared/EditPostModal'
import uploadService from '@/services/uploadService'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useSearchParams } from 'react-router-dom'

type MediaFilter = 'all' | 'image' | 'video' | 'text'
type PeriodFilter = 'all' | 'recent' | 'month'

const PAGE_SIZE = 10

const escapeCsv = (value: string | number | null | undefined) => {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  const escaped = normalized.replace(/"/g, '""')
  return `"${escaped}"`
}

const AdminPosts: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [loading, setLoading] = useState(true)

  const [selectedPost, setSelectedPost] = useState<AdminPostDetail | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingDetail, setEditingDetail] = useState(false)
  const [savingDetail, setSavingDetail] = useState(false)
  const [detailForm, setDetailForm] = useState({
    content: '',
    imageUrl: '',
    videoUrl: '',
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [authors, setAuthors] = useState<AdminUser[]>([])
  const [loadingAuthors, setLoadingAuthors] = useState(false)
  const [creatingPost, setCreatingPost] = useState(false)
  const [createForm, setCreateForm] = useState({
    userId: '',
    content: '',
    imageUrl: '',
    videoUrl: '',
  })

  // Create modal file states (previews + files)
  const [createSelectedImages, setCreateSelectedImages] = useState<File[]>([])
  const [createSelectedVideo, setCreateSelectedVideo] = useState<File | null>(null)
  const [createPreviewUrls, setCreatePreviewUrls] = useState<string[]>([])
  const [createVideoPreviewUrl, setCreateVideoPreviewUrl] = useState<string | null>(null)

  // Edit modal (external) state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const [editInitialContent, setEditInitialContent] = useState('')
  const [editInitialImages, setEditInitialImages] = useState('')
  const [editInitialVideo, setEditInitialVideo] = useState<string | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getPosts(page, PAGE_SIZE, search || undefined, mediaFilter)
      setPosts(data.posts)
      setTotal(data.total)
      setTotalPages(data.totalPages)

      if (data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages)
      }
    } catch {
      toast.error('Không thể tải danh sách bài viết')
    } finally {
      setLoading(false)
    }
  }, [page, search, mediaFilter])

  useEffect(() => { load() }, [load])

  const loadAuthors = useCallback(async () => {
    setLoadingAuthors(true)
    try {
      const data = await adminService.getUsers(1, 100)
      setAuthors(data.users)
      setCreateForm(prev => ({
        ...prev,
        userId: prev.userId || data.users[0]?.id || '',
      }))
    } catch {
      toast.error('Không thể tải danh sách tác giả')
    } finally {
      setLoadingAuthors(false)
    }
  }, [])

  useEffect(() => {
    if (showCreateModal && authors.length === 0 && !loadingAuthors) {
      loadAuthors()
    }
  }, [showCreateModal, authors.length, loadingAuthors, loadAuthors])

  // Cleanup previews when create modal closes
  useEffect(() => {
    if (!showCreateModal) {
      createPreviewUrls.forEach(url => URL.revokeObjectURL(url))
      setCreatePreviewUrls([])
      if (createVideoPreviewUrl) URL.revokeObjectURL(createVideoPreviewUrl)
      setCreateVideoPreviewUrl(null)
      setCreateSelectedImages([])
      setCreateSelectedVideo(null)
    }
  }, [showCreateModal])

  useEffect(() => {
    const urlSearch = (searchParams.get('search') || '').trim()
    const urlMedia = (searchParams.get('media') || 'all').trim()
    const urlPeriod = (searchParams.get('period') || 'all').trim()
    const nextMedia = ['all', 'image', 'video', 'text'].includes(urlMedia)
      ? (urlMedia as MediaFilter)
      : 'all'
    const nextPeriod = ['all', 'recent', 'month'].includes(urlPeriod)
      ? (urlPeriod as PeriodFilter)
      : 'all'

    let shouldResetPage = false

    if (urlSearch !== searchInput) {
      setSearchInput(urlSearch)
    }

    if (urlSearch !== search) {
      setSearch(urlSearch)
      shouldResetPage = true
    }

    if (nextMedia !== mediaFilter) {
      setMediaFilter(nextMedia)
      shouldResetPage = true
    }

    if (nextPeriod !== periodFilter) {
      setPeriodFilter(nextPeriod)
      shouldResetPage = true
    }

    if (shouldResetPage) {
      setPage(1)
    }
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleResetSearch = () => {
    setSearchInput('')
    setSearch('')
    setMediaFilter('all')
    setPeriodFilter('all')
    setPage(1)
  }

  const handleExport = () => {
    if (visiblePosts.length === 0) {
      toast.info('Không có dữ liệu để xuất')
      return
    }

    const header = ['ID', 'Tác giả', 'Username', 'Nội dung', 'Ảnh', 'Video', 'Likes', 'Comments', 'Shares', 'Thời gian tạo']
    const rows = visiblePosts.map(post => ([
      post.id,
      post.user.name,
      post.user.username,
      post.content,
      post.imageUrl || '',
      post.videoUrl || '',
      post._count.likes,
      post._count.comments,
      post._count.shares,
      post.createdAt,
    ]))

    const csv = [
      header.map(item => escapeCsv(item)).join(','),
      ...rows.map(row => row.map(item => escapeCsv(item)).join(',')),
    ].join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `admin-posts-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success('Đã xuất báo cáo CSV')
  }

  const openDetail = async (postId: string, startEdit = false) => {
    setShowDetail(true)
    setDetailLoading(true)
    setEditingDetail(false)

    try {
      const data = await adminService.getPostDetail(postId)
      setSelectedPost(data)
      setDetailForm({
        content: data.content || '',
        imageUrl: data.imageUrl || '',
        videoUrl: data.videoUrl || '',
      })
      setEditingDetail(startEdit)
    } catch {
      toast.error('Không thể tải chi tiết bài viết')
      setShowDetail(false)
      setSelectedPost(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    const openPostId = searchParams.get('openPost')
    if (!openPostId) return

    openDetail(openPostId).finally(() => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('openPost')
      setSearchParams(nextParams, { replace: true })
    })
    // This effect is URL-driven and should only run when quick search sets openPost.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams])

  const openEditModal = async (postId: string) => {
    setEditPostId(postId)
    setShowEditModal(true)
    try {
      const data = await adminService.getPostDetail(postId)
      setEditInitialContent(data.content || '')
      setEditInitialImages(data.imageUrl || '')
      setEditInitialVideo(data.videoUrl || undefined)
    } catch {
      toast.error('Không thể tải bài viết để chỉnh sửa')
      setShowEditModal(false)
      setEditPostId(null)
    }
  }

  const closeDetail = () => {
    setShowDetail(false)
    setSelectedPost(null)
    setEditingDetail(false)
    setSavingDetail(false)
  }

  const handleUpdatePost = async () => {
    if (!selectedPost) return

    const content = detailForm.content.trim()
    const imageUrl = detailForm.imageUrl.trim()
    const videoUrl = detailForm.videoUrl.trim()

    if (!content && !imageUrl && !videoUrl) {
      toast.error('Bài viết phải có nội dung hoặc media')
      return
    }

    setSavingDetail(true)
    try {
      const updated = await adminService.updatePost(selectedPost.id, {
        content,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
      })

      setSelectedPost(prev => prev ? ({ ...prev, ...updated }) : prev)
      setPosts(prev => prev.map(post => (post.id === updated.id ? { ...post, ...updated } : post)))
      setEditingDetail(false)
      toast.success('Đã cập nhật bài viết')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật bài viết')
    } finally {
      setSavingDetail(false)
    }
  }

  const handleDelete = async (post: AdminPost) => {
    if (!confirm('Bạn chắc chắn muốn xóa bài viết này?')) return
    try {
      await adminService.deletePost(post.id)
      toast.success('Đã xóa bài viết')

      if (showDetail && selectedPost?.id === post.id) {
        closeDetail()
      }

      if (posts.length === 1 && page > 1) {
        setPage(p => p - 1)
      } else {
        load()
      }
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    const userId = createForm.userId.trim()
    const content = createForm.content.trim()
    const imageUrlText = createForm.imageUrl.trim()
    const videoUrlText = createForm.videoUrl.trim()

    if (!userId) {
      toast.error('Vui lòng chọn tác giả')
      return
    }

    if (!content && !imageUrlText && !videoUrlText) {
      toast.error('Bài viết phải có nội dung hoặc media')
      return
    }

    setCreatingPost(true)
    try {
      // If files are selected, upload them first
      let finalImageUrl: string | undefined = undefined
      let finalVideoUrl: string | undefined = undefined

      if (createSelectedImages.length > 0) {
        const uploaded: string[] = []
        for (const img of createSelectedImages) {
          const url = await uploadService.uploadImage(img)
          uploaded.push(url)
        }
        finalImageUrl = uploaded.join(',')
      } else if (imageUrlText) {
        finalImageUrl = imageUrlText
      }

      if (createSelectedVideo) {
        finalVideoUrl = await uploadService.uploadVideo(createSelectedVideo)
      } else if (videoUrlText) {
        finalVideoUrl = videoUrlText
      }

      // If images exist, prefer images over video (mirror app logic)
      if (finalImageUrl) finalVideoUrl = undefined

      await adminService.createPost({
        userId,
        content,
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
      })

      toast.success('Tạo bài viết thành công')
      setShowCreateModal(false)
      setCreateForm(prev => ({
        userId: prev.userId,
        content: '',
        imageUrl: '',
        videoUrl: '',
      }))

      // cleanup previews
      createPreviewUrls.forEach(url => URL.revokeObjectURL(url))
      setCreatePreviewUrls([])
      if (createVideoPreviewUrl) URL.revokeObjectURL(createVideoPreviewUrl)
      setCreateVideoPreviewUrl(null)
      setCreateSelectedImages([])
      setCreateSelectedVideo(null)

      if (page !== 1) {
        setPage(1)
      } else {
        load()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo bài viết')
    } finally {
      setCreatingPost(false)
    }
  }

  const visiblePosts = useMemo(() => {
    if (periodFilter === 'all') return posts

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(startOfToday)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return posts.filter((post) => {
      const createdAt = new Date(post.createdAt)

      if (periodFilter === 'recent') {
        return createdAt >= sevenDaysAgo
      }

      return (
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth()
      )
    })
  }, [posts, periodFilter])

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const postsThisWeek = visiblePosts.filter(p => new Date(p.createdAt).getTime() >= weekAgo).length
  const mediaCount = visiblePosts.filter(p => !!p.imageUrl || !!p.videoUrl).length
  const likesTotal = visiblePosts.reduce((s, p) => s + (p._count?.likes || 0), 0)
  const showingCount = visiblePosts.length

  return (
    <div className="admin-page posts-page">
      <div className="editorial-header">
        <div>
          <h2 className="text-3xl font-extrabold">Quản lý bài viết</h2>
          <div className="editorial-sub">
            <span className="status-dot" />
            <span className="text-muted">Tổng cộng <strong>{total}</strong> bài viết · Đang hiển thị <strong>{showingCount}</strong></span>
          </div>
        </div>

        <div className="editorial-actions">
          <button className="posts-filter-btn cursor-pointer" type="button" onClick={handleResetSearch}>
            <Filter size={16} />
            <span>Đặt lại bộ lọc</span>
          </button>
          <button className="posts-export-btn cursor-pointer" type="button" onClick={handleExport}>
            <Download size={16} />
            Xuất báo cáo
          </button>
        </div>
      </div>

      <form className="posts-toolbar" onSubmit={handleSearch}>
        <div className="posts-search-wrap">
          <Search size={16} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo nội dung, tên hoặc username tác giả"
            className="posts-search-input"
          />
        </div>

        <CustomSelect
          options={[
            { label: 'Tất cả media', value: 'all' },
            { label: 'Chỉ ảnh', value: 'image' },
            { label: 'Chỉ video', value: 'video' },
            { label: 'Chỉ text', value: 'text' },
          ]}
          value={mediaFilter}
          onChange={(v) => { setMediaFilter(v as MediaFilter); setPage(1) }}
          className="posts-media-select"
        />

        <button type="submit" className="posts-search-btn cursor-pointer">
          Tìm kiếm
        </button>
      </form>

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
              {loading && (
                <tr>
                  <td colSpan={6} className="users-empty-row">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Đang tải danh sách bài viết...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && visiblePosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="users-empty-row">Không có bài viết phù hợp</td>
                </tr>
              )}

              {!loading && visiblePosts.map(post => (
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
                    <p className="text-[11px] text-slate-400 mt-1">ID: {post.id.slice(0, 8)}...</p>
                  </td>

                  <td className="px-6 py-5">
                    {!post.imageUrl && !post.videoUrl && (
                      <span className="text-sm text-slate-300">—</span>
                    )}

                    {post.imageUrl && (
                      <div className="inline-flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-lg text-orange-700 mr-2 mb-2">
                        <Image size={14} />
                        <span className="text-xs font-bold uppercase">Ảnh</span>
                      </div>
                    )}

                    {post.videoUrl && (
                      <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg text-blue-700">
                        <Video size={14} />
                        <span className="text-xs font-bold uppercase">Video</span>
                      </div>
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
                      <button
                        type="button"
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết"
                        onClick={() => openDetail(post.id)}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa bài viết"
                        onClick={() => openEditModal(post.id)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="p-2 text-error hover:bg-error/5 rounded-lg transition-colors cursor-pointer"
                        title="Xóa bài viết"
                        onClick={() => handleDelete(post)}
                      >
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
            <button className="p-2 rounded-lg bg-slate-100 text-slate-300 cursor-pointer disabled:cursor-not-allowed" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed" disabled={page >= totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <button className="floating-add-btn cursor-pointer" title="Tạo bài mới" type="button" onClick={() => setShowCreateModal(true)}>
        <Plus size={20} />
      </button>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content posts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo bài viết mới</h3>
              <button className="modal-close cursor-pointer" onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form className="modal-body posts-form" onSubmit={handleCreatePost}>
              <label className="posts-field">
                <span>Tác giả</span>
                <CustomSelect
                  options={authors.map((user) => ({ label: `${user.name} (@${user.username})`, value: user.id }))}
                  value={createForm.userId}
                  onChange={(v) => setCreateForm(prev => ({ ...prev, userId: v }))}
                  className="posts-input"
                  disabled={loadingAuthors || creatingPost}
                />
              </label>

              <label className="posts-field">
                <span>Nội dung</span>
                <textarea
                  value={createForm.content}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="posts-input"
                  placeholder="Nhập nội dung bài viết"
                  disabled={creatingPost}
                />
              </label>

              <label className="posts-field">
                <span>Ảnh</span>

                {(createPreviewUrls.length > 0) && (
                  <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2">
                    <div className={`grid gap-2 ${createPreviewUrls.length === 1 ? 'grid-cols-1' : createPreviewUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {createPreviewUrls.map((url, index) => (
                        <div key={`new-${index}`} className="relative rounded-lg overflow-hidden border aspect-square">
                          <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover bg-gray-100" />
                          <button
                            onClick={() => {
                              const newFiles = createSelectedImages.filter((_, i) => i !== index)
                              setCreateSelectedImages(newFiles)
                              URL.revokeObjectURL(createPreviewUrls[index])
                              const newUrls = createPreviewUrls.filter((_, i) => i !== index)
                              setCreatePreviewUrls(newUrls)
                            }}
                            className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-1.5 rounded-full shadow-lg transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Thêm ảnh / video</span>
                    <div className="flex gap-2">
                      {createSelectedImages.length < 10 && !createSelectedVideo && (
                        <label className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files || [])
                              if (files.length > 0 && !createSelectedVideo) {
                                const totalImages = createSelectedImages.length + files.length
                                if (totalImages > 10) {
                                  alert('Bạn chỉ có thể tải tối đa 10 ảnh')
                                  return
                                }
                                const newFiles = [...createSelectedImages, ...files].slice(0, 10)
                                setCreateSelectedImages(newFiles)
                                const newUrls = newFiles.map(file => URL.createObjectURL(file))
                                createPreviewUrls.forEach(url => URL.revokeObjectURL(url))
                                setCreatePreviewUrls(newUrls)
                              }
                            }}
                            className="hidden"
                          />
                          <Image size={18} />
                        </label>
                      )}

                      {createSelectedImages.length === 0 && !createSelectedVideo && (
                        <label className="cursor-pointer hover:bg-gray-100 p-2 rounded-full transition">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file && createSelectedImages.length === 0) {
                                const validation = uploadService.validateVideo(file)
                                if (!validation.valid) {
                                  alert(validation.error)
                                  return
                                }
                                setCreateSelectedVideo(file)
                                if (createVideoPreviewUrl) URL.revokeObjectURL(createVideoPreviewUrl)
                                setCreateVideoPreviewUrl(URL.createObjectURL(file))
                              }
                            }}
                            className="hidden"
                          />
                          <Video size={18} />
                        </label>
                      )}
                    </div>
                  </div>

                  {createSelectedImages.length >= 10 && (
                    <p className="text-xs text-gray-500 mt-2">Maximum 10 images reached</p>
                  )}
                </div>
              </label>
              {createVideoPreviewUrl && (
                <div className="max-h-[300px] overflow-hidden border rounded-lg p-2">
                  <div className="relative rounded-lg overflow-hidden">
                    <video
                      src={createVideoPreviewUrl}
                      controls
                      className="w-full max-h-[280px] object-contain bg-black"
                    />
                    <button
                      onClick={() => {
                        if (createVideoPreviewUrl) URL.revokeObjectURL(createVideoPreviewUrl)
                        setCreateSelectedVideo(null)
                        setCreateVideoPreviewUrl(null)
                      }}
                      className="absolute top-2 right-2 bg-white hover:bg-gray-100 p-1.5 rounded-full shadow-lg transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <label className="posts-field">
                <span>Image/Video URL (tùy chọn)</span>
                <input
                  value={createForm.imageUrl}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="posts-input"
                  placeholder="https://..."
                  disabled={creatingPost}
                />
              </label>

              <label className="posts-field">
                <span>Video URL (tùy chọn)</span>
                <input
                  value={createForm.videoUrl}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className="posts-input"
                  placeholder="https://..."
                  disabled={creatingPost}
                />
              </label>

              <div className="modal-footer-actions">
                <button type="button" className="modal-footer-btn subtle cursor-pointer" onClick={() => setShowCreateModal(false)} disabled={creatingPost}>
                  Hủy
                </button>
                <button type="submit" className="modal-footer-btn primary cursor-pointer" disabled={creatingPost || loadingAuthors}>
                  {creatingPost ? 'Đang tạo...' : 'Tạo bài viết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editPostId && (
        <EditPostModal
          postId={editPostId}
          initialContent={editInitialContent}
          initialImages={editInitialImages}
          initialVideo={editInitialVideo}
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setEditPostId(null) }}
          onUpdated={async () => {
            const id = editPostId
            setShowEditModal(false)
            setEditPostId(null)
            await load()
            if (selectedPost?.id === id && id) {
              openDetail(id)
            }
          }}
        />
      )}

      {showDetail && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content posts-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết bài viết</h3>
              <button className="modal-close cursor-pointer" onClick={closeDetail}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {detailLoading && (
                <div className="admin-loading !py-10">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Đang tải chi tiết bài viết...</span>
                </div>
              )}

              {!detailLoading && selectedPost && (
                <>
                  <div className="posts-detail-author">
                    <img
                      src={selectedPost.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedPost.user.name}`}
                      alt={selectedPost.user.name}
                      className="posts-detail-avatar"
                    />
                    <div>
                      <div className="font-extrabold text-base">{selectedPost.user.name}</div>
                      <div className="text-xs text-slate-500">@{selectedPost.user.username}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: true, locale: vi })}
                      </div>
                    </div>
                  </div>

                  <div className="posts-detail-stats">
                    <div><Heart size={14} /> {selectedPost._count.likes} likes</div>
                    <div><MessageCircle size={14} /> {selectedPost._count.comments} comments</div>
                    <div><Share2 size={14} /> {selectedPost._count.shares} shares</div>
                  </div>

                  {editingDetail ? (
                    <div className="posts-form">
                      <label className="posts-field">
                        <span>Nội dung</span>
                        <textarea
                          value={detailForm.content}
                          onChange={(e) => setDetailForm(prev => ({ ...prev, content: e.target.value }))}
                          rows={4}
                          className="posts-input"
                          disabled={savingDetail}
                        />
                      </label>

                      <label className="posts-field">
                        <span>Image URL</span>
                        <input
                          value={detailForm.imageUrl}
                          onChange={(e) => setDetailForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                          className="posts-input"
                          disabled={savingDetail}
                        />
                      </label>

                      <label className="posts-field">
                        <span>Video URL</span>
                        <input
                          value={detailForm.videoUrl}
                          onChange={(e) => setDetailForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                          className="posts-input"
                          disabled={savingDetail}
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="posts-detail-content">{selectedPost.content || 'Không có nội dung văn bản'}</div>

                      <div className="posts-detail-media-wrap">
                        {selectedPost.imageUrl && (
                          <img src={selectedPost.imageUrl} alt="post media" className="posts-detail-image" />
                        )}
                        {selectedPost.videoUrl && (
                          <video src={selectedPost.videoUrl} controls className="posts-detail-video" />
                        )}
                      </div>
                    </>
                  )}

                  <div className="posts-detail-grid">
                    <div>
                      <h4>Bình luận gần đây</h4>
                      {selectedPost.comments.length === 0 && <p className="posts-detail-empty">Chưa có bình luận</p>}
                      {selectedPost.comments.slice(0, 5).map(comment => (
                        <div className="posts-mini-item" key={comment.id}>
                          <strong>{comment.user.name}</strong>
                          <p>{comment.content}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4>Lượt thích gần đây</h4>
                      {selectedPost.likes.length === 0 && <p className="posts-detail-empty">Chưa có lượt thích</p>}
                      {selectedPost.likes.slice(0, 5).map(like => (
                        <div className="posts-mini-item" key={like.id}>
                          <strong>{like.user.name}</strong>
                          <p>{like.type}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="modal-footer-actions">
                    <button type="button" className="modal-footer-btn subtle cursor-pointer" onClick={closeDetail} disabled={savingDetail}>
                      Đóng
                    </button>

                    {!editingDetail && (
                      <button type="button" className="modal-footer-btn primary cursor-pointer" onClick={() => openEditModal(selectedPost.id)}>
                        Chỉnh sửa
                      </button>
                    )}

                    {editingDetail && (
                      <>
                        <button
                          type="button"
                          className="modal-footer-btn subtle cursor-pointer"
                          onClick={() => {
                            setEditingDetail(false)
                            setDetailForm({
                              content: selectedPost.content || '',
                              imageUrl: selectedPost.imageUrl || '',
                              videoUrl: selectedPost.videoUrl || '',
                            })
                          }}
                          disabled={savingDetail}
                        >
                          Hủy chỉnh sửa
                        </button>
                        <button type="button" className="modal-footer-btn primary cursor-pointer" onClick={handleUpdatePost} disabled={savingDetail}>
                          {savingDetail ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="modal-footer-btn cursor-pointer"
                      style={{ background: '#fef2f2', color: '#dc2626' }}
                      onClick={() => handleDelete(selectedPost)}
                      disabled={savingDetail}
                    >
                      Xóa bài viết
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPosts
