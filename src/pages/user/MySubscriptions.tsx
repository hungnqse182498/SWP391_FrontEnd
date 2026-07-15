import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, Car, CreditCard, History, RefreshCw, ShieldAlert } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import { formatUtcToVietnamDateTime } from '../../utils/dateTime'
import { formatCurrency } from '../../utils/pricing'
import {
  type MonthlySubscriptionDto,
  type SubscriptionPackageDto,
  type SubscriptionRenewalDto,
  subscriptionApi,
  subscriptionRenewalApi,
} from '../../utils/apiServices'
import { ToastContainer, useToast } from '../../components/Toast'

function getStatusBadgeClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'active') {
    return 'badge-history-success'
  }
  if (normalized === 'pendingpayment') {
    return 'badge-history-pending'
  }
  if (normalized === 'expired') {
    return 'badge-history-cancelled'
  }
  return 'badge-history-neutral'
}

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'Hoạt động'
    case 'pendingpayment':
      return 'Chờ thanh toán'
    case 'expired':
      return 'Hết hạn'
    default:
      return status
  }
}

function MySubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<MonthlySubscriptionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [packages, setPackages] = useState<SubscriptionPackageDto[]>([])
  const [renewTarget, setRenewTarget] = useState<MonthlySubscriptionDto | null>(null)
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [renewing, setRenewing] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<MonthlySubscriptionDto | null>(null)
  const [renewalHistory, setRenewalHistory] = useState<SubscriptionRenewalDto[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const toast = useToast()

  const loadSubscriptions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await subscriptionApi.getMy()
      if (res.isSuccess && Array.isArray(res.result)) {
        const sorted = [...res.result].sort((a, b) => {
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        })
        setSubscriptions(sorted)
      } else {
        setError(res.message || 'Không thể tải danh sách gói đăng ký.')
      }
    } catch (err: unknown) {
      console.error(err)
      setError('Đã xảy ra lỗi khi kết nối đến máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadSubscriptions()
      void subscriptionApi.getPackages().then((res) => {
        if (res.isSuccess && res.result) {
          setPackages(res.result.filter((item) => item.status.toLowerCase() === 'active'))
        }
      }).catch(console.error)
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [])

  const getRenewPackages = (subscription: MonthlySubscriptionDto) => {
    const vehicleType = subscription.vehicleType?.trim().toLowerCase()
    return packages.filter(
      (item) =>
        item.vehicleTypeName?.trim().toLowerCase() === vehicleType &&
        item.packageName === subscription.packageName,
    )
  }

  const openRenewModal = (subscription: MonthlySubscriptionDto) => {
    const compatiblePackages = getRenewPackages(subscription)
    const currentPackage = compatiblePackages.find(
      (item) => item.packageName === subscription.packageName,
    )
    setRenewTarget(subscription)
    setSelectedPackageId(currentPackage?.packageId || compatiblePackages[0]?.packageId || '')
  }

  const handleRenew = async () => {
    if (!renewTarget || !selectedPackageId) return
    setRenewing(true)
    try {
      const res = await subscriptionRenewalApi.renew(renewTarget.subscriptionId, selectedPackageId)
      if (res.isSuccess && res.result?.paymentUrl) {
        sessionStorage.setItem('payment_return_context', JSON.stringify({
          type: 'subscription-renewal',
          subscriptionId: renewTarget.subscriptionId,
        }))
        window.location.assign(res.result.paymentUrl)
        return
      }
      toast.error(res.message || 'Không thể tạo thanh toán gia hạn.')
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Không thể tạo thanh toán gia hạn.')
    } finally {
      setRenewing(false)
    }
  }

  const openHistoryModal = async (subscription: MonthlySubscriptionDto) => {
    setHistoryTarget(subscription)
    setRenewalHistory([])
    setHistoryLoading(true)
    try {
      const res = await subscriptionRenewalApi.getHistory(subscription.subscriptionId)
      if (res.isSuccess) setRenewalHistory(res.result || [])
      else toast.error(res.message || 'Không thể tải lịch sử gia hạn.')
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Không thể tải lịch sử gia hạn.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleRepayment = async (id: string) => {
    setPayingId(id)
    try {
      const res = await subscriptionApi.createPayment(id)
      if (res.isSuccess && res.result?.paymentUrl) {
        window.location.assign(res.result.paymentUrl)
      } else {
        toast.error(res.message || 'Lỗi khi tạo lại link thanh toán.')
      }
    } catch (err: unknown) {
      console.error(err)
      let msg = 'Đã xảy ra lỗi, vui lòng thử lại sau.'
      if (err instanceof Error) {
        try {
          const body = JSON.parse(err.message.replace(/^HTTP \d+: /, ''))
          if (body?.message) msg = body.message
        } catch { /* ignore */ }
      }
      toast.error(msg)
    } finally {
      setPayingId(null)
    }
  }

  return (
    <section className="my-subscriptions-page">
      <ToastContainer toasts={toast.toasts} onClose={toast.close} />

      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Gói đăng ký của tôi</h1>
          <p>Danh sách lịch sử và các gói thuê bao tháng của bạn.</p>
        </div>
      </header>

      {loading ? (
        <div className="empty-state card-panel">
          <p>Đang tải...</p>
        </div>
      ) : error ? (
        <div className="empty-state card-panel">
          <ShieldAlert size={40} strokeWidth={1.5} className="success-icon" style={{ color: 'var(--danger, #ef4444)' }} />
          <p>{error}</p>
          <button onClick={loadSubscriptions} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Thử lại
          </button>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state card-panel">
          <CreditCard size={40} strokeWidth={1.5} aria-hidden />
          <p>Bạn chưa đăng ký gói nào.</p>
          <Link to="/dang-ky-thang" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Đăng ký ngay
          </Link>
        </div>
      ) : (
        <div
          className="subscriptions-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
            marginTop: '1.5rem',
          }}
        >
          {subscriptions.map((sub, i) => (
            <motion.div
              key={sub.subscriptionId}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-panel"
              style={{
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.75rem',
                    gap: '0.5rem',
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-heading)' }}>
                    {sub.packageName || 'Gói thuê bao tháng'}
                  </h3>
                  <span className={`badge ${getStatusBadgeClass(sub.status)}`} style={{ flexShrink: 0 }}>
                    {getStatusLabel(sub.status)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Car size={16} />
                    <span>
                      Biển số: <strong>{sub.licensePlate}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>Loại xe:</span>
                    <span>{sub.vehicleType || 'Không rõ'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>Chỗ đỗ:</span>
                    <span>
                      {sub.fixedSlot ? (
                        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                          Chỗ cố định: {sub.fixedSlot}
                        </span>
                      ) : (
                        'Không có chỗ cố định'
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '0.5rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px dashed var(--border)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div>
                      Bắt đầu: <strong>{formatUtcToVietnamDateTime(sub.startDate)}</strong>
                    </div>
                    <div>
                      Kết thúc: <strong>{formatUtcToVietnamDateTime(sub.endDate)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giá thanh toán</span>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--text-heading)' }}>
                    {formatCurrency(sub.price)}
                  </strong>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.5rem' }}>
                {sub.status.toLowerCase() === 'pendingpayment' ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={payingId === sub.subscriptionId}
                    onClick={() => handleRepayment(sub.subscriptionId)}
                  >
                    {payingId === sub.subscriptionId ? 'Đang xử lý...' : 'Thanh toán lại'}
                  </button>
                ) : sub.status.toLowerCase() !== 'cancelled' ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openRenewModal(sub)}>
                    <RefreshCw size={15} aria-hidden />
                    Gia hạn
                  </button>
                ) : null}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => void openHistoryModal(sub)}>
                    <History size={15} aria-hidden />
                    Lịch sử
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {renewTarget && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget && !renewing) setRenewTarget(null) }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="renew-subscription-title">
            <h3 id="renew-subscription-title" className="modal-title">Gia hạn gói thuê bao</h3>
            <div className="success-details" style={{ marginTop: 0 }}>
              <p><strong>Biển số:</strong> {renewTarget.licensePlate}</p>
              <p><strong>Loại xe:</strong> {renewTarget.vehicleType || 'Không rõ'}</p>
              <p><strong>Hạn hiện tại:</strong> {formatUtcToVietnamDateTime(renewTarget.endDate)}</p>
            </div>

            <div className="form-field">
              <label htmlFor="renew-package">Gói muốn gia hạn *</label>
              <select id="renew-package" value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)}>
                <option value="" disabled>-- Chọn gói phù hợp --</option>
                {getRenewPackages(renewTarget).map((item) => (
                  <option key={item.packageId} value={item.packageId}>
                    {item.packageName} · {item.durationMonths} tháng · {formatCurrency(item.price)}
                  </option>
                ))}
              </select>
            </div>

            {getRenewPackages(renewTarget).length === 0 && (
              <p className="form-error">Hiện không có gói đang hoạt động phù hợp với loại xe này.</p>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" disabled={renewing} onClick={() => setRenewTarget(null)}>Huỷ</button>
              <button type="button" className="btn btn-primary" disabled={renewing || !selectedPackageId} onClick={handleRenew}>
                {renewing ? 'Đang tạo thanh toán...' : 'Thanh toán gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyTarget && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setHistoryTarget(null) }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="renewal-history-title">
            <h3 id="renewal-history-title" className="modal-title">Lịch sử gia hạn</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '-0.75rem' }}>{historyTarget.licensePlate}</p>
            {historyLoading ? (
              <p>Đang tải lịch sử...</p>
            ) : renewalHistory.length === 0 ? (
              <div className="empty-state"><CalendarClock size={36} aria-hidden /><p>Chưa có lần gia hạn nào.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {renewalHistory.map((item) => (
                  <div key={item.renewalId} className="success-details" style={{ margin: 0 }}>
                    <p><strong>Ngày gia hạn:</strong> {formatUtcToVietnamDateTime(item.renewalDate || item.newEndDate)}</p>
                    <p><strong>Hạn cũ:</strong> {formatUtcToVietnamDateTime(item.oldEndDate)}</p>
                    <p><strong>Hạn mới:</strong> {formatUtcToVietnamDateTime(item.newEndDate)}</p>
                    <p><strong>Số tiền:</strong> {formatCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions"><button type="button" className="btn btn-primary" onClick={() => setHistoryTarget(null)}>Đóng</button></div>
          </div>
        </div>
      )}
    </section>
  )
}

export default function MySubscriptions() {
  return (
    <ProtectedRoute>
      <MySubscriptionsContent />
    </ProtectedRoute>
  )
}
