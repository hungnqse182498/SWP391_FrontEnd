import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, CalendarDays, Car, MapPin } from 'lucide-react'
import BookingSteps from '../../components/BookingSteps'
import ProtectedRoute from '../../components/ProtectedRoute'
import { ToastContainer, useToast } from '../../components/Toast'
import { useBooking } from '../../context/BookingContext'
import { vehicleTypeLabel } from '../../utils/bookingPricing'
import { bookingTimeBoundsLocal, defaultBookingDatetimeLocal, parseDatetimeLocal } from '../../utils/bookingTime'
import { vietnamDatetimeLocalToUtcIso } from '../../utils/dateTime'
import { formatCurrency } from '../../utils/pricing'

function CancellationPolicy() {
  return (
    <div className="cancel-policy-banner cancel-policy-banner--compact" role="note">
      <AlertTriangle size={20} strokeWidth={2.2} aria-hidden />
      <div>
        <strong>Chính sách hủy đặt chỗ</strong>
        <p>
          Hủy đặt chỗ <strong>không hoàn tiền</strong>. Tiền cọc sẽ không được hoàn lại dưới mọi
          hình thức.
        </p>
      </div>
    </div>
  )
}

interface PriceTableProps {
  basePrice: number
  baseHours: number
  extraHourPrice: number
  nightSurcharge: number
}

function PriceTable({ basePrice, baseHours, extraHourPrice, nightSurcharge }: PriceTableProps) {
  return (
    <div className="booking-price-table">
      <h3>Bảng giá giữ xe ô tô</h3>
      <table>
        <thead>
          <tr>
            <th>Hạng mục</th>
            <th>Giá</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ fontWeight: 'bold', background: '#eef6ff' }}>
            <td>Giá cơ bản ({baseHours} giờ đầu)</td>
            <td>{formatCurrency(basePrice)}</td>
          </tr>
          <tr>
            <td>Mỗi giờ tiếp theo</td>
            <td>{formatCurrency(extraHourPrice)}/giờ</td>
          </tr>
          <tr>
            <td>Phụ thu ban đêm (22h – 6h)</td>
            <td>{formatCurrency(nightSurcharge)}/lượt</td>
          </tr>
        </tbody>
      </table>
      <p className="booking-price-note">
        Phụ thu ban đêm chỉ được cộng một lần nếu thời gian gửi xe có giao với khung 22:00–06:00,
        không tính theo số giờ ban đêm.
      </p>
    </div>
  )
}

function BookingContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setDraft, getPolicy } = useBooking()
  const carPolicy = getPolicy('car')
  const toast = useToast()

  const locationState = location.state as { startTime?: string } | null
  const initialStartTime = locationState?.startTime ?? ''

  const [startTime, setStartTime] = useState<string>(() => {
    if (initialStartTime) return initialStartTime
    return defaultBookingDatetimeLocal()
  })

  const handlePreRegisterSubmit = () => {
    if (!startTime) {
      toast.warning('Bạn chưa chọn thời gian dự kiến đến bãi.')
      return
    }

    const selectedTime = parseDatetimeLocal(startTime).getTime()
    const nowTime = Date.now()
    const diffHours = (selectedTime - nowTime) / (1000 * 60 * 60)

    if (!Number.isFinite(selectedTime)) {
      toast.error('Thời gian đã chọn không hợp lệ. Vui lòng chọn lại ngày và giờ đến bãi.')
      return
    }

    if (diffHours <= 0) {
      toast.warning('Thời gian dự kiến đến phải sau thời điểm hiện tại.')
      return
    }

    if (diffHours > 5) {
      toast.warning('Bạn chỉ có thể đặt chỗ trong vòng 5 giờ tính từ thời điểm hiện tại.')
      return
    }

    const policy = getPolicy('car')
    const deposit = policy.basePrice

    setDraft({
      floorId: 0,
      floorName: 'Tự động xếp chỗ',
      spots: [
        {
          id: 'preregistered',
          label: 'Đăng ký trước',
          row: '-',
          number: 0,
          type: 'standard',
        },
      ],
      startTime: vietnamDatetimeLocalToUtcIso(startTime),
      hours: 1,
      vehiclePlate: '',
      isPreRegistered: true,
      vehicleType: 'car',
      depositAmount: deposit,
    })

    navigate('/dat-cho/xac-nhan')
  }

  // Calculate min and max time for the input
  const { min: minTimeStr, max: maxTimeStr } = bookingTimeBoundsLocal()

  return (
    <div className="home-landing booking-landing">
      <ToastContainer toasts={toast.toasts} onClose={toast.close} />
      <section className="home-hero">
        <div className="home-hero-media" aria-hidden="true">
          <img src="/image/banner.jpg" alt="" className="home-hero-img" />
          <div className="home-hero-overlay" />
        </div>

        <div className="home-hero-inner">
          <div className="booking-steps-wrap">
            <BookingSteps current={1} />
          </div>

          <div className="home-hero-copy">
            <div className="location-pill">
              <MapPin size={18} strokeWidth={2.2} aria-hidden />
              01 Lưu Hữu Phước, Đông Hòa, Bình Dương
            </div>

            <h1>
              Đăng ký giữ chỗ trước
              <span>chọn giờ vào bãi</span>
            </h1>

            <p className="home-hero-lead">
              Đặt trước chỉ dành cho ô tô. Chọn giờ vào bãi và thanh toán tiền cọc 1 giờ.
            </p>

            <div className="booking-split-layout">
                {/* Bên trái: Thông tin đặt chỗ + Bảng giá */}
                <section className="booking-section-card booking-info-card">
                  <div className="booking-section-heading">
                    <span>Thông tin đặt chỗ</span>
                    <strong>Đặt trước ô tô — chọn giờ vào bãi</strong>
                  </div>

                  <div className="booking-vehicle-badge">
                    <Car size={18} strokeWidth={2.2} aria-hidden />
                    <span>Loại xe: Ô tô</span>
                  </div>

                  <div className="search-grid booking-field-grid booking-field-grid--single">
                    <label className="hero-field">
                      <span>Thời gian vào bãi</span>
                      <div>
                        <CalendarDays size={18} strokeWidth={2.2} aria-hidden />
                        <input
                          type="datetime-local"
                          value={startTime}
                          min={minTimeStr}
                          max={maxTimeStr}
                          onChange={(event) => setStartTime(event.target.value)}
                        />
                      </div>
                    </label>
                  </div>

                  {/* Bảng giá chuyển sang bên trái */}
                  <PriceTable {...carPolicy} />
                </section>

                {/* Bên phải: Chỉ thông tin thanh toán */}
                <aside className="booking-section-card booking-payment-card">
                  <div className="booking-section-heading">
                    <span>Thông tin thanh toán</span>
                    <strong>Xác nhận tiền cọc</strong>
                  </div>

                  <div className="booking-payment-summary">
                    <div className="booking-payment-item">
                      <span>Loại xe</span>
                      <strong>{vehicleTypeLabel('car')}</strong>
                    </div>

                    <div className="booking-payment-item booking-payment-item--total">
                      <span>Số tiền thanh toán</span>
                      <strong>{formatCurrency(carPolicy.basePrice)}</strong>
                    </div>
                  </div>

                  <CancellationPolicy />

                  <button
                    type="button"
                    onClick={handlePreRegisterSubmit}
                    className="hero-search-btn booking-continue-btn"
                  >
                    Tiếp tục thanh toán
                  </button>
                </aside>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}

export default function Booking() {
  return (
    <ProtectedRoute allowedRoles={['user', 'customer']}>
      <BookingContent />
    </ProtectedRoute>
  )
}
