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

export default function Checkout() {
  const navigate = useNavigate()
  const [searchPlate, setSearchPlate] = useState('')
  const [foundSession, setFoundSession] = useState<{
    plate: string
    entryTime: string
    duration: number
    fee: number
  } | null>(null)

  const handleSearch = () => {
    if (searchPlate.trim()) {
      // Mock data
      setFoundSession({
        plate: searchPlate,
        entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleTimeString('vi-VN'),
        duration: 2,
        fee: 30000,
      })
    }
  }

  const handleLogout = () => {
    navigate('/')
  }

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <StaffLayout items={menuItems} activeItem="checkout" onSelectItem={(id) => {
        if (id === 'scan') navigate('/staff/scan-plate')
        else if (id === 'checkin') navigate('/staff/create-session')
        else if (id === 'checkout') navigate('/staff/checkout')
        else if (id === 'exception') navigate('/staff/exception')
      }}>
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <h2>Xử lý xe ra bãi</h2>
            <p className="section-desc">Tìm lượt gửi xe, xác nhận thời gian ra, kiểm tra phí cần thanh toán, thu phí gửi xe.</p>

            <div className="staff-form-group">
              <div className="form-field">
                <label htmlFor="search-plate">Tìm xe</label>
                <div className="input-group">
                  <input
                    id="search-plate"
                    type="text"
                    className="input-standalone"
                    placeholder="51A-12345"
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button type="button" className="btn btn-primary" onClick={handleSearch}>
                    Tìm
                  </button>
                </div>
              </div>
            </div>

            {foundSession && (
              <div className="staff-checkout-result card-panel">
                <h3>Thông tin xe</h3>
                <div className="checkout-info">
                  <p>
                    <strong>Biển số:</strong> {foundSession.plate}
                  </p>
                  <p>
                    <strong>Giờ vào:</strong> {foundSession.entryTime}
                  </p>
                  <p>
                    <strong>Thời gian gửi:</strong> {foundSession.duration} giờ
                  </p>
                  <p className="fee-amount">
                    <strong>Phí gửi:</strong> {foundSession.fee.toLocaleString()} đ
                  </p>
                </div>
                <div className="checkout-actions">
                  <button type="button" className="btn btn-success">
                    Xác nhận thanh toán
                  </button>
                  <button type="button" className="btn btn-ghost">
                    Hủy
                  </button>
                </div>
              </div>
            )}
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
