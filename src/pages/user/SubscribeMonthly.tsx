import { useEffect, useMemo, useState } from 'react'
import { Bike, CalendarDays, Car, CreditCard, MapPin } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import {
  parkingSlotApi,
  subscriptionApi,
  type ParkingSlotDto,
  type SubscriptionPackageDto,
} from '../../utils/apiServices'
import { formatCurrency } from '../../utils/pricing'
import { normalizeLicensePlate } from '../../utils/licensePlate'
import { savePaymentReturnContext } from '../../utils/paymentReturnContext'

type VehicleFilter = 'all' | 'car' | 'bike'

const isActivePackage = (pkg: SubscriptionPackageDto) =>
  pkg.status.toLowerCase() === 'active'

const getVehicleFilter = (pkg: SubscriptionPackageDto): VehicleFilter => {
  const name = (pkg.vehicleTypeName ?? '').toLowerCase()
  if (name.includes('car') || name.includes('oto') || name.includes('o to') || name.includes('ô tô')) {
    return 'car'
  }
  if (name.includes('bike') || name.includes('motor') || name.includes('xe may') || name.includes('xe máy')) {
    return 'bike'
  }
  return 'all'
}

const getApiErrorMessage = (err: unknown) => {
  const apiError = err as {
    response?: { data?: { message?: string } }
    data?: { message?: string }
    message?: string
  }

  const responseMessage = apiError.response?.data?.message || apiError.data?.message
  if (responseMessage) return responseMessage

  if (!(err instanceof Error)) return null
  const jsonStart = err.message.indexOf('{')
  if (jsonStart === -1) return err.message || null

  try {
    const parsed = JSON.parse(err.message.slice(jsonStart)) as { message?: string }
    return parsed.message || err.message
  } catch {
    return err.message
  }
}

