import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, LogOut } from 'lucide-react'
import StaffLayout from '../../components/StaffLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { parkingOperationApi, type ParkingFeePreview } from '../../utils/apiServices'
import { formatNowInVietnamTime, formatUtcToVietnamDateTime } from '../../utils/dateTime'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [checkOutType, setCheckOutType] = useState<'guest' | 'resident'>('guest')
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [exitImageUrl, setExitImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [licensePlate, setLicensePlate] = useState('')
  const [exitTimePreview, setExitTimePreview] = useState('')
  const [gateName, setGateName] = useState('Cổng A')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<ParkingFeePreview | null>(null)
  const [showResidentCard, setShowResidentCard] = useState(false)

  const setPlateForCheckout = (plate: string) => {
    const nextPlate = plate.toUpperCase()
    setLicensePlate(nextPlate)
    setExitTimePreview(nextPlate.trim() ? formatNowInVietnamTime() : '')
  }

  const triggerPreview = async (plate: string) => {
    if (!plate.trim()) return
    setLoading(true)
    setMessage('')
    try {
      const res = await parkingOperationApi.guestCheckOutPreview({
        licensePlate: plate.trim(),
      })
      if (res.isSuccess && res.result) {
        setPreview(res.result)
      } else {
        setMessage(res.message || 'Không tìm thấy phiên gửi xe hoặc lỗi tính phí')
        setPreview(null)
      }
    } catch (err) {
      console.error(err)
      setMessage('Lỗi kết nối API khi tính phí')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const preparePlateForCheckout = async (plate: string) => {
    setPlateForCheckout(plate)
    setPreview(null)
    setShowResidentCard(false)

    if (!plate.trim()) return
    if (checkOutType === 'guest') {
      await triggerPreview(plate)
    } else {
      setShowResidentCard(true)
    }
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImagePreviewUrl(URL.createObjectURL(file))
    setUploading(true)
    setMessage('')
    setPlateForCheckout('')
    setPreview(null)
    setShowResidentCard(false)

    try {
      const res = await parkingOperationApi.uploadAndRecognizePlate(file)
      if (res?.imageUrl) {
        setExitImageUrl(res.imageUrl)
        if (res.licensePlate) {
          const recognizedPlate = res.licensePlate.toUpperCase()
          await preparePlateForCheckout(recognizedPlate)
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

  const handleCheckout = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await parkingOperationApi.guestCheckOut({
        licensePlate: licensePlate.trim() || undefined,
        gateName,
        paymentMethod,
        licensePlateOut: licensePlate.trim() || undefined,
        exitImageUrl: exitImageUrl || undefined,
      })
      if (res.isSuccess) {
        setMessage(res.message || 'Checkout thành công')
        setPreview(null)
        setPlateForCheckout('')
        setImagePreviewUrl('')
        setExitImageUrl('')
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

  const handleResidentCheckout = async () => {
    if (!licensePlate.trim()) return
    setLoading(true)
    setMessage('')
    try {
      const res = await parkingOperationApi.residentCheckOut({
        licensePlate: licensePlate.trim() || undefined,
        gateName,
        licensePlateOut: licensePlate.trim() || undefined,
        exitImageUrl: exitImageUrl || undefined,
      })
      if (res.isSuccess) {
        setMessage(res.message || 'Checkout cư dân thành công')
        setPlateForCheckout('')
        setImagePreviewUrl('')
        setExitImageUrl('')
        setShowResidentCard(false)
      } else {
        setMessage(res.message || 'Checkout cư dân thất bại')
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
              Kiểm tra biển số và xác nhận xe ra bãi.
            </p>

            <div className="scan-container">
              <div className="camera-preview">
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

              <div className="scan-form">
                <div className="form-field">
                  <label>Loại check-out</label>
                  <select
                    className="input-standalone select"
                    value={checkOutType}
                    onChange={(event) => {
                      setCheckOutType(event.target.value as 'guest' | 'resident')
                      setPreview(null)
                      setShowResidentCard(false)
                      setMessage('')
                    }}
                  >
                    <option value="guest">Khách vãng lai</option>
                    <option value="resident">Cư dân (Khách tháng)</option>
                  </select>
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
                      setPreview(null)
                      setShowResidentCard(false)
                    }}
                    onBlur={() => preparePlateForCheckout(licensePlate)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') preparePlateForCheckout(licensePlate)
                    }}
                  />
                </div>

                <div className="form-field">
                  <label>Cổng ra</label>
                  <select className="input-standalone select" value={gateName} onChange={(event) => setGateName(event.target.value)}>
                    <option value="Cổng A">Cổng A</option>
                    <option value="Cổng B">Cổng B</option>
                  </select>
                </div>

                {checkOutType === 'guest' && (
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
                )}

                {message && <p className="alert-inline">{message}</p>}

                {checkOutType === 'guest' && preview && (
                  <div className="scan-result">
                    <h3>Thông tin xe ra bãi</h3>
                    <div className="scan-info">
                      <p><strong>Biển số:</strong> {preview.licensePlate}</p>
                      <p><strong>Giờ hiện tại:</strong> {formatUtcToVietnamDateTime(preview.exitTime)}</p>
                      <p><strong>Giờ vào:</strong> {formatUtcToVietnamDateTime(preview.entryTime)}</p>
                      <p><strong>Thời gian gửi:</strong> {preview.totalHours.toFixed(1)} giờ</p>
                      <p className="fee-amount"><strong>Phí gửi:</strong> {formatCurrency(preview.amount)}</p>
                    </div>
                    <div className="checkout-actions">
                      <button type="button" className="btn btn-success btn-block" disabled={loading || uploading} onClick={handleCheckout}>
                        Xác nhận thanh toán
                      </button>
                      <button type="button" className="btn btn-ghost btn-block" onClick={() => setPreview(null)}>
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {checkOutType === 'resident' && showResidentCard && (
                  <div className="scan-result">
                    <h3>Thông tin xe cư dân</h3>
                    <div className="scan-info">
                      <p><strong>Biển số:</strong> {licensePlate}</p>
                      <p><strong>Giờ hiện tại:</strong> {exitTimePreview || formatNowInVietnamTime()}</p>
                      <p className="fee-amount"><strong>Phí gửi:</strong> Miễn phí (Gói tháng)</p>
                    </div>
                    <div className="checkout-actions">
                      <button type="button" className="btn btn-success btn-block" disabled={loading || uploading} onClick={handleResidentCheckout}>
                        Xác nhận xe ra bãi
                      </button>
                      <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowResidentCard(false)}>
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
