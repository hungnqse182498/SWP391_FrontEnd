import { motion } from 'framer-motion'
import { Calendar, Car, Clock, MapPin } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import BookingSteps from '../components/BookingSteps'
import FormField from '../components/FormField'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../context/AuthContext'
import { useBooking } from '../context/BookingContext'
import { calcTotal, formatCurrency } from '../utils/pricing'

function ConfirmContent() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { draft, setDraft } = useBooking()
  const [hours, setHours] = useState(draft?.hours ?? 2)
  const [startLocal, setStartLocal] = useState('')
  const [plate, setPlate] = useState(draft?.vehiclePlate ?? profile?.vehiclePlate ?? '')

  useEffect(() => {
    if (!draft) return
    const d = new Date(draft.startTime)
    const pad = (n: number) => String(n).padStart(2, '0')
    setStartLocal(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    )
    setHours(draft.hours)
    setPlate(draft.vehiclePlate)
  }, [draft])

  if (!draft || draft.spots.length === 0) {
    return <Navigate to="/dat-cho" replace />
  }

  const total = calcTotal(draft.spots.length, hours)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!plate.trim()) return
    setDraft({
      ...draft,
      hours,
      startTime: new Date(startLocal).toISOString(),
      vehiclePlate: plate.trim(),
    })
    navigate('/thanh-toan')
  }

  return (
    <section className="booking-page">
      <BookingSteps current={2} />
      <header className="page-header">
        <div>
          <h1>Xác nhận đặt chỗ</h1>
          <p>Kiểm tra thông tin trước khi thanh toán.</p>
        </div>
      </header>

      <motion.div
        className="confirm-layout"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="confirm-card">
          <h2>
            <MapPin size={20} strokeWidth={2} aria-hidden />
            {draft.floorName}
          </h2>
          <ul className="confirm-spots">
            {draft.spots.map((s) => (
              <li key={s.id}>
                <strong>{s.label}</strong>
                <span>{s.type === 'ev' ? 'Xe điện' : s.type === 'handicap' ? 'Khuyết tật' : 'Tiêu chuẩn'}</span>
              </li>
            ))}
          </ul>
        </div>

        <form className="confirm-form card-panel" onSubmit={handleSubmit}>
          <h2>Thông tin đặt chỗ</h2>
          <FormField
            label="Biển số xe"
            name="plate"
            id="plate"
            icon={Car}
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="51A-12345"
            required
          />
          <div className="form-field">
            <label htmlFor="start">
              <Calendar size={16} strokeWidth={2} aria-hidden /> Thời gian bắt đầu
            </label>
            <input
              id="start"
              type="datetime-local"
              className="input-standalone"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="hours">
              <Clock size={16} strokeWidth={2} aria-hidden /> Số giờ đỗ
            </label>
            <select
              id="hours"
              className="input-standalone"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                <option key={h} value={h}>
                  {h} giờ
                </option>
              ))}
            </select>
          </div>

          <div className="confirm-summary">
            <div>
              <span>Số chỗ</span>
              <strong>{draft.spots.length}</strong>
            </div>
            <div>
              <span>Tổng thanh toán</span>
              <strong className="price-total">{formatCurrency(total)}</strong>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Tiếp tục thanh toán
          </button>
        </form>
      </motion.div>
    </section>
  )
}

export default function BookingConfirm() {
  return (
    <ProtectedRoute>
      <ConfirmContent />
    </ProtectedRoute>
  )
}
