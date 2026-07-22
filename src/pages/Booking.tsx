import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CalendarDays, Car, MapPin } from 'lucide-react'
import BookingSteps from '../components/BookingSteps'
import ParkingMap from '../components/ParkingMap'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../context/AuthContext'
import { useBooking } from '../context/BookingContext'
import { parkingFloors } from '../data/parkingFloors'
import { formatCurrency } from '../utils/pricing'
import { defaultBookingDatetimeLocal } from '../utils/bookingTime'
import { vietnamDatetimeLocalToUtcIso } from '../utils/dateTime'

function BookingContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const { setDraft, getPolicy } = useBooking()
  const carPolicy = getPolicy('car')

  // Read initial states passed from Home Page
  const locationState = location.state as { vehicle?: 'car' | 'bike'; startTime?: string } | null
  const initialStartTime = locationState?.startTime ?? ''

  const [bookingType, setBookingType] = useState<'spot' | 'preregister'>(
    initialStartTime ? 'preregister' : 'spot'
  )
  const [startTime, setStartTime] = useState<string>(() => {
    if (initialStartTime) return initialStartTime
    return defaultBookingDatetimeLocal()
  })
  const [vehiclePlate, setVehiclePlate] = useState(profile?.vehiclePlate ?? '')

  useEffect(() => {
    if (profile?.vehiclePlate && !vehiclePlate) {
      setVehiclePlate(profile.vehiclePlate)
    }
  }, [profile])

  const handlePreRegisterSubmit = () => {
    if (!vehiclePlate.trim()) {
      alert('Vui lòng nhập biển số xe')
      return
    }
    if (!startTime) {
      alert('Vui lòng chọn thời gian vào')
      return
    }

    const depositAmount = carPolicy.basePrice

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
      hours: 1, // Fixed 1 hour deposit
      vehiclePlate: vehiclePlate.trim(),
      isPreRegistered: true,
      vehicleType: 'car',
      depositAmount,
    } as any)

    navigate('/dat-cho/xac-nhan')
  }

  return (
    <section className="home-hero" style={{ minHeight: 'auto', paddingTop: '2.5rem', paddingBottom: '3.5rem' }}>
      <div className="home-hero-media" aria-hidden="true">
        <img src="/image/banner.jpg" alt="" className="home-hero-img" />
        <div className="home-hero-overlay" />
      </div>

      <div className="home-hero-inner" style={{ maxWidth: '1200px', width: '100%' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <BookingSteps current={1} />
        </div>

        <div className="home-hero-copy" style={{ maxWidth: '100%' }}>
          <div className="location-pill">
            <MapPin size={18} strokeWidth={2.2} aria-hidden />
            01 Lưu Hữu Phước, Đông Hòa, Bình Dương
          </div>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--blue-900)' }}>
            Đặt chỗ đỗ xe
          </h1>
          <p className="home-hero-lead" style={{ marginBottom: '2rem', fontSize: '1.05rem' }}>
            Chọn hình thức đỗ xe linh hoạt phù hợp với lịch trình của bạn.
          </p>

          <div className="availability-card" style={{ background: 'rgba(255, 255, 255, 0.96)', width: '100%', maxWidth: '900px' }}>
            {/* Booking Type Selector */}
            <div className="vehicle-toggle" style={{ marginBottom: '1.5rem', display: 'flex', width: '100%', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setBookingType('spot')}
                className={bookingType === 'spot' ? 'active' : ''}
                style={{ flex: 1, justifyContent: 'center', height: '44px' }}
              >
                Đặt chỗ theo vị trí (Chọn ô)
              </button>
              <button
                type="button"
                onClick={() => setBookingType('preregister')}
                className={bookingType === 'preregister' ? 'active' : ''}
                style={{ flex: 1, justifyContent: 'center', height: '44px' }}
              >
                Đăng ký trước (Chọn giờ)
              </button>
            </div>

            {bookingType === 'spot' ? (
              <div>
                <header className="page-header" style={{ marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', color: 'var(--blue-900)', marginBottom: '0.25rem' }}>
                      Chọn chỗ đỗ xe trên sơ đồ
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Chọn tầng và nhấn vào ô còn trống (màu xanh lá) trên sơ đồ bên dưới.
                    </p>
                  </div>
                </header>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)' }}>
                  <ParkingMap floors={parkingFloors} />
                </div>
              </div>
            ) : (
              <div>
                <header className="page-header" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', color: 'var(--blue-900)', marginBottom: '0.25rem' }}>
                      Đăng ký giữ chỗ trước
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Điền thông tin và thanh toán tiền cọc 1 giờ để đảm bảo có chỗ khi đến.
                    </p>
                  </div>
                </header>

                <div className="search-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <label className="hero-field">
                    <span>Loại xe</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <Car size={18} />
                      <span style={{ fontWeight: 600 }}>Ô tô</span>
                    </div>
                  </label>

                  <label className="hero-field">
                    <span>Biển số xe</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <Car size={18} />
                      <input
                        type="text"
                        placeholder="Nhập biển số (VD: 51A-12345)"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontWeight: 600 }}
                      />
                    </div>
                  </label>
                </div>

                <div className="search-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Thời gian vào */}
                  <label className="hero-field">
                    <span>Thời gian vào bãi</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <CalendarDays size={18} />
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontWeight: 600 }}
                      />
                    </div>
                  </label>
                </div>

                {/* Price Table - positioned under time select */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue-900)', marginBottom: '0.75rem' }}>
                    Bảng giá giữ xe ô tô
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem' }}>Loại xe</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Giá ban ngày (6h - 22h)</th>
                          <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Giá ban đêm (22h - 6h)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '0.75rem 0.25rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Car size={16} className="text-blue-600" />
                              Ô tô
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '0.75rem 0.25rem', color: 'var(--text)' }}>{formatCurrency(carPolicy.basePrice)}</td>
                          <td style={{ textAlign: 'center', padding: '0.75rem 0.25rem', color: 'var(--text)' }}>{formatCurrency(carPolicy.nightSurcharge)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer action: Deposit on left, continue on right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Tiền cọc cần thanh toán (cố định 1h)
                    </span>
                    <strong style={{ fontSize: '1.65rem', color: 'var(--blue-700)', fontWeight: 800 }}>
                      {formatCurrency(carPolicy.basePrice)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={handlePreRegisterSubmit}
                    className="btn btn-primary"
                    style={{ height: '48px', padding: '0 2rem', borderRadius: '12px', fontSize: '0.95rem' }}
                  >
                    Tiếp tục thanh toán
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Booking() {
  return (
    <ProtectedRoute>
      <BookingContent />
    </ProtectedRoute>
  )
}
