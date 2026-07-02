import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
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
import { formatNowInVietnamTime, formatUtcToVietnamDateTime } from '../../utils/dateTime'

type GatePanel = 'scan' | 'reservations' | 'active-vehicles'

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

const panelCopy: Record<GatePanel, { title: string; desc: string }> = {
  scan: {
    title: 'Quét xe vào bãi',
    desc: 'Kiểm tra biển số và xác nhận xe vào bãi.',
  },
  reservations: {
    title: 'Đơn đặt trước',
    desc: 'Danh sách đơn đặt trước đang chờ xe đến cổng vào.',
  },
  'active-vehicles': {
    title: 'Xe đang trong bãi',
    desc: 'Danh sách xe đã check-in và chưa checkout.',
  },
}

function formatDateTime(value?: string) {
  if (!value) return 'Chưa có'
  return formatUtcToVietnamDateTime(value)
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
  const locationState = location.state as { activePanel?: GatePanel } | null
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activePanel, setActivePanel] = useState<GatePanel>(locationState?.activePanel ?? 'scan')
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [entryImageUrl, setEntryImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [licensePlate, setLicensePlate] = useState('')
  const [entryTimePreview, setEntryTimePreview] = useState('')
  const [vehicleTypeId, setVehicleTypeId] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeDto[]>([])
  const [gateName, setGateName] = useState('Cổng A')
  const [checkInType, setCheckInType] = useState<'guest' | 'resident'>('guest')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
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

  const setPlateForConfirm = (plate: string) => {
    const nextPlate = plate.toUpperCase()
    setLicensePlate(nextPlate)
    setEntryTimePreview(nextPlate.trim() ? formatNowInVietnamTime() : '')
  }

  const resetScan = () => {
    setImagePreviewUrl('')
    setEntryImageUrl('')
    setPlateForConfirm('')
    setMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImagePreviewUrl(URL.createObjectURL(file))
    setUploading(true)
    setMessage('')
    setPlateForConfirm('')

    try {
      const res = await parkingOperationApi.uploadAndRecognizePlate(file)
      if (res?.imageUrl) {
        setEntryImageUrl(res.imageUrl)
        if (res.licensePlate) {
          setPlateForConfirm(res.licensePlate)
        } else {
          setMessage(res.message || 'Không nhận diện được biển số.')
        }
      } else {
        setMessage('Tải ảnh thất bại hoặc không nhận được đường dẫn ảnh.')
      }
    } catch (err) {
      console.error(err)
      setMessage(err instanceof Error ? err.message : 'Lỗi kết nối khi upload ảnh.')
    } finally {
      setUploading(false)
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
        entryImageUrl: entryImageUrl || undefined,
      }
      const res =
        checkInType === 'resident'
          ? await parkingOperationApi.residentCheckIn(payload)
          : await parkingOperationApi.guestCheckIn(payload)

      if (res.isSuccess) {
        setMessage(res.message || 'Check-in thành công')
        resetScan()
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

  const handleSelectSidebar = (id: string) => {
    if (id === 'scan' || id === 'reservations' || id === 'active-vehicles') {
      setActivePanel(id)
      if (id !== 'scan') loadGateLists()
    } else if (id === 'checkin') navigate('/staff/create-session')
    else if (id === 'exception') navigate('/staff/exception')
  }

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <StaffLayout items={menuItems} activeItem={activePanel} onSelectItem={handleSelectSidebar}>
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <header className="staff-page-heading">
              <div>
                <h2>{panelCopy[activePanel].title}</h2>
                <p className="section-desc">{panelCopy[activePanel].desc}</p>
              </div>
              {activePanel !== 'scan' && (
                <button type="button" className="btn btn-outline btn-sm" onClick={loadGateLists} disabled={listLoading}>
                  {listLoading ? 'Đang tải...' : 'Làm mới'}
                </button>
              )}
            </header>

            {activePanel === 'scan' && (
              <div className="scan-entry-layout">
                <div className="camera-preview scan-entry-camera">
                  <div className="camera-frame clickable camera-frame--compact" onClick={() => fileInputRef.current?.click()}>
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} className="camera-preview-img" alt="Ảnh biển số xe" />
                    ) : (
                      <div className="camera-placeholder">
                        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <p>Tải ảnh xe lên</p>
                      </div>
                    )}

                    {uploading && (
                      <>
                        <div className="ocr-scanning-line" />
                        <div className="ocr-loading-overlay">
                          <span>Đang nhận diện biển số...</span>
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="upload-input-hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <button type="button" className="btn btn-outline btn-block" onClick={() => fileInputRef.current?.click()}>
                    Tải ảnh
                  </button>
                </div>

                <div className="scan-entry-form card-panel">
                  <div className="scan-entry-grid">
                    <div className="form-field">
                      <label htmlFor="license-plate">Biển số xe</label>
                      <input
                        id="license-plate"
                        type="text"
                        className="input-standalone plate-input"
                        placeholder="Nhập biển số"
                        value={licensePlate}
                        onChange={(event) => setPlateForConfirm(event.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label>Giờ hiện tại</label>
                      <div className="input-readonly">{entryTimePreview || formatNowInVietnamTime()}</div>
                    </div>

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
                  </div>

                  {message && <p className="alert-inline">{message}</p>}

                  <div className="scan-entry-actions">
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={loading || uploading || !licensePlate.trim()}
                      onClick={handleConfirmCheckIn}
                    >
                      {loading ? 'Đang xử lý...' : 'Xác nhận vào bãi'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={resetScan}>
                      Làm lại
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activePanel !== 'scan' && (
              <section className="staff-gate-board">
                {listError && <p className="alert-inline alert-error">{listError}</p>}

                <div className="staff-gate-grid staff-gate-grid--single">
                  {activePanel === 'reservations' && (
                    <div className="staff-gate-column card-panel">
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
                                <PlateVisual plate={reservationPlate} muted={reservationPlate === 'Chưa ghi nhận'} />
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
                    </div>
                  )}

                  {activePanel === 'active-vehicles' && (
                    <div className="staff-gate-column card-panel">
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
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </StaffLayout>
    </ProtectedRoute>
  )
}
