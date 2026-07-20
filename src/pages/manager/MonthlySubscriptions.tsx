import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, Eye, Pencil, RefreshCw, Search, Trash2, X } from 'lucide-react'
import ManagerConfirmActionModal from '../../components/ManagerConfirmActionModal'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'
import { formatUtcToVietnamDate, formatUtcToVietnamDateTime } from '../../utils/dateTime'
import { formatCurrency } from '../../utils/pricing'
import type { ApiResponse } from '../../utils/apiServices'

interface SubscriptionDto {
  subscriptionId: string
  fullName?: string
  licensePlate: string
  vehicleType?: string
  packageName?: string
  startDate: string
  endDate: string
  price: number
  status: string
  fixedSlot?: string
}

interface SlotDto { slotId: string; slotCode: string; status?: string }
interface FormState { licensePlate: string; startDate: string; endDate: string; status: string; fixedSlotId: string }

const STATUS_LABELS: Record<string, string> = {
  pendingpayment: 'Chờ thanh toán', active: 'Đang hiệu lực', cancelled: 'Đã hủy', expired: 'Hết hạn',
}

function statusLabel(status: string) {
  return STATUS_LABELS[status.replace(/[\s_-]/g, '').toLowerCase()] ?? status
}

function dateInput(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

export default function ManagerMonthlySubscriptions() {
  const [items, setItems] = useState<SubscriptionDto[]>([])
  const [slots, setSlots] = useState<SlotDto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<SubscriptionDto | null>(null)
  const [editing, setEditing] = useState<SubscriptionDto | null>(null)
  const [form, setForm] = useState<FormState>({ licensePlate: '', startDate: '', endDate: '', status: 'Active', fixedSlotId: '' })
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionDto | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subscriptions, parkingSlots] = await Promise.all([
        apiClient.get<ApiResponse<SubscriptionDto[]>>('/MonthlySubscription'),
        apiClient.get<ApiResponse<SlotDto[]>>('/ParkingSlot'),
      ])
      if (!subscriptions.isSuccess) throw new Error(subscriptions.message || 'Không thể tải đăng ký tháng.')
      setItems(subscriptions.result ?? [])
      setSlots(parkingSlots.result ?? [])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể kết nối đến hệ thống.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { queueMicrotask(() => void fetchData()) }, [fetchData])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter((item) => (statusFilter === 'all' || item.status.toLowerCase() === statusFilter) &&
      (!term || [item.fullName, item.licensePlate, item.vehicleType, item.packageName, item.fixedSlot, item.subscriptionId].filter(Boolean).join(' ').toLowerCase().includes(term)))
  }, [items, query, statusFilter])

  const openDetail = async (item: SubscriptionDto) => {
    try {
      const response = await apiClient.get<ApiResponse<SubscriptionDto>>(`/MonthlySubscription/${item.subscriptionId}`)
      setSelected(response.isSuccess && response.result ? response.result : item)
    } catch { setSelected(item) }
  }

  const openEdit = (item: SubscriptionDto) => {
    setForm({ licensePlate: item.licensePlate, startDate: dateInput(item.startDate), endDate: dateInput(item.endDate), status: item.status, fixedSlotId: '' })
    setEditing(item)
    setSelected(null)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setSaving(true)
    setError(null)
    const payload: Record<string, string> = {
      licensePlate: form.licensePlate.trim().toUpperCase(), startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${form.endDate}T23:59:59`).toISOString(), status: form.status,
    }
    if (form.fixedSlotId) payload.fixedSlotId = form.fixedSlotId
    try {
      const response = await apiClient.put<ApiResponse<SubscriptionDto>>(`/MonthlySubscription/${editing.subscriptionId}`, payload)
      if (!response.isSuccess) throw new Error(response.message || 'Không thể cập nhật đăng ký tháng.')
      setEditing(null)
      await fetchData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể cập nhật đăng ký tháng.')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!deleteTarget) return
    const response = await apiClient.delete<ApiResponse<unknown>>(`/MonthlySubscription/${deleteTarget.subscriptionId}`)
    if (!response.isSuccess) throw new Error(response.message || 'Không thể xóa đăng ký tháng.')
    setDeleteTarget(null)
    setSelected(null)
    await fetchData()
  }

  return <ManagerPageShell activeItem="monthly-subscriptions">
    <div className="staff-content-wrapper manager-resource-page">
      <header className="manager-resource-header"><div className="manager-resource-title"><span className="manager-resource-icon manager-resource-icon--purple"><CalendarRange size={24} /></span><div><h2>Đăng ký gửi xe tháng</h2><p>Quản lý các gói tháng khách hàng đã đăng ký và thanh toán.</p></div></div><div className="manager-header-actions"><button className="btn btn-outline" onClick={fetchData} disabled={loading}><RefreshCw size={17} className={loading ? 'spin' : ''} /> Làm mới</button></div></header>
      <section className="manager-summary-grid manager-summary-grid--four"><article className="manager-summary-card"><span>Tổng đăng ký</span><strong>{items.length}</strong><small>Tất cả trạng thái</small></article><article className="manager-summary-card manager-summary-card--green"><span>Đang hiệu lực</span><strong>{items.filter((x) => x.status.toLowerCase() === 'active').length}</strong><small>Được phép sử dụng</small></article><article className="manager-summary-card manager-summary-card--orange"><span>Chờ thanh toán</span><strong>{items.filter((x) => x.status.toLowerCase() === 'pendingpayment').length}</strong><small>Chưa kích hoạt</small></article><article className="manager-summary-card manager-summary-card--red"><span>Hết hạn/đã hủy</span><strong>{items.filter((x) => ['expired','cancelled'].includes(x.status.toLowerCase())).length}</strong><small>Không còn hiệu lực</small></article></section>
      <section className="card-panel manager-resource-panel"><div className="manager-resource-toolbar manager-resource-toolbar--wrap"><label className="manager-search-field"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm khách hàng, biển số, gói hoặc slot..." />{query && <button onClick={() => setQuery('')}><X size={16} /></button>}</label><div className="manager-filter-controls"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="pendingpayment">Chờ thanh toán</option><option value="active">Đang hiệu lực</option><option value="cancelled">Đã hủy</option><option value="expired">Hết hạn</option></select></div></div>
        {error && <div className="manager-inline-error">{error}</div>}
        <div className="table-wrap manager-table-wrap"><table className="ui-table manager-resource-table"><thead><tr><th>Khách hàng</th><th>Biển số</th><th>Gói / loại xe</th><th>Thời hạn</th><th>Giá</th><th>Slot</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{loading && items.length === 0 && <tr><td colSpan={8}><div className="manager-empty-state">Đang tải dữ liệu...</div></td></tr>}{!loading && filtered.length === 0 && <tr><td colSpan={8}><div className="manager-empty-state">Không có đăng ký phù hợp.</div></td></tr>}{filtered.map((item) => <tr key={item.subscriptionId}><td><strong>{item.fullName || 'Chưa có tên'}</strong></td><td><strong>{item.licensePlate}</strong></td><td>{item.packageName || '—'}<br/><small>{item.vehicleType || '—'}</small></td><td>{formatUtcToVietnamDate(item.startDate)} – {formatUtcToVietnamDate(item.endDate)}</td><td>{formatCurrency(item.price)}</td><td>{item.fixedSlot || 'Không cố định'}</td><td><span className={`manager-session-status status-${item.status.toLowerCase()}`}><i />{statusLabel(item.status)}</span></td><td><div className="manager-row-actions"><button type="button" className="btn btn-outline btn-sm" onClick={() => void openDetail(item)}><Eye size={15} /> Xem</button><button type="button" className="btn btn-outline btn-sm manager-edit-button" onClick={() => openEdit(item)}><Pencil size={15} aria-hidden /> Sửa</button><button type="button" className="btn btn-ghost btn-sm manager-danger-action" onClick={() => setDeleteTarget(item)}><Trash2 size={15} /> Xóa</button></div></td></tr>)}</tbody></table></div>
      </section>
    </div>
    {editing && <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditing(null)}><div className="modal-panel manager-form-modal"><div className="manager-modal-header"><div><h3 className="modal-title">Sửa đăng ký tháng</h3><p>{editing.fullName || editing.subscriptionId}</p></div><button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><X size={20} /></button></div><form onSubmit={save}><div className="form-grid-2"><div className="form-field"><label>Biển số *</label><input required value={form.licensePlate} onChange={(e) => setForm({...form, licensePlate: e.target.value})} /></div><div className="form-field"><label>Trạng thái *</label><select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}><option value="PendingPayment">Chờ thanh toán</option><option value="Active">Đang hiệu lực</option><option value="Cancelled">Đã hủy</option><option value="Expired">Hết hạn</option></select></div><div className="form-field"><label>Ngày bắt đầu *</label><input type="date" required value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} /></div><div className="form-field"><label>Ngày kết thúc *</label><input type="date" required value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})} /></div><div className="form-field form-field--full"><label>Đổi slot cố định</label><select value={form.fixedSlotId} onChange={(e) => setForm({...form, fixedSlotId: e.target.value})}><option value="">Giữ nguyên: {editing.fixedSlot || 'Không cố định'}</option>{slots.map((slot) => <option key={slot.slotId} value={slot.slotId}>{slot.slotCode}{slot.status ? ` · ${slot.status}` : ''}</option>)}</select></div></div>{error && <div className="manager-inline-error">{error}</div>}<div className="form-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Hủy</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div></form></div></div>}
    {selected && <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}><div className="modal-panel manager-form-modal"><div className="manager-modal-header"><div><h3 className="modal-title">Chi tiết đăng ký tháng</h3><p>{selected.subscriptionId}</p></div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}><X size={20} /></button></div><div className="manager-payment-detail-grid"><div><span>Khách hàng</span><strong>{selected.fullName || 'Chưa có tên'}</strong></div><div><span>Biển số</span><strong>{selected.licensePlate}</strong></div><div><span>Gói</span><strong>{selected.packageName || '—'}</strong></div><div><span>Loại xe</span><strong>{selected.vehicleType || '—'}</strong></div><div><span>Bắt đầu</span><strong>{formatUtcToVietnamDateTime(selected.startDate)}</strong></div><div><span>Kết thúc</span><strong>{formatUtcToVietnamDateTime(selected.endDate)}</strong></div><div><span>Giá</span><strong>{formatCurrency(selected.price)}</strong></div><div><span>Slot</span><strong>{selected.fixedSlot || 'Không cố định'}</strong></div></div><div className="form-actions"><button type="button" className="btn btn-outline manager-edit-button" onClick={() => openEdit(selected)}><Pencil size={16} aria-hidden /> Sửa</button><button type="button" className="btn btn-ghost manager-danger-action" onClick={() => setDeleteTarget(selected)}><Trash2 size={16} /> Xóa</button></div></div></div>}
    <ManagerConfirmActionModal open={Boolean(deleteTarget)} title="Xóa đăng ký gửi xe tháng?" description={<>Bạn có chắc muốn xóa đăng ký của xe <strong>{deleteTarget?.licensePlate}</strong>? Hành động này không thể hoàn tác.</>} targetLabel={deleteTarget?.licensePlate} targetMeta={deleteTarget ? `${deleteTarget.fullName || 'Chưa có tên'} · ${deleteTarget.packageName || 'Chưa rõ gói'}` : undefined} targetIcon={<CalendarRange size={18} aria-hidden />} note="Quyền sử dụng gói và slot cố định liên quan có thể bị ảnh hưởng sau khi xóa." errorFallback="Không thể xóa đăng ký tháng." onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
  </ManagerPageShell>
}
