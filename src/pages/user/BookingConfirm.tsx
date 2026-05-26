import { Link } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useBooking } from '../../context/BookingContext'
import { formatCurrency } from '../../utils/pricing'

function ConfirmContent() {
  const { draft } = useBooking()

  if (!draft) {
    return (
      <section className="empty-state card-panel">
        <p>Chưa có thông tin đặt chỗ.</p>
        <Link to="/dat-cho" className="btn btn-primary">Quay lại</Link>
      </section>
    )
  }

  return (
    <section className="booking-confirm-page">
      <header className="page-header">
        <div>
          <h1>Xác nhận đặt chỗ</h1>
          <p>Kiểm tra lại thông tin trước khi thanh toán.</p>
        </div>
      </header>
      <div className="confirm-summary card-panel">
        <div>
          <h2>{draft.floorName}</h2>
          <p>Chỗ: {draft.spots.map((spot) => spot.label).join(', ')}</p>
          <p>Thời gian: {new Date(draft.startTime).toLocaleString()}</p>
          <p>Số giờ: {draft.hours}</p>
          <p>Biển số: {draft.vehiclePlate}</p>
        </div>
        <div className="confirm-total">
          <strong>{formatCurrency(draft.spots.length * draft.hours * 15000)}</strong>
          <span>Tạm tính</span>
        </div>
      </div>
      <Link to="/thanh-toan" className="btn btn-primary btn-block">Tiếp tục thanh toán</Link>
    </section>
  )
}

export default function BookingConfirm() {
  return (
    <ProtectedRoute>
      <ConfirmContent />
    </ProtectedRoute>
  )
}
