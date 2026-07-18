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
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
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
import { motion, AnimatePresence } from 'framer-motion'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'
import { formatCurrency } from '../../utils/pricing'
import { formatUtcToVietnamDateTime, formatUtcToVietnamDate } from '../../utils/dateTime'
import './Reports.css'

/* ── Color Palette ──────────────────────────────────────────── */
const CHART_COLORS = ['#2563eb', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#94a3b8']

/* ── Vietnamese Translation Maps ────────────────────────────── */
const METRIC_LABELS: Record<string, string> = {
  totalRevenue: 'Tổng doanh thu',
  successfulPayments: 'Số thanh toán thành công',
  entries: 'Lượt xe vào',
  exits: 'Lượt xe ra',
  activeSessions: 'Phiên đang gửi',
  completedSessions: 'Phiên hoàn tất',
  averageParkingMinutes: 'Thời gian gửi trung bình',
  reservations: 'Lượt đặt chỗ',
  newSubscriptions: 'Gói tháng tạo mới',
  activeSubscriptions: 'Gói tháng đang hoạt động',
  expiredSubscriptions: 'Gói tháng hết hạn',
  expiringSubscriptions: 'Gói tháng sắp hết hạn 7 ngày',
  slotUtilizationRate: 'Tỷ lệ sử dụng chỗ đỗ',
  openIncidents: 'Sự cố đang mở',
  resolvedIncidents: 'Sự cố đã xử lý trong kỳ',
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  SubscriptionFee: 'Mua gói',
  SubscriptionRenewal: 'Gia hạn',
  Deposit: 'Đặt trước',
  CheckoutFee: 'Check-out',
  subscriptionfee: 'Mua gói',
  subscriptionrenewal: 'Gia hạn',
  deposit: 'Đặt trước',
  checkoutfee: 'Check-out',
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  Car: 'Ô tô',
  Motorbike: 'Xe máy',
  SUV: 'SUV',
  Bicycle: 'Xe đạp',
  Truck: 'Xe tải',
  car: 'Ô tô',
  motorbike: 'Xe máy',
  suv: 'SUV',
  bicycle: 'Xe đạp',
  truck: 'Xe tải',
}

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  Pending: 'Đang chờ',
  Confirmed: 'Đã xác nhận',
  CheckedIn: 'Đã nhận chỗ',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  NoShow: 'Không đến',
  Active: 'Đang hoạt động',
  pending: 'Đang chờ',
  confirmed: 'Đã xác nhận',
  checkedin: 'Đã nhận chỗ',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  noshow: 'Không đến',
  active: 'Đang hoạt động',
}

function translatePaymentType(name: string): string {
  return PAYMENT_TYPE_LABELS[name] ?? PAYMENT_TYPE_LABELS[name.toLowerCase()] ?? name
}

function translateVehicleType(name: string): string {
  return VEHICLE_TYPE_LABELS[name] ?? VEHICLE_TYPE_LABELS[name.toLowerCase()] ?? name
}

