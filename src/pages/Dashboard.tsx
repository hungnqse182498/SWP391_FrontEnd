import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, CalendarDays, Car, CheckCircle2, ClipboardList, DollarSign, MapPin, ShieldCheck } from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../context/AuthContext'
import { useBooking } from '../context/BookingContext'
import { formatCurrency, formatDateTime } from '../utils/pricing'

const cardMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

export default function Dashboard() {
  const { user } = useAuth()
  const { getAllBookings, updateBookingStatus } = useBooking()
  const allBookings = getAllBookings()

  const totalRevenue = allBookings.reduce((sum, b) => sum + b.totalAmount, 0)
  const completedCount = allBookings.filter((b) => b.status === 'completed').length
  const paidCount = allBookings.filter((b) => b.status === 'paid').length
  const cancelledCount = allBookings.filter((b) => b.status === 'cancelled').length
  const bookingsCount = allBookings.length
  const averageRevenue = bookingsCount ? totalRevenue / bookingsCount : 0
  const pendingCount = allBookings.filter((b) => b.status === 'pending_payment').length

  const handleComplete = (id: string) => updateBookingStatus(id, 'completed')
  const handleCancel = (id: string) => updateBookingStatus(id, 'cancelled')

  if (!user) return null

  if (user.role === 'admin') {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <section className="dashboard-page">
          <header className="page-header">
            <div>
              <h1>Bảng điều khiển quản trị</h1>
              <p>Quản lý doanh thu, phân tích lượt xe, tỷ lệ lấp đầy và trạng thái hoạt động.</p>
            </div>
          </header>

          <motion.div className="dashboard-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.article className="stat-card card-panel" variants={cardMotion}>
              <div className="stat-card-icon">
                <DollarSign size={24} />
              </div>
              <strong>{formatCurrency(totalRevenue)}</strong>
              <span>Doanh thu toàn hệ thống</span>
            </motion.article>
            <motion.article className="stat-card card-panel" variants={cardMotion}>
              <div className="stat-card-icon">
                <CheckCircle2 size={24} />
              </div>
              <strong>{bookingsCount}</strong>
              <span>Tổng lượt gửi xe</span>
            </motion.article>
            <motion.article className="stat-card card-panel" variants={cardMotion}>
              <div className="stat-card-icon">
                <CalendarDays size={24} />
              </div>
              <strong>{bookingsCount ? `${Math.round((completedCount / bookingsCount) * 100)}%` : '0%'}</strong>
              <span>Tỷ lệ hoàn tất</span>
            </motion.article>
            <motion.article className="stat-card card-panel" variants={cardMotion}>
              <div className="stat-card-icon">
                <ShieldCheck size={24} />
              </div>
              <strong>{formatCurrency(averageRevenue)}</strong>
              <span>Doanh thu trung bình mỗi lượt</span>
            </motion.article>
          </motion.div>

          <section className="dashboard-report card-panel">
            <h2>Báo cáo nhanh</h2>
            <ul className="dashboard-report-list">
              <li><strong>{paidCount}</strong> lượt đã thanh toán</li>
              <li><strong>{completedCount}</strong> lượt đã hoàn tất</li>
              <li><strong>{cancelledCount}</strong> lượt hủy</li>
              <li><strong>{pendingCount}</strong> lượt chờ thanh toán</li>
            </ul>
            <p>Hiển thị báo cáo tổng quan theo dữ liệu đặt chỗ hiện có từ hệ thống.</p>
          </section>

          <section className="dashboard-table card-panel">
            <header className="dashboard-table-header">
              <div>
                <h2>Đơn gửi xe gần đây</h2>
                <p>Xem nhanh trạng thái và giá trị từng đơn.</p>
              </div>
            </header>
            {allBookings.length === 0 ? (
              <div className="empty-state">
                <ClipboardList size={32} />
                <p>Chưa có đơn gửi xe trong hệ thống.</p>
              </div>
            ) : (
              <div className="dashboard-list">
                {allBookings.slice(0, 8).map((booking) => (
                  <article key={booking.id} className="dashboard-item">
                    <div className="dashboard-item-main">
                      <strong>{booking.id}</strong>
                      <span className={`badge badge-${booking.status}`}>{booking.status.replace('_', ' ')}</span>
                    </div>
                    <div className="dashboard-item-meta">
                      <span><Car size={14} /> {booking.vehiclePlate}</span>
                      <span><MapPin size={14} /> {booking.floorName}</span>
                      <span><CalendarDays size={14} /> {formatDateTime(booking.startTime)}</span>
                    </div>
                    <div className="dashboard-item-footer">
                      <strong>{formatCurrency(booking.totalAmount)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <section className="dashboard-page">
        <header className="page-header">
          <div>
            <h1>Bảng điều khiển nhân viên</h1>
            <p>Quản lý đơn đăng ký, xác nhận chỗ đặt và cập nhật trạng thái hiện trường.</p>
          </div>
        </header>

        <motion.div className="dashboard-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.article className="stat-card card-panel" variants={cardMotion}>
            <div className="stat-card-icon">
              <ClipboardList size={24} />
            </div>
            <strong>{bookingsCount}</strong>
            <span>Tổng đơn hiện có</span>
          </motion.article>
          <motion.article className="stat-card card-panel" variants={cardMotion}>
            <div className="stat-card-icon">
              <CheckCircle2 size={24} />
            </div>
            <strong>{completedCount}</strong>
            <span>Đã hoàn tất</span>
          </motion.article>
          <motion.article className="stat-card card-panel" variants={cardMotion}>
            <div className="stat-card-icon">
              <ArrowRight size={24} />
            </div>
            <strong>{paidCount}</strong>
            <span>Đơn chờ xử lý</span>
          </motion.article>
          <motion.article className="stat-card card-panel" variants={cardMotion}>
            <div className="stat-card-icon">
              <BarChart3 size={24} />
            </div>
            <strong>{formatCurrency(totalRevenue)}</strong>
            <span>Doanh thu hiện tại</span>
          </motion.article>
        </motion.div>

        <section className="dashboard-table card-panel">
          <header className="dashboard-table-header">
            <div>
              <h2>Đơn đăng ký</h2>
              <p>Xem và cập nhật trạng thái đặt chỗ.</p>
            </div>
          </header>
          {allBookings.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={32} />
              <p>Chưa có đơn gửi xe nào.</p>
            </div>
          ) : (
            <div className="dashboard-list">
              {allBookings.map((booking) => (
                <article key={booking.id} className="dashboard-item">
                  <div className="dashboard-item-main">
                    <strong>{booking.id}</strong>
                    <span className={`badge badge-${booking.status}`}>{booking.status.replace('_', ' ')}</span>
                  </div>
                  <div className="dashboard-item-meta">
                    <span><Car size={14} /> {booking.vehiclePlate}</span>
                    <span><MapPin size={14} /> {booking.floorName}</span>
                    <span><CalendarDays size={14} /> {formatDateTime(booking.startTime)}</span>
                  </div>
                  <div className="dashboard-item-footer">
                    <strong>{formatCurrency(booking.totalAmount)}</strong>
                    <div className="dashboard-actions">
                      {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleComplete(booking.id)}>
                          Hoàn tất
                        </button>
                      )}
                      {booking.status !== 'cancelled' && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCancel(booking.id)}>
                          Hủy
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ProtectedRoute>
  )
}
