import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, Car, ClipboardCheck, CreditCard, FilePenLine, History, Pencil, RefreshCw, ShieldAlert, Trash2, X } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import { formatUtcToVietnamDateTime, parseBackendUtcDate } from '../../utils/dateTime'
import { formatCurrency } from '../../utils/pricing'
import { normalizeLicensePlate } from '../../utils/licensePlate'
import {
  type MonthlySubscriptionDto,
  type SubscriptionPackageDto,
  type SubscriptionRenewalDto,
  type VehicleChangeRequestDto,
  subscriptionApi,
  subscriptionRenewalApi,
  vehicleChangeRequestApi,
} from '../../utils/apiServices'
import { ToastContainer, useToast } from '../../components/Toast'
import { savePaymentReturnContext } from '../../utils/paymentReturnContext'

function getStatusBadgeClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'active') {
    return 'badge-history-success'
  }
  if (normalized === 'pendingpayment') {
    return 'badge-history-pending'
  }
  if (normalized === 'expired') {
    return 'badge-history-cancelled'
  }
  return 'badge-history-neutral'
}

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'Hoạt động'
    case 'pendingpayment':
      return 'Chờ thanh toán'
    case 'expired':
      return 'Hết hạn'
    default:
      return status
  }
}

function getChangeStatusLabel(status?: string) {
  switch (status?.toLowerCase()) {
    case 'pending': return 'Chờ xử lý'
    case 'approved': return 'Đã duyệt'
    case 'rejected': return 'Đã từ chối'
    default: return status || 'Không rõ'
  }
}

function MySubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<MonthlySubscriptionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [packages, setPackages] = useState<SubscriptionPackageDto[]>([])
  const [renewTarget, setRenewTarget] = useState<MonthlySubscriptionDto | null>(null)
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [renewing, setRenewing] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<MonthlySubscriptionDto | null>(null)
  const [renewalHistory, setRenewalHistory] = useState<SubscriptionRenewalDto[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [changeRequests, setChangeRequests] = useState<VehicleChangeRequestDto[]>([])
  const [changeTarget, setChangeTarget] = useState<MonthlySubscriptionDto | null>(null)
  const [editingChangeRequest, setEditingChangeRequest] = useState<VehicleChangeRequestDto | null>(null)
  const [changeForm, setChangeForm] = useState({ newLicensePlate: '', reason: '' })
  const [changeSaving, setChangeSaving] = useState(false)
  const [changeError, setChangeError] = useState('')
  const [changeHistoryTarget, setChangeHistoryTarget] = useState<MonthlySubscriptionDto | null>(null)
  const toast = useToast()

  const loadSubscriptions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await subscriptionApi.getMy()
      if (res.isSuccess && Array.isArray(res.result)) {
        const sorted = [...res.result].sort((a, b) => {
          return parseBackendUtcDate(b.startDate).getTime() - parseBackendUtcDate(a.startDate).getTime()
        })
        setSubscriptions(sorted)
      } else {
        setError(res.message || 'Không thể tải danh sách gói đăng ký.')
      }
    } catch (err: unknown) {
      console.error(err)
      setError('Đã xảy ra lỗi khi kết nối đến máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  const loadChangeRequests = async () => {
    try {
      const res = await vehicleChangeRequestApi.getMy()
      setChangeRequests(res.isSuccess && Array.isArray(res.result) ? res.result : [])
    } catch (err) {
      console.error(err)
      setChangeRequests([])
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadSubscriptions()
      void loadChangeRequests()
      void subscriptionApi.getPackages().then((res) => {
        if (res.isSuccess && res.result) {
          setPackages(res.result.filter((item) => item.status.toLowerCase() === 'active'))
        }
      }).catch(console.error)
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [])

  const getRenewPackages = (subscription: MonthlySubscriptionDto) => {
    const vehicleType = subscription.vehicleType?.trim().toLowerCase()
    return packages.filter(
      (item) =>
        item.vehicleTypeName?.trim().toLowerCase() === vehicleType &&
        item.packageName === subscription.packageName,
    )
  }

  const openRenewModal = (subscription: MonthlySubscriptionDto) => {
    const compatiblePackages = getRenewPackages(subscription)
    const currentPackage = compatiblePackages.find(
      (item) => item.packageName === subscription.packageName,
    )
    setRenewTarget(subscription)
    setSelectedPackageId(currentPackage?.packageId || compatiblePackages[0]?.packageId || '')
  }

  const handleRenew = async () => {
    if (!renewTarget || !selectedPackageId) return
    setRenewing(true)
    try {
      const res = await subscriptionRenewalApi.renew(renewTarget.subscriptionId, selectedPackageId)
      if (res.isSuccess && res.result?.paymentUrl) {
        savePaymentReturnContext({
          type: 'subscription-renewal',
          subscriptionId: renewTarget.subscriptionId,
          successPath: '/my-subscriptions',
          cancelPath: '/my-subscriptions',
        }, res.result.orderCode)
        window.location.assign(res.result.paymentUrl)
        return
      }
      toast.error(res.message || 'Không thể tạo thanh toán gia hạn.')
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Không thể tạo thanh toán gia hạn.')
    } finally {
      setRenewing(false)
    }
  }

  const openHistoryModal = async (subscription: MonthlySubscriptionDto) => {
    setHistoryTarget(subscription)
    setRenewalHistory([])
    setHistoryLoading(true)
    try {
      const res = await subscriptionRenewalApi.getHistory(subscription.subscriptionId)
      if (res.isSuccess) setRenewalHistory(res.result || [])
      else toast.error(res.message || 'Không thể tải lịch sử gia hạn.')
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Không thể tải lịch sử gia hạn.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const requestsFor = (subscriptionId: string) =>
    changeRequests.filter((item) => item.subscriptionId === subscriptionId)

  const pendingRequestFor = (subscriptionId: string) =>
    requestsFor(subscriptionId).find((item) => item.status?.toLowerCase() === 'pending')

  const openChangeModal = (subscription: MonthlySubscriptionDto, request?: VehicleChangeRequestDto) => {
    const pending = request ?? pendingRequestFor(subscription.subscriptionId) ?? null
    setChangeTarget(subscription)
    setEditingChangeRequest(pending)
    setChangeForm({
      newLicensePlate: normalizeLicensePlate(pending?.newLicensePlate ?? ''),
      reason: pending?.reason ?? '',
    })
    setChangeError('')
  }

  const closeChangeModal = () => {
    if (changeSaving) return
    setChangeTarget(null)
    setEditingChangeRequest(null)
    setChangeForm({ newLicensePlate: '', reason: '' })
    setChangeError('')
  }

  const saveChangeRequest = async () => {
    if (!changeTarget) return
    const newLicensePlate = normalizeLicensePlate(changeForm.newLicensePlate)
    if (!/^[A-Z0-9]{4,15}$/.test(newLicensePlate)) {
      setChangeError('Biển số chỉ gồm 4-15 chữ cái và chữ số, không nhập dấu hoặc khoảng trắng.')
      return
    }
    if (newLicensePlate === normalizeLicensePlate(changeTarget.licensePlate)) {
      setChangeError('Biển số mới phải khác biển số hiện tại.')
      return
    }

    setChangeSaving(true)
    setChangeError('')
    try {
      const res = editingChangeRequest
        ? await vehicleChangeRequestApi.update(editingChangeRequest.requestId, {
            newLicensePlate,
            reason: changeForm.reason.trim(),
          })
        : await vehicleChangeRequestApi.create({
            subscriptionId: changeTarget.subscriptionId,
            newLicensePlate,
            reason: changeForm.reason.trim(),
          })
      if (!res.isSuccess) {
        setChangeError(res.message || 'Không thể lưu yêu cầu đổi biển số.')
        return
      }
      toast.success(editingChangeRequest ? 'Đã cập nhật yêu cầu đổi biển số.' : 'Đã gửi yêu cầu đổi biển số.')
      setChangeSaving(false)
      closeChangeModal()
      await loadChangeRequests()
    } catch (err) {
      setChangeError(err instanceof Error ? err.message : 'Không thể lưu yêu cầu đổi biển số.')
    } finally {
      setChangeSaving(false)
    }
  }

  const cancelChangeRequest = async (request: VehicleChangeRequestDto) => {
    if (!window.confirm('Bạn có chắc muốn hủy yêu cầu đổi biển số đang chờ xử lý?')) return
    setChangeSaving(true)
    try {
      const res = await vehicleChangeRequestApi.remove(request.requestId)
      if (!res.isSuccess) {
        toast.error(res.message || 'Không thể hủy yêu cầu.')
        return
      }
      toast.success('Đã hủy yêu cầu đổi biển số.')
      setChangeSaving(false)
      closeChangeModal()
      await loadChangeRequests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể hủy yêu cầu.')
    } finally {
      setChangeSaving(false)
    }
  }

  const handleRepayment = async (id: string) => {
    setPayingId(id)
    try {
      const res = await subscriptionApi.createPayment(id)
      if (res.isSuccess && res.result?.paymentUrl) {
        savePaymentReturnContext({
          type: 'subscription-registration',
          subscriptionId: id,
          successPath: '/my-subscriptions',
          cancelPath: '/my-subscriptions',
        }, res.result.orderCode)
        window.location.assign(res.result.paymentUrl)
      } else {
        toast.error(res.message || 'Lỗi khi tạo lại link thanh toán.')
      }
    } catch (err: unknown) {
      console.error(err)
      let msg = 'Đã xảy ra lỗi, vui lòng thử lại sau.'
      if (err instanceof Error) {
        try {
          const body = JSON.parse(err.message.replace(/^HTTP \d+: /, ''))
          if (body?.message) msg = body.message
        } catch { /* ignore */ }
      }
      toast.error(msg)
    } finally {
      setPayingId(null)
    }
  }

  return (
    <section className="my-subscriptions-page">
      <ToastContainer toasts={toast.toasts} onClose={toast.close} />

      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Gói đăng ký của tôi</h1>
          <p>Danh sách lịch sử và các gói thuê bao tháng của bạn.</p>
        </div>
      </header>

      {loading ? (
        <div className="empty-state card-panel">
          <p>Đang tải...</p>
        </div>
      ) : error ? (
        <div className="empty-state card-panel">
          <ShieldAlert size={40} strokeWidth={1.5} className="success-icon" style={{ color: 'var(--danger, #ef4444)' }} />
          <p>{error}</p>
          <button onClick={loadSubscriptions} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Thử lại
          </button>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state card-panel">
          <CreditCard size={40} strokeWidth={1.5} aria-hidden />
          <p>Bạn chưa đăng ký gói nào.</p>
          <Link to="/dang-ky-thang" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Đăng ký ngay
          </Link>
        </div>
      ) : (
        <div
          className="subscriptions-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
            marginTop: '1.5rem',
          }}
        >
          {subscriptions.map((sub, i) => (
            <motion.div
              key={sub.subscriptionId}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-panel"
              style={{
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.75rem',
                    gap: '0.5rem',
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-heading)' }}>
                    {sub.packageName || 'Gói thuê bao tháng'}
                  </h3>
                  <span className={`badge ${getStatusBadgeClass(sub.status)}`} style={{ flexShrink: 0 }}>
                    {getStatusLabel(sub.status)}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Car size={16} />
                    <span>
                      Biển số: <strong>{sub.licensePlate}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>Loại xe:</span>
                    <span>{sub.vehicleType || 'Không rõ'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>Chỗ đỗ:</span>
                    <span>
                      {sub.fixedSlot ? (
                        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
                          Chỗ cố định: {sub.fixedSlot}
                        </span>
                      ) : (
                        'Không có chỗ cố định'
                      )}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '0.5rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px dashed var(--border)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div>
                      Bắt đầu: <strong>{formatUtcToVietnamDateTime(sub.startDate)}</strong>
                    </div>
                    <div>
                      Kết thúc: <strong>{formatUtcToVietnamDateTime(sub.endDate)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="my-subscription-card-footer">
                <div className="my-subscription-price">
                  <span>Giá thanh toán</span>
                  <strong>
                    {formatCurrency(sub.price)}
                  </strong>
                </div>

                <div className="my-subscription-actions">
                {sub.status.toLowerCase() === 'active' && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openChangeModal(sub)}
                  >
                    <FilePenLine size={15} aria-hidden />
                    {pendingRequestFor(sub.subscriptionId) ? 'Sửa yêu cầu đổi biển' : 'Đổi biển số'}
                  </button>
                )}
                {requestsFor(sub.subscriptionId).length > 0 && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setChangeHistoryTarget(sub)}>
                    <ClipboardCheck size={15} aria-hidden />
                    Lịch sử đổi biển
                  </button>
                )}
                {sub.status.toLowerCase() === 'pendingpayment' ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={payingId === sub.subscriptionId}
                    onClick={() => handleRepayment(sub.subscriptionId)}
                  >
                    {payingId === sub.subscriptionId ? 'Đang xử lý...' : 'Thanh toán lại'}
                  </button>
                ) : sub.status.toLowerCase() !== 'cancelled' ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openRenewModal(sub)}>
                    <RefreshCw size={15} aria-hidden />
                    Gia hạn
                  </button>
                ) : null}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => void openHistoryModal(sub)}>
                    <History size={15} aria-hidden />
                    Lịch sử gia hạn
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {changeTarget && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) closeChangeModal() }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="change-plate-title">
            <div className="manager-modal-header">
              <div>
                <h3 id="change-plate-title" className="modal-title">
                  {editingChangeRequest ? 'Sửa yêu cầu đổi biển số' : 'Yêu cầu đổi biển số'}
                </h3>
                <p>Manager sẽ kiểm tra trước khi cập nhật vào gói tháng.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeChangeModal} disabled={changeSaving} aria-label="Đóng">
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="success-details" style={{ marginTop: 0 }}>
              <p><strong>Gói:</strong> {changeTarget.packageName || 'Gói thuê bao tháng'}</p>
              <p><strong>Biển số hiện tại:</strong> {changeTarget.licensePlate}</p>
            </div>
            <div className="form-field">
              <label htmlFor="change-new-plate">Biển số mới *</label>
              <input
                id="change-new-plate"
                autoFocus
                maxLength={15}
                value={changeForm.newLicensePlate}
                onChange={(event) => setChangeForm({ ...changeForm, newLicensePlate: normalizeLicensePlate(event.target.value) })}
                placeholder="Ví dụ: 51A12345"
              />
            </div>
            <div className="form-field">
              <label htmlFor="change-reason">Lý do đổi biển số</label>
              <textarea
                id="change-reason"
                rows={4}
                maxLength={500}
                value={changeForm.reason}
                onChange={(event) => setChangeForm({ ...changeForm, reason: event.target.value })}
                placeholder="Ví dụ: Đổi xe mới, cấp lại biển số..."
              />
              <small className="field-hint">{changeForm.reason.length}/500 ký tự</small>
            </div>
            {changeError && <div className="manager-inline-error" role="alert">{changeError}</div>}
            <div className="form-actions">
              {editingChangeRequest && (
                <button type="button" className="btn btn-ghost manager-danger-action" disabled={changeSaving} onClick={() => void cancelChangeRequest(editingChangeRequest)}>
                  <Trash2 size={16} aria-hidden /> Hủy yêu cầu
                </button>
              )}
              <button type="button" className="btn btn-ghost" disabled={changeSaving} onClick={closeChangeModal}>Đóng</button>
              <button type="button" className="btn btn-primary" disabled={changeSaving || !changeForm.newLicensePlate.trim()} onClick={() => void saveChangeRequest()}>
                {editingChangeRequest ? <Pencil size={16} aria-hidden /> : <FilePenLine size={16} aria-hidden />}
                {changeSaving ? 'Đang lưu...' : editingChangeRequest ? 'Lưu thay đổi' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {changeHistoryTarget && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setChangeHistoryTarget(null) }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="change-history-title">
            <div className="manager-modal-header">
              <div><h3 id="change-history-title" className="modal-title">Lịch sử đổi biển số</h3><p>{changeHistoryTarget.packageName || changeHistoryTarget.licensePlate}</p></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChangeHistoryTarget(null)} aria-label="Đóng"><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {requestsFor(changeHistoryTarget.subscriptionId).map((request) => (
                <div key={request.requestId} className="success-details" style={{ margin: 0 }}>
                  <p><strong>{request.oldLicensePlate}</strong> → <strong>{request.newLicensePlate}</strong></p>
                  <p><strong>Trạng thái:</strong> {getChangeStatusLabel(request.status)}</p>
                  <p><strong>Ngày gửi:</strong> {request.createdAt ? formatUtcToVietnamDateTime(request.createdAt) : '—'}</p>
                  {request.reason && <p><strong>Lý do gửi:</strong> {request.reason}</p>}
                  {request.rejectionReason && <p><strong>Lý do từ chối:</strong> {request.rejectionReason}</p>}
                  {request.handledByFullName && <p><strong>Người xử lý:</strong> {request.handledByFullName}</p>}
                  {request.status?.toLowerCase() === 'pending' && (
                    <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => { setChangeHistoryTarget(null); openChangeModal(changeHistoryTarget, request) }}><Pencil size={15} /> Sửa</button>
                      <button type="button" className="btn btn-ghost btn-sm manager-danger-action" onClick={() => void cancelChangeRequest(request)}><Trash2 size={15} /> Hủy</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="form-actions"><button type="button" className="btn btn-primary" onClick={() => setChangeHistoryTarget(null)}>Đóng</button></div>
          </div>
        </div>
      )}

      {renewTarget && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget && !renewing) setRenewTarget(null) }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="renew-subscription-title">
            <h3 id="renew-subscription-title" className="modal-title">Gia hạn gói thuê bao</h3>
            <div className="success-details" style={{ marginTop: 0 }}>
              <p><strong>Biển số:</strong> {renewTarget.licensePlate}</p>
              <p><strong>Loại xe:</strong> {renewTarget.vehicleType || 'Không rõ'}</p>
              <p><strong>Hạn hiện tại:</strong> {formatUtcToVietnamDateTime(renewTarget.endDate)}</p>
            </div>

            <div className="form-field">
              <label htmlFor="renew-package">Gói muốn gia hạn *</label>
              <select id="renew-package" value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)}>
                <option value="" disabled>-- Chọn gói phù hợp --</option>
                {getRenewPackages(renewTarget).map((item) => (
                  <option key={item.packageId} value={item.packageId}>
                    {item.packageName} · {item.durationMonths} tháng · {formatCurrency(item.price)}
                  </option>
                ))}
              </select>
            </div>

            {getRenewPackages(renewTarget).length === 0 && (
              <p className="form-error">Hiện không có gói đang hoạt động phù hợp với loại xe này.</p>
            )}

            <div className="form-actions">
              <button type="button" className="btn btn-ghost" disabled={renewing} onClick={() => setRenewTarget(null)}>Huỷ</button>
              <button type="button" className="btn btn-primary" disabled={renewing || !selectedPackageId} onClick={handleRenew}>
                {renewing ? 'Đang tạo thanh toán...' : 'Thanh toán gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyTarget && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setHistoryTarget(null) }}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="renewal-history-title">
            <h3 id="renewal-history-title" className="modal-title">Lịch sử gia hạn</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '-0.75rem' }}>{historyTarget.licensePlate}</p>
            {historyLoading ? (
              <p>Đang tải lịch sử...</p>
            ) : renewalHistory.length === 0 ? (
              <div className="empty-state"><CalendarClock size={36} aria-hidden /><p>Chưa có lần gia hạn nào.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {renewalHistory.map((item) => (
                  <div key={item.renewalId} className="success-details" style={{ margin: 0 }}>
                    <p><strong>Ngày gia hạn:</strong> {formatUtcToVietnamDateTime(item.renewalDate || item.newEndDate)}</p>
                    <p><strong>Hạn cũ:</strong> {formatUtcToVietnamDateTime(item.oldEndDate)}</p>
                    <p><strong>Hạn mới:</strong> {formatUtcToVietnamDateTime(item.newEndDate)}</p>
                    <p><strong>Số tiền:</strong> {formatCurrency(item.amount)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions"><button type="button" className="btn btn-primary" onClick={() => setHistoryTarget(null)}>Đóng</button></div>
          </div>
        </div>
      )}
    </section>
  )
}

export default function MySubscriptions() {
  return (
    <ProtectedRoute>
      <MySubscriptionsContent />
    </ProtectedRoute>
  )
}
