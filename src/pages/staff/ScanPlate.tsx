import { useEffect, useState } from 'react'
import StaffLayout from '../../components/StaffLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Car, AlertCircle } from 'lucide-react'
import { parkingOperationApi, vehicleTypeApi, type VehicleTypeDto } from '../../utils/apiServices'

interface StaffMenuItem {
  id: string
  label: string
  icon: React.ReactNode
}

const menuItems: StaffMenuItem[] = [
  { id: 'scan', label: 'Quét biển số', icon: <Smartphone size={18} /> },
  { id: 'checkin', label: 'Tạo lượt gửi xe', icon: <Car size={18} /> },
  { id: 'exception', label: 'Xử lý ngoại lệ', icon: <AlertCircle size={18} /> },
]

export default function ScanPlate() {
  const navigate = useNavigate()
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleTypeId, setVehicleTypeId] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeDto[]>([])
  const [gateName, setGateName] = useState('Cổng A')
  const [cardCode, setCardCode] = useState('CARD-001')
  const [checkInType, setCheckInType] = useState<'guest' | 'resident'>('guest')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [scanned, setScanned] = useState<{ plate: string; time: string; detail?: string } | null>(null)

  useEffect(() => {
    vehicleTypeApi.getAll().then((res) => {
      if (res.isSuccess && res.result) {
        setVehicleTypes(res.result)
        if (res.result[0]) setVehicleTypeId(res.result[0].vehicleTypeId)
      }
    }).catch(console.error)
  }, [])

  const handleScan = () => {
    if (licensePlate.trim()) {
      setScanned({
        plate: licensePlate,
        time: new Date().toLocaleTimeString('vi-VN'),
      })
    }
  }

  const handleConfirmCheckIn = async () => {
    if (!licensePlate.trim() || !vehicleTypeId) return
    setLoading(true)
    setMessage('')
    try {
      const payload = {
        licensePlate: licensePlate.trim(),
        vehicleTypeId,
        gateName,
        cardCode,
      }
      const res = checkInType === 'resident'
        ? await parkingOperationApi.residentCheckIn(payload)
        : await parkingOperationApi.guestCheckIn(payload)

      if (res.isSuccess) {
        setMessage(res.message || 'Check-in thành công')
        setScanned({
          plate: licensePlate,
          time: new Date().toLocaleTimeString('vi-VN'),
          detail: JSON.stringify(res.result),
        })
        setLicensePlate('')
      } else {
        setMessage(res.message || 'Check-in thất bại')
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
      <StaffLayout items={menuItems} activeItem="scan" onSelectItem={(id) => {
        if (id === 'scan') navigate('/staff/scan-plate')
        else if (id === 'checkin') navigate('/staff/create-session')
        else if (id === 'exception') navigate('/staff/exception')
      }}>
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <h2>Quét biển số xe vào bãi</h2>
            <p className="section-desc">Kiểm tra điều kiện xe vào bãi, nhập/quét biển số xe, hướng dẫn xe vào đúng tầng/khu vực theo loại phương tiện.</p>

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
                  <label>Loại check-in</label>
                  <select className="input-standalone select" value={checkInType} onChange={(e) => setCheckInType(e.target.value as 'guest' | 'resident')}>
                    <option value="guest">Khách vãng lai</option>
                    <option value="resident">Khách tháng (customer)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="vehicle-type">Loại phương tiện</label>
                  <select
                    id="vehicle-type"
                    className="input-standalone select"
                    value={vehicleTypeId}
                    onChange={(e) => setVehicleTypeId(e.target.value)}
                  >
                    {vehicleTypes.map((vt) => (
                      <option key={vt.vehicleTypeId} value={vt.vehicleTypeId}>{vt.typeName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="gate">Cổng vào</label>
                  <select id="gate" className="input-standalone select" value={gateName} onChange={(e) => setGateName(e.target.value)}>
                    <option value="Cổng A">Cổng A</option>
                    <option value="Cổng B">Cổng B</option>
                    <option value="Cổng C">Cổng C</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="card-code">Mã thẻ</label>
                  <input id="card-code" className="input-standalone" value={cardCode} onChange={(e) => setCardCode(e.target.value)} />
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
                      onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleScan}>Quét</button>
                  </div>
                </div>

                {message && <p className="alert-inline">{message}</p>}

                {scanned && (
                  <div className="scan-result">
                    <h3>Thông tin xe</h3>
                    <div className="scan-info">
                      <p><strong>Biển số:</strong> {scanned.plate}</p>
                      <p><strong>Thời gian:</strong> {scanned.time}</p>
                      {scanned.detail && <p className="muted-text">{scanned.detail}</p>}
                    </div>
                    <button type="button" className="btn btn-success btn-block" disabled={loading} onClick={handleConfirmCheckIn}>
                      {loading ? 'Đang xử lý...' : 'Xác nhận vào bãi'}
                    </button>
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
