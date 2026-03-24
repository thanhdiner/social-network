import React, { useEffect, useState } from 'react'
import {
  Film, MessageSquare, Heart,
  Activity,
  UserPlus,
  Download, Megaphone, Server, AlertTriangle,
} from 'lucide-react'
import adminService, { type AdminStats, type GrowthPoint } from '@/services/adminService'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

type MetricTone = 'blue' | 'violet' | 'rose' | 'indigo'

interface MetricCardProps {
  title: string
  value: string
  chip: string
  tone: MetricTone
  footerType: 'progress' | 'avatars' | 'note' | 'bars'
  footerText?: string
  progress?: number
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  chip,
  tone,
  footerType,
  footerText,
  progress,
}) => (
  <article className="metric-card">
    <p className="metric-title">{title}</p>
    <div className="metric-headline">
      <p className="metric-value">{value}</p>
      <span className={`metric-chip ${tone}`}>{chip}</span>
    </div>

    <div className="metric-footer">
      {footerType === 'progress' && (
        <div className="metric-progress">
          <span style={{ width: `${Math.max(8, Math.min(progress ?? 0, 100))}%` }} />
        </div>
      )}

      {footerType === 'avatars' && (
        <div className="metric-avatars-row">
          <div className="metric-avatars">
            <span className="avatar-dot one" />
            <span className="avatar-dot two" />
            <span className="avatar-dot three" />
          </div>
          <p className="metric-footer-text">{footerText}</p>
        </div>
      )}

      {footerType === 'note' && (
        <p className="metric-note">{footerText}</p>
      )}

      {footerType === 'bars' && (
        <div className="metric-bars-wrap">
          <div className="metric-bars" aria-hidden="true">
            <span style={{ height: '46%' }} />
            <span style={{ height: '74%' }} />
            <span style={{ height: '58%' }} />
            <span style={{ height: '86%' }} />
          </div>
          <p className="metric-footer-text">{footerText}</p>
        </div>
      )}
    </div>
  </article>
)

const formatCompact = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(value)
    .toUpperCase()

