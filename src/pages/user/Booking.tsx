import { useNavigate } from 'react-router-dom'
import BookingSteps from '../../components/BookingSteps'
import ParkingMap from '../../components/ParkingMap'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import { parkingFloors } from '../../data/parkingFloors'
import type { ParkingFloor, ParkingSpot } from '../../types/parking'
import type { BookingSpot } from '../../types/booking'

function spotLabel(s: ParkingSpot) {
  return `${s.row}${s.number}`
}

function toBookingSpots(spots: ParkingSpot[]): BookingSpot[] {
  return spots.map((s) => ({
    id: s.id,
    label: spotLabel(s),
    row: s.row,
    number: s.number,
    type: s.type,
  }))
}

function BookingContent() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { setDraft } = useBooking()

  const handleContinue = (spots: ParkingSpot[], floor: ParkingFloor) => {
    const start = new Date()
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() + 1)

    setDraft({
      floorId: floor.id,
      floorName: floor.name,
      spots: toBookingSpots(spots),
      startTime: start.toISOString(),
      hours: 2,
      vehiclePlate: profile?.vehiclePlate ?? '',
    })
    navigate('/dat-cho/xac-nhan')
  }

  return (
    <section className="booking-page">
      <BookingSteps current={1} />
      <header className="page-header">
        <div>
          <h1>Chọn chỗ đỗ xe</h1>
          <p>Chọn tầng và nhấn ô trống trên sơ đồ — giống chọn ghế rạp chiếu phim.</p>
        </div>
      </header>
      <ParkingMap floors={parkingFloors} onContinue={handleContinue} />
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
