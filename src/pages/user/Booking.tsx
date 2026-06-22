import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, Bike, CalendarDays, Car, MapPin } from 'lucide-react'
import BookingSteps from '../../components/BookingSteps'
import ParkingMap from '../../components/ParkingMap'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import { parkingFloors } from '../../data/parkingFloors'
import type { ParkingFloor } from '../../types/parking'
import {
  depositAmount,
  DEPOSIT_RATES,
  filterCustomerFloors,
  HOURLY_RATES,
  vehicleTypeLabel,
} from '../../utils/bookingPricing'
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

function PriceTable() {
  return (
    <div className="booking-price-table">
      <h3>Bảng giá giữ xe ô tô</h3>
      <table>
        <thead>
          <tr>
            <th>Loại xe</th>
            <th>Giá ban ngày (6h – 22h)</th>
            <th>Giá ban đêm (22h – 6h)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <Car size={16} aria-hidden />
              Ô tô
            </td>
            <td>{formatCurrency(HOURLY_RATES.car.day)}/giờ</td>
            <td>{formatCurrency(HOURLY_RATES.car.night)}/giờ</td>
          </tr>
        </tbody>
      </table>
      <p className="booking-price-note">
        Tiền cọc cố định 1 giờ: {formatCurrency(DEPOSIT_RATES.car)}. Chỉ áp dụng cho ô tô — xe máy không hỗ trợ đặt trước.
      </p>
    </div>
  )
}

function BookingContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { setDraft } = useBooking()

  const isCustomer = user?.role === 'customer'
  const locationState = location.state as { vehicle?: 'car' | 'bike'; startTime?: string } | null
  const initialVehicle = isCustomer
    ? (locationState?.vehicle ?? 'car')
    : 'car'
  const initialStartTime = locationState?.startTime ?? ''

  const [vehicle, setVehicle] = useState<'car' | 'bike'>(initialVehicle)
  const [startTime, setStartTime] = useState<string>(() => {
    if (initialStartTime) return initialStartTime
    const now = new Date()
    now.setHours(now.getHours() + 1)
    now.setMinutes(0, 0, 0)
    const tzoffset = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - tzoffset).toISOString().slice(0, 16)
  })

  const customerFloors = useMemo(
    () => filterCustomerFloors(vehicle, parkingFloors) as ParkingFloor[],
    [vehicle],
  )

  const handlePreRegisterSubmit = () => {
    if (!startTime) {
      alert('Vui lòng chọn thời gian vào')
      return
    }

    const deposit = depositAmount('car')

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
      startTime: new Date(startTime).toISOString(),
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
                      <label className="hero-field">
                        <span>Thời gian vào bãi</span>
                        <div>
                          <CalendarDays size={18} strokeWidth={2.2} aria-hidden />
                          <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(event) => setStartTime(event.target.value)}
                          />
                        </div>
                      </label>
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
                        <strong>{formatCurrency(depositAmount('car'))}</strong>
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
