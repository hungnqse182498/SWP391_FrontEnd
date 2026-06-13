import { motion } from 'framer-motion'
import { Ban, Calendar, Car, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { reservationApi, type ReservationDto } from '../../utils/apiServices'
import { formatCurrency, formatDateTime } from '../../utils/pricing'

const statusLabel: Record<string, string> = {
  Pending: 'Chờ thanh toán',
  Confirmed: 'Đã xác nhận',
  Cancelled: 'Đã hủy',
  Completed: 'Hoàn tất',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
}

function HistoryContent() {
  const [list, setList] = useState<ReservationDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await reservationApi.getMy()
      if (res.isSuccess && res.result) {
        setList(res.result)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCancel = async (id: string) => {
    try {
      const res = await reservationApi.cancel(id)
      if (res.isSuccess) load()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <section className="history-page">
      <header className="page-header">
        <div>
          <h1>Lịch sử đặt chỗ</h1>
          <p>Các lần đăng ký giữ chỗ trước của bạn.</p>
        </div>
      </header>

      {loading ? (
        <div className="empty-state card-panel"><p>Đang tải...</p></div>
      ) : list.length === 0 ? (
        <div className="empty-state card-panel">
          <Calendar size={40} strokeWidth={1.5} aria-hidden />
          <p>Chưa có đơn đặt chỗ nào.</p>
          <Link to="/dat-cho" className="btn btn-primary">Đặt chỗ ngay</Link>
        </div>
      ) : (
        <ul className="history-list">
          {list.map((b, i) => {
            const deposit = b.payments?.[0]?.amount ?? 0
            const paymentStatus = b.payments?.[0]?.paymentStatus
            return (
              <motion.li
                key={b.reservationId}
                className={`history-item card-panel status-${b.status?.toLowerCase()}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="history-item-head">
                  <strong>{b.reservationId.slice(0, 8).toUpperCase()}</strong>
                  <span className={`badge badge-${b.status?.toLowerCase()}`}>
                    {statusLabel[b.status] ?? b.status}
                  </span>
                </div>
                <div className="history-meta">
                  <span><MapPin size={14} /> Đăng ký trước</span>
                  <span><Car size={14} /> {b.vehicleType?.typeName ?? 'Xe'}</span>
                  <span><Calendar size={14} /> {formatDateTime(b.expectedEntryTime)}</span>
                </div>
                <div className="history-footer">
                  <strong>{formatCurrency(deposit)}</strong>
                  {b.status === 'Confirmed' || paymentStatus === 'Success' ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCancel(b.reservationId)}>
                      <Ban size={14} /> Hủy (không hoàn tiền)
                    </button>
                  ) : null}
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default function BookingHistory() {
  return (
    <ProtectedRoute allowedRoles={['user', 'customer']}>
      <HistoryContent />
    </ProtectedRoute>
  )
}
