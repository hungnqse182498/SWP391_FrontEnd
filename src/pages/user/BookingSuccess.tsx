import { useMemo } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useBooking } from '../../context/BookingContext'
import type { BookingRecord } from '../../types/booking'
import type { ParkingSessionTicket } from '../../utils/apiServices'
import { formatCurrency, formatDateTime } from '../../utils/pricing'

function SuccessContent() {
  const location = useLocation()
  const state = location.state as {
    reservationId?: string
    ticket?: ParkingSessionTicket
  } | null
  const { bookings } = useBooking()
  const latest = useMemo(() => bookings[0] ?? null, [bookings]) as BookingRecord | null
  const ticket = state?.ticket
  const reservationCode = ticket?.qrPayload || state?.reservationId

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
          {reservationCode && <p><strong>Mã đặt trước:</strong> {reservationCode}</p>}
          <p><strong>Thời gian:</strong> {formatDateTime(latest.startTime)}</p>
          <p><strong>Tổng:</strong> {formatCurrency(latest.totalAmount)}</p>
        </div>
        {ticket?.qrCodeDataUrl && (
          <div className="reservation-ticket-card success-reservation-ticket">
            <span>Đưa mã này cho staff quét khi check-in</span>
            <img src={ticket.qrCodeDataUrl} alt="Mã QR đặt trước" className="reservation-ticket-qr" />
            <code className="reservation-ticket-code">{ticket.qrPayload}</code>
          </div>
        )}
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
