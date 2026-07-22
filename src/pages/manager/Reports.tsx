import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Banknote,
  BarChart3,
  CalendarCheck2,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  DoorOpen,
  Download,
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
import { toVietnamDateInput } from '../../utils/dateTime'
import type { ReactNode } from 'react'

/* ── colour palette ─────────────────────────────────────────── */
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

const REPORT_LABELS: Record<string, string> = {
  deposit: 'Tiền đặt cọc',
  checkoutfee: 'Phí gửi xe',
  subscriptionfee: 'Phí đăng ký gói tháng',
  subscriptionrenewal: 'Phí gia hạn gói tháng',
  payos: 'Chuyển khoản PayOS',
  cash: 'Tiền mặt',
  pending: 'Chờ xử lý',
  success: 'Thành công',
  successful: 'Thành công',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  confirmed: 'Đã xác nhận',
  modified: 'Đã điều chỉnh',
  checkedin: 'Đã vào bãi',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy',
  noshow: 'Không đến',
  active: 'Đang hoạt động',
  exception: 'Có sự cố',
  unknown: 'Chưa xác định',
}
function localizeReportLabel(value: string) {
  const key = (value || '').replace(/[\s_-]/g, '').toLowerCase()
  return REPORT_LABELS[key] ?? (value || 'Chưa xác định')
}

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

interface RevenueDTO {
  totalRevenue: number
  successfulPaymentCount: number
  revenueSeries: SeriesPoint[]
  byPaymentType: Breakdown[]
}

interface ReportTypeDTO {
  key: string
  name: string
  description: string
  supportedFormats: string[]
}

interface OperationsDTO {
  sessionsByVehicleType: Breakdown[]
  reservationsByStatus: Breakdown[]
}

/* ── Date helpers ────────────────────────────────────────────── */
function shiftCalendarDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

type Preset = 'today' | '7d' | '30d' | 'this-month' | 'last-month' | 'custom'