function SubscribeContent() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const requestedPackageId = searchParams.get('package') ?? ''
  const requestedVehicle = searchParams.get('vehicle')
  const [vehicle, setVehicle] = useState<VehicleFilter>(
    requestedVehicle === 'car' || requestedVehicle === 'bike' ? requestedVehicle : 'all',
  )
  const [packages, setPackages] = useState<SubscriptionPackageDto[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [licensePlate, setLicensePlate] = useState(
    normalizeLicensePlate(profile?.vehiclePlate ?? ''),
  )
  const [availableFixedSlots, setAvailableFixedSlots] = useState<ParkingSlotDto[]>([])
  const [selectedFixedSlotId, setSelectedFixedSlotId] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const activePackages = useMemo(
    () => packages.filter(isActivePackage),
    [packages],
  )

  const visiblePackages = useMemo(
    () =>
      activePackages.filter((pkg) => {
        if (vehicle === 'all') return true
        const packageVehicle = getVehicleFilter(pkg)
        return packageVehicle === vehicle || packageVehicle === 'all'
      }),
    [activePackages, vehicle],
  )

  const selectedPackage =
    visiblePackages.find((pkg) => pkg.packageId === selectedPackageId) ??
    visiblePackages[0] ??
    null

  const requiresFixedSlot = Boolean(
    selectedPackage?.requireFixedSlot && getVehicleFilter(selectedPackage) !== 'bike',
  )
  const selectedFixedSlot = availableFixedSlots.find((slot) => slot.slotId === selectedFixedSlotId)

  useEffect(() => {
    if (!profile?.vehiclePlate) return undefined
    const timer = window.setTimeout(
      () => setLicensePlate(normalizeLicensePlate(profile.vehiclePlate)),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [profile])

  useEffect(() => {
    let ignore = false

    const loadPackages = async () => {
      setLoadingPackages(true)
      setError('')
      try {
        const res = await subscriptionApi.getPackages()
        if (ignore) return

        if (res.isSuccess && Array.isArray(res.result)) {
          setPackages(res.result)
          const requestedPackage = res.result.find(
            (pkg) => pkg.packageId === requestedPackageId && isActivePackage(pkg),
          )
          setSelectedPackageId(requestedPackage?.packageId ?? res.result.find(isActivePackage)?.packageId ?? '')
          if (requestedPackage && requestedVehicle !== 'car' && requestedVehicle !== 'bike') {
            setVehicle(getVehicleFilter(requestedPackage))
          }
        } else {
          setError(res.message || 'Không thể tải danh sách gói thuê bao.')
        }
      } catch (err) {
        console.error(err)
        if (!ignore) setError(getApiErrorMessage(err) || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.')
      } finally {
        if (!ignore) setLoadingPackages(false)
      }
    }

    loadPackages()
    return () => {
      ignore = true
    }
  }, [requestedPackageId, requestedVehicle])

  useEffect(() => {
    const nextPackageId = selectedPackage?.packageId ?? ''
    if (nextPackageId === selectedPackageId) return undefined

    const timer = window.setTimeout(() => setSelectedPackageId(nextPackageId), 0)
    return () => window.clearTimeout(timer)
  }, [selectedPackage, selectedPackageId])

  useEffect(() => {
    let ignore = false

    if (!selectedPackage || !requiresFixedSlot) return undefined

    const loadAvailableSlots = async () => {
      setLoadingSlots(true)
      try {
        const res = await parkingSlotApi.getAll()
        if (ignore) return

        if (res.isSuccess && Array.isArray(res.result)) {
          const matchingSlots = res.result.filter(
            (slot) =>
              slot.isResident &&
              slot.vehicleTypeId === selectedPackage.vehicleTypeId &&
              slot.status.toLowerCase() === 'available',
          )
          setAvailableFixedSlots(matchingSlots)
          setSelectedFixedSlotId(matchingSlots[0]?.slotId ?? '')
        } else {
          setAvailableFixedSlots([])
          setSelectedFixedSlotId('')
          setError(res.message || 'Không thể tải danh sách vị trí đỗ cư dân.')
        }
      } catch (err) {
        console.error(err)
        if (!ignore) {
          setAvailableFixedSlots([])
          setSelectedFixedSlotId('')
          setError(getApiErrorMessage(err) || 'Không thể tải danh sách vị trí đỗ cư dân.')
        }
      } finally {
        if (!ignore) setLoadingSlots(false)
      }
    }

    void loadAvailableSlots()
    return () => {
      ignore = true
    }
  }, [requiresFixedSlot, selectedPackage])

  const handleSubscribe = async () => {
    if (!selectedPackage) {
      setError('Vui lòng chọn một gói thuê bao đang hoạt động.')
      return
    }
    if (!licensePlate.trim()) {
      setError('Vui lòng nhập biển số xe.')
      return
    }
    if (requiresFixedSlot && !selectedFixedSlotId) {
      setError('Gói này yêu cầu chọn vị trí đỗ cố định nhưng hiện chưa có vị trí phù hợp.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await subscriptionApi.register({
        packageId: selectedPackage.packageId,
        licensePlate: normalizeLicensePlate(licensePlate),
        fixedSlotId: requiresFixedSlot ? selectedFixedSlotId : undefined,
      })

      if (res.isSuccess && res.result?.paymentUrl) {
        savePaymentReturnContext({
          type: 'subscription-registration',
          subscriptionId: res.result.subscriptionId,
          successPath: '/my-subscriptions',
          cancelPath: '/dang-ky-thang',
        }, res.result.orderCode)
        window.location.assign(res.result.paymentUrl)
        return
      }

      setError(res.message || 'Đăng ký gói thuê bao thất bại.')
    } catch (err) {
      console.error(err)
      setError(getApiErrorMessage(err) || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="subscribe-page">
      <header className="page-header">
        <div>
          <h1>Đăng ký gói thuê bao tháng</h1>
          <p>Chọn gói thuê bao phù hợp, nhập biển số xe và tiến hành thanh toán qua cổng PayOS.</p>
        </div>
      </header>

      <div className="subscribe-layout">
        <div className="card-panel subscribe-vehicle-card">
          <h2>Thông tin xe</h2>
          <div className="subscribe-vehicle-filter">
            <span>Loại phương tiện</span>
            <div className="vehicle-toggle subscribe-vehicle-toggle">
              <button type="button" className={vehicle === 'all' ? 'active' : ''} onClick={() => setVehicle('all')}>
                Tất cả
              </button>
              <button type="button" className={vehicle === 'car' ? 'active' : ''} onClick={() => setVehicle('car')}>
                <Car size={18} /> Ô tô
              </button>
              <button type="button" className={vehicle === 'bike' ? 'active' : ''} onClick={() => setVehicle('bike')}>
                <Bike size={18} /> Xe máy
              </button>
            </div>
            <small>Chọn loại xe để lọc danh sách gói.</small>
          </div>

          <label className="hero-field subscribe-plate-field">
            <span>Biển số xe đăng ký</span>
            <div>
              <Car size={18} />
              <input
                type="text"
                value={licensePlate}
                onChange={(event) => setLicensePlate(normalizeLicensePlate(event.target.value))}
                placeholder="Ví dụ: 51A12345"
                aria-describedby="subscribe-plate-hint"
              />
            </div>
            <small id="subscribe-plate-hint">Nhập đúng biển số của xe sẽ sử dụng gói.</small>
          </label>
        </div>

        <div className="card-panel subscribe-packages-card">
          <h2>Chọn gói dịch vụ</h2>
          {loadingPackages ? (
            <p className="section-desc">Đang tải danh sách gói...</p>
          ) : visiblePackages.length === 0 ? (
            <p className="alert-inline alert-error">Hiện tại không có gói thuê bao nào khả dụng cho loại xe này.</p>
          ) : (
            <div className="subscribe-plans">
              {visiblePackages.map((pkg) => (
                <button
                  key={pkg.packageId}
                  type="button"
                  className={`subscribe-plan-btn${selectedPackage?.packageId === pkg.packageId ? ' active' : ''}`}
                  onClick={() => setSelectedPackageId(pkg.packageId)}
                  aria-pressed={selectedPackage?.packageId === pkg.packageId}
                >
                  <span className="plan-tag">{pkg.vehicleTypeName || 'Phương tiện'}</span>
                  <strong className="plan-name">{pkg.packageName}</strong>
                  <span className="plan-price-label">Giá gói</span>
                  <span className="plan-price">{formatCurrency(pkg.price)}</span>
                  <div className="plan-details">
                    <div className="plan-detail-row">
                      <CalendarDays size={16} />
                      <span>
                        <small>Thời hạn</small>
                        <strong>{pkg.durationMonths} tháng</strong>
                      </span>
                    </div>
                    <div className="plan-detail-row">
                      <MapPin size={16} />
                      <span>
                        <small>Vị trí đỗ</small>
                        <strong>
                          {getVehicleFilter(pkg) === 'bike'
                            ? 'Không cố định'
                            : pkg.requireFixedSlot
                              ? 'Được chọn cố định'
                              : 'Hệ thống phân bổ'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {requiresFixedSlot && (
            <div className="subscribe-slot-picker">
              <div className="subscribe-slot-heading">
                <span className="subscribe-slot-icon"><MapPin size={19} /></span>
                <div>
                  <strong>Chọn vị trí đỗ cố định</strong>
                  <small>Vị trí đã chọn sẽ được dành riêng cho xe mang biển số trên.</small>
                </div>
                <span className="subscribe-required-badge">Bắt buộc</span>
              </div>

              <label className="hero-field subscribe-slot-field">
                <span>Vị trí còn trống tại tầng cư dân</span>
                <div>
                  <Car size={18} />
                  <select
                    value={selectedFixedSlotId}
                    disabled={loadingSlots || availableFixedSlots.length === 0}
                    onChange={(event) => setSelectedFixedSlotId(event.target.value)}
                  >
                    {loadingSlots ? (
                      <option value="">Đang tải vị trí...</option>
                    ) : availableFixedSlots.length === 0 ? (
                      <option value="">Không còn vị trí phù hợp</option>
                    ) : (
                      availableFixedSlots.map((slot) => (
                        <option key={slot.slotId} value={slot.slotId}>
                          {slot.slotCode} — {slot.floorName || 'Tầng cư dân'}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <small className={selectedFixedSlot ? 'subscribe-slot-selected' : ''}>
                  {loadingSlots
                    ? 'Đang kiểm tra vị trí còn trống...'
                    : selectedFixedSlot
                      ? `Đang chọn: ${selectedFixedSlot.slotCode} tại ${selectedFixedSlot.floorName || 'tầng cư dân'}`
                      : 'Vui lòng chọn một vị trí còn trống để tiếp tục thanh toán.'}
                </small>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="subscribe-footer card-panel">
        <div>
          <span>Tổng tiền thanh toán</span>
          <strong>{selectedPackage ? formatCurrency(selectedPackage.price) : formatCurrency(0)}</strong>
          <small>{selectedPackage ? `Gói đang chọn: ${selectedPackage.packageName}` : 'Chưa chọn gói dịch vụ'}</small>
        </div>
        {error && <p className="alert-inline alert-error">{error}</p>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={
            loadingPackages ||
            loadingSlots ||
            submitting ||
            !selectedPackage ||
            (requiresFixedSlot && !selectedFixedSlotId)
          }
          onClick={handleSubscribe}
        >
          <CreditCard size={18} />
          {submitting ? 'Đang kết nối cổng thanh toán...' : 'Đăng ký & Thanh toán'}
        </button>
      </div>
    </section>
  )
}

export default function SubscribeMonthly() {
  return (
    <ProtectedRoute allowedRoles={['user', 'customer']}>
      <SubscribeContent />
    </ProtectedRoute>
  )
}
