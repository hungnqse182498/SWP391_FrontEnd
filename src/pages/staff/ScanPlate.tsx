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

export default function ScanPlate() {
  const navigate = useNavigate()
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleType, setVehicleType] = useState('car')
  const [scanned, setScanned] = useState<{ plate: string; time: string } | null>(null)

  const handleScan = () => {
    if (licensePlate.trim()) {
      setScanned({
        plate: licensePlate,
        time: new Date().toLocaleTimeString('vi-VN'),
      })
      setLicensePlate('')
    }
  }

  const handleLogout = () => {
    navigate('/')
  }

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <StaffLayout items={menuItems} activeItem="scan" onSelectItem={(id) => {
        if (id === 'scan') navigate('/staff/scan-plate')
        else if (id === 'checkin') navigate('/staff/create-session')
        else if (id === 'checkout') navigate('/staff/checkout')
        else if (id === 'exception') navigate('/staff/exception')
      }}>
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <h2>Quét biển số xe vào bãi</h2>
            <p className="section-desc">Kiểm tra điều kiện xe vào bãi, nhập/quét biển số xe, hướng dẫn xe vào đúng tầng/khu vực theo loại phương tiện.</p>

            <div className="scan-container">
              {/* Camera Preview */}
              <div className="camera-preview">
                <div className="camera-frame">
                  <div className="camera-placeholder">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <p>Camera</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="scan-form">
                <div className="form-field">
                  <label htmlFor="vehicle-type">Loại phương tiện</label>
                  <select
                    id="vehicle-type"
                    className="input-standalone select"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  >
                    <option value="car">Ô tô</option>
                    <option value="motorcycle">Xe máy</option>
                    <option value="bicycle">Xe đạp</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="license-plate">Biển số xe</label>
                  <div className="input-group">
                    <input
                      id="license-plate"
                      type="text"
                      className="input-standalone"
                      placeholder="51A-12345"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleScan}>
                      Quét
                    </button>
                  </div>
                </div>

                {scanned && (
                  <div className="scan-result">
                    <h3>Thông tin xe</h3>
                    <div className="scan-info">
                      <p>
                        <strong>Biển số:</strong> {scanned.plate}
                      </p>
                      <p>
                        <strong>Loại xe:</strong> {vehicleType === 'car' ? 'Ô tô' : vehicleType === 'motorcycle' ? 'Xe máy' : 'Xe đạp'}
                      </p>
                      <p>
                        <strong>Thời gian:</strong> {scanned.time}
                      </p>
                    </div>
                    <button type="button" className="btn btn-success btn-block">
                      Xác nhận vào bãi
                    </button>
                  </div>
                )}
              </div>
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
