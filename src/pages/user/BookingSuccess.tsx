import { useMemo } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useBooking } from '../../context/BookingContext'
import type { BookingRecord } from '../../types/booking'
import { formatCurrency, formatDateTime } from '../../utils/pricing'

function SuccessContent() {
  const { bookings } = useBooking()
  const latest = useMemo(() => bookings[0] ?? null, [bookings]) as BookingRecord | null

  if (!latest) {
    return (
      <section className="empty-state card-panel">
        <p>Không có đơn đặt chỗ nào.</p>
        <Link to="/dat-cho" className="btn btn-primary">Đặt chỗ ngay</Link>
      </section>
    )
  }

  return (
    <section className="success-page">
      <div className="success-panel card-panel">
        <CheckCircle2 size={48} strokeWidth={1.5} aria-hidden />
        <h1>Đặt chỗ thành công!</h1>
        <p>Đơn đã được ghi nhận và chờ thanh toán.</p>
        <div className="success-summary">
          <p><strong>Mã đơn:</strong> {latest.id}</p>
          <p><strong>Thời gian:</strong> {formatDateTime(latest.startTime)}</p>
          <p><strong>Tổng:</strong> {formatCurrency(latest.totalAmount)}</p>
        </div>
        <Link to="/lich-su" className="btn btn-primary">Xem lịch sử</Link>
      </div>
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
