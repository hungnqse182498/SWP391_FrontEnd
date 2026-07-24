import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { ExternalLink, LogOut, QrCode } from 'lucide-react'
import StaffPageShell from '../../components/StaffPageShell'
import {
  gateApi,
  parkingOperationApi,
  type GateDto,
  type ParkingCheckOutResponse,
  type ParkingOnlinePayment,
  type ParkingQrDecodeResult,
} from '../../utils/apiServices'
import { formatNowInVietnamTime } from '../../utils/dateTime'
import { formatCurrency } from '../../utils/pricing'

function getOnlinePaymentUrl(payment: ParkingOnlinePayment | null) {
  return payment?.paymentUrl || payment?.PaymentUrl || ''
}

function getOnlinePaymentOrderCode(payment: ParkingOnlinePayment | null) {
  return payment?.orderCode || payment?.OrderCode || ''
}

function getOnlinePaymentLinkId(payment: ParkingOnlinePayment | null) {
  return payment?.paymentLinkId || payment?.PaymentLinkId || ''
}

export default function Checkout() {
  const location = useLocation()
  const initialState = location.state as { sessionId?: string; licensePlate?: string; qrPayload?: string } | null
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  const [checkOutType, setCheckOutType] = useState<'auto' | 'guest' | 'resident' | 'reservation'>('auto')
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [exitImageUrl, setExitImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [qrUploading, setQrUploading] = useState(false)
  const [qrDecode, setQrDecode] = useState<ParkingQrDecodeResult | null>(null)
  const [qrPayload, setQrPayload] = useState(initialState?.qrPayload ?? '')
  const [sessionId, setSessionId] = useState(initialState?.sessionId ?? '')
  const [licensePlate, setLicensePlate] = useState(initialState?.licensePlate ?? '')
  const [exitTimePreview, setExitTimePreview] = useState(() => initialState?.licensePlate ? formatNowInVietnamTime() : '')
  const [gateId, setGateId] = useState('')
  const [exitGates, setExitGates] = useState<GateDto[]>([])
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [onlinePayment, setOnlinePayment] = useState<ParkingOnlinePayment | null>(null)
  const [checkoutResult, setCheckoutResult] = useState<ParkingCheckOutResponse | null>(null)

  useEffect(() => {
    gateApi
      .getAll()
      .then((res) => {
        if (res.isSuccess && res.result) {
          const gates = res.result.filter((gate) => gate.gateType?.toLowerCase() === 'exit')
          setExitGates(gates)
          if (gates[0]) setGateId(gates[0].gateId)
        }
      })
      .catch(console.error)
  }, [])

  const setPlateForCheckout = (plate: string) => {
    const nextPlate = plate.toUpperCase()
    setLicensePlate(nextPlate)
    setExitTimePreview(nextPlate.trim() ? formatNowInVietnamTime() : '')
  }

  const preparePlateForCheckout = (plate: string) => {
    setPlateForCheckout(plate)
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImagePreviewUrl(URL.createObjectURL(file))
    setUploading(true)
    setMessage('')
    setOnlinePayment(null)
    setCheckoutResult(null)
    setPlateForCheckout('')

    try {
      const res = await parkingOperationApi.uploadAndRecognizePlate(file)
      if (res?.imageUrl) {
        setExitImageUrl(res.imageUrl)
        if (res.licensePlate) {
          const recognizedPlate = res.licensePlate.toUpperCase()
          preparePlateForCheckout(recognizedPlate)
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

  const handleQrUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setQrUploading(true)
    setMessage('')
    setOnlinePayment(null)
    setCheckoutResult(null)
    setQrDecode(null)
    setQrPayload('')
    setSessionId('')

    try {
      const res = await parkingOperationApi.uploadAndDecodeQr(file)
      if (res.isSuccess && res.result) {
        setQrDecode(res.result)
        setQrPayload(res.result.qrPayload)
        setSessionId(res.result.sessionId || '')
        if (!res.result.sessionId) {
          setMessage('QR đã đọc được nhưng không phải mã vé xe/session. Vui lòng dùng QR vé gửi xe để checkout.')
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

  const handleCheckout = async () => {
    if (!licensePlate.trim()) {
      setMessage('Vui lòng nhập hoặc nhận diện biển số xe ra')
      return
    }
    if (!sessionId && !qrPayload.trim()) {
      setMessage('Vui lòng upload ảnh QR vé xe hoặc nhập SessionId/QR payload')
      return
    }
    if (!gateId) {
      setMessage('Vui lòng chọn cổng ra')
      return
    }

    setLoading(true)
    setMessage('')
    setOnlinePayment(null)
    setCheckoutResult(null)
    try {
      const customerType =
        checkOutType === 'auto'
          ? undefined
          : checkOutType === 'resident'
            ? 'Resident'
            : checkOutType === 'reservation'
              ? 'Reservation'
              : 'Guest'

      const res = await parkingOperationApi.checkOut({
        customerType,
        sessionId: sessionId || undefined,
        qrPayload: qrPayload.trim() || undefined,
        licensePlate: licensePlate.trim() || undefined,
        licensePlateOut: licensePlate.trim() || undefined,
        gateId,
        paymentMethod,
        exitImageUrl: exitImageUrl || undefined,
      })
      if (res.isSuccess) {
        setCheckoutResult(res.result ?? null)
        const payment = res.result?.onlinePayment ?? res.result?.OnlinePayment ?? null
        setOnlinePayment(payment)
        setMessage(res.message || 'Checkout thành công')
        setPlateForCheckout('')
        setImagePreviewUrl('')
        setExitImageUrl('')
        setQrPayload('')
        setSessionId('')
        setQrDecode(null)
        if (qrInputRef.current) qrInputRef.current.value = ''
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
      <StaffPageShell activeItem="checkout">
        <div className="staff-content-wrapper staff-manager-page manager-resource-page">
          <div className="staff-section">
            <header className="manager-resource-header">
              <div className="manager-resource-title"><span className="manager-resource-icon manager-resource-icon--orange"><LogOut size={24} aria-hidden /></span><div><h2>Checkout tại cổng ra</h2><p>Đọc vé QR, đối chiếu biển số, tính phí và xác nhận xe rời bãi.</p></div></div>
            </header>

            <div className="scan-container staff-checkout-layout">
              <div className="camera-preview card-panel staff-checkout-camera-card">
                <div className="scan-card-heading"><span className="scan-step-badge">1</span><div><h3>Ảnh xe tại cổng ra</h3><p>Tải ảnh để nhận diện và đối chiếu biển số lúc vào.</p></div></div>
                <div className="camera-frame clickable" onClick={() => fileInputRef.current?.click()}>
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} className="camera-preview-img" alt="Exit Plate Preview" />
                  ) : (
                    <div className="camera-placeholder">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <p>Tải ảnh xe ra bãi</p>
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
              </div>

              <div className="scan-form card-panel staff-checkout-form-card">
                <div className="scan-card-heading"><span className="scan-step-badge">2</span><div><h3>Xác nhận thông tin checkout</h3><p>Đọc QR vé xe, chọn cổng ra và phương thức thanh toán.</p></div></div>
                <div className="form-field">
                  <label>Loại check-out</label>
                  <select
                    className="input-standalone select"
                    value={checkOutType}
                    onChange={(event) => {
                      setCheckOutType(event.target.value as 'auto' | 'guest' | 'resident' | 'reservation')
                      setMessage('')
                      setOnlinePayment(null)
                      setCheckoutResult(null)
                    }}
                  >
                    <option value="auto">Tự nhận diện từ vé QR</option>
                    <option value="guest">Khách vãng lai</option>
                    <option value="resident">Cư dân (Khách tháng)</option>
                    <option value="reservation">Xe đặt trước</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Mã vé xe / SessionId</label>
                  <div className="input-readonly">
                    {sessionId ? `SessionId: ${sessionId}` : 'Upload QR hoặc nhập payload bên dưới'}
                  </div>
                  <input
                    type="text"
                    className="input-standalone"
                    placeholder="Dán QR payload / SessionId"
                    value={qrPayload}
                    onChange={(event) => {
                      setQrPayload(event.target.value.trim())
                      setSessionId('')
                      setQrDecode(null)
                      setOnlinePayment(null)
                      setCheckoutResult(null)
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={qrUploading}
                    onClick={() => qrInputRef.current?.click()}
                  >
                    <QrCode size={16} aria-hidden />
                    {qrUploading ? 'Đang đọc QR...' : 'Tải ảnh QR vé'}
                  </button>
                  <input
                    type="file"
                    ref={qrInputRef}
                    className="upload-input-hidden"
                    accept="image/*"
                    onChange={handleQrUpload}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="license-plate-checkout">Biển số xe</label>
                  <input
                    id="license-plate-checkout"
                    type="text"
                    className="input-standalone"
                    placeholder="Nhập biển số"
                    value={licensePlate}
                    onChange={(event) => {
                      setPlateForCheckout(event.target.value)
                      setOnlinePayment(null)
                      setCheckoutResult(null)
                    }}
                    onBlur={() => preparePlateForCheckout(licensePlate)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') preparePlateForCheckout(licensePlate)
                    }}
                  />
                </div>

                <div className="form-field">
                  <label>Cổng ra</label>
                  <select
                    className="input-standalone select"
                    value={gateId}
                    onChange={(event) => {
                      setGateId(event.target.value)
                      setOnlinePayment(null)
                      setCheckoutResult(null)
                    }}
                  >
                    {exitGates.length === 0 && <option value="">Chưa có cổng ra</option>}
                    {exitGates.map((gate) => (
                      <option key={gate.gateId} value={gate.gateId}>
                        {gate.gateName}
                        {gate.floorName ? ` · ${gate.floorName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {checkOutType !== 'resident' && (
                  <div className="form-field">
                    <label>Thanh toán</label>
                    <select
                      className="input-standalone select"
                      value={paymentMethod}
                      onChange={(event) => {
                        setPaymentMethod(event.target.value)
                        setOnlinePayment(null)
                        setCheckoutResult(null)
                      }}
                    >
                      <option value="Cash">Tiền mặt</option>
                      <option value="PayOS">PayOS</option>
                    </select>
                  </div>
                )}

                {message && <p className="alert-inline">{message}</p>}

                {getOnlinePaymentUrl(onlinePayment) && (
                  <div className="scan-result checkout-online-payment">
                    <h3>Thanh toán PayOS</h3>
                    <div className="scan-info">
                      <p><strong>OrderCode:</strong> {getOnlinePaymentOrderCode(onlinePayment) || 'Chưa có'}</p>
                      <p><strong>PaymentLinkId:</strong> {getOnlinePaymentLinkId(onlinePayment) || 'Chưa có'}</p>
                    </div>
                    <div className="checkout-actions">
                      <a
                        className="btn btn-primary btn-block"
                        href={getOnlinePaymentUrl(onlinePayment)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={16} aria-hidden />
                        Mở trang thanh toán PayOS
                      </a>
                    </div>
                  </div>
                )}

                <div className="scan-result">
                  <h3>Thông tin checkout</h3>
                  <div className="scan-info">
                    <p><strong>Biển số ra:</strong> {checkoutResult?.session?.licensePlateOut || checkoutResult?.Session?.licensePlateOut || licensePlate || 'Chưa nhập'}</p>
                    <p><strong>Giờ hiện tại:</strong> {exitTimePreview || formatNowInVietnamTime()}</p>
                    <p><strong>SessionId:</strong> {checkoutResult?.session?.sessionId || checkoutResult?.Session?.sessionId || sessionId || 'Chưa có'}</p>
                    <p><strong>Loại mã QR:</strong> {qrDecode?.codeType || 'Chưa đọc QR'}</p>
                    {(checkoutResult?.fee || checkoutResult?.Fee) ? (
                      <p className="fee-amount"><strong>Phí gửi:</strong> {formatCurrency((checkoutResult.fee || checkoutResult.Fee)!.amount)}</p>
                    ) : checkOutType === 'resident' ? (
                      <p className="fee-amount"><strong>Phí gửi:</strong> Miễn phí nếu còn gói tháng hợp lệ</p>
                    ) : (
                      <p className="fee-amount"><strong>Thanh toán:</strong> {paymentMethod}</p>
                    )}
                  </div>
                  <div className="checkout-actions">
                    <button
                      type="button"
                      className="btn btn-success btn-block"
                      disabled={loading || uploading || qrUploading || !licensePlate.trim() || (!sessionId && !qrPayload.trim()) || !gateId}
                      onClick={handleCheckout}
                    >
                      {loading ? 'Đang xử lý...' : 'Xác nhận checkout'}
                    </button>
                  </div>
                </div>

                {qrDecode && (
                  <div className="scan-result">
                    <h3>QR đã đọc</h3>
                    <div className="scan-info">
                      <p><strong>Payload:</strong> {qrDecode.qrPayload}</p>
                      <p><strong>SessionId:</strong> {qrDecode.sessionId || 'Không có'}</p>
                      <p><strong>ReservationId:</strong> {qrDecode.reservationId || 'Không có'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </StaffPageShell>
  )
}
