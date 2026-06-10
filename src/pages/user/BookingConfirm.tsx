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

  const isPreRegistered = (draft as any).isPreRegistered
  const total = isPreRegistered
    ? ((draft as any).depositAmount ?? 25000)
    : draft.spots.length * draft.hours * 15000

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
          <h2>{isPreRegistered ? 'Đăng ký giữ chỗ trước' : draft.floorName}</h2>
          {isPreRegistered ? (
            <p><strong>Hình thức:</strong> Đăng ký trước (Tự động xếp chỗ khi vào bãi)</p>
          ) : (
            <p><strong>Chỗ:</strong> {draft.spots.map((spot) => spot.label).join(', ')}</p>
          )}
          <p><strong>Thời gian vào:</strong> {new Date(draft.startTime).toLocaleString('vi-VN')}</p>
          {!isPreRegistered && <p><strong>Số giờ:</strong> {draft.hours}</p>}
          <p><strong>Biển số:</strong> {draft.vehiclePlate}</p>
        </div>
        <div className="confirm-total">
          <strong>{formatCurrency(total)}</strong>
          <span>{isPreRegistered ? 'Tiền cọc cần thanh toán' : 'Tạm tính'}</span>
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
