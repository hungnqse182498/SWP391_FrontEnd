import { useNavigate } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { Smartphone, Car, LogOut, AlertCircle } from 'lucide-react'

export default function StaffDashboard() {
  const navigate = useNavigate()

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
      </div>
    </ProtectedRoute>
  )
}
