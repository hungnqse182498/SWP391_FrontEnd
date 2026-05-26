import { useNavigate } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { Smartphone, Car, LogOut, AlertCircle } from 'lucide-react'

export default function StaffDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const menuItems = [
    {
      id: 'scan',
      label: 'Quét biển số',
      desc: 'Quét/nhập biển số xe vào bãi',
      icon: <Smartphone size={32} />,
      path: '/staff/scan-plate',
    },
    {
      id: 'checkin',
      label: 'Tạo lượt gửi xe',
      desc: 'Tạo parking session mới',
      icon: <Car size={32} />,
      path: '/staff/create-session',
    },
    {
      id: 'checkout',
      label: 'Xử lý xe ra bãi',
      desc: 'Tính phí và xác nhận thanh toán',
      icon: <LogOut size={32} />,
      path: '/staff/checkout',
    },
    {
      id: 'exception',
      label: 'Xử lý ngoại lệ',
      desc: 'Báo cáo và xử lý sự cố',
      icon: <AlertCircle size={32} />,
      path: '/staff/exception',
    },
  ]

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <div className="staff-dashboard-home">
        

        <div className="dashboard-menu-grid">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="dashboard-menu-card"
              onClick={() => navigate(item.path)}
            >
              <div className="menu-card-icon">{item.icon}</div>
              <h3>{item.label}</h3>
              <p>{item.desc}</p>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-ghost staff-logout-btn"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </ProtectedRoute>
  )
}
