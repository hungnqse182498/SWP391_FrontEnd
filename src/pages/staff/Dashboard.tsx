import { useNavigate } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { LogIn, LogOut, } from 'lucide-react'

export default function StaffDashboard() {
  const navigate = useNavigate()

  const menuItems = [
    {
      id: 'scan',
      label: 'Cổng vào',
      desc: 'Quét/nhập biển số xe vào bãi',
      icon: <LogIn size={32} />,
      path: '/staff/scan-plate',
    },
  
    {
      id: 'checkout',
      label: 'Cổng ra',
      desc: 'Tính phí và xác nhận thanh toán',
      icon: <LogOut size={32} />,
      path: '/staff/checkout',
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
