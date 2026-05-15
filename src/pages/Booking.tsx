import { ArrowLeft, CheckCircle2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import ParkingMap from '../components/ParkingMap'
import { useAuth } from '../context/AuthContext'
import { parkingFloors } from '../data/parkingFloors'
import type { ParkingFloor, ParkingSpot } from '../types/parking'

export default function Booking() {
  const { isAuthenticated } = useAuth()
  const [success, setSuccess] = useState<string | null>(null)

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />
  }

  const handleConfirm = (spots: ParkingSpot[], floor: ParkingFloor) => {
    const labels = spots.map((s) => `${s.row}${s.number}`).join(', ')
    setSuccess(`Đã đặt ${spots.length} chỗ tại ${floor.name}: ${labels}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="booking-page">
      <header className="page-header">
        <div>
          <h1>Đặt chỗ đỗ xe</h1>
          <p>Chọn tầng, nhấn ô trống trên sơ đồ — giao diện giống chọn ghế rạp chiếu phim.</p>
        </div>
        <Link to="/" className="btn btn-ghost">
          <ArrowLeft size={18} strokeWidth={2} aria-hidden />
          Trang chủ
        </Link>
      </header>

      {success && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={20} strokeWidth={2} aria-hidden />
          <span>{success}</span>
          <button type="button" className="alert-close" onClick={() => setSuccess(null)} aria-label="Đóng">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      )}

      <ParkingMap floors={parkingFloors} onConfirm={handleConfirm} />
    </section>
  )
}
