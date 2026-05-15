import { motion } from 'framer-motion'
import { CreditCard, Smartphone, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import BookingSteps from '../components/BookingSteps'
import ProtectedRoute from '../components/ProtectedRoute'
import { useBooking } from '../context/BookingContext'
import type { PaymentMethod } from '../types/booking'
import { calcTotal, formatCurrency } from '../utils/pricing'

const methods: { id: PaymentMethod; label: string; icon: typeof Wallet }[] = [
  { id: 'momo', label: 'Ví MoMo', icon: Smartphone },
  { id: 'vnpay', label: 'VNPay', icon: Wallet },
  { id: 'card', label: 'Thẻ ngân hàng', icon: CreditCard },
]

function PaymentContent() {
  const navigate = useNavigate()
  const { draft, completePayment } = useBooking()
  const [method, setMethod] = useState<PaymentMethod>('momo')
  const [loading, setLoading] = useState(false)

  if (!draft || draft.spots.length === 0) {
    return <Navigate to="/dat-cho" replace />
  }

  const total = calcTotal(draft.spots.length, draft.hours)

  const handlePay = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    const record = completePayment(method)
    setLoading(false)
    if (record) navigate('/dat-cho/thanh-cong', { state: { bookingId: record.id } })
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
          <p><strong>{draft.floorName}</strong></p>
          <p className="muted-text">
            {draft.spots.map((s) => s.label).join(', ')} · {draft.hours} giờ
          </p>
          <p className="muted-text">Xe: {draft.vehiclePlate}</p>
          <div className="payment-total">
            <span>Tổng cộng</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={loading}
            onClick={handlePay}
          >
            {loading ? 'Đang xử lý...' : 'Thanh toán ngay'}
          </button>
        </div>
      </motion.div>
    </section>
  )
}

export default function Payment() {
  return (
    <ProtectedRoute>
      <PaymentContent />
    </ProtectedRoute>
  )
}
