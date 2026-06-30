import { useState, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { AlertTriangle, Bike, Car, MapPin } from 'lucide-react'
import BookingSteps from '../../components/BookingSteps'
import BookingDatetimeField from '../../components/BookingDatetimeField'
import ParkingMap from '../../components/ParkingMap'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import { parkingFloors } from '../../data/parkingFloors'
import type { ParkingFloor } from '../../types/parking'
import {
  filterCustomerFloors,
  vehicleTypeLabel,
} from '../../utils/bookingPricing'
import { formatCurrency } from '../../utils/pricing'
import {
  clampBookingDatetimeLocal,
  defaultBookingDatetimeLocal,
  isBookingDatetimeLocalValid,
} from '../../utils/bookingTime'

function CancellationPolicy() {
  return (
    <div className="cancel-policy-banner cancel-policy-banner--compact" role="note">
      <AlertTriangle size={20} strokeWidth={2.2} aria-hidden />
      <div>
        <strong>Chính sách hủy đặt chỗ</strong>
        <p>
          Hủy đặt chỗ <strong>không hoàn tiền</strong>. Tiền cọc sẽ không được hoàn lại dưới mọi
          hình thức.{" "}
          <Link to="/legal#booking-rules" style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 'bold' }}>
            Tìm hiểu thêm về chính sách của chúng tôi
          </Link>
        </p>
      </div>
    </div>
  )
}

function PriceTable() {
  const { getPolicy } = useBooking()
  getPolicy('car')

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
          <tr style={{ fontWeight: 'bold', backgroundColor: '#eef6ff' }}>
            <td>
              <Car size={16} aria-hidden style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Giờ đầu
            </td>
            <td>30.000 đ</td>
          </tr>
          <tr>
            <td>Ban ngày (6h – 22h)</td>
            <td>10.000 đ/giờ</td>
          </tr>
          <tr>
            <td>Ban đêm (22h – 6h)</td>
            <td>20.000 đ/giờ</td>
          </tr>
        </tbody>
      </table>
      <p className="booking-price-note">
        Giờ đầu: 30.000 đ — Các giờ tiếp theo: 10.000 đ/giờ (06:00–22:00), 20.000 đ/giờ (22:00–06:00).
      </p>
    </div>
  )
}

function BookingContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { setDraft, getPolicy } = useBooking()

  const isCustomer = user?.role === 'customer'
  const locationState = location.state as { vehicle?: 'car' | 'bike'; startTime?: string } | null
  const initialVehicle = isCustomer
    ? (locationState?.vehicle ?? 'car')
    : 'car'
  const initialStartTime = locationState?.startTime ?? ''

  const [vehicle, setVehicle] = useState<'car' | 'bike'>(initialVehicle)
  const [startTime, setStartTime] = useState<string>(() =>
    initialStartTime
      ? clampBookingDatetimeLocal(initialStartTime)
      : defaultBookingDatetimeLocal(),
  )

  const customerFloors = useMemo(
    () => filterCustomerFloors(vehicle, parkingFloors) as ParkingFloor[],
    [vehicle],
  )

  const handlePreRegisterSubmit = () => {
    const normalized = clampBookingDatetimeLocal(startTime)
    if (!isBookingDatetimeLocalValid(normalized)) {
      alert('Vui lòng chọn thời gian trong vòng 5 giờ tới.')
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
      startTime: new Date(normalized).toISOString(),
      hours: 1,
      vehiclePlate: '',
      isPreRegistered: true,
      vehicleType: 'car',
      depositAmount: deposit,
    })

    navigate('/dat-cho/xac-nhan')
  }

  return (
    <div className="home-landing booking-landing">
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
              {isCustomer ? 'Chọn chỗ đỗ tháng' : 'Đăng ký giữ chỗ trước'}
              <span>{isCustomer ? 'chọn tầng & vị trí' : 'chọn giờ vào bãi'}</span>
            </h1>

            <p className="home-hero-lead">
              {isCustomer
                ? 'Khách hàng tháng: chọn tầng và ô đỗ cố định theo loại xe của bạn.'
                : 'Đặt trước chỉ dành cho ô tô. Chọn giờ vào bãi và thanh toán tiền cọc 1 giờ.'}
            </p>

           
              {isCustomer ? (
                <div className="booking-customer-layout">
                  <section className="booking-section-card booking-customer-form">
                    <div className="booking-section-heading">
                      <span>Thông tin xe</span>
                      <strong>Chọn loại xe</strong>
                    </div>

                    <div className="availability-head">
                      <div className="vehicle-toggle" aria-label="Chọn loại xe">
                        <button
                          type="button"
                          onClick={() => setVehicle('car')}
                          className={vehicle === 'car' ? 'active' : ''}
                        >
                          <Car size={18} strokeWidth={2.2} aria-hidden />
                          Ô tô (B2, B3)
                        </button>
                        <button
                          type="button"
                          onClick={() => setVehicle('bike')}
                          className={vehicle === 'bike' ? 'active' : ''}
                        >
                          <Bike size={18} strokeWidth={2.2} aria-hidden />
                          Xe máy (B1)
                        </button>
                      </div>
                    </div>
                  </section>

                  <div className="booking-map-panel">
                    <ParkingMap floors={customerFloors} />
                  </div>
                </div>
              ) : (
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
                      <BookingDatetimeField
                        id="booking-arrival-time"
                        value={startTime}
                        onChange={setStartTime}
                      />
                    </div>

                    {/* Bảng giá chuyển sang bên trái */}
                    <PriceTable />
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
                        <strong>{formatCurrency(getPolicy('car').basePrice)}</strong>
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
              )}
            
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
