import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Trash2, ChevronLeft, ChevronRight, Play, Eye, Heart, MessageCircle, Share2, Film } from 'lucide-react'
import adminService, { type AdminReel } from '@/services/adminService'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

/* ─── Aspect-ratio detection ────────────────────────────────────────────────
   We detect the natural width/height of the thumbnail image and compute
   a CSS aspect-ratio string (e.g. "9/16", "1/1", "16/9") so every card
   renders at the correct shape instead of being cropped to a fixed ratio.
   ──────────────────────────────────────────────────────────────────────── */
type AspectClass =
  | 'ar-portrait-tall'   // 9:16  (1080×1920)
  | 'ar-portrait'        // 4:5   (1080×1350)
  | 'ar-square'          // 1:1   (1080×1080)
  | 'ar-portrait-short'  // 2:3   (1080×1620)
  | 'ar-landscape'       // 16:9  (1920×1080)
  | 'ar-landscape-wide'  // 1.91:1 or wider (1080×566)

function classifyRatio(w: number, h: number): AspectClass {
  if (w === 0 || h === 0) return 'ar-portrait-tall'
  const r = w / h
  if (r < 0.65) return 'ar-portrait-tall'
  if (r < 0.85) return 'ar-portrait'
  if (r < 1.15) return 'ar-square'
  if (r < 1.5)  return 'ar-portrait-short'  // wider but still portrait-ish (reuse name)
  if (r < 1.85) return 'ar-landscape'
  return 'ar-landscape-wide'
}

/* Pre-load image to measure dimensions */
function useImageAspect(src: string | null | undefined): AspectClass {
  const [cls, setCls] = useState<AspectClass>('ar-portrait-tall')

  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => setCls(classifyRatio(img.naturalWidth, img.naturalHeight))
    img.onerror = () => setCls('ar-portrait-tall')
    img.src = src
  }, [src])

  return cls
}

/* ─── Badge colours per ratio ────────────────────────────────────────────── */
const RATIO_LABEL: Record<AspectClass, string> = {
  'ar-portrait-tall':   '9:16',
  'ar-portrait':        '4:5',
  'ar-square':          '1:1',
  'ar-portrait-short':  '2:3',
  'ar-landscape':       '16:9',
  'ar-landscape-wide':  '1.91:1',
}

/* ─── Individual Reel Card ────────────────────────────────────────────────── */
const ReelCard: React.FC<{ reel: AdminReel; onDelete: (r: AdminReel) => void }> = ({ reel, onDelete }) => {
  const aspectCls = useImageAspect(reel.thumbnailUrl)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoAspect, setVideoAspect] = useState<AspectClass | null>(null)

  // If we have the actual video we can read dimensions directly
  const finalAspect = videoAspect ?? aspectCls

  return (
    <div className={`reel-card-v2 ${finalAspect}`}>
      {/* Thumbnail / video preview */}
      <div className="reel-thumb-v2">
        {reel.videoUrl ? (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            className="reel-video-v2"
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={e => {
              const v = e.currentTarget
              setVideoAspect(classifyRatio(v.videoWidth, v.videoHeight))
            }}
            onMouseEnter={e => e.currentTarget.play().catch(() => {})}
            onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
          />
        ) : reel.thumbnailUrl ? (
          <img src={reel.thumbnailUrl} alt="Reel thumbnail" className="reel-thumb-img-v2" />
        ) : (
          <div className="reel-no-thumb-v2">
            <Play size={36} />
          </div>
        )}

        {/* Overlays */}
        <div className="reel-overlay-v2">
          {/* Top-left: aspect ratio badge */}
          <span className="reel-ratio-badge">{RATIO_LABEL[finalAspect]}</span>
          {/* Top-right: delete button */}
          <button
            className="reel-delete-float"
            onClick={() => onDelete(reel)}
            title="Xóa reel"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Bottom stats strip */}
        <div className="reel-bottom-strip">
          <span className="reel-stat-pill"><Eye size={12} />{reel.views.toLocaleString('vi-VN')}</span>
          <span className="reel-stat-pill"><Heart size={12} />{reel._count.likes}</span>
          <span className="reel-stat-pill"><MessageCircle size={12} />{reel._count.comments}</span>
          {reel._count.shares > 0 && (
            <span className="reel-stat-pill"><Share2 size={12} />{reel._count.shares}</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="reel-meta-v2">
        <img
          src={reel.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${reel.user.name}`}
          alt={reel.user.name}
          className="reel-avatar-v2"
        />
        <div className="reel-meta-copy">
          <span className="reel-meta-name">{reel.user.name}</span>
          {reel.description && (
            <span className="reel-meta-desc">
              {reel.description.length > 50 ? reel.description.slice(0, 50) + '…' : reel.description}
            </span>
          )}
          <span className="reel-meta-time">
            {formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true, locale: vi })}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
const AdminReels: React.FC = () => {
  const [reels, setReels] = useState<AdminReel[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getReels(page, 12)
      setReels(data.reels)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      toast.error('Không thể tải danh sách reels')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (reel: AdminReel) => {
    if (!confirm(`Xóa reel của ${reel.user.name}?`)) return
    try {
      await adminService.deleteReel(reel.id)
      toast.success('Đã xóa reel')
      load()
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  return (
    <div className="admin-page">
      <div className="page-header reels-page-header">
        <div>
          <h1 className="page-title">Quản lý Reels</h1>
          <p className="page-subtitle">
            Tổng cộng <strong>{total}</strong> reels · Grid tự động theo tỷ lệ khung hình gốc
          </p>
        </div>
        <div className="reels-legend">
          {(['ar-portrait-tall','ar-portrait','ar-square','ar-landscape','ar-landscape-wide'] as AspectClass[]).map(cls => (
            <span key={cls} className={`reels-legend-chip ${cls}`}>{RATIO_LABEL[cls]}</span>
          ))}
        </div>
      </div>

      <div className="admin-card reels-card-v2">
        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner" />
            <span>Đang tải reels...</span>
          </div>
        ) : reels.length === 0 ? (
          <div className="reels-empty-v2">
            <Film size={52} opacity={0.25} />
            <p>Chưa có reel nào</p>
          </div>
        ) : (
          <div className="reels-masonry">
            {reels.map(reel => (
              <ReelCard key={reel.id} reel={reel} onDelete={handleDelete} />
            ))}
          </div>
        )}

        <div className="pagination reels-pagination">
          <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span className="page-info">Trang {page} / {totalPages}</span>
          <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminReels
