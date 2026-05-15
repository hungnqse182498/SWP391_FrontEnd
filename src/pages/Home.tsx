import { Building2, ParkingCircle, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const BANNER_SRC = '/image/banner.jpg'

const stats = [
  {
    icon: ParkingCircle,
    label: 'Chỗ trống',
    value: '156',
    unit: 'ô / 288 tổng',
  },
  {
    icon: Wallet,
    label: 'Chi phí',
    value: '15.000đ',
    unit: 'mỗi giờ',
  },
  {
    icon: Building2,
    label: 'Tầng hầm',
    value: '3',
    unit: 'B1 · B2 · B3',
  },
]

export default function Home() {
  const { isAuthenticated } = useAuth()
  const bookHref = isAuthenticated ? '/dat-cho' : '/dang-nhap'

  return (
    <div className="home-page">
      <section className="home-banner">
        <img src={BANNER_SRC} alt="" className="home-banner-img" />
        <div className="home-banner-overlay" aria-hidden="true" />
        <div className="home-banner-content">
          <Link to={bookHref} className="btn btn-primary btn-lg home-banner-btn">
            <ParkingCircle size={22} strokeWidth={2} aria-hidden />
            Đặt chỗ
          </Link>
        </div>
      </section>

      <section className="home-stats" aria-label="Thông tin bãi đỗ">
        <div className="stats-grid">
          {stats.map(({ icon: Icon, label, value, unit }) => (
            <article key={label} className="stat-card">
              <div className="stat-card-icon">
                <Icon size={28} strokeWidth={1.75} aria-hidden />
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">{label}</span>
                <strong className="stat-card-value">{value}</strong>
                <span className="stat-card-unit">{unit}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
