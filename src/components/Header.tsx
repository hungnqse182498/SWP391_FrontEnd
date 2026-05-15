import { LogIn, LogOut, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LOGO_SRC = '/image/logo.png'

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
        <Link to="/" className="brand" aria-label="EasyParking — về trang chủ">
          <img src={LOGO_SRC} alt="" className="brand-logo" />
          <span className="brand-name">
            <span className="brand-easy">Easy</span>
            <span className="brand-parking">Parking</span>
          </span>
        </Link>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <span className="user-badge" title={user?.email}>
                {user?.name}
              </span>
              <button type="button" className="btn btn-ghost btn-header" onClick={handleLogout}>
                <LogOut size={18} strokeWidth={2} aria-hidden />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/dang-ky" className="btn btn-outline btn-header">
                <UserPlus size={18} strokeWidth={2} aria-hidden />
                Đăng ký
              </Link>
              <Link to="/dang-nhap" className="btn btn-primary btn-header">
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