function presetDates(preset: Preset): { from: string; to: string } {
  const today = toVietnamDateInput()
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case '7d':
      return { from: shiftCalendarDate(today, -6), to: today }
    case '30d':
      return { from: shiftCalendarDate(today, -29), to: today }
    case 'this-month':
      return { from: `${today.slice(0, 7)}-01`, to: today }
    case 'last-month': {
      const last = shiftCalendarDate(`${today.slice(0, 7)}-01`, -1)
      return { from: `${last.slice(0, 7)}-01`, to: last }
    }
    default:
      return { from: shiftCalendarDate(today, -29), to: today }
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
  const [reportTypes, setReportTypes] = useState<ReportTypeDTO[]>([])
  const [exportType, setExportType] = useState('summary')
  const [exportFormat, setExportFormat] = useState('excel')
  const [exporting, setExporting] = useState(false)

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
    // Tải dữ liệu máy chủ khi mở trang báo cáo lần đầu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports(fromDate, toDate)
    apiClient.get<ApiRes<ReportTypeDTO[]>>('/reports/types')
      .then((response) => {
        if (response.isSuccess) setReportTypes(response.result ?? [])
      })
      .catch(() => setError('Không thể tải danh sách loại báo cáo.'))
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

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate, reportType: exportType, format: exportFormat })
      const file = await apiClient.download(`/reports/export?${params}`)
      const url = URL.createObjectURL(file.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể xuất báo cáo.')
    } finally {
      setExporting(false)
    }
  }

  /* charts data */
  const revenueSeries = useMemo(
    () => summary?.revenueSeries ?? revenue?.revenueSeries ?? [],
    [summary, revenue],
  )

  const paymentTypePie = useMemo(
    () => (summary?.revenueByPaymentType ?? revenue?.byPaymentType ?? []).map((item) => ({
      name: localizeReportLabel(item.name),
      count: item.count,
      amount: item.amount,
    })),
    [summary, revenue],
  )

  const vehicleTypeBars = useMemo(
    () => operations?.sessionsByVehicleType ?? [],
    [operations],
  )

  const reservationPie = useMemo(
    () => (operations?.reservationsByStatus ?? []).map((item) => ({
      name: localizeReportLabel(item.name),
      count: item.count,
      amount: item.amount,
    })),
    [operations],
  )

  return (
    <ManagerPageShell activeItem="reports">
      <div className="staff-content-wrapper manager-resource-page manager-report-page">
        <header className="manager-resource-header">
          <div className="manager-resource-title">
            <span className="manager-resource-icon manager-resource-icon--purple">
              <BarChart3 size={24} />
            </span>
            <div>
              <h2>Báo cáo vận hành</h2>
              <p>Tổng hợp doanh thu, lượt xe, đặt chỗ và các chỉ số vận hành bãi đỗ xe.</p>
            </div>
          </div>
          <div className="manager-header-actions"><button type="button" className="btn btn-outline" onClick={handleApply} disabled={loading}><RefreshCw size={17} className={loading ? 'spin' : ''} /> Làm mới</button></div>
        </header>

        <div className="staff-section">

          {/* ── Toolbar ─────────────────────────────────────── */}
          <div className="manager-report-toolbar card-panel">
            <div className="form-field">
              <label htmlFor="report-from">Từ ngày</label>
              <input
                id="report-from"
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPreset('custom') }}
              />
            </div>
            <div className="form-field">
              <label htmlFor="report-to">Đến ngày</label>
              <input
                id="report-to"
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPreset('custom') }}
              />
            </div>
            <div className="form-field">
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
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? <><Loader2 size={16} className="spin" /> Đang tải...</> : <><TrendingUp size={16} /> Xem báo cáo</>}
            </button>
            <div className="form-field">
              <label htmlFor="report-export-type">Loại xuất</label>
              <select id="report-export-type" value={exportType} onChange={(e) => setExportType(e.target.value)}>
                {(reportTypes.length ? reportTypes : [{ key: 'summary', name: 'Báo cáo tổng quan', description: '', supportedFormats: ['excel', 'pdf'] }]).map((type) => <option key={type.key} value={type.key}>{type.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="report-export-format">Định dạng</label>
              <select id="report-export-format" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                {(reportTypes.find((type) => type.key === exportType)?.supportedFormats ?? ['excel', 'pdf']).map((format) => <option key={format} value={format}>{format === 'pdf' ? 'PDF' : 'Excel/CSV'}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn-outline" onClick={() => void handleExport()} disabled={exporting || loading}>
              {exporting ? <><Loader2 size={16} className="spin" /> Đang xuất...</> : <><Download size={16} /> Xuất báo cáo</>}
            </button>
          </div>

          {/* ── Error ────────────────────────────────────────── */}
          {error && (
            <div className="manager-inline-error manager-report-message" role="alert">{error}</div>
          )}

          {/* ── Loading ─────────────────────────────────────── */}
          {loading && !summary && (
            <div className="card-panel manager-empty-state manager-report-message"><Loader2 size={32} className="spin" /><strong>Đang tải dữ liệu báo cáo...</strong></div>
          )}

          {/* ── Metrics Grid ────────────────────────────────── */}
          {summary && summary.metrics.length > 0 && (
            <div className="manager-report-metrics">
              {summary.metrics.map((m) => (
                <article key={m.key} className="manager-summary-card manager-report-metric">
                  <div className="manager-report-metric-icon">
                    {METRIC_ICONS[m.key] ?? <Activity size={22} />}
                  </div>
                  <strong>{metricDisplayValue(m)}</strong>
                  <span>{localizeReportLabel(m.label)}</span>
                </article>
              ))}
            </div>
          )}

          {/* ── Charts Row ──────────────────────────────────── */}
          {!loading && (revenueSeries.length > 0 || paymentTypePie.length > 0) && (
            <div className="manager-report-chart-grid">
              {/* Bar Chart – Revenue Over Time */}
              {revenueSeries.length > 0 && (
                <div className="card-panel manager-report-chart-card">
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
                <div className="card-panel manager-report-chart-card">
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
            <div className="manager-report-chart-grid">
              {/* Bar Chart – Sessions by Vehicle Type */}
              {vehicleTypeBars.length > 0 && (
                <div className="card-panel manager-report-chart-card">
                  <h3 className="panel-subtitle">Lượt xe theo loại phương tiện</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vehicleTypeBars}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: unknown) => [new Intl.NumberFormat('vi-VN').format(Number(value)), 'Số lượt']} />
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
                <div className="card-panel manager-report-chart-card">
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
                      <Tooltip formatter={(value: unknown) => [new Intl.NumberFormat('vi-VN').format(Number(value)), 'Số lượt']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────── */}
          {!loading && !error && !summary && !revenue && !operations && (
            <div className="card-panel manager-empty-state manager-report-message"><Car size={40} aria-hidden /><strong>Không có dữ liệu</strong><span>Không có dữ liệu trong khoảng thời gian này.</span></div>
          )}
        </div>
      </div>
    </ManagerPageShell>
  )
}
