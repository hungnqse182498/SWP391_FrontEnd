import { useState, useEffect, useMemo } from 'react'
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
  filterCustomerFloors,
  vehicleTypeLabel,
} from '../../utils/bookingPricing'
import { formatCurrency } from '../../utils/pricing'
import { apiClient } from '../../config/api'

/* ---------- Types ---------- */
interface CarPolicyData {
  basePrice: number
  extraHourPrice: number
  nightSurcharge: number
}

/* ---------- Fallback values (used when API is unavailable) ---------- */
const FALLBACK_POLICY: CarPolicyData = {
  basePrice: 30000,
  extraHourPrice: 10000,
  nightSurcharge: 20000,
}

/* ---------- Helpers ---------- */
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

function PriceTable({ policy }: { policy: CarPolicyData }) {
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
          <tr>
            <td>
              <Car size={16} aria-hidden />
              <strong>Giá giờ đầu</strong>
            </td>
            <td><strong style={{ fontSize: '1.1em' }}>{formatCurrency(policy.basePrice)}</strong></td>
          </tr>
          <tr>
            <td>Phụ phí giờ tiếp theo (6h – 22h)</td>
            <td>{formatCurrency(policy.extraHourPrice)}/giờ</td>
          </tr>
          <tr>
            <td>Phụ phí giờ tiếp theo (22h – 6h)</td>
            <td>{formatCurrency(policy.nightSurcharge)}/giờ</td>
          </tr>
        </tbody>
      </table>
      <p className="booking-price-note">
        Tiền cọc cố định 1 giờ: {formatCurrency(policy.basePrice)}. Chỉ áp dụng cho ô tô — xe máy không hỗ trợ đặt trước.
      </p>
    </div>
  )
}

/* ---------- Main component ---------- */
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

  /* --- Dynamic pricing state (guest flow only) --- */
  const [carPolicy, setCarPolicy] = useState<CarPolicyData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isCustomer) return // Customer flow doesn't need API pricing

    let cancelled = false
    setLoading(true)

    apiClient
      .get<{ result: Array<{ vehicleTypeName?: string; basePrice: number; extraHourPrice: number; nightSurcharge: number }> }>('/PricingPolicy')
      .then((data) => {
        if (cancelled) return
        const policies = data?.result ?? (Array.isArray(data) ? data : [])
        const carItem = policies.find((p) => p.vehicleTypeName === 'Ô Tô') ?? policies[0]
        if (carItem) {
          setCarPolicy({
            basePrice: carItem.basePrice,
            extraHourPrice: carItem.extraHourPrice,
            nightSurcharge: carItem.nightSurcharge,
          })
        } else {
          setCarPolicy(FALLBACK_POLICY)
        }
      })
      .catch(() => {
        if (!cancelled) setCarPolicy(FALLBACK_POLICY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [isCustomer])

  const effectivePolicy = carPolicy ?? FALLBACK_POLICY

  const customerFloors = useMemo(
    () => filterCustomerFloors(vehicle, parkingFloors) as ParkingFloor[],
    [vehicle],
  )

  const handlePreRegisterSubmit = () => {
    if (!startTime) {
      alert('Vui lòng chọn thời gian vào')
      return
    }

    const deposit = effectivePolicy.basePrice

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
                    {loading ? (
                      <p style={{ padding: '1rem', opacity: 0.7 }}>Đang tải giá...</p>
                    ) : (
                      <PriceTable policy={effectivePolicy} />
                    )}
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
                        <strong>{loading ? '...' : formatCurrency(effectivePolicy.basePrice)}</strong>
                      </div>
                    </div>

                    <CancellationPolicy />

                    <button
                      type="button"
                      onClick={handlePreRegisterSubmit}
                      className="hero-search-btn booking-continue-btn"
                      disabled={loading}
                    >
                      {loading ? 'Đang tải giá...' : 'Tiếp tục thanh toán'}
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

