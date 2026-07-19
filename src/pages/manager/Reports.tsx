import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Banknote,
  CalendarCheck2,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  DoorOpen,
  Loader2,
  Package,
  ParkingSquare,
  RefreshCw,
  Timer,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'
import { formatCurrency } from '../../utils/pricing'
import { formatUtcToVietnamDateTime } from '../../utils/dateTime'
import type { ReactNode } from 'react'

/* ── colour palette ─────────────────────────────────────────── */
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

/* ── Types matching backend DTOs ─────────────────────────────── */
interface ApiRes<T = unknown> {
  isSuccess: boolean
  result?: T
  message?: string
}

interface ReportMetric {
  key: string
  label: string
  value: number
  unit: string
}

interface SeriesPoint {
  period: string
  count: number
  amount: number
}

interface Breakdown {
  name: string
  count: number
  amount: number
  percent: number
}

interface SummaryDTO {
  metrics: ReportMetric[]
  revenueSeries: SeriesPoint[]
  revenueByPaymentType: Breakdown[]
}

interface PaymentRow {
  paymentId: string
  paymentTime: string
  paymentType: string
  paymentMethod: string
  amount: number
  paymentStatus: string
}

interface RevenueDTO {
  totalRevenue: number
  successfulPaymentCount: number
  revenueSeries: SeriesPoint[]
  byPaymentType: Breakdown[]
  latestPayments: PaymentRow[]
}

interface SessionRow {
  sessionId: string
  licensePlate: string
  vehicleTypeName: string
  entryTime: string
  exitTime?: string
  status: string
}

interface OperationsDTO {
  sessionsByVehicleType: Breakdown[]
  reservationsByStatus: Breakdown[]
  latestSessions: SessionRow[]
}

/* ── Date helpers ────────────────────────────────────────────── */
function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

type Preset = 'today' | '7d' | '30d' | 'this-month' | 'last-month' | 'custom'

function presetDates(preset: Preset): { from: string; to: string } {
  const now = new Date()
  switch (preset) {
    case 'today':
      return { from: toDateStr(now), to: toDateStr(now) }
    case '7d':
      return { from: toDateStr(daysAgo(6)), to: toDateStr(now) }
    case '30d':
      return { from: toDateStr(daysAgo(29)), to: toDateStr(now) }
    case 'this-month':
      return { from: toDateStr(startOfMonth(now)), to: toDateStr(now) }
    case 'last-month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: toDateStr(first), to: toDateStr(last) }
    }
    default:
      return { from: toDateStr(daysAgo(29)), to: toDateStr(now) }
  }
}

const PRESET_LABELS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày qua' },
  { value: '30d', label: '30 ngày qua' },
  { value: 'this-month', label: 'Tháng này' },
  { value: 'last-month', label: 'Tháng trước' },
  { value: 'custom', label: 'Tùy chỉnh' },
]

/* ── Metric icon lookup ──────────────────────────────────────── */
const METRIC_ICONS: Record<string, ReactNode> = {
  totalRevenue: <Banknote size={22} />,
  successfulPayments: <CreditCard size={22} />,
  entries: <DoorOpen size={22} />,
  exits: <DoorOpen size={22} />,
  activeSessions: <Activity size={22} />,
  completedSessions: <CheckCircle2 size={22} />,
  averageParkingMinutes: <Timer size={22} />,
  reservations: <CalendarCheck2 size={22} />,
  newSubscriptions: <Package size={22} />,
  activeSubscriptions: <Package size={22} />,
  expiredSubscriptions: <Package size={22} />,
  expiringSubscriptions: <Clock3 size={22} />,
  openIncidents: <Activity size={22} />,
  resolvedIncidents: <CheckCircle2 size={22} />,
  slotUtilizationRate: <ParkingSquare size={22} />,
}

function metricDisplayValue(m: ReportMetric) {
  if (m.unit === 'VND') return formatCurrency(m.value)
  if (m.unit === '%') return `${m.value}%`
  return new Intl.NumberFormat('vi-VN').format(m.value)
}

