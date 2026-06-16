import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike, Car, MapPin } from 'lucide-react'
import ParkingMap from '../../components/ParkingMap'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { parkingFloors } from '../../data/parkingFloors'
import type { ParkingFloor, ParkingSpot } from '../../types/parking'
import { filterCustomerFloors, vehicleTypeLabel } from '../../utils/bookingPricing'
import { subscriptionApi } from '../../utils/apiServices'
import { formatCurrency } from '../../utils/pricing'

interface PlanOption {
  months: number
  label: string
  carPrice: number
  bikePrice: number
  tag?: string
}

const PLANS: PlanOption[] = [
  { months: 1, label: '1 Tháng', carPrice: 1200000, bikePrice: 450000, tag: 'Linh hoạt' },
  { months: 3, label: '3 Tháng', carPrice: 3200000, bikePrice: 1200000, tag: 'Tiết kiệm' },
  { months: 12, label: '12 Tháng', carPrice: 11500000, bikePrice: 4200000, tag: 'Cao cấp' },
]

function SubscribeContent() {
  const navigate = useNavigate()
  const { profile, refreshProfile, upgradeToCustomer } = useAuth()
  const [vehicle, setVehicle] = useState<'car' | 'bike'>('car')
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(PLANS[1])
  const [licensePlate, setLicensePlate] = useState(profile?.vehiclePlate ?? '')
  const [selectedSpot, setSelectedSpot] = useState<{ floor: ParkingFloor; spot: ParkingSpot } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const customerFloors = filterCustomerFloors(vehicle, parkingFloors) as ParkingFloor[]
  const price = vehicle === 'car' ? selectedPlan.carPrice : selectedPlan.bikePrice

  useEffect(() => {
    if (profile?.vehiclePlate) setLicensePlate(profile.vehiclePlate)
  }, [profile])

  const handleSpotSelect = (spot: ParkingSpot, floor: ParkingFloor) => {
    setSelectedSpot({ floor, spot })
  }

  const handleSubscribe = async () => {
    if (!licensePlate.trim()) {
      setError('Vui lòng nhập biển số xe')
      return
    }
    if (!selectedSpot) {
      setError('Vui lòng chọn tầng và chỗ đỗ')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await subscriptionApi.subscribe({
        vehicleTypeName: vehicleTypeLabel(vehicle),
        licensePlate: licensePlate.trim(),
        months: selectedPlan.months,
        price,
        preferredFloorName: selectedSpot.floor.name,
        preferredSlotLabel: `${selectedSpot.spot.row}${selectedSpot.spot.number}`,
      })

      if (res.isSuccess) {
        await refreshProfile()
        upgradeToCustomer()
        navigate('/dat-cho', { state: { subscribed: true } })
        return
      }
      setError(res.message || 'Đăng ký gói tháng thất bại')
    } catch (err) {
      console.error(err)
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="subscribe-page">
      <header className="page-header">
        <div>
          <h1>Đăng ký gói tháng</h1>
          <p>Chọn gói, loại xe, tầng và chỗ đỗ cố định. Sau khi đăng ký, tài khoản nâng cấp lên khách hàng (customer).</p>
        </div>
      </header>

      <div className="subscribe-layout">
        <div className="card-panel">
          <h2>Chọn gói</h2>
          <div className="subscribe-plans">
            {PLANS.map((plan) => (
              <button
                key={plan.months}
                type="button"
                className={`subscribe-plan-btn${selectedPlan.months === plan.months ? ' active' : ''}`}
                onClick={() => setSelectedPlan(plan)}
              >
                <span className="plan-tag">{plan.tag}</span>
                <strong>{plan.label}</strong>
                <span>{formatCurrency(vehicle === 'car' ? plan.carPrice : plan.bikePrice)}</span>
              </button>
            ))}
          </div>

          <div className="vehicle-toggle subscribe-vehicle-toggle">
            <button type="button" className={vehicle === 'car' ? 'active' : ''} onClick={() => setVehicle('car')}>
              <Car size={18} /> Ô tô (B2, B3)
            </button>
            <button type="button" className={vehicle === 'bike' ? 'active' : ''} onClick={() => setVehicle('bike')}>
              <Bike size={18} /> Xe máy (B1)
            </button>
          </div>

          <label className="hero-field">
            <span>Biển số xe</span>
            <div>
              <Car size={18} />
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="51A-12345"
              />
            </div>
          </label>
        </div>

        <div className="card-panel">
          <h2>Chọn tầng & chỗ đỗ</h2>
          <ParkingMap floors={customerFloors} onSelect={handleSpotSelect} />
          {selectedSpot && (
            <p className="selected-spot-info">
              <MapPin size={16} />
              Đã chọn: {selectedSpot.floor.name} — {selectedSpot.spot.row}{selectedSpot.spot.number}
            </p>
          )}
        </div>
      </div>

      <div className="subscribe-footer card-panel">
        <div>
          <span>Tổng thanh toán</span>
          <strong>{formatCurrency(price)}</strong>
          <small>Gói {selectedPlan.label} · {vehicleTypeLabel(vehicle)}</small>
        </div>
        {error && <p className="alert-inline alert-error">{error}</p>}
        <button type="button" className="btn btn-primary" disabled={loading} onClick={handleSubscribe}>
          {loading ? 'Đang xử lý...' : 'Đăng ký & nâng cấp tài khoản'}
        </button>
      </div>
    </section>
  )
}

export default function SubscribeMonthly() {
  return (
    <ProtectedRoute allowedRoles={['user']}>
      <SubscribeContent />
    </ProtectedRoute>
  )
}
