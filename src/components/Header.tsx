import { LogIn, LogOut, UserPlus } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO_SRC = '/image/logo.jpg'

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="ParkEase — về trang chủ">
          <img src={LOGO_SRC} alt="ParkEase" className="brand-logo" />
        </Link>

        <nav className="main-nav" aria-label="Điều hướng chính">
          {isAuthenticated && (
            <NavLink to="/dat-cho">Đặt chỗ đỗ</NavLink>
          )}
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <span className="user-badge" title={user?.email}>
                {user?.name}
              </span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                <LogOut size={18} strokeWidth={2} aria-hidden />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/dang-ky" className="btn btn-outline">
                <UserPlus size={18} strokeWidth={2} aria-hidden />
                Đăng ký
              </Link>
              <Link to="/dang-nhap" className="btn btn-primary">
                <LogIn size={18} strokeWidth={2} aria-hidden />
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