const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value}%`
}

const toActionLabel = (value: number) => {
  if (value >= 20) return 'Action'
  if (value >= 0) return 'Stable'
  return 'Drop'
}

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

const buildResponseRate = (stats: AdminStats | null) => {
  const totalUsers = stats?.totalUsers ?? 0
  const activeUsers = stats?.activeUsers ?? 0
  if (totalUsers === 0) return 0
  return Math.round((activeUsers / totalUsers) * 100)
}

const SecondaryMetric: React.FC<{ icon: React.ElementType; label: string; value: number }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="secondary-metric-pill">
    <Icon size={16} />
    <span>{label}</span>
    <strong>{value.toLocaleString('vi-VN')}</strong>
  </div>
)

// Simple bar chart using CSS flexbox
const BarChart: React.FC<{ data: GrowthPoint[] }> = ({ data }) => {
  const maxVal = Math.max(...data.flatMap(d => [d.users, d.posts]), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Bars area */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', gap: 2 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%' }}>
              <div
                style={{
                  flex: 1,
                  height: `${Math.max((d.users / maxVal) * 100, 2)}%`,
                  background: 'linear-gradient(to top, #f97316, #fb923c)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 4,
                  transition: 'height 0.6s ease',
                  cursor: 'pointer',
                }}
                title={`Users: ${d.users}`}
              />
              <div
                style={{
                  flex: 1,
                  height: `${Math.max((d.posts / maxVal) * 100, 2)}%`,
                  background: 'linear-gradient(to top, #0f172a, #334155)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 4,
                  transition: 'height 0.6s ease',
                  cursor: 'pointer',
                }}
                title={`Posts: ${d.posts}`}
              />
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {d.month}
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-end' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f97316', display: 'inline-block' }} />
          Người dùng
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#0f172a', display: 'inline-block' }} />
          Bài viết
        </span>
      </div>
    </div>
  )
}

const LegacyBarChart = BarChart

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [growth, setGrowth] = useState<GrowthPoint[]>([])
  const [activity, setActivity] = useState<{ recentUsers: any[]; recentPosts: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, g, a] = await Promise.all([
          adminService.getStats(),
          adminService.getGrowthChart(),
          adminService.getRecentActivity(),
        ])
        setStats(s)
        setGrowth(g)
        setActivity(a)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner" />
        <span>Đang tải dữ liệu...</span>
      </div>
    )
  }

  const usersGrowth = stats?.usersGrowth ?? 0
  const postGrowth = stats?.postsGrowth ?? 0
  const activeRate = buildResponseRate(stats)
  const totalPosts = stats?.totalPosts ?? 0
  const activeUsers = stats?.activeUsers ?? 0
  const newUsersThisMonth = stats?.newUsersThisMonth ?? 0
  const newPostsThisMonth = stats?.newPostsThisMonth ?? 0

  const engagementRate = clamp(Math.round((stats?.totalLikes ?? 0) / Math.max((stats?.totalPosts ?? 1), 1)), 12, 96)
  const userProgress = clamp(activeRate, 12, 100)
  const postProgress = clamp(Math.round((newPostsThisMonth / Math.max(totalPosts, 1)) * 100), 8, 100)

  return (
    <div className="admin-dashboard">
      <section className="executive-header">
        <div>
          <h1 className="page-title">Executive Overview</h1>
          <p className="page-subtitle">Real-time metrics for social network operations</p>
        </div>
        <div className="executive-actions">
          <button type="button" className="btn-subtle-action">
            <Download size={16} />
            Export Report
          </button>
          <button type="button" className="btn-primary-action">
            <Megaphone size={16} />
            Create Announcement
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="stats-grid">
        <MetricCard
          title="Total Users"
          value={formatCompact(stats?.totalUsers ?? 0)}
          chip={usersGrowth >= 0 ? `↗${Math.abs(usersGrowth)}%` : `↘${Math.abs(usersGrowth)}%`}
          tone="blue"
          footerType="progress"
          progress={userProgress}
        />
        <MetricCard
          title="Active Accounts"
          value={formatCompact(activeUsers)}
          chip={`${activeRate}% active`}
          tone="violet"
          footerType="avatars"
          footerText={`+${newUsersThisMonth} new users this month`}
        />
        <MetricCard
          title="Total Posts"
          value={formatCompact(totalPosts)}
          chip={`+${newPostsThisMonth} this month`}
          tone="rose"
          footerType="progress"
          progress={postProgress}
        />
        <MetricCard
          title="Posts MoM Growth"
          value={formatPercent(postGrowth)}
          chip={`△${toActionLabel(Math.abs(postGrowth))}`}
          tone="indigo"
          footerType="bars"
          footerText={`${engagementRate}% efficiency`}
        />
      </div>

      <div className="secondary-metrics-grid">
        <SecondaryMetric icon={Film} label="Total Reels" value={stats?.totalReels ?? 0} />
        <SecondaryMetric icon={MessageSquare} label="Total Comments" value={stats?.totalComments ?? 0} />
        <SecondaryMetric icon={Heart} label="Total Likes" value={stats?.totalLikes ?? 0} />
      </div>

      {/* Charts & Activity */}
      <div className="dashboard-grid">
        {/* Growth Chart */}
        <div className="admin-card chart-card">
          <div className="card-header">
            <h2 className="card-title">
              <Activity size={20} />
              Users & Posts Growth
            </h2>
          </div>
          <LegacyBarChart data={growth} />
        </div>

        {/* System Health */}
        <div className="admin-health-card">
          <div className="card-header">
            <h2 className="card-title health-title">
              <Server size={20} />
              System Health
            </h2>
          </div>
          <div className="health-stack">
            <div className="health-box">
              <div>
                <p className="health-caption">Edge Server Status</p>
                <p className="health-value ok">Operational</p>
              </div>
              <span className="health-dot" />
            </div>
            <div className="health-box simple">
              <p className="health-caption">New Posts This Month</p>
              <p className="health-number">{newPostsThisMonth.toLocaleString('vi-VN')}</p>
            </div>
            <div className="health-mini-grid">
              <div>
                <p className="health-caption">Total Posts</p>
                <p className="health-number-sm">{totalPosts.toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <p className="health-caption">Total Comments</p>
                <p className="health-number-sm">{(stats?.totalComments ?? 0).toLocaleString('vi-VN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Insights */}
      <div className="insights-grid">
        <div className="admin-card">
          <div className="card-header">
            <h2 className="card-title">
              <AlertTriangle size={20} />
              Latest Posts Queue
            </h2>
          </div>
          <div className="recent-list">
            {activity?.recentPosts.slice(0, 4).map((p: any) => (
              <div key={p.id} className="recent-item moderation-item">
                <img
                  src={p.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${p.user.name}`}
                  alt={p.user.name}
                  className="recent-avatar"
                />
                <div className="recent-info">
                  <div className="recent-name">{p.user.name}</div>
                  <div className="recent-meta">
                    {p.content?.slice(0, 70)}{p.content?.length > 70 ? '...' : ''}
                  </div>
                </div>
                <button type="button" className="review-btn">Open</button>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="card-header">
            <h2 className="card-title">
              <UserPlus size={20} />
              Newest Residents
            </h2>
          </div>
          <div className="posts-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {activity?.recentUsers.slice(0, 5).map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-user">
                        <img
                          src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                          alt={u.name}
                        />
                        <div>
                          <div className="user-name">{u.name}</div>
                          <div className="user-username">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-gray">{u.role || 'user'}</span></td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                        {u.isActive ? 'Active' : 'Locked'}
                      </span>
                    </td>
                    <td className="text-muted">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: vi })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
