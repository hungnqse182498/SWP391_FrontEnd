import { Mail, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

const LOGO_SRC = '/image/logo.jpg'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src={LOGO_SRC} alt="ParkEase" className="footer-logo" />
          <div>
            <strong>ParkEase</strong>
            <p>Hệ thống đặt trước chỗ đỗ xe thông minh</p>
          </div>
        </div>

        <div className="footer-links">
          <h4>Liên kết</h4>
          <ul>
            <li>
              <Link to="/dat-cho">Đặt chỗ đỗ</Link>
            </li>
            <li>
              <Link to="/dang-ky">Đăng ký</Link>
            </li>
            <li>
              <Link to="/dang-nhap">Đăng nhập</Link>
            </li>
          </ul>
        </div>

        <div className="footer-contact">
          <h4>Hỗ trợ</h4>
          <p>
            <Phone size={16} strokeWidth={2} aria-hidden />
            Hotline: 1900 6868
          </p>
          <p>
            <Mail size={16} strokeWidth={2} aria-hidden />
            support@parkease.vn
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {year} ParkEase — Nhóm 6. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  )
}
