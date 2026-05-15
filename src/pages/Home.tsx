import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Building2, ParkingCircle, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const BANNER_SRC = '/image/banner.jpg'

const stats: {
  icon: LucideIcon
  label: string
  value: string
  unit: string
}[] = [
  { icon: ParkingCircle, label: 'Chỗ trống', value: '156', unit: 'ô / 288 tổng' },
  { icon: Wallet, label: 'Chi phí', value: '15.000đ', unit: 'mỗi giờ' },
  { icon: Building2, label: 'Tầng hầm', value: '3', unit: 'B1 · B2 · B3' },
]

const bannerMotion = {
  hidden: { opacity: 0, scale: 1.04 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const btnMotion = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const gridMotion = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.45 } },
}

const cardMotion = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const bookHref = isAuthenticated ? '/dat-cho' : '/dang-nhap'

  return (
    <div className="home-page">
      <motion.section
        className="home-banner"
        variants={bannerMotion}
        initial="hidden"
        animate="visible"
      >
        <img src={BANNER_SRC} alt="" className="home-banner-img" />
        <div className="home-banner-overlay" aria-hidden="true" />
        <motion.div className="home-banner-content" variants={btnMotion}>
          <Link to={bookHref} className="btn btn-primary btn-lg home-banner-btn">
            <ParkingCircle size={22} strokeWidth={2} aria-hidden />
            Đặt chỗ
          </Link>
        </motion.div>
      </motion.section>

      <section className="home-stats" aria-label="Thông tin bãi đỗ">
        <motion.div
          className="stats-grid"
          variants={gridMotion}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {stats.map(({ icon: Icon, label, value, unit }) => (
            <motion.article key={label} className="stat-card" variants={cardMotion} whileHover={{ y: -6 }}>
              <h3 className="stat-card-label">{label}</h3>
              <div className="stat-card-icon">
                <Icon size={32} strokeWidth={1.75} aria-hidden />
              </div>
              <strong className="stat-card-value">{value}</strong>
              <span className="stat-card-unit">{unit}</span>
            </motion.article>
          ))}
        </motion.div>
      </section>
    </div>
  )
}