function translateReservationStatus(name: string): string {
  return RESERVATION_STATUS_LABELS[name] ?? RESERVATION_STATUS_LABELS[name.toLowerCase()] ?? name
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
  period: string;
  count: number;
  amount: number;
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
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

/* ── Currency tick formatter for YAxis ───────────────────────── */
function currencyTick(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}Mđ`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}Kđ`
  return `${value}đ`
}

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

  // Expandable cards state (default to collapsed/false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    revenue: false,
    traffic: false,
    subscriptions: false,
    incidents: false,
  })

  const toggleCard = (cardKey: string) => {
    setExpanded((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }))
  }

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

  /* ── Data Mapping Helpers ──────────────────────────────────── */
  const metricsMap = useMemo(() => {
    if (!summary || !summary.metrics) return {} as Record<string, ReportMetric>
    return summary.metrics.reduce((acc, m) => {
      acc[m.key] = m
      return acc
    }, {} as Record<string, ReportMetric>)
  }, [summary])

  const getMetricValue = (key: string, defaultValue: number = 0): number => {
    return metricsMap[key]?.value ?? defaultValue
  }

  // Raw breakdown data
  const paymentTypePie = useMemo(
    () => summary?.revenueByPaymentType ?? revenue?.byPaymentType ?? [],
    [summary, revenue],
  )

  const paymentTypeMap = useMemo(() => {
    const map: Record<string, number> = {}
    paymentTypePie.forEach((item) => {
      map[item.name.toLowerCase()] = item.amount
    })
    return map
  }, [paymentTypePie])

  const getPaymentTypeAmount = (nameKey: string): number => {
    return paymentTypeMap[nameKey.toLowerCase()] ?? 0
  }

  /* ── Charts Data Prep with Translations ────────────────────── */
  const formattedRevenueSeries = useMemo(() => {
    const raw = summary?.revenueSeries ?? revenue?.revenueSeries ?? []
    return raw.map((item) => ({
      ...item,
      formattedDate: formatUtcToVietnamDate(item.period),
    }))
  }, [summary, revenue])

  // Translate labels and values completely inside the data object for reliability
  const translatedPaymentTypePie = useMemo(() => {
    return paymentTypePie.map((item) => {
      const translatedName = translatePaymentType(item.name)
      return {
        ...item,
        name: translatedName,
        displayName: translatedName,
      }
    })
  }, [paymentTypePie])

  const vehicleTypeBars = useMemo(
    () => operations?.sessionsByVehicleType ?? [],
    [operations],
  )

  const translatedVehicleTypeBars = useMemo(() => {
    return vehicleTypeBars.map((item) => {
      const translatedName = translateVehicleType(item.name)
      return {
        ...item,
        name: translatedName,
        displayName: translatedName,
      }
    })
  }, [vehicleTypeBars])

  const reservationPie = useMemo(
    () => operations?.reservationsByStatus ?? [],
    [operations],
  )

  const translatedReservationPie = useMemo(() => {
    return reservationPie.map((item) => {
      const translatedName = translateReservationStatus(item.name)
      return {
        ...item,
        name: translatedName,
        displayName: translatedName,
      }
    })
  }, [reservationPie])

  return (
    <ManagerPageShell activeItem="reports">
      <div className="reports-dashboard">
        
        {/* ── Title Header ────────────────────────────────────── */}
        <div className="staff-section">
          <h2>Báo cáo vận hành</h2>
          <p className="section-desc">
            Phân tích chuyên sâu doanh thu, phiên đỗ xe và hiệu suất hoạt động hệ thống.
          </p>
        </div>

        {/* ── Filter Toolbar ──────────────────────────────────── */}
        <section className="reports-toolbar">
          <div className="reports-form-field">
            <label htmlFor="report-from">Từ ngày</label>
            <input
              id="report-from"
              type="date"
              className="reports-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPreset('custom')
              }}
            />
          </div>
          <div className="reports-form-field">
            <label htmlFor="report-to">Đến ngày</label>
            <input
              id="report-to"
              type="date"
              className="reports-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPreset('custom')
              }}
            />
          </div>
          <div className="reports-form-field">
            <label htmlFor="report-preset">Khoảng thời gian</label>
            <select
              id="report-preset"
              className="reports-select"
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as Preset)}
            >
              {PRESET_LABELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="reports-actions-group">
            <button
              type="button"
              className="reports-btn reports-btn-primary"
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="reports-loader-spin" /> Đang tải...
                </>
              ) : (
                <>
                  <TrendingUp size={16} /> Xem báo cáo
                </>
              )}
            </button>
            <button
              type="button"
              className="reports-btn reports-btn-ghost"
              onClick={() => handlePresetChange('30d')}
              disabled={loading}
            >
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </section>

        {/* ── Error Notification ──────────────────────────────── */}
        {error && (
          <div className="state-container" style={{ borderColor: '#fca5a5', color: '#b91c1c' }}>
            <p className="state-title">Đã xảy ra lỗi</p>
            <p>{error}</p>
          </div>
        )}

        {/* ── Loading Overlay ─────────────────────────────────── */}
        {loading && !summary && (
          <div className="state-container">
            <Loader2 size={32} className="reports-loader-spin" style={{ color: '#2563eb' }} />
            <p className="state-title">Đang tổng hợp dữ liệu báo cáo...</p>
          </div>
        )}

        {/* ── CRM style Expandable Cards Grid ─────────────────── */}
        {summary && (
          <section className="crm-cards-grid">
            
            {/* Card A: Tổng doanh thu */}
            <article className="crm-card">
              <div className="crm-card-header" onClick={() => toggleCard('revenue')}>
                <div className="crm-header-left">
                  <div className="crm-icon-wrapper accent-revenue">
                    <Banknote size={18} />
                  </div>
                  <div className="crm-header-info">
                    <span className="crm-card-label">Tổng doanh thu</span>
                    <strong className="crm-card-value">
                      {formatCurrency(getMetricValue('totalRevenue'))}
                    </strong>
                  </div>
                </div>
                <div className="crm-header-right">
                  {expanded.revenue ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              <AnimatePresence initial={false}>
                {expanded.revenue && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="crm-card-details">
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Doanh thu mua gói</span>
                        <span className="crm-detail-value">
                          {formatCurrency(getPaymentTypeAmount('SubscriptionFee'))}
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Doanh thu gia hạn gói</span>
                        <span className="crm-detail-value">
                          {formatCurrency(getPaymentTypeAmount('SubscriptionRenewal'))}
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Doanh thu đặt trước</span>
                        <span className="crm-detail-value">
                          {formatCurrency(getPaymentTypeAmount('Deposit'))}
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Doanh thu check-out</span>
                        <span className="crm-detail-value">
                          {formatCurrency(getPaymentTypeAmount('CheckoutFee'))}
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Số thanh toán thành công</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('successfulPayments'))} lượt
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>

            {/* Card B: Tổng lượt ra vào */}
            <article className="crm-card">
              <div className="crm-card-header" onClick={() => toggleCard('traffic')}>
                <div className="crm-header-left">
                  <div className="crm-icon-wrapper accent-traffic">
                    <DoorOpen size={18} />
                  </div>
                  <div className="crm-header-info">
                    <span className="crm-card-label">Tổng lượt ra vào</span>
                    <strong className="crm-card-value">
                      {new Intl.NumberFormat('vi-VN').format(getMetricValue('entries') + getMetricValue('exits'))} lượt
                    </strong>
                  </div>
                </div>
                <div className="crm-header-right">
                  {expanded.traffic ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              <AnimatePresence initial={false}>
                {expanded.traffic && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="crm-card-details">
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Lượt xe vào</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('entries'))} lượt
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Lượt xe ra</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('exits'))} lượt
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Phiên đang gửi</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('activeSessions'))} phiên
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Phiên hoàn tất</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('completedSessions'))} phiên
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Thời gian gửi trung bình</span>
                        <span className="crm-detail-value">
                          {Math.round(getMetricValue('averageParkingMinutes'))} phút
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Lượt đặt chỗ</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('reservations'))} lượt
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>

            {/* Card C: Các gói đang hoạt động */}
            <article className="crm-card">
              <div className="crm-card-header" onClick={() => toggleCard('subscriptions')}>
                <div className="crm-header-left">
                  <div className="crm-icon-wrapper accent-subscriptions">
                    <Package size={18} />
                  </div>
                  <div className="crm-header-info">
                    <span className="crm-card-label">Gói đang hoạt động</span>
                    <strong className="crm-card-value">
                      {new Intl.NumberFormat('vi-VN').format(getMetricValue('activeSubscriptions'))} gói
                    </strong>
                  </div>
                </div>
                <div className="crm-header-right">
                  {expanded.subscriptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              <AnimatePresence initial={false}>
                {expanded.subscriptions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="crm-card-details">
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Gói tháng tạo mới</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('newSubscriptions'))} gói
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Gói tháng đang hoạt động</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('activeSubscriptions'))} gói
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Gói tháng hết hạn</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('expiredSubscriptions'))} gói
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Gói tháng sắp hết hạn</span>
                        <span className="crm-detail-value">
                          {new Intl.NumberFormat('vi-VN').format(getMetricValue('expiringSubscriptions'))} gói
                        </span>
                      </div>
                      <div className="crm-detail-item">
                        <span className="crm-detail-label">Tỷ lệ sử dụng chỗ đỗ</span>
                        <span className="crm-detail-value">
                          {getMetricValue('slotUtilizationRate')}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>

            {/* Card D: Sự cố đang mở */}
            <article className="crm-card">
              <div className="crm-card-header" onClick={() => toggleCard('incidents')}>
                <div className="crm-header-left">
                  <div className="crm-icon-wrapper accent-incidents">
                    <Activity size={18} />
                  </div>
                  <div className="crm-header-info">
                    <span className="crm-card-label">Sự cố đang mở</span>
                    <strong className="crm-card-value">
                      {new Intl.NumberFormat('vi-VN').format(getMetricValue('openIncidents'))} sự cố
                    </strong>
                  </div>
                </div>
                <div className="crm-header-right">
                  {expanded.incidents ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              <AnimatePresence initial={false}>
                {expanded.incidents && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="crm-card-details">
                      {getMetricValue('openIncidents') === 0 && getMetricValue('resolvedIncidents') === 0 ? (
                        <div className="crm-empty-incidents">Không có sự cố trong kỳ này.</div>
                      ) : (
                        <>
                          <div className="crm-detail-item">
                            <span className="crm-detail-label">Sự cố đang mở</span>
                            <span className="crm-detail-value" style={{ color: '#e11d48' }}>
                              {getMetricValue('openIncidents')} sự cố
                            </span>
                          </div>
                          <div className="crm-detail-item">
                            <span className="crm-detail-label">Sự cố đã xử lý trong kỳ</span>
                            <span className="crm-detail-value" style={{ color: '#10b981' }}>
                              {getMetricValue('resolvedIncidents')} sự cố
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>

          </section>
        )}

        {/* ── Charts Grid Section ────────────────────────────── */}
        {!loading && (
          <section className="charts-grid">
            
            {/* Chart 1: Doanh thu theo ngày (Bar Chart) */}
            <div className="chart-card">
              <h3 className="chart-title">Doanh thu theo ngày</h3>
              {formattedRevenueSeries.length === 0 ? (
                <div className="state-container" style={{ minHeight: 260, border: 'none', padding: 0 }}>
                  <TrendingUp size={24} style={{ color: '#94a3b8' }} />
                  <p className="state-title" style={{ fontSize: '12px' }}>Không có dữ liệu doanh thu</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedRevenueSeries} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fontSize: 12, fill: '#64748b', angle: -20, textAnchor: 'end' }}
                        axisLine={false}
                        tickLine={false}
                        height={50}
                        minTickGap={25}
                      />
                      <YAxis
                        tickFormatter={currencyTick}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value: unknown) => [formatCurrency(Number(value)), 'Doanh thu']}
                        labelFormatter={(label: unknown) => `Ngày: ${label}`}
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} name="Doanh thu" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Phân bổ doanh thu theo loại thanh toán (Pie Donut) */}
            <div className="chart-card">
              <h3 className="chart-title">Phân bổ doanh thu theo loại thanh toán</h3>
              {translatedPaymentTypePie.length === 0 ? (
                <div className="state-container" style={{ minHeight: 260, border: 'none', padding: 0 }}>
                  <CreditCard size={24} style={{ color: '#94a3b8' }} />
                  <p className="state-title" style={{ fontSize: '12px' }}>Không có dữ liệu phân bổ thanh toán</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={translatedPaymentTypePie}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {translatedPaymentTypePie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown) => [formatCurrency(Number(value)), 'Tổng tiền']}
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                      />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 3: Lượt xe theo loại phương tiện (Bar Chart) */}
            <div className="chart-card">
              <h3 className="chart-title chart-title-purple">Lượt xe theo loại phương tiện</h3>
              {translatedVehicleTypeBars.length === 0 ? (
                <div className="state-container" style={{ minHeight: 260, border: 'none', padding: 0 }}>
                  <Car size={24} style={{ color: '#94a3b8' }} />
                  <p className="state-title" style={{ fontSize: '12px' }}>Không có dữ liệu lượt xe</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={translatedVehicleTypeBars} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="displayName"
                        tick={{ fontSize: 12, fill: '#64748b', angle: -20, textAnchor: 'end' }}
                        axisLine={false}
                        tickLine={false}
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value: unknown) => [value, 'Lượt xe']}
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={28} name="Lượt xe">
                        {translatedVehicleTypeBars.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 4: Trạng thái đặt chỗ (Pie Chart) */}
            <div className="chart-card">
              <h3 className="chart-title chart-title-purple">Trạng thái đặt chỗ</h3>
              {translatedReservationPie.length === 0 ? (
                <div className="state-container" style={{ minHeight: 260, border: 'none', padding: 0 }}>
                  <CalendarCheck2 size={24} style={{ color: '#94a3b8' }} />
                  <p className="state-title" style={{ fontSize: '12px' }}>Không có dữ liệu đặt chỗ</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={translatedReservationPie}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {translatedReservationPie.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown) => [value, 'Số lượng']}
                        contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                      />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </section>
        )}

        {/* ── Latest Payments Table ──────────────────────────── */}
        {revenue && revenue.latestPayments && revenue.latestPayments.length > 0 && (
          <section className="full-width-section">
            <h3 className="section-title">Thanh toán gần đây</h3>
            <div className="table-responsive">
              <table className="custom-table">
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
                      <td>
                        <code style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.paymentId.slice(0, 8)}…</code>
                      </td>
                      <td>{formatUtcToVietnamDateTime(p.paymentTime)}</td>
                      <td>{translatePaymentType(p.paymentType)}</td>
                      <td>{p.paymentMethod}</td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{formatCurrency(p.amount)}</strong>
                      </td>
                      <td>
                        <span className={`badge-pill ${paymentStatusBadge(p.paymentStatus)}`}>
                          {p.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Latest Sessions Table ──────────────────────────── */}
        {operations && operations.latestSessions && operations.latestSessions.length > 0 && (
          <section className="full-width-section">
            <h3 className="section-title">Phiên gửi xe gần đây</h3>
            <div className="table-responsive">
              <table className="custom-table">
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
                      <td>
                        <strong style={{ color: '#0f172a' }}>{s.licensePlate}</strong>
                      </td>
                      <td>{translateVehicleType(s.vehicleTypeName) || '—'}</td>
                      <td>{formatUtcToVietnamDateTime(s.entryTime)}</td>
                      <td>{s.exitTime ? formatUtcToVietnamDateTime(s.exitTime) : '—'}</td>
                      <td>
                        <span className={`badge-pill ${sessionStatusBadge(s.status)}`}>
                          {sessionStatusLabel(s.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Empty State ────────────────────────────────────── */}
        {!loading && !error && !summary && !revenue && !operations && (
          <section className="state-container">
            <AlertTriangle size={36} style={{ color: '#e11d48' }} />
            <p className="state-title">Không tìm thấy dữ liệu</p>
            <p>Vui lòng thử chọn một khoảng thời gian khác.</p>
          </section>
        )}
      </div>
    </ManagerPageShell>
  )
}

/* ── Badge helpers ──────────────────────────────────────────── */
function paymentStatusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'success' || s === 'completed' || s === 'paid') return 'badge-paid'
  if (s === 'failed' || s === 'cancelled') return 'badge-cancelled'
  return 'badge-pending'
}

function sessionStatusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'badge-active'
  if (s === 'completed') return 'badge-completed'
  if (s === 'cancelled') return 'badge-cancelled'
  return 'badge-pending'
}

function sessionStatusLabel(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'Đang gửi'
  if (s === 'completed') return 'Hoàn tất'
  if (s === 'cancelled') return 'Đã hủy'
  if (s === 'pending') return 'Chờ xử lý'
  return status
}
