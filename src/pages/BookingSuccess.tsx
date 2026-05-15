import { motion } from 'framer-motion'
import { CheckCircle2, History, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import { useBooking } from '../context/BookingContext'
import { formatCurrency, formatDateTime } from '../utils/pricing'

function SuccessContent() {
  const location = useLocation()
  const bookingId = (location.state as { bookingId?: string } | null)?.bookingId
  const { getMyBookings } = useBooking()
  const booking = getMyBookings().find((b) => b.id === bookingId) ?? getMyBookings()[0]

  return (
    <section className="success-page">
      <motion.div
        className="success-card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <CheckCircle2 size={64} strokeWidth={1.5} className="success-icon" aria-hidden />
        <h1>Đặt chỗ thành công!</h1>
        <p>Thanh toán đã được xác nhận. Bạn có thể đến bãi đúng giờ.</p>

        {booking && (
          <div className="success-details">
            <p><strong>Mã:</strong> {booking.id}</p>
            <p><strong>Tầng:</strong> {booking.floorName}</p>
            <p><strong>Chỗ:</strong> {booking.spots.map((s) => s.label).join(', ')}</p>
            <p><strong>Bắt đầu:</strong> {formatDateTime(booking.startTime)}</p>
            <p><strong>Tổng:</strong> {formatCurrency(booking.totalAmount)}</p>
          </div>
        )}

        <div className="success-actions">
          <Link to="/lich-su" className="btn btn-primary">
            <History size={18} strokeWidth={2} aria-hidden />
            Xem lịch sử
          </Link>
          <Link to="/" className="btn btn-outline">
            <Home size={18} strokeWidth={2} aria-hidden />
            Trang chủ
          </Link>
        </div>
      </motion.div>
    </section>
  )
}

export default function BookingSuccess() {
  return (
    <ProtectedRoute>
      <SuccessContent />
    </ProtectedRoute>
  )
}
