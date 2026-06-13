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

export default function CreateSession() {
  const navigate = useNavigate()
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleTypeId, setVehicleTypeId] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeDto[]>([])
  const [gateName, setGateName] = useState('Cổng A')
  const [cardCode, setCardCode] = useState('CARD-002')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    vehicleTypeApi.getAll().then((res) => {
      if (res.isSuccess && res.result) {
        setVehicleTypes(res.result)
        if (res.result[0]) setVehicleTypeId(res.result[0].vehicleTypeId)
      }
    }).catch(console.error)
  }, [])

  const handleCreateSession = async () => {
    if (!licensePlate.trim()) {
      setMessage('Vui lòng nhập biển số')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const res = await parkingOperationApi.guestCheckIn({
        licensePlate: licensePlate.trim(),
        vehicleTypeId,
        gateName,
        cardCode,
      })
      setMessage(res.isSuccess ? res.message || 'Tạo lượt gửi xe thành công' : res.message || 'Thất bại')
      if (res.isSuccess) setLicensePlate('')
    } catch (err) {
      console.error(err)
      setMessage('Lỗi kết nối API')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <StaffLayout items={menuItems} activeItem="checkin" onSelectItem={(id) => {
        if (id === 'scan') navigate('/staff/scan-plate')
        else if (id === 'checkin') navigate('/staff/create-session')
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
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="vehicle-type-session">Loại xe</label>
                <select
                  id="vehicle-type-session"
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
                <label htmlFor="card">Mã thẻ</label>
                <input id="card" className="input-standalone" value={cardCode} onChange={(e) => setCardCode(e.target.value)} />
              </div>

              <div className="form-field">
                <label>Thời gian vào</label>
                <div className="input-readonly">{new Date().toLocaleString('vi-VN')}</div>
              </div>

              {message && <p className="alert-inline">{message}</p>}

              <button type="button" className="btn btn-success btn-block" disabled={loading} onClick={handleCreateSession}>
                {loading ? 'Đang xử lý...' : 'Tạo lượt gửi xe'}
              </button>
            </div>
          </div>
        </div>
      </StaffLayout>
    </ProtectedRoute>
  )
}
