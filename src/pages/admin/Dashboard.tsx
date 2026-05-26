import { useNavigate } from 'react-router-dom'
import { Settings, Shield, Users } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import { ADMIN_NAV } from '../../config/adminNav'

const hubIcons: Record<string, React.ReactNode> = {
  users: <Users size={32} />,
  permissions: <Shield size={32} />,
  system: <Settings size={32} />,
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="staff-dashboard-home">
        <header className="dashboard-header">
          <h1>Quản trị hệ thống</h1>
          <p>Quản lý tài khoản, phân quyền và cấu hình hệ thống.</p>
        </header>
        <div className="dashboard-menu-grid">
          {ADMIN_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className="dashboard-menu-card"
              onClick={() => navigate(item.path)}
            >
              <div className="menu-card-icon">{hubIcons[item.id]}</div>
              <h3>{item.label}</h3>
              <p>{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  )
}
