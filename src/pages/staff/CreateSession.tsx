import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CalendarClock, Car, Smartphone } from 'lucide-react'
import StaffLayout from '../../components/StaffLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { parkingOperationApi, vehicleTypeApi, type VehicleTypeDto } from '../../utils/apiServices'
import { formatNowInVietnamTime } from '../../utils/dateTime'

interface StaffMenuItem {
  id: string
  label: string
  icon: ReactNode
}

const menuItems: StaffMenuItem[] = [
  { id: 'scan', label: 'Quét biển số', icon: <Smartphone size={18} /> },
  { id: 'reservations', label: 'Đơn đặt trước', icon: <CalendarClock size={18} /> },
  { id: 'active-vehicles', label: 'Xe đang trong bãi', icon: <Car size={18} /> },
  { id: 'checkin', label: 'Tạo lượt gửi xe', icon: <Car size={18} /> },
  { id: 'exception', label: 'Xử lý ngoại lệ', icon: <AlertCircle size={18} /> },
]

export default function CreateSession() {
  const navigate = useNavigate()
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleTypeId, setVehicleTypeId] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeDto[]>([])
  const [gateName, setGateName] = useState('Cổng A')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    vehicleTypeApi
      .getAll()
      .then((res) => {
        if (res.isSuccess && res.result) {
          setVehicleTypes(res.result)
          if (res.result[0]) setVehicleTypeId(res.result[0].vehicleTypeId)
        }
      })
      .catch(console.error)
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
      <StaffLayout
        items={menuItems}
        activeItem="checkin"
        onSelectItem={(id) => {
          if (id === 'scan' || id === 'reservations' || id === 'active-vehicles') {
            navigate('/staff/scan-plate', { state: { activePanel: id } })
          } else if (id === 'checkin') navigate('/staff/create-session')
          else if (id === 'exception') navigate('/staff/exception')
        }}
      >
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <h2>Tạo lượt gửi xe</h2>
            <p className="section-desc">
              Tạo parking session cho xe gửi theo lượt, ghi nhận thời gian vào, loại xe và cổng vào.
            </p>

            <div className="staff-form-group card-panel">
              <div className="form-field">
                <label htmlFor="plate-session">Biển số xe</label>
                <input
                  id="plate-session"
                  type="text"
                  className="input-standalone"
                  placeholder="51A-12345"
                  value={licensePlate}
                  onChange={(event) => setLicensePlate(event.target.value.toUpperCase())}
                />
              </div>

              <div className="form-field">
                <label htmlFor="vehicle-type-session">Loại xe</label>
                <select
                  id="vehicle-type-session"
                  className="input-standalone select"
                  value={vehicleTypeId}
                  onChange={(event) => setVehicleTypeId(event.target.value)}
                >
                  {vehicleTypes.map((vehicleType) => (
                    <option key={vehicleType.vehicleTypeId} value={vehicleType.vehicleTypeId}>
                      {vehicleType.typeName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="gate">Cổng vào</label>
                <select
                  id="gate"
                  className="input-standalone select"
                  value={gateName}
                  onChange={(event) => setGateName(event.target.value)}
                >
                  <option value="Cổng A">Cổng A</option>
                  <option value="Cổng B">Cổng B</option>
                  <option value="Cổng C">Cổng C</option>
                </select>
              </div>

              <div className="form-field">
                <label>Thời gian vào</label>
                <div className="input-readonly">{formatNowInVietnamTime()}</div>
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
