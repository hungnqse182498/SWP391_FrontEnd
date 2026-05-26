import { motion } from 'framer-motion'
import { CheckCircle2, ClipboardList, DollarSign, ShieldCheck } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useBooking } from '../../context/BookingContext'
import { formatCurrency } from '../../utils/pricing'

const cardMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

export default function AdminDashboard() {
  const { getAllBookings } = useBooking()
  const allBookings = getAllBookings()

  const totalRevenue = allBookings.reduce((sum, b) => sum + b.totalAmount, 0)
  const completedCount = allBookings.filter((b) => b.status === 'completed').length
  const paidCount = allBookings.filter((b) => b.status === 'paid').length
  const cancelledCount = allBookings.filter((b) => b.status === 'cancelled').length
  const bookingsCount = allBookings.length
  const pendingCount = allBookings.filter((b) => b.status === 'pending_payment').length
  const averageRevenue = bookingsCount ? totalRevenue / bookingsCount : 0

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <section className="dashboard-page">
        <header className="page-header">
          <div>
            <h1>Bảng điều khiển quản trị</h1>
            <p>Quản lý doanh thu, báo cáo và trạng thái hoạt động của bãi gửi xe.</p>
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
              <ShieldCheck size={24} />
            </div>
            <strong>{bookingsCount ? `${Math.round((completedCount / bookingsCount) * 100)}%` : '0%'}</strong>
            <span>Tỷ lệ hoàn tất</span>
          </motion.article>
          <motion.article className="stat-card card-panel" variants={cardMotion}>
            <div className="stat-card-icon">
              <ClipboardList size={24} />
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
          <p>Hiển thị báo cáo tổng quan theo dữ liệu đặt chỗ hiện có.</p>
        </section>
      </section>
    </ProtectedRoute>
  )
}