/* ── Custom Recharts tooltip formatter ───────────────────────── */
function currencyTick(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

/* ── Main Component ──────────────────────────────────────────── */
export default function ManagerReports() {
  const defaults = presetDates('30d')
  const [preset, setPreset] = useState<Preset>('30d')
  const [fromDate, setFromDate] = useState(defaults.from)
  const [toDate, setToDate] = useState(defaults.to)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [summary, setSummary] = useState<SummaryDTO | null>(null)
  const [revenue, setRevenue] = useState<RevenueDTO | null>(null)
  const [operations, setOperations] = useState<OperationsDTO | null>(null)

  const fetchReports = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(null)
    const qs = `from=${from}&to=${to}`
    try {
      const [sumRes, revRes, opsRes] = await Promise.all([
        apiClient.get<ApiRes<SummaryDTO>>(`/reports/summary?${qs}`),
        apiClient.get<ApiRes<RevenueDTO>>(`/reports/revenue?${qs}`),
        apiClient.get<ApiRes<OperationsDTO>>(`/reports/operations?${qs}`),
      ])
      if (sumRes.isSuccess) setSummary(sumRes.result ?? null)
      if (revRes.isSuccess) setRevenue(revRes.result ?? null)
      if (opsRes.isSuccess) setOperations(opsRes.result ?? null)
      if (!sumRes.isSuccess && !revRes.isSuccess && !opsRes.isSuccess) {
        setError(sumRes.message || 'Không thể tải dữ liệu báo cáo.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports(fromDate, toDate)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePresetChange = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') {
      const d = presetDates(p)
      setFromDate(d.from)
      setToDate(d.to)
      fetchReports(d.from, d.to)
    }
  }

  const handleApply = () => {
    fetchReports(fromDate, toDate)
  }

  /* charts data */
  const revenueSeries = useMemo(
    () => summary?.revenueSeries ?? revenue?.revenueSeries ?? [],
    [summary, revenue],
  )

  const paymentTypePie = useMemo(
    () => summary?.revenueByPaymentType ?? revenue?.byPaymentType ?? [],
    [summary, revenue],
  )

  const vehicleTypeBars = useMemo(
    () => operations?.sessionsByVehicleType ?? [],
    [operations],
  )

  const reservationPie = useMemo(
    () => operations?.reservationsByStatus ?? [],
    [operations],
  )

  return (
    <ManagerPageShell activeItem="reports">
      <div className="staff-content-wrapper">
        <div className="staff-section">
          <h2>Báo cáo vận hành</h2>
          <p className="section-desc">
            Tổng hợp doanh thu, lượt xe, đặt chỗ và các chỉ số vận hành bãi đỗ xe.
          </p>

          {/* ── Toolbar ─────────────────────────────────────── */}
          <div className="toolbar-row card-panel" style={{ flexWrap: 'wrap' }}>
            <div className="form-field" style={{ margin: 0, flex: '1 1 140px', maxWidth: 180 }}>
              <label htmlFor="report-from">Từ ngày</label>
              <input
                id="report-from"
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPreset('custom') }}
              />
            </div>
            <div className="form-field" style={{ margin: 0, flex: '1 1 140px', maxWidth: 180 }}>
              <label htmlFor="report-to">Đến ngày</label>
              <input
                id="report-to"
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPreset('custom') }}
              />
            </div>
            <div className="form-field" style={{ margin: 0, flex: '1 1 140px', maxWidth: 180 }}>
              <label htmlFor="report-preset">Khoảng thời gian</label>
              <select
                id="report-preset"
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value as Preset)}
              >
                {PRESET_LABELS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-end', height: 'fit-content' }}
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? <><Loader2 size={16} className="spin" /> Đang tải...</> : <><TrendingUp size={16} /> Xem báo cáo</>}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ alignSelf: 'flex-end', height: 'fit-content' }}
              onClick={() => { handlePresetChange('30d') }}
              disabled={loading}
            >
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>

          {/* ── Error ────────────────────────────────────────── */}
          {error && (
            <div className="card-panel" style={{ color: 'var(--danger, #ef4444)', marginTop: '1rem' }}>
              {error}
            </div>
          )}

          {/* ── Loading ─────────────────────────────────────── */}
          {loading && !summary && (
            <div className="card-panel" style={{ textAlign: 'center', padding: '3rem 1rem', marginTop: '1.5rem' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu báo cáo...</p>
            </div>
          )}

          {/* ── Metrics Grid ────────────────────────────────── */}
          {summary && summary.metrics.length > 0 && (
            <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
              {summary.metrics.map((m) => (
                <article key={m.key} className="stat-card card-panel">
                  <div style={{ color: 'var(--blue-600)', marginBottom: '0.25rem' }}>
                    {METRIC_ICONS[m.key] ?? <Activity size={22} />}
                  </div>
                  <strong style={{ fontSize: '1.35rem' }}>{metricDisplayValue(m)}</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {m.label}
                  </span>
                </article>
              ))}
            </div>
          )}

          {/* ── Charts Row ──────────────────────────────────── */}
          {!loading && (revenueSeries.length > 0 || paymentTypePie.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '1.5rem',
                marginTop: '1.5rem',
              }}
            >
              {/* Bar Chart – Revenue Over Time */}
              {revenueSeries.length > 0 && (
                <div className="card-panel" style={{ padding: '1.25rem' }}>
                  <h3 className="panel-subtitle">Doanh thu theo ngày</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={currencyTick} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: unknown) => [formatCurrency(Number(value)), 'Doanh thu']}
                        labelFormatter={(label: unknown) => `Ngày: ${label}`}
                      />
                      <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie Chart – Revenue by Payment Type */}
              {paymentTypePie.length > 0 && (
                <div className="card-panel" style={{ padding: '1.25rem' }}>
                  <h3 className="panel-subtitle">Phân bổ doanh thu theo loại thanh toán</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentTypePie}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(props: PieLabelRenderProps) =>
                          `${props.name ?? ''}: ${((Number(props.percent) || 0) * 100).toFixed(1)}%`
                        }
                      >
                        {paymentTypePie.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => formatCurrency(Number(value))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Charts Row 2 – Operations ────────────────────── */}
          {!loading && (vehicleTypeBars.length > 0 || reservationPie.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '1.5rem',
                marginTop: '1.5rem',
              }}
            >
              {/* Bar Chart – Sessions by Vehicle Type */}
              {vehicleTypeBars.length > 0 && (
                <div className="card-panel" style={{ padding: '1.25rem' }}>
                  <h3 className="panel-subtitle">Lượt xe theo loại phương tiện</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vehicleTypeBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]}>
                        {vehicleTypeBars.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie Chart – Reservation Status */}
              {reservationPie.length > 0 && (
                <div className="card-panel" style={{ padding: '1.25rem' }}>
                  <h3 className="panel-subtitle">Trạng thái đặt chỗ</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reservationPie}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(props: PieLabelRenderProps) =>
                          `${props.name ?? ''}: ${((Number(props.percent) || 0) * 100).toFixed(1)}%`
                        }
                      >
                        {reservationPie.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Latest Payments Table ────────────────────────── */}
          {revenue && revenue.latestPayments && revenue.latestPayments.length > 0 && (
            <div className="card-panel table-wrap" style={{ marginTop: '1.5rem' }}>
              <h3 className="panel-subtitle">Thanh toán gần đây</h3>
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Mã thanh toán</th>
                    <th>Thời gian</th>
                    <th>Loại thanh toán</th>
                    <th>Phương thức</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.latestPayments.map((p) => (
                    <tr key={p.paymentId}>
                      <td><code style={{ fontSize: '0.8rem' }}>{p.paymentId.slice(0, 8)}…</code></td>
                      <td>{formatUtcToVietnamDateTime(p.paymentTime)}</td>
                      <td>{p.paymentType}</td>
                      <td>{p.paymentMethod}</td>
                      <td><strong>{formatCurrency(p.amount)}</strong></td>
                      <td>
                        <span className={`badge ${paymentStatusBadge(p.paymentStatus)}`}>
                          {p.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Latest Sessions Table ────────────────────────── */}
          {operations && operations.latestSessions && operations.latestSessions.length > 0 && (
            <div className="card-panel table-wrap" style={{ marginTop: '1.5rem' }}>
              <h3 className="panel-subtitle">Phiên gửi xe gần đây</h3>
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Loại xe</th>
                    <th>Thời gian vào</th>
                    <th>Thời gian ra</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.latestSessions.map((s) => (
                    <tr key={s.sessionId}>
                      <td><strong>{s.licensePlate}</strong></td>
                      <td>{s.vehicleTypeName || '—'}</td>
                      <td>{formatUtcToVietnamDateTime(s.entryTime)}</td>
                      <td>{s.exitTime ? formatUtcToVietnamDateTime(s.exitTime) : '—'}</td>
                      <td>
                        <span className={`badge ${sessionStatusBadge(s.status)}`}>
                          {sessionStatusLabel(s.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────── */}
          {!loading && !error && !summary && !revenue && !operations && (
            <div className="card-panel" style={{ textAlign: 'center', padding: '3rem 1rem', marginTop: '1.5rem' }}>
              <Car size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Không có dữ liệu trong khoảng thời gian này.</p>
            </div>
          )}
        </div>
      </div>
    </ManagerPageShell>
  )
}

/* ── Badge helpers ──────────────────────────────────────────── */
function paymentStatusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'success' || s === 'completed' || s === 'paid') return 'badge-paid'
  if (s === 'failed' || s === 'cancelled') return 'badge-cancelled'
  return 'badge-history-pending'
}

function sessionStatusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'badge-history-success'
  if (s === 'completed') return 'badge-history-neutral'
  if (s === 'cancelled') return 'badge-history-cancelled'
  return 'badge-history-pending'
}

function sessionStatusLabel(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'active') return '🟢 Đang gửi'
  if (s === 'completed') return '✅ Hoàn tất'
  if (s === 'cancelled') return 'Đã hủy'
  if (s === 'pending') return '🟡 Chờ xử lý'
  return status
}
