import { motion } from 'framer-motion'
import { CreditCard, Smartphone, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import BookingSteps from '../components/BookingSteps'
import ProtectedRoute from '../components/ProtectedRoute'
import { useBooking } from '../context/BookingContext'
import type { PaymentMethod } from '../types/booking'
import { reservationApi } from '../utils/apiServices'
import { depositAmount, vehicleTypeLabel } from '../utils/bookingPricing'
import { calcTotal, formatCurrency } from '../utils/pricing'

const methods: { id: PaymentMethod; label: string; icon: typeof Wallet }[] = [
  { id: 'momo', label: 'Ví MoMo / PayOS', icon: Smartphone },
  { id: 'vnpay', label: 'VNPay', icon: Wallet },
  { id: 'card', label: 'Thẻ ngân hàng', icon: CreditCard },
]

function PaymentContent() {
  const navigate = useNavigate()
  const { draft, setDraft, completePayment } = useBooking()
  const [method, setMethod] = useState<PaymentMethod>('momo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!draft || draft.spots.length === 0) {
    return <Navigate to="/dat-cho" replace />
  }

  const isPreRegistered = draft.isPreRegistered
  const isMonthly = draft.isMonthlyCustomer
  const total = isPreRegistered
    ? (draft.depositAmount ?? depositAmount(draft.vehicleType ?? 'car'))
    : calcTotal(draft.spots.length, draft.hours)

  const handlePay = async () => {
    setLoading(true)
    setError('')

    try {
      if (isMonthly) {
        const record = completePayment(method)
        if (record) navigate('/dat-cho/thanh-cong', { state: { bookingId: record.id } })
        return
      }

      if (isPreRegistered) {
        const res = await reservationApi.create({
          expectedEntryTime: draft.startTime,
          vehicleTypeName: vehicleTypeLabel(draft.vehicleType ?? 'car'),
          licensePlate: draft.vehiclePlate,
        })

        if (res.isSuccess && res.result) {
          const { paymentUrl, orderCode, reservationId } = res.result
          setDraft({
            ...draft,
            reservationId,
            paymentUrl,
            orderCode,
          })

          if (paymentUrl && method !== 'card') {
            window.location.href = paymentUrl
            return
          }

          const record = completePayment(method)
          if (record) navigate('/dat-cho/thanh-cong', { state: { bookingId: record.id, reservationId } })
          return
        }

        setError(res.message || 'Không thể tạo đặt chỗ. Vui lòng thử lại.')
        return
      }

      await new Promise((r) => setTimeout(r, 600))
      const record = completePayment(method)
      if (record) navigate('/dat-cho/thanh-cong', { state: { bookingId: record.id } })
    } catch (err) {
      console.error(err)
      setError('Lỗi thanh toán. Kiểm tra kết nối backend và thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="booking-page">
      <BookingSteps current={3} />
      <header className="page-header">
        <div>
          <h1>Thanh toán</h1>
          <p>Chọn phương thức thanh toán để hoàn tất đặt chỗ.</p>
        </div>
      </header>

      <motion.div
        className="payment-layout"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="card-panel payment-methods">
          <h2>Phương thức</h2>
          <div className="method-list">
            {methods.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`method-item${method === id ? ' active' : ''}`}
                onClick={() => setMethod(id)}
              >
                <Icon size={22} strokeWidth={2} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card-panel payment-summary">
          <h2>Chi tiết</h2>
          <p>
            <strong>
              {isPreRegistered ? 'Đăng ký giữ chỗ trước' : isMonthly ? 'Chỗ đỗ tháng' : draft.floorName}
            </strong>
          </p>
          <p className="muted-text">
            {isPreRegistered
              ? 'Tự động xếp chỗ · Tiền cọc 1 giờ'
              : isMonthly
                ? `${draft.floorName} · ${draft.spots.map((s) => s.label).join(', ')}`
                : `${draft.spots.map((s) => s.label).join(', ')} · ${draft.hours} giờ`}
          </p>
          <p className="muted-text">Xe: {draft.vehiclePlate}</p>
          <div className="payment-total">
            <span>{isPreRegistered ? 'Tiền cọc cần thanh toán' : isMonthly ? 'Phí' : 'Tổng cộng'}</span>
            <strong>{isMonthly ? '0 ₫' : formatCurrency(total)}</strong>
          </div>
          {error && <p className="alert-inline alert-error">{error}</p>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={loading}
            onClick={handlePay}
          >
            {loading ? 'Đang xử lý...' : isMonthly ? 'Hoàn tất' : 'Thanh toán ngay'}
          </button>
        </div>
      </motion.div>
    </section>
  )
}

export default function Payment() {
  return (
    <ProtectedRoute allowedRoles={['user', 'customer']}>
      <PaymentContent />
    </ProtectedRoute>
  )
}
