import { motion } from 'framer-motion'
import { Ban, Calendar, Car, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useBooking } from '../../context/BookingContext'
import { formatCurrency, formatDateTime } from '../../utils/pricing'

const statusLabel: Record<string, string> = {
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
  completed: 'Hoàn tất',
  pending_payment: 'Chờ thanh toán',
}

function HistoryContent() {
  const { getMyBookings, cancelBooking } = useBooking()
  const list = getMyBookings()

  return (
    <section className="history-page">
      <header className="page-header">
        <div>
          <h1>Lịch sử đặt chỗ</h1>
          <p>Các lần đặt chỗ đỗ xe của bạn.</p>
        </div>
      </header>

      {list.length === 0 ? (
        <div className="empty-state card-panel">
          <Calendar size={40} strokeWidth={1.5} aria-hidden />
          <p>Chưa có đơn đặt chỗ nào.</p>
          <Link to="/dat-cho" className="btn btn-primary">Đặt chỗ ngay</Link>
        </div>
      ) : (
        <ul className="history-list">
          {list.map((b, i) => (
            <motion.li
              key={b.id}
              className={`history-item card-panel status-${b.status}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="history-item-head">
                <strong>{b.id}</strong>
                <span className={`badge badge-${b.status}`}>{statusLabel[b.status] ?? b.status}</span>
              </div>
              <div className="history-meta">
                <span><MapPin size={14} /> {b.floorName}</span>
                <span><Car size={14} /> {b.vehiclePlate}</span>
                <span><Calendar size={14} /> {formatDateTime(b.startTime)}</span>
              </div>
              <p className="history-spots">Chỗ: {b.spots.map((s) => s.label).join(', ')}</p>
              <div className="history-footer">
                <strong>{formatCurrency(b.totalAmount)}</strong>
                {b.status === 'paid' && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancelBooking(b.id)}>
                    <Ban size={14} /> Hủy đơn
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function BookingHistory() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  )
}
