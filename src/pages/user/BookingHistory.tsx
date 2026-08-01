import { motion } from 'framer-motion'
import { Calendar, Car, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { ToastContainer, useToast } from '../../components/Toast'
import { ApiRequestError } from '../../config/api'
import { reservationApi, type ReservationDto } from '../../utils/apiServices'
import { bookingTimeBoundsLocal, parseDatetimeLocal } from '../../utils/bookingTime'
import { parseBackendUtcDate, vietnamDatetimeLocalToUtcIso } from '../../utils/dateTime'
import { formatDateTime } from '../../utils/pricing'
import { savePaymentReturnContext } from '../../utils/paymentReturnContext'

const statusLabel: Record<string, string> = {
  Pending: 'Chờ thanh toán',
  Confirmed: 'Đã xác nhận',
  Cancelled: 'Đã hủy',
  Completed: 'Hoàn tất',
  Modified: 'Đã đổi giờ',
  NoShow: 'Quá hạn',
  CheckedIn: 'Đã check-in',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
}

function getOrderCreatedTime(order: ReservationDto) {
  const value = order.createdAt || order.expectedEntryTime
  return value ? parseBackendUtcDate(value).getTime() : 0
}

function getHistoryStatus(order: ReservationDto) {
  const paymentStatus = order.payments?.[0]?.paymentStatus
  if (paymentStatus?.toLowerCase() === 'success') return 'Success'
  return order.status || 'Pending'
}

function getStatusBadgeClass(status: string) {
  const normalized = status.toLowerCase()
  if (['confirmed', 'success', 'completed', 'checkedin', 'modified', 'paid'].includes(normalized)) {
    return 'badge-history-success'
  }
  if (['cancelled', 'canceled', 'cancel'].includes(normalized)) {
    return 'badge-history-cancelled'
  }
  if (['pending', 'pendingpayment', 'pending_payment'].includes(normalized)) {
    return 'badge-history-pending'
  }
  return 'badge-history-neutral'
}

function HistoryContent() {
  const [list, setList] = useState<ReservationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTime, setNewTime] = useState('')
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await reservationApi.getMy()
      if (res.isSuccess && res.result) {
        setList([...res.result].sort((a, b) => getOrderCreatedTime(b) - getOrderCreatedTime(a)))
      }
    } catch (err) {
      console.error(err)
      if (err instanceof ApiRequestError && err.statusCode === 404) {
        setList([])
        return
      }
      toast.error('Không thể tải danh sách đặt chỗ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleRepayment = async (id: string) => {
    try {
      const res = await reservationApi.recreatePayment(id)
      if (res.isSuccess && res.result?.paymentUrl) {
        savePaymentReturnContext({
          type: 'reservation',
          successPath: '/lich-su',
          cancelPath: '/lich-su',
        }, res.result.orderCode)
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
    }
  }

  const handleChangeTime = async (id: string) => {
    if (!newTime) {
      toast.warning('Vui lòng chọn giờ mới.')
      return
    }

    const selectedTime = parseDatetimeLocal(newTime).getTime()
    const nowTime = Date.now()
    const diffHours = (selectedTime - nowTime) / (1000 * 60 * 60)

    if (diffHours < 0) {
      toast.warning('Giờ hẹn mới phải lớn hơn thời gian hiện tại.')
      return
    }
    if (diffHours > 5) {
      toast.warning('Giờ hẹn mới không được vượt quá 5 tiếng tính từ thời điểm hiện tại.')
      return
    }

    try {
      const isoTime = vietnamDatetimeLocalToUtcIso(newTime)
      const res = await reservationApi.changeTime(id, isoTime)
      if (res.isSuccess) {
        toast.success('Đổi giờ check-in thành công!')
        setEditingId(null)
        load()
      } else {
        toast.error(res.message || 'Lỗi khi đổi giờ.')
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
    }
  }

  // Calculate time limits for datetime input
  const { min: minTimeStr, max: maxTimeStr } = bookingTimeBoundsLocal()

  return (
    <section className="history-page">
      {/* Toast notifications */}
      <ToastContainer toasts={toast.toasts} onClose={toast.close} />

      <header className="page-header">
        <div>
          <h1>Lịch sử đặt chỗ</h1>
          <p>Các lần đăng ký giữ chỗ trước của bạn.</p>
        </div>
      </header>

      {loading ? (
        <div className="empty-state card-panel"><p>Đang tải...</p></div>
      ) : list.length === 0 ? (
        <div className="empty-state card-panel">
          <Calendar size={40} strokeWidth={1.5} aria-hidden />
          <p>Chưa có đơn đặt chỗ nào.</p>
          <Link to="/dat-cho" className="btn btn-primary">Đặt chỗ ngay</Link>
        </div>
      ) : (
        <ul className="history-list">
          {list.map((b, i) => {
            const paymentStatus = b.payments?.[0]?.paymentStatus
            const displayStatus = getHistoryStatus(b)
            const canChangeTime = b.status === 'Confirmed'
            const alreadyChanged = b.status === 'Modified'
            const ticket = b.ticket
            const canShowTicket =
              Boolean(ticket?.qrCodeDataUrl) &&
              (
                ['confirmed', 'modified', 'checkedin', 'completed'].includes(b.status?.toLowerCase()) ||
                paymentStatus?.toLowerCase() === 'success'
              )

            return (
              <motion.li
                key={b.reservationId}
                className={`history-item card-panel status-${b.status?.toLowerCase()}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="history-item-head">
                  <strong>{b.reservationId.slice(0, 8).toUpperCase()}</strong>
                  <span className={`badge ${getStatusBadgeClass(displayStatus)}`}>
                    {statusLabel[displayStatus] ?? statusLabel[b.status] ?? displayStatus}
                  </span>
                </div>
                <div className="history-meta">
                  <span><MapPin size={14} /> Đăng ký trước</span>
                  <span><Car size={14} /> {b.vehicleType?.typeName ?? 'Xe'}</span>
                  <span><Calendar size={14} /> {formatDateTime(b.expectedEntryTime)}</span>
                </div>
                {canShowTicket && ticket && (
                  <div className="reservation-ticket-card history-reservation-ticket">
                    <img src={ticket.qrCodeDataUrl} alt="Mã QR đặt trước" className="reservation-ticket-qr" />
                    <div>
                      <span>Mã QR đặt trước để staff quét lúc check-in</span>
                      <code className="reservation-ticket-code">{ticket.qrPayload || b.reservationId}</code>
                    </div>
                  </div>
                )}
                <div
                  className="history-footer"
                  style={{ flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}
                >
                  {/* Thanh toán lại cho đơn Pending */}
                  {b.status === 'Pending' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleRepayment(b.reservationId)}
                    >
                      Thanh toán lại
                    </button>
                  )}

                  {/* Đổi giờ cho đơn Confirmed / Modified */}
                  {(b.status === 'Confirmed' || b.status === 'Modified' || paymentStatus === 'Success') && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={alreadyChanged}
                        onClick={() => {
                          if (!canChangeTime) return
                          setEditingId(editingId === b.reservationId ? null : b.reservationId)
                          if (editingId !== b.reservationId) {
                            setNewTime(minTimeStr)
                          }
                        }}
                        title={alreadyChanged ? 'Bạn đã dùng lượt đổi giờ (tối đa 1 lần)' : 'Đổi giờ check-in'}
                      >
                        {alreadyChanged ? 'Đã đổi giờ (Hết lượt)' : 'Đổi giờ check-in'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline form đổi giờ */}
                {editingId === b.reservationId && (
                  <div
                    className="history-edit-time"
                    style={{
                      marginTop: '12px',
                      padding: '14px',
                      background: '#f0f9ff',
                      borderRadius: '10px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    <p style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#0369a1', fontWeight: 500 }}>
                      ⏰ Chọn giờ check-in mới — chỉ được đổi <strong>1 lần</strong>, tối đa 5 tiếng kể từ hiện tại:
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={newTime}
                        min={minTimeStr}
                        max={maxTimeStr}
                        onChange={(e) => setNewTime(e.target.value)}
                        style={{ flex: 1, minWidth: '200px' }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleChangeTime(b.reservationId)}
                      >
                        Lưu thay đổi
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingId(null)}
                      >
                        Hủy bỏ
                      </button>
                    </div>
                  </div>
                )}
              </motion.li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default function BookingHistory() {
  return (
    <ProtectedRoute allowedRoles={['user', 'customer']}>
      <HistoryContent />
    </ProtectedRoute>
  )
}
