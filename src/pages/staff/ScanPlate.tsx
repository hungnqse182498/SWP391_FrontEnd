import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock,
  QrCode,
  RotateCcw,
  Smartphone,
  Upload,
  UserCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import StaffLayout from '../../components/StaffLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import {
  parkingOperationApi,
  parkingSessionApi,
  reservationApi,
  vehicleTypeApi,
  gateApi,
  type GateDto,
  type ParkingSessionTicket,
  type ParkingQrDecodeResult,
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

interface CheckInTicketView {
  sessionId: string
  qrPayload: string
  qrCodeDataUrl: string
  licensePlate?: string
  vehicleTypeName?: string
  slotCode?: string
  entryTime?: string
}

type LooseParkingSessionTicket = ParkingSessionTicket & {
  QrPayload?: string
  QrCodeDataUrl?: string
}

type CheckInResult = Partial<ParkingSessionDto> & {
  licensePlate?: string
  ticket?: LooseParkingSessionTicket
  Ticket?: LooseParkingSessionTicket
  SessionId?: string
  LicensePlate?: string
  LicensePlateIn?: string
  VehicleTypeName?: string
  ActualSlotCode?: string
  AssignedSlotCode?: string
  EntryTime?: string
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

function toCheckInTicketView(result?: CheckInResult): CheckInTicketView | null {
  const ticket = result?.ticket ?? result?.Ticket
  const qrPayload = ticket?.qrPayload ?? ticket?.QrPayload
  const qrCodeDataUrl = ticket?.qrCodeDataUrl ?? ticket?.QrCodeDataUrl
  if (!qrCodeDataUrl || !qrPayload) return null

  return {
    sessionId: result?.sessionId || result?.SessionId || qrPayload,
    qrPayload,
    qrCodeDataUrl,
    licensePlate: result?.licensePlateIn || result?.LicensePlateIn || result?.licensePlate || result?.LicensePlate,
    vehicleTypeName: result?.vehicleTypeName || result?.VehicleTypeName,
    slotCode: result?.actualSlotCode || result?.ActualSlotCode || result?.assignedSlotCode || result?.AssignedSlotCode,
    entryTime: result?.entryTime || result?.EntryTime,
  }
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
  const qrInputRef = useRef<HTMLInputElement>(null)

  const [activePanel, setActivePanel] = useState<GatePanel>(locationState?.activePanel ?? 'scan')
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [entryImageUrl, setEntryImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [licensePlate, setLicensePlate] = useState('')
  const [entryTimePreview, setEntryTimePreview] = useState('')
  const [vehicleTypeId, setVehicleTypeId] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeDto[]>([])
  const [gateId, setGateId] = useState('')
  const [entryGates, setEntryGates] = useState<GateDto[]>([])
  const [checkInType, setCheckInType] = useState<'guest' | 'resident' | 'reservation'>('guest')
  const [reservationId, setReservationId] = useState('')
  const [qrPayload, setQrPayload] = useState('')
  const [qrDecode, setQrDecode] = useState<ParkingQrDecodeResult | null>(null)
  const [qrUploading, setQrUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [checkInTicket, setCheckInTicket] = useState<CheckInTicketView | null>(null)
  const [reservations, setReservations] = useState<ReservationDto[]>([])
  const [activeSessions, setActiveSessions] = useState<ParkingSessionDto[]>([])
  const [ticketSession, setTicketSession] = useState<ParkingSessionDto | null>(null)
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

    gateApi
      .getAll()
      .then((res) => {
        if (res.isSuccess && res.result) {
          const gates = res.result.filter((gate) => gate.gateType?.toLowerCase() === 'entry')
          setEntryGates(gates)
          if (gates[0]) setGateId(gates[0].gateId)
        }
      })
      .catch(console.error)

    queueMicrotask(() => {
      void loadGateLists()
    })
  }, [])

  const setPlateForConfirm = (plate: string) => {
    const nextPlate = plate.toUpperCase()
    setLicensePlate(nextPlate)
    setEntryTimePreview(nextPlate.trim() ? formatNowInVietnamTime() : '')
  }

  const resetScan = (options: { keepResult?: boolean } = {}) => {
    setImagePreviewUrl('')
    setEntryImageUrl('')
    setReservationId('')
    setQrPayload('')
    setQrDecode(null)
    setPlateForConfirm('')
    if (!options.keepResult) {
      setMessage('')
      setCheckInTicket(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (qrInputRef.current) qrInputRef.current.value = ''
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImagePreviewUrl(URL.createObjectURL(file))
    setUploading(true)
    setMessage('')
    setCheckInTicket(null)
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
    if (!licensePlate.trim() || !gateId) return
    if (checkInType !== 'reservation' && !vehicleTypeId) return
    if (checkInType === 'reservation' && !reservationId && !qrPayload.trim()) {
      setMessage('Vui lòng upload ảnh QR đặt chỗ hoặc nhập mã QR đặt chỗ')
      return
    }
    setLoading(true)
    setMessage('')
    setCheckInTicket(null)
    try {
      const payload = {
        customerType:
          checkInType === 'resident'
            ? 'Resident'
            : checkInType === 'reservation'
              ? 'Reservation'
              : 'Guest',
        licensePlate: licensePlate.trim(),
        vehicleTypeId: checkInType === 'reservation' ? undefined : vehicleTypeId,
        reservationId: reservationId || undefined,
        qrPayload: qrPayload.trim() || undefined,
        gateId,
        entryImageUrl: entryImageUrl || undefined,
      } as const
      const res = await parkingOperationApi.checkIn(payload)

      if (res.isSuccess) {
        const ticket = toCheckInTicketView(res.result)
        resetScan({ keepResult: true })
        setCheckInTicket(ticket)
        setMessage(res.message || 'Check-in thành công')
        loadGateLists()
      } else {
        setMessage(res.message || 'Check-in thất bại')
      }
    } catch (err) {
      console.error(err)
      setMessage(err instanceof Error ? err.message : 'Lỗi kết nối API')
    } finally {
      setLoading(false)
    }
  }

  const handleQrUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setQrUploading(true)
    setMessage('')
    setCheckInTicket(null)
    setQrDecode(null)
    setReservationId('')
    setQrPayload('')

    try {
      const res = await parkingOperationApi.uploadAndDecodeQr(file)
      if (res.isSuccess && res.result) {
        setQrDecode(res.result)
        setQrPayload(res.result.qrPayload)
        setReservationId(res.result.reservationId || '')
        if (!res.result.reservationId) {
          setMessage('QR đã đọc được nhưng không phải mã đặt chỗ. Vui lòng dùng QR reservation để check-in đặt trước.')
        }
      } else {
        setMessage(res.message || 'Không đọc được mã QR.')
      }
    } catch (err) {
      console.error(err)
      setMessage(err instanceof Error ? err.message : 'Lỗi kết nối khi upload QR.')
    } finally {
      setQrUploading(false)
    }
  }

  const handleSelectSidebar = (id: string) => {
    if (id === 'scan' || id === 'reservations' || id === 'active-vehicles') {
      setActivePanel(id)
      if (id !== 'scan') loadGateLists()
    } else if (id === 'checkin') navigate('/staff/create-session')
    else if (id === 'exception') navigate('/staff/exception')
  }

  const selectCheckInType = (type: 'guest' | 'resident' | 'reservation') => {
    setCheckInType(type)
    setMessage('')
    setCheckInTicket(null)
    if (type !== 'reservation') {
      setReservationId('')
      setQrPayload('')
      setQrDecode(null)
    }
  }

  const handleUseReservation = (reservation: ReservationDto) => {
    resetScan()
    setCheckInType('reservation')
    setReservationId(reservation.reservationId)
    const plate = getReservationPlate(reservation)
    if (plate !== 'Chưa ghi nhận') setPlateForConfirm(plate)
    setActivePanel('scan')
  }

  const hasReservationCode = Boolean(reservationId || qrPayload.trim())
  const canConfirm = Boolean(
    !loading &&
      !uploading &&
      !qrUploading &&
      licensePlate.trim() &&
      gateId &&
      (checkInType === 'reservation' ? hasReservationCode : vehicleTypeId),
  )

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
                <div className="camera-preview scan-entry-camera card-panel">
                  <div className="scan-card-heading">
                    <span className="scan-step-badge">1</span>
                    <div>
                      <h3>Nhận diện biển số</h3>
                      <p>Chụp rõ toàn bộ biển số hoặc nhập thủ công ở bước bên cạnh.</p>
                    </div>
                  </div>
                  <div className="camera-frame clickable camera-frame--compact" onClick={() => fileInputRef.current?.click()}>
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} className="camera-preview-img" alt="Ảnh biển số xe" />
                    ) : (
                      <div className="camera-placeholder">
                        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <p>Nhấn để chọn ảnh biển số</p>
                        <small>Hỗ trợ JPG, PNG từ camera hoặc thiết bị</small>
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
                    <Upload size={17} aria-hidden />
                    {imagePreviewUrl ? 'Đổi ảnh khác' : 'Chọn ảnh biển số'}
                  </button>
                </div>

                <div className="scan-entry-form card-panel">
                  <div className="scan-card-heading">
                    <span className="scan-step-badge">2</span>
                    <div>
                      <h3>Xác nhận thông tin xe</h3>
                      <p>Kiểm tra biển số, loại khách và cổng trước khi cho xe vào.</p>
                    </div>
                  </div>
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

                    <div className="form-field form-field--full">
                      <label>Loại khách</label>
                      <div className="checkin-type-selector" role="group" aria-label="Chọn loại khách check-in">
                        <button
                          type="button"
                          className={checkInType === 'guest' ? 'active' : ''}
                          aria-pressed={checkInType === 'guest'}
                          onClick={() => selectCheckInType('guest')}
                        >
                          <UsersRound size={19} aria-hidden />
                          <span><strong>Vãng lai</strong><small>Khách gửi xe thông thường</small></span>
                        </button>
                        <button
                          type="button"
                          className={checkInType === 'resident' ? 'active' : ''}
                          aria-pressed={checkInType === 'resident'}
                          onClick={() => selectCheckInType('resident')}
                        >
                          <UserCheck size={19} aria-hidden />
                          <span><strong>Khách tháng</strong><small>Đã có gói gửi xe</small></span>
                        </button>
                        <button
                          type="button"
                          className={checkInType === 'reservation' ? 'active' : ''}
                          aria-pressed={checkInType === 'reservation'}
                          onClick={() => selectCheckInType('reservation')}
                        >
                          <CalendarClock size={19} aria-hidden />
                          <span><strong>Đặt trước</strong><small>Có mã QR hoặc mã đơn</small></span>
                        </button>
                      </div>
                    </div>

                    {checkInType !== 'reservation' && (
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
                    )}

                    {checkInType === 'reservation' && (
                      <div className="form-field form-field--full reservation-code-field">
                        <label>Mã QR đặt chỗ</label>
                        <div className={`input-readonly${reservationId ? ' input-readonly--success' : ''}`}>
                          {reservationId ? `ReservationId: ${reservationId}` : 'Upload QR hoặc nhập payload bên dưới'}
                        </div>
                        <input
                          type="text"
                          className="input-standalone"
                          placeholder="Dán QR payload / ReservationId"
                          value={qrPayload}
                          onChange={(event) => {
                            setQrPayload(event.target.value.trim())
                            setReservationId('')
                            setQrDecode(null)
                          }}
                        />
                        <div className="reservation-code-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={qrUploading}
                            onClick={() => qrInputRef.current?.click()}
                          >
                            <QrCode size={16} aria-hidden />
                            {qrUploading ? 'Đang đọc QR...' : 'Quét QR từ ảnh'}
                          </button>
                          {hasReservationCode && (
                            <span className="scan-ready-label"><CheckCircle2 size={16} aria-hidden /> Đã nhận mã đặt chỗ</span>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={qrInputRef}
                          className="upload-input-hidden"
                          accept="image/*"
                          onChange={handleQrUpload}
                        />
                      </div>
                    )}

                    <div className="form-field">
                      <label htmlFor="gate">Cổng vào</label>
                      <select
                        id="gate"
                        className="input-standalone select"
                        value={gateId}
                        onChange={(event) => setGateId(event.target.value)}
                      >
                        {entryGates.length === 0 && <option value="">Chưa có cổng vào</option>}
                        {entryGates.map((gate) => (
                          <option key={gate.gateId} value={gate.gateId}>
                            {gate.gateName}
                            {gate.floorName ? ` · ${gate.floorName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {checkInType === 'reservation' && qrDecode && (
                    <div className="scan-result">
                      <h3>QR đặt chỗ</h3>
                      <div className="scan-info">
                        <p><strong>Loại mã:</strong> {qrDecode.codeType}</p>
                        <p><strong>ReservationId:</strong> {qrDecode.reservationId || 'Không có'}</p>
                        <p><strong>Payload:</strong> {qrDecode.qrPayload}</p>
                      </div>
                    </div>
                  )}

                  {message && (
                    <p className={`alert-inline ${checkInTicket ? 'alert-success' : 'alert-error'}`} role="status">
                      {checkInTicket ? <CheckCircle2 size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
                      {message}
                    </p>
                  )}

                  {checkInTicket && (
                    <div className="reservation-ticket-card staff-checkin-ticket">
                      <img src={checkInTicket.qrCodeDataUrl} alt="Mã QR vé xe" className="reservation-ticket-qr" />
                      <div>
                        <span>Vé xe sau check-in</span>
                        <code className="reservation-ticket-code">{checkInTicket.qrPayload}</code>
                        <div className="staff-checkin-ticket-meta">
                          <p><strong>SessionId:</strong> {checkInTicket.sessionId}</p>
                          {checkInTicket.licensePlate && <p><strong>Biển số:</strong> {checkInTicket.licensePlate}</p>}
                          {checkInTicket.vehicleTypeName && <p><strong>Loại xe:</strong> {checkInTicket.vehicleTypeName}</p>}
                          {checkInTicket.slotCode && <p><strong>Ô:</strong> {checkInTicket.slotCode}</p>}
                          {checkInTicket.entryTime && <p><strong>Giờ vào:</strong> {formatDateTime(checkInTicket.entryTime)}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="scan-entry-actions">
                    <div className={`scan-submit-status${canConfirm ? ' ready' : ''}`}>
                      {canConfirm ? (
                        <><CheckCircle2 size={17} aria-hidden /> Thông tin đã sẵn sàng</>
                      ) : (
                        <><AlertCircle size={17} aria-hidden /> Vui lòng nhập đủ thông tin bắt buộc</>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={!canConfirm}
                      onClick={handleConfirmCheckIn}
                    >
                      <CheckCircle2 size={18} aria-hidden />
                      {loading ? 'Đang xử lý...' : 'Xác nhận vào bãi'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => resetScan()}>
                      <RotateCcw size={17} aria-hidden />
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
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm staff-reservation-checkin-btn"
                                    onClick={() => handleUseReservation(reservation)}
                                  >
                                    <CheckCircle2 size={16} aria-hidden />
                                    Check-in đơn này
                                  </button>
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
                                {session.ticket?.qrCodeDataUrl && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm staff-ticket-button"
                                    onClick={() => setTicketSession(session)}
                                  >
                                    <QrCode size={16} aria-hidden />
                                    Xem mã vé
                                  </button>
                                )}
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

            {ticketSession?.ticket && (
              <div
                className="modal-overlay"
                role="presentation"
                onClick={(event) => {
                  if (event.target === event.currentTarget) setTicketSession(null)
                }}
              >
                <div
                  className="modal-panel staff-ticket-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="staff-ticket-modal-title"
                >
                  <div className="staff-ticket-modal-header">
                    <div>
                      <h3 id="staff-ticket-modal-title" className="modal-title">Mã vé giữ xe</h3>
                      <p>{ticketSession.licensePlateIn} · {ticketSession.vehicleTypeName || 'Chưa rõ loại xe'}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      aria-label="Đóng mã vé"
                      onClick={() => setTicketSession(null)}
                    >
                      <X size={20} aria-hidden />
                    </button>
                  </div>
                  <div className="staff-ticket-modal-content">
                    <img
                      src={ticketSession.ticket.qrCodeDataUrl}
                      alt={`Mã QR vé giữ xe ${ticketSession.licensePlateIn}`}
                      className="staff-ticket-modal-qr"
                    />
                    <span>Mã vé / SessionId</span>
                    <code className="reservation-ticket-code">{ticketSession.ticket.qrPayload}</code>
                    <p>Giờ vào: {formatDateTime(ticketSession.entryTime)}</p>
                    <small>Dùng mã QR này để xác minh và làm thủ tục cho khách trong trường hợp mất vé.</small>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </StaffLayout>
    </ProtectedRoute>
  )
}
