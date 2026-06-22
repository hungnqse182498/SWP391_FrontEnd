import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CalendarClock, Car, Clock, Smartphone, UserRound } from 'lucide-react'
import StaffLayout from '../../components/StaffLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import {
  parkingOperationApi,
  parkingSessionApi,
  reservationApi,
  vehicleTypeApi,
  type ParkingSessionDto,
  type ReservationDto,
  type VehicleTypeDto,
} from '../../utils/apiServices'

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

function formatDateTime(value?: string) {
  if (!value) return 'Chưa có'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function statusLabel(status?: string) {
  const normalized = status?.toLowerCase()
  if (normalized === 'confirmed') return 'Đã xác nhận'
  if (normalized === 'pending') return 'Chờ thanh toán'
  if (normalized === 'active') return 'Đang trong bãi'
  if (normalized === 'completed') return 'Đã hoàn tất'
  if (normalized === 'cancelled') return 'Đã hủy'
  return status || 'Không rõ'
}

function getReservationPlate(reservation: ReservationDto) {
  return (
    reservation.licensePlate ||
    reservation.parkingSessions?.[0]?.licensePlateIn ||
    'Chưa ghi nhận'
  )
}

function PlateVisual({ plate, muted = false }: { plate?: string; muted?: boolean }) {
  return (
    <div className={`license-plate-visual${muted ? ' license-plate-visual--muted' : ''}`}>
      <span>{plate || 'NO PLATE'}</span>
    </div>
  )
}

export default function ScanPlate() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { activePanel?: 'scan' | 'reservations' | 'active-vehicles' } | null
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleTypeId, setVehicleTypeId] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeDto[]>([])
  const [gateName, setGateName] = useState('Cổng A')
  const [checkInType, setCheckInType] = useState<'guest' | 'resident'>('guest')
  const [activePanel, setActivePanel] = useState<'scan' | 'reservations' | 'active-vehicles'>(
    locationState?.activePanel ?? 'scan',
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [scanned, setScanned] = useState<{ plate: string; time: string; detail?: string } | null>(null)
  const [reservations, setReservations] = useState<ReservationDto[]>([])
  const [activeSessions, setActiveSessions] = useState<ParkingSessionDto[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState('')

  const loadGateLists = async () => {
    setListLoading(true)
    setListError('')
    try {
      const [reservationRes, sessionRes] = await Promise.all([
        reservationApi.getAll(),
        parkingSessionApi.getAll(),
      ])

      if (reservationRes.isSuccess && reservationRes.result) {
        setReservations(
          reservationRes.result
            .filter((item) => !['cancelled', 'completed'].includes(item.status?.toLowerCase()))
            .sort(
              (left, right) =>
                new Date(left.expectedEntryTime).getTime() -
                new Date(right.expectedEntryTime).getTime(),
            ),
        )
      }

      if (sessionRes.isSuccess && sessionRes.result) {
        setActiveSessions(
          sessionRes.result
            .filter((item) => item.status?.toLowerCase() === 'active' && !item.exitTime)
            .sort(
              (left, right) =>
                new Date(right.entryTime).getTime() - new Date(left.entryTime).getTime(),
            ),
        )
      }
    } catch (err) {
      console.error(err)
      setListError('Chưa tải được danh sách từ API. Vui lòng kiểm tra quyền staff hoặc backend.')
    } finally {
      setListLoading(false)
    }
  }

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

    loadGateLists()
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
      }
      const res =
        checkInType === 'resident'
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
        loadGateLists()
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
      <StaffLayout
        items={menuItems}
        activeItem={activePanel}
        onSelectItem={(id) => {
          if (id === 'scan' || id === 'reservations' || id === 'active-vehicles') {
            setActivePanel(id)
            if (id !== 'scan') loadGateLists()
          }
          else if (id === 'checkin') navigate('/staff/create-session')
          else if (id === 'exception') navigate('/staff/exception')
        }}
      >
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <h2>Quét biển số xe vào bãi</h2>
            <p className="section-desc">
              Kiểm tra xe vào bãi, đối chiếu đơn đặt trước và danh sách xe đang gửi.
            </p>

            {activePanel === 'scan' && <div className="scan-container">
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
                  <select
                    className="input-standalone select"
                    value={checkInType}
                    onChange={(event) => setCheckInType(event.target.value as 'guest' | 'resident')}
                  >
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
                  <label htmlFor="license-plate">Biển số xe</label>
                  <div className="input-group">
                    <input
                      id="license-plate"
                      type="text"
                      className="input-standalone"
                      placeholder="51A-12345"
                      value={licensePlate}
                      onChange={(event) => setLicensePlate(event.target.value.toUpperCase())}
                      onKeyDown={(event) => event.key === 'Enter' && handleScan()}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleScan}>
                      Quét
                    </button>
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
                    <button
                      type="button"
                      className="btn btn-success btn-block"
                      disabled={loading}
                      onClick={handleConfirmCheckIn}
                    >
                      {loading ? 'Đang xử lý...' : 'Xác nhận vào bãi'}
                    </button>
                  </div>
                )}
              </div>
            </div>}

            {activePanel !== 'scan' && <section className="staff-gate-board">
              <div className="staff-gate-board-head">
                <div>
                  <h3>Thông tin cổng vào</h3>
                  <p>Theo dõi đơn đặt trước và xe đang trong bãi để đối chiếu khi xe đến.</p>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={loadGateLists} disabled={listLoading}>
                  {listLoading ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>

              {listError && <p className="alert-inline alert-error">{listError}</p>}

              <div className="staff-gate-grid staff-gate-grid--single">
                {activePanel === 'reservations' && <div className="staff-gate-column card-panel">
                  <div className="staff-gate-column-head">
                    <CalendarClock size={20} strokeWidth={2.2} aria-hidden />
                    <div>
                      <h4>Đơn đã đặt trước</h4>
                      <span>{reservations.length} đơn đang chờ xe vào</span>
                    </div>
                  </div>

                  <div className="staff-vehicle-card-list">
                    {reservations.length === 0 ? (
                      <div className="staff-empty-state">Chưa có đơn đặt trước cần xử lý.</div>
                    ) : (
                      reservations.map((reservation) => {
                        const reservationPlate = getReservationPlate(reservation)
                        return (
                          <article key={reservation.reservationId} className="staff-vehicle-card">
                            <PlateVisual
                              plate={reservationPlate}
                              muted={reservationPlate === 'Chưa ghi nhận'}
                            />
                            <div className="staff-vehicle-info">
                              <div className="staff-vehicle-title">
                                <strong>{reservation.user?.fullName || 'Khách đặt trước'}</strong>
                                <span>{statusLabel(reservation.status)}</span>
                              </div>
                              <p>
                                <UserRound size={15} aria-hidden />
                                {reservation.user?.phoneNumber ||
                                  reservation.user?.email ||
                                  'Chưa có thông tin liên hệ'}
                              </p>
                              <p>
                                <Clock size={15} aria-hidden />
                                Giờ dự kiến vào: {formatDateTime(reservation.expectedEntryTime)}
                              </p>
                            </div>
                          </article>
                        )
                      })
                    )}
                  </div>
                </div>}

                {activePanel === 'active-vehicles' && <div className="staff-gate-column card-panel">
                  <div className="staff-gate-column-head">
                    <Car size={20} strokeWidth={2.2} aria-hidden />
                    <div>
                      <h4>Xe đang trong bãi</h4>
                      <span>{activeSessions.length} xe chưa ra</span>
                    </div>
                  </div>

                  <div className="staff-vehicle-card-list">
                    {activeSessions.length === 0 ? (
                      <div className="staff-empty-state">Chưa có xe đang trong bãi.</div>
                    ) : (
                      activeSessions.map((session) => (
                        <article key={session.sessionId} className="staff-vehicle-card">
                          <PlateVisual plate={session.licensePlateIn} />
                          <div className="staff-vehicle-info">
                            <div className="staff-vehicle-title">
                              <strong>{session.driverFullName || 'Khách vãng lai'}</strong>
                              <span>{statusLabel(session.status)}</span>
                            </div>
                            <p>
                              <Car size={15} aria-hidden />
                              {session.vehicleTypeName || 'Chưa rõ loại xe'}
                              {session.assignedSlotCode ? ` · Ô ${session.assignedSlotCode}` : ''}
                            </p>
                            <p>
                              <Clock size={15} aria-hidden />
                              Giờ vào: {formatDateTime(session.entryTime)}
                            </p>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>}
              </div>
            </section>}
          </div>
        </div>
      </StaffLayout>
    </ProtectedRoute>
  )
}
