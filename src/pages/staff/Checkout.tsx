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
  const [licensePlate, setLicensePlate] = useState('')
  const [scannedData, setScannedData] = useState<{
    plate: string
    entryTime: string
    exitTime: string
    duration: number
    fee: number
    paid: boolean
    location: string
  } | null>(null)

  const handleScan = () => {
    if (licensePlate.trim()) {
      // Mock data
      setScannedData({
        plate: licensePlate,
        entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleTimeString('vi-VN'),
        exitTime: new Date().toLocaleTimeString('vi-VN'),
        duration: 2,
        fee: 30000,
        paid: false,
        location: 'Tầng 3 - Khu vực A',
      })
      setLicensePlate('')
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
            <p className="section-desc">Quét biển số xe ra bãi, xác nhận thời gian ra, kiểm tra phí cần thanh toán, thu phí gửi xe.</p>

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

              {/* Scanned Info */}
              <div className="scan-form">
                <div className="form-field">
                  <label htmlFor="license-plate-checkout">Biển số xe</label>
                  <div className="input-group">
                    <input
                      id="license-plate-checkout"
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

                {scannedData && (
                  <div className="scan-result">
                    <h3>Thông tin xe</h3>
                    <div className="scan-info">
                      <p>
                        <strong>Biển số:</strong> {scannedData.plate}
                      </p>
                      <p>
                        <strong>Giờ vào:</strong> {scannedData.entryTime}
                      </p>
                      <p>
                        <strong>Giờ ra:</strong> {scannedData.exitTime}
                      </p>
                      <p>
                        <strong>Thời gian gửi:</strong> {scannedData.duration} giờ
                      </p>
                      <p>
                        <strong>Vị trí:</strong> {scannedData.location}
                      </p>
                      <p className="fee-amount">
                        <strong>Phí gửi:</strong> {scannedData.fee.toLocaleString()} đ
                      </p>
                      <p className={scannedData.paid ? 'payment-status-paid' : 'payment-status-unpaid'}>
                        <strong>Trạng thái:</strong> {scannedData.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </p>
                    </div>
                    <div className="checkout-actions">
                      <button type="button" className="btn btn-success btn-block">
                        Xác nhận thanh toán
                      </button>
                      <button type="button" className="btn btn-ghost btn-block">
                        Hủy
                      </button>
                    </div>
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
