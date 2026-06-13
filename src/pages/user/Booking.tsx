import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, Bike, CalendarDays, Car, MapPin } from 'lucide-react'
import BookingSteps from '../../components/BookingSteps'
import ParkingMap from '../../components/ParkingMap'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import { parkingFloors } from '../../data/parkingFloors'
import type { ParkingFloor, ParkingSpot } from '../../types/parking'
import type { BookingSpot } from '../../types/booking'
import {
  depositAmount,
  DEPOSIT_RATES,
  filterCustomerFloors,
  HOURLY_RATES,
  vehicleTypeLabel,
} from '../../utils/bookingPricing'
import { formatCurrency } from '../../utils/pricing'

function spotLabel(spot: ParkingSpot) {
  return `${spot.row}${spot.number}`
}

function toBookingSpots(spots: ParkingSpot[]): BookingSpot[] {
  return spots.map((spot) => ({
    id: spot.id,
    label: spotLabel(spot),
    row: spot.row,
    number: spot.number,
    type: spot.type,
  }))
}

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
      <h3>Bảng giá giữ xe cố định</h3>
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
          <tr>
            <td>
              <Bike size={16} aria-hidden />
              Xe máy
            </td>
            <td>{formatCurrency(HOURLY_RATES.bike.day)}/giờ</td>
            <td>{formatCurrency(HOURLY_RATES.bike.night)}/giờ</td>
          </tr>
        </tbody>
      </table>
      <p className="booking-price-note">
        Tiền cọc cố định 1 giờ: Ô tô {formatCurrency(DEPOSIT_RATES.car)} · Xe máy{' '}
        {formatCurrency(DEPOSIT_RATES.bike)}
      </p>
    </div>
  )
}

function BookingContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const { setDraft } = useBooking()

  const isCustomer = user?.role === 'customer'
  const locationState = location.state as { vehicle?: 'car' | 'bike'; startTime?: string } | null
  const initialVehicle = locationState?.vehicle ?? 'car'
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
  const [vehiclePlate, setVehiclePlate] = useState(profile?.vehiclePlate ?? '')

  const customerFloors = useMemo(
    () => filterCustomerFloors(vehicle, parkingFloors) as ParkingFloor[],
    [vehicle],
  )

  useEffect(() => {
    if (profile?.vehiclePlate && !vehiclePlate) {
      setVehiclePlate(profile.vehiclePlate)
    }
  }, [profile, vehiclePlate])

  const handleSpotContinue = (spots: ParkingSpot[], floor: ParkingFloor) => {
    if (!vehiclePlate.trim()) {
      alert('Vui lòng nhập biển số xe')
      return
    }

    setDraft({
      floorId: floor.id,
      floorName: floor.name,
      spots: toBookingSpots(spots),
      startTime: new Date().toISOString(),
      hours: 24,
      vehiclePlate: vehiclePlate.trim(),
      vehicleType: vehicle,
      isMonthlyCustomer: true,
    })
    navigate('/dat-cho/xac-nhan')
  }

  const handlePreRegisterSubmit = () => {
    if (!vehiclePlate.trim()) {
      alert('Vui lòng nhập biển số xe')
      return
    }
    if (!startTime) {
      alert('Vui lòng chọn thời gian vào')
      return
    }

    const deposit = depositAmount(vehicle)

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
      vehiclePlate: vehiclePlate.trim(),
      isPreRegistered: true,
      vehicleType: vehicle,
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
                : 'Điền thông tin, thanh toán tiền cọc 1 giờ để đảm bảo có chỗ khi đến.'}
            </p>

           
              {isCustomer ? (
                <>
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

                  <div className="search-grid booking-field-grid">
                    <label className="hero-field">
                      <span>Biển số xe</span>
                      <div>
                        <Car size={18} strokeWidth={2.2} aria-hidden />
                        <input
                          type="text"
                          placeholder="51A-12345"
                          value={vehiclePlate}
                          onChange={(event) => setVehiclePlate(event.target.value)}
                        />
                      </div>
                    </label>
                  </div>

                  <div className="booking-map-wrap">
                    <ParkingMap floors={customerFloors} onContinue={handleSpotContinue} />
                  </div>
                </>
              ) : (
                <div className="booking-split-layout">
                  {/* Bên trái: Thông tin đặt chỗ + Bảng giá */}
                  <section className="booking-section-card booking-info-card">
                    <div className="booking-section-heading">
                      <span>Thông tin đặt chỗ</span>
                      <strong>Nhập thông tin xe và thời gian đến bãi</strong>
                    </div>

                    <div className="availability-head">
                      <div className="vehicle-toggle" aria-label="Chọn loại xe">
                        <button
                          type="button"
                          onClick={() => setVehicle('car')}
                          className={vehicle === 'car' ? 'active' : ''}
                        >
                          <Car size={18} strokeWidth={2.2} aria-hidden />
                          Ô tô
                        </button>
                        <button
                          type="button"
                          onClick={() => setVehicle('bike')}
                          className={vehicle === 'bike' ? 'active' : ''}
                        >
                          <Bike size={18} strokeWidth={2.2} aria-hidden />
                          Xe máy
                        </button>
                      </div>
                    </div>

                    <div className="search-grid booking-field-grid">
                      <label className="hero-field">
                        <span>Loại xe</span>
                        <div>
                          {vehicle === 'car' ? (
                            <Car size={18} strokeWidth={2.2} aria-hidden />
                          ) : (
                            <Bike size={18} strokeWidth={2.2} aria-hidden />
                          )}

                          <select
                            value={vehicle}
                            onChange={(event) =>
                              setVehicle(event.target.value as 'car' | 'bike')
                            }
                          >
                            <option value="car">Ô tô</option>
                            <option value="bike">Xe máy</option>
                          </select>
                        </div>
                      </label>

                      <label className="hero-field">
                        <span>Biển số xe</span>
                        <div>
                          <Car size={18} strokeWidth={2.2} aria-hidden />
                          <input
                            type="text"
                            placeholder="51A-12345"
                            value={vehiclePlate}
                            onChange={(event) => setVehiclePlate(event.target.value)}
                          />
                        </div>
                      </label>
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
                        <strong>{vehicleTypeLabel(vehicle)}</strong>
                      </div>

                      <div className="booking-payment-item booking-payment-item--total">
                        <span>Số tiền thanh toán</span>
                        <strong>{formatCurrency(depositAmount(vehicle))}</strong>
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
