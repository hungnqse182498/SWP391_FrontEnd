import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useBooking } from '../../context/BookingContext'
import { vehicleTypeLabel } from '../../utils/bookingPricing'
import { formatCurrency } from '../../utils/pricing'

function ConfirmContent() {
  const { draft, getPolicy } = useBooking()

  if (!draft) {
    return (
      <section className="empty-state card-panel">
        <p>Chưa có thông tin đặt chỗ.</p>
        <Link to="/dat-cho" className="btn btn-primary">Quay lại</Link>
      </section>
    )
  }

  const isPreRegistered = draft.isPreRegistered
  const isMonthly = draft.isMonthlyCustomer
  const policy = getPolicy(draft.vehicleType ?? 'car')
  const total = isPreRegistered
    ? (draft.depositAmount ?? policy.basePrice)
    : draft.spots.length * draft.hours * policy.basePrice

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
          <h2>
            {isPreRegistered ? 'Đăng ký giữ chỗ trước' : isMonthly ? 'Chỗ đỗ tháng' : draft.floorName}
          </h2>
          {isPreRegistered ? (
            <p><strong>Hình thức:</strong> Đăng ký trước (Tự động xếp chỗ khi vào bãi)</p>
          ) : (
            <p><strong>Chỗ:</strong> {draft.spots.map((spot) => spot.label).join(', ')}</p>
          )}
          <p><strong>Thời gian vào:</strong> {new Date(draft.startTime).toLocaleString('vi-VN')}</p>
          {!isPreRegistered && !isMonthly && <p><strong>Số giờ:</strong> {draft.hours}</p>}
          {draft.vehiclePlate ? (
            <p><strong>Biển số:</strong> {draft.vehiclePlate}</p>
          ) : null}
          {draft.vehicleType && (
            <p><strong>Loại xe:</strong> {vehicleTypeLabel(draft.vehicleType)}</p>
          )}
        </div>
        <div className="confirm-total">
          <strong>{isMonthly ? 'Đã bao gồm gói tháng' : formatCurrency(total)}</strong>
          <span>
            {isPreRegistered ? 'Tiền cọc cần thanh toán' : isMonthly ? 'Không cần cọc' : 'Tạm tính'}
          </span>
        </div>
      </div>

      {isPreRegistered && (
        <div className="cancel-policy-banner cancel-policy-banner--compact" role="note">
          <AlertTriangle size={18} strokeWidth={2.2} aria-hidden />
          <p>Hủy đặt chỗ <strong>không hoàn tiền</strong>.</p>
        </div>
      )}

      <Link to="/thanh-toan" className="btn btn-primary btn-block">
        {isMonthly ? 'Hoàn tất' : 'Tiếp tục thanh toán'}
      </Link>
    </section>
  )
}

export default function BookingConfirm() {
  return (
    <ProtectedRoute allowedRoles={['user', 'customer']}>
      <ConfirmContent />
    </ProtectedRoute>
  )
}
