import { useState } from 'react'
import StaffLayout from '../../components/StaffLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Car, LogOut, AlertCircle } from 'lucide-react'

interface StaffMenuItem {
  id: string
  label: string
  icon: React.ReactNode
}

const menuItems: StaffMenuItem[] = [
  { id: 'scan', label: 'Quét biển số', icon: <Smartphone size={18} /> },
  {
    id: 'checkin',
    label: 'Tạo lượt gửi xe',
    icon: <Car size={18} />,
  },
  {
    id: 'checkout',
    label: 'Xử lý xe ra bãi',
    icon: <LogOut size={18} />,
  },
  {
    id: 'exception',
    label: 'Xử lý ngoại lệ',
    icon: <AlertCircle size={18} />,
  },
]

export default function CreateSession() {
  const navigate = useNavigate()
  const [sessionData, setSessionData] = useState({
    licensePlate: '',
    entryTime: new Date().toLocaleTimeString('vi-VN'),
    vehicleType: 'car',
    gate: 'A',
  })

  const handleCreateSession = () => {
    // Logic tạo session gửi xe
    console.log('Tạo lượt gửi xe:', sessionData)
  }

  const handleLogout = () => {
    navigate('/')
  }

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <StaffLayout items={menuItems} activeItem="checkin" onSelectItem={(id) => {
        if (id === 'scan') navigate('/staff/scan-plate')
        else if (id === 'checkin') navigate('/staff/create-session')
        else if (id === 'checkout') navigate('/staff/checkout')
        else if (id === 'exception') navigate('/staff/exception')
      }}>
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <h2>Tạo lượt gửi xe</h2>
            <p className="section-desc">Tạo parking session cho xe gửi theo lượt, ghi nhận thời gian vào, loại xe, cổng vào.</p>

            <div className="staff-form-group card-panel">
              <div className="form-field">
                <label htmlFor="plate-session">Biển số xe</label>
                <input
                  id="plate-session"
                  type="text"
                  className="input-standalone"
                  placeholder="51A-12345"
                  value={sessionData.licensePlate}
                  onChange={(e) => setSessionData({ ...sessionData, licensePlate: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="vehicle-type-session">Loại xe</label>
                <select
                  id="vehicle-type-session"
                  className="input-standalone select"
                  value={sessionData.vehicleType}
                  onChange={(e) => setSessionData({ ...sessionData, vehicleType: e.target.value })}
                >
                  <option value="car">Ô tô</option>
                  <option value="motorcycle">Xe máy</option>
                  <option value="bicycle">Xe đạp</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="gate">Cổng vào</label>
                <select
                  id="gate"
                  className="input-standalone select"
                  value={sessionData.gate}
                  onChange={(e) => setSessionData({ ...sessionData, gate: e.target.value })}
                >
                  <option value="A">Cổng A</option>
                  <option value="B">Cổng B</option>
                  <option value="C">Cổng C</option>
                </select>
              </div>

              <div className="form-field">
                <label>Thời gian vào</label>
                <div className="input-readonly">{sessionData.entryTime}</div>
              </div>

              <button type="button" className="btn btn-success btn-block" onClick={handleCreateSession}>
                Tạo lượt gửi xe
              </button>
            </div>
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
      </StaffLayout>
    </ProtectedRoute>
  )
}
