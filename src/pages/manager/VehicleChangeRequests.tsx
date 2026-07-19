import { useEffect, useState, useMemo } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'
import { formatUtcToVietnamDateTime, formatUtcToVietnamDate } from '../../utils/dateTime'
import type { ApiResponse } from '../../utils/apiServices'

interface VehicleChangeRequestDto {
  requestId: string
  subscriptionId: string
  oldLicensePlate?: string
  newLicensePlate?: string
  reason?: string
  status?: string
  createdAt?: string
  processedAt?: string
  userFullName?: string
  packageName?: string
}

export default function ManagerVehicleChangeRequests() {
  const [requests, setRequests] = useState<VehicleChangeRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  // Modals state
  const [activeModal, setActiveModal] = useState<'approve' | 'reject' | null>(null)
  const [targetRequest, setTargetRequest] = useState<VehicleChangeRequestDto | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<ApiResponse<VehicleChangeRequestDto[]>>(
        '/VehicleChangeRequest/change-vehicle'
      )
      if (res.isSuccess) {
        setRequests(res.result || [])
      } else {
        setError(res.message || 'Không thể tải danh sách yêu cầu thay đổi biển số.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleRefresh = async () => {
    setStatusFilter('all')
    setDateFilter('all')
    await fetchRequests()
  }

  const openApproveModal = (req: VehicleChangeRequestDto) => {
    setTargetRequest(req)
    setActiveModal('approve')
  }

  const openRejectModal = (req: VehicleChangeRequestDto) => {
    setTargetRequest(req)
    setRejectReason('')
    setActiveModal('reject')
  }

  const closeModal = () => {
    setActiveModal(null)
    setTargetRequest(null)
    setRejectReason('')
  }

  const handleApprove = async () => {
    if (!targetRequest) return
    setActionLoading(true)
    try {
      const res = await apiClient.put<ApiResponse>(
        `/VehicleChangeRequest/change-vehicle/${targetRequest.requestId}/approve`,
        {}
      )
      if (res.isSuccess) {
        closeModal()
        await fetchRequests()
      } else {
        alert(res.message || 'Phê duyệt thất bại. Vui lòng thử lại.')
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!targetRequest) return
    setActionLoading(true)
    try {
      const res = await apiClient.put<ApiResponse>(
        `/VehicleChangeRequest/change-vehicle/${targetRequest.requestId}/reject`,
        { reason: rejectReason }
      )
      if (res.isSuccess) {
        closeModal()
        await fetchRequests()
      } else {
        alert(res.message || 'Từ chối thất bại. Vui lòng thử lại.')
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredRequests = useMemo(() => {
    return requests
      .filter((req) => {
        // 1. Status Filter
        if (statusFilter !== 'all') {
          if ((req.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
            return false
          }
        }

        // 2. Date Filter
        if (dateFilter !== 'all') {
          const createdAt = req.createdAt
          if (!createdAt) return false

          if (dateFilter === 'today') {
            const reqDate = formatUtcToVietnamDate(createdAt)
            const todayDate = formatUtcToVietnamDate(new Date().toISOString())
            if (reqDate !== todayDate) return false
          } else if (dateFilter === '7days') {
            const diffMs = Date.now() - new Date(createdAt).getTime()
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
            if (diffMs < 0 || diffMs > sevenDaysMs) return false
          }
        }

        return true
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
  }, [requests, statusFilter, dateFilter])

  const truncateText = (text?: string, length = 50) => {
    if (!text) return '—'
    if (text.length <= length) return text
    return `${text.substring(0, length)}...`
  }

  const getStatusBadgeClass = (status?: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'pending') return 'badge-history-pending'
    if (s === 'approved') return 'badge-history-success'
    if (s === 'rejected') return 'badge-history-cancelled'
    return 'badge-history-neutral'
  }

  const getStatusText = (status?: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'pending') return '🟡 Chờ xử lý'
    if (s === 'approved') return '🟢 Đã duyệt'
    if (s === 'rejected') return '🔴 Từ chối'
    return status || '—'
  }

  return (
    <ManagerPageShell activeItem="vehicle-change-requests">
      <div className="staff-content-wrapper">
        <div className="staff-section">
          <h2>Phê duyệt sửa biển số xe</h2>
          <p className="section-desc">
            Duyệt hoặc từ chối các yêu cầu thay đổi biển số xe từ khách hàng.
          </p>

          {/* Filters toolbar */}
          <div className="toolbar-row card-panel">
            <div className="form-field" style={{ margin: 0, flex: 1, maxWidth: 200 }}>
              <label htmlFor="filter-status">Trạng thái</label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xử lý</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>

            <div className="form-field" style={{ margin: 0, flex: 1, maxWidth: 200 }}>
              <label htmlFor="filter-date">Ngày yêu cầu</label>
              <select
                id="filter-date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              style={{ alignSelf: 'flex-end', height: 'fit-content' }}
              onClick={handleRefresh}
            >
              Làm mới
            </button>
          </div>

          {error && (
            <div className="card-panel" style={{ color: 'var(--danger, #ef4444)', marginTop: '1rem' }}>
              {error}
            </div>
          )}

          {/* Requests Table */}
          <div className="card-panel table-wrap" style={{ marginTop: '1.5rem' }}>
            {loading && requests.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                Đang tải danh sách yêu cầu...
              </p>
            ) : filteredRequests.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 0' }}>
                <p>Không có yêu cầu thay đổi biển số nào.</p>
              </div>
            ) : (
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Gói thuê bao</th>
                    <th>Biển số cũ</th>
                    <th>Biển số mới</th>
                    <th>Lý do</th>
                    <th>Ngày yêu cầu</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.requestId}>
                      <td>{req.userFullName || '—'}</td>
                      <td>{req.packageName || '—'}</td>
                      <td>
                        <strong style={{ color: 'var(--text-muted)' }}>{req.oldLicensePlate}</strong>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--blue-600)' }}>{req.newLicensePlate}</strong>
                      </td>
                      <td title={req.reason}>{truncateText(req.reason)}</td>
                      <td>{req.createdAt ? formatUtcToVietnamDateTime(req.createdAt) : '—'}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(req.status)}`}>
                          {getStatusText(req.status)}
                        </span>
                      </td>
                      <td>
                        {(req.status || '').toLowerCase() === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              title="Duyệt"
                              onClick={() => openApproveModal(req)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '0.25rem 0.5rem' }}
                            >
                              <Check size={14} /> Duyệt
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              title="Từ chối"
                              onClick={() => openRejectModal(req)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid var(--border)',
                                color: 'var(--danger, #ef4444)',
                              }}
                            >
                              <X size={14} /> Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {activeModal === 'approve' && targetRequest && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal-panel">
            <h3 className="modal-title">Duyệt yêu cầu thay đổi biển số</h3>
            <div style={{ marginBottom: '1.25rem' }}>
              <p>
                Duyệt yêu cầu đổi biển số từ <strong>{targetRequest.oldLicensePlate}</strong> sang{' '}
                <strong>{targetRequest.newLicensePlate}</strong>?
              </p>
              <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Khách hàng:</td>
                    <td style={{ padding: '0.5rem 0', fontWeight: '600' }}>{targetRequest.userFullName || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Gói thuê bao:</td>
                    <td style={{ padding: '0.5rem 0', fontWeight: '600' }}>{targetRequest.packageName || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Lý do khách hàng:</td>
                    <td style={{ padding: '0.5rem 0', fontWeight: '600' }}>{targetRequest.reason || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={actionLoading}>
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={actionLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                {actionLoading && <Loader2 size={16} className="spin" />}
                {actionLoading ? 'Đang duyệt...' : 'Duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {activeModal === 'reject' && targetRequest && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal-panel">
            <h3 className="modal-title">Từ chối yêu cầu đổi biển số</h3>
            <div style={{ marginBottom: '1.25rem' }}>
              <p>
                Bạn có chắc chắn muốn từ chối yêu cầu đổi biển số của khách hàng{' '}
                <strong>{targetRequest.userFullName || '—'}</strong>?
              </p>
              <div className="form-field" style={{ marginTop: '1rem' }}>
                <label htmlFor="reject-note">Lý do từ chối (Ghi chú)</label>
                <textarea
                  id="reject-note"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối yêu cầu..."
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={actionLoading}>
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReject}
                disabled={actionLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'var(--danger, #ef4444)',
                  borderColor: 'var(--danger, #ef4444)',
                }}
              >
                {actionLoading && <Loader2 size={16} className="spin" />}
                {actionLoading ? 'Đang từ chối...' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerPageShell>
  )
}
