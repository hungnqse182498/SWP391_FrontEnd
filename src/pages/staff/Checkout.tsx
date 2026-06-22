import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, LogOut } from 'lucide-react'
import StaffLayout from '../../components/StaffLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { parkingOperationApi, type ParkingFeePreview } from '../../utils/apiServices'
import { formatCurrency } from '../../utils/pricing'

interface StaffMenuItem {
  id: string
  label: string
  icon: ReactNode
}

const menuItems: StaffMenuItem[] = [
  { id: 'checkout', label: 'Xử lý xe ra bãi', icon: <LogOut size={18} /> },
  { id: 'exception', label: 'Xử lý ngoại lệ', icon: <AlertCircle size={18} /> },
]

export default function Checkout() {
  const navigate = useNavigate()
  const [licensePlate, setLicensePlate] = useState('')
  const [gateName, setGateName] = useState('Cổng A')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<ParkingFeePreview | null>(null)

  const handleScan = async () => {
    if (!licensePlate.trim()) return
    setLoading(true)
    setMessage('')
    try {
      const res = await parkingOperationApi.guestCheckOutPreview({
        licensePlate: licensePlate.trim(),
      })
      if (res.isSuccess && res.result) {
        setPreview(res.result)
      } else {
        setMessage(res.message || 'Không tìm thấy phiên gửi xe')
        setPreview(null)
      }
    } catch (err) {
      console.error(err)
      setMessage('Lỗi kết nối API')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await parkingOperationApi.guestCheckOut({
        licensePlate: licensePlate.trim() || undefined,
        gateName,
        paymentMethod,
      })
      if (res.isSuccess) {
        setMessage(res.message || 'Checkout thành công')
        setPreview(null)
        setLicensePlate('')
      } else {
        setMessage(res.message || 'Checkout thất bại')
      }
    } catch (err) {
      console.error(err)
      setMessage('Lỗi kết nối API')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <StaffLayout
        items={menuItems}
        activeItem="checkout"
        onSelectItem={(id) => {
          if (id === 'checkout') navigate('/staff/checkout')
          else if (id === 'exception') navigate('/staff/exception')
        }}
      >
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <h2>Xử lý xe ra bãi</h2>
            <p className="section-desc">
              Quét biển số xe ra bãi, xác nhận thời gian ra, kiểm tra phí cần thanh toán và thu phí gửi xe.
            </p>

            <div className="scan-container">
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
                      onChange={(event) => setLicensePlate(event.target.value.toUpperCase())}
                      onKeyDown={(event) => event.key === 'Enter' && handleScan()}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleScan} disabled={loading}>
                      {loading ? '...' : 'Quét'}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label>Cổng ra</label>
                  <select className="input-standalone select" value={gateName} onChange={(event) => setGateName(event.target.value)}>
                    <option value="Cổng A">Cổng A</option>
                    <option value="Cổng B">Cổng B</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Thanh toán</label>
                  <select
                    className="input-standalone select"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    <option value="Cash">Tiền mặt</option>
                    <option value="PayOS">PayOS</option>
                  </select>
                </div>

                {message && <p className="alert-inline">{message}</p>}

                {preview && (
                  <div className="scan-result">
                    <h3>Thông tin xe</h3>
                    <div className="scan-info">
                      <p><strong>Biển số:</strong> {preview.licensePlate}</p>
                      <p><strong>Giờ vào:</strong> {new Date(preview.entryTime).toLocaleString('vi-VN')}</p>
                      <p><strong>Giờ ra:</strong> {new Date(preview.exitTime).toLocaleString('vi-VN')}</p>
                      <p><strong>Thời gian gửi:</strong> {preview.totalHours.toFixed(1)} giờ</p>
                      <p className="fee-amount"><strong>Phí gửi:</strong> {formatCurrency(preview.amount)}</p>
                    </div>
                    <div className="checkout-actions">
                      <button type="button" className="btn btn-success btn-block" disabled={loading} onClick={handleCheckout}>
                        Xác nhận thanh toán
                      </button>
                      <button type="button" className="btn btn-ghost btn-block" onClick={() => setPreview(null)}>
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </StaffLayout>
    </ProtectedRoute>
  )
}
