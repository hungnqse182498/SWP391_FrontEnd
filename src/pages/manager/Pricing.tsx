import { useEffect, useState } from 'react'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'

// ─── Raw shape returned by GET /api/PricingPolicy ────────────────────────────
interface PricingPolicyRaw {
  policyId: string
  vehicleTypeName: string
  basePrice: number
  baseHours: number
  extraHourPrice: number
  nightSurcharge: number
  status: string
  effectiveDate?: string
}

// ─── Derived UI-friendly shape (read-only, computed from raw) ─────────────────
interface PricingPolicyDisplay {
  policyId: string
  vehicleTypeName: string
  /** basePrice — displayed in "Theo giờ" column */
  hourlyRate: number
  /** basePrice × 8 — rough daily estimate */
  dailyRate: number
  /** nightSurcharge */
  overnightRate: number
  /** Human-readable note built from baseHours + extraHourPrice */
  note: string
  status: string
  // keep originals so the edit form can prefill correctly
  basePrice: number
  baseHours: number
  extraHourPrice: number
  nightSurcharge: number
  effectiveDate: string
}

// ─── Form state matches what the API actually accepts ─────────────────────────
interface PricingPolicyForm {
  vehicleTypeName: string
  basePrice: number
  baseHours: number
  extraHourPrice: number
  nightSurcharge: number
  effectiveDate: string
  status: string
}

interface ApiResponse<T> {
  isSuccess: boolean
  result: T
  message?: string
}

// ─── Transform raw → display ──────────────────────────────────────────────────
function toDisplay(raw: PricingPolicyRaw): PricingPolicyDisplay {
  return {
    policyId: raw.policyId,
    vehicleTypeName: raw.vehicleTypeName,
    hourlyRate: raw.basePrice,
    dailyRate: raw.basePrice * 8,
    overnightRate: raw.nightSurcharge,
    note: `${raw.baseHours} giờ đầu, sau đó ${raw.extraHourPrice.toLocaleString('vi-VN')}đ/giờ`,
    status: raw.status,
    basePrice: raw.basePrice,
    baseHours: raw.baseHours,
    extraHourPrice: raw.extraHourPrice,
    nightSurcharge: raw.nightSurcharge,
    effectiveDate: raw.effectiveDate ?? '',
  }
}

const EMPTY_FORM: PricingPolicyForm = {
  vehicleTypeName: '',
  basePrice: 0,
  baseHours: 1,
  extraHourPrice: 0,
  nightSurcharge: 0,
  effectiveDate: new Date().toISOString().slice(0, 10),
  status: 'Active',
}

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ'
}

export default function ManagerPricing() {
  const [policies, setPolicies] = useState<PricingPolicyDisplay[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<PricingPolicyDisplay | null>(null)
  const [form, setForm] = useState<PricingPolicyForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchPolicies = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<ApiResponse<PricingPolicyRaw[]>>('/PricingPolicy')
      if (res.isSuccess) {
        setPolicies(res.result.map(toDisplay))
      } else {
        setError(res.message ?? 'Không thể tải bảng giá.')
      }
    } catch (e) {
      console.error(e)
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (p: PricingPolicyDisplay) => {
    setEditTarget(p)
    setForm({
      vehicleTypeName: p.vehicleTypeName,
      basePrice: p.basePrice,
      baseHours: p.baseHours,
      extraHourPrice: p.extraHourPrice,
      nightSurcharge: p.nightSurcharge,
      effectiveDate: p.effectiveDate || new Date().toISOString().slice(0, 10),
      status: p.status,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editTarget) {
        await apiClient.put<ApiResponse<PricingPolicyRaw>>('/PricingPolicy', {
          policyId: editTarget.policyId,
          ...form,
        })
      } else {
        await apiClient.post<ApiResponse<PricingPolicyRaw>>('/PricingPolicy', form)
      }
      closeModal()
      await fetchPolicies()
    } catch (e) {
      console.error(e)
      alert('Lưu thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (policyId: string, name: string) => {
    if (!window.confirm(`Xóa chính sách giá cho "${name}"?`)) return
    try {
      await apiClient.delete<ApiResponse<unknown>>(`/PricingPolicy/${policyId}`)
      await fetchPolicies()
    } catch (e) {
      console.error(e)
      alert('Xóa thất bại. Vui lòng thử lại.')
    }
  }

  return (
    <ManagerPageShell activeItem="pricing">
      <div className="staff-content-wrapper">
        <div className="staff-section">
          <h2>Bảng giá đỗ xe</h2>
          <p className="section-desc">
            Thiết lập đơn giá theo giờ, ngày, qua đêm và các quy định ưu đãi, phụ thu.
          </p>

          <div className="toolbar-row card-panel">
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {loading ? 'Đang tải...' : `${policies.length} chính sách giá`}
            </p>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Thêm chính sách
            </button>
          </div>

          {error && (
            <div className="card-panel" style={{ color: 'var(--danger, #ef4444)', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div className="card-panel table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Loại xe</th>
                  <th>Theo giờ</th>
                  <th>Theo ngày (ước tính)</th>
                  <th>Qua đêm</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                )}
                {!loading && policies.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có chính sách nào.
                    </td>
                  </tr>
                )}
                {policies.map((r) => (
                  <tr key={r.policyId}>
                    <td>{r.vehicleTypeName}</td>
                    <td>{formatVND(r.hourlyRate)}</td>
                    <td>{formatVND(r.dailyRate)}</td>
                    <td>{formatVND(r.overnightRate)}</td>
                    <td style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>{r.note}</td>
                    <td>
                      <span
                        className={`badge ${r.status === 'Active' ? 'badge-paid' : 'badge-cancelled'}`}
                      >
                        {r.status === 'Active' ? 'Đang áp dụng' : r.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(r)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(r.policyId, r.vehicleTypeName)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="modal-panel">
            <h3 className="modal-title">
              {editTarget ? 'Sửa chính sách giá' : 'Thêm chính sách giá'}
            </h3>
            <form onSubmit={handleSave}>
              {/* vehicleTypeName */}
              <div className="form-field">
                <label htmlFor="pp-vtype">Loại xe *</label>
                <input
                  id="pp-vtype"
                  type="text"
                  required
                  value={form.vehicleTypeName}
                  onChange={(e) => setForm({ ...form, vehicleTypeName: e.target.value })}
                  placeholder="VD: Ô tô"
                />
              </div>

              {/* basePrice */}
              <div className="form-field">
                <label htmlFor="pp-base-price">Giá cơ bản (đ) *</label>
                <input
                  id="pp-base-price"
                  type="number"
                  min={0}
                  required
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                  placeholder="VD: 25000"
                />
              </div>

              {/* baseHours */}
              <div className="form-field">
                <label htmlFor="pp-base-hours">Số giờ cơ bản *</label>
                <input
                  id="pp-base-hours"
                  type="number"
                  min={1}
                  required
                  value={form.baseHours}
                  onChange={(e) => setForm({ ...form, baseHours: Number(e.target.value) })}
                  placeholder="VD: 2"
                />
              </div>

              {/* extraHourPrice */}
              <div className="form-field">
                <label htmlFor="pp-extra-hour">Giá mỗi giờ phát sinh (đ) *</label>
                <input
                  id="pp-extra-hour"
                  type="number"
                  min={0}
                  required
                  value={form.extraHourPrice}
                  onChange={(e) => setForm({ ...form, extraHourPrice: Number(e.target.value) })}
                  placeholder="VD: 10000"
                />
              </div>

              {/* nightSurcharge */}
              <div className="form-field">
                <label htmlFor="pp-night">Phụ phí qua đêm (đ) *</label>
                <input
                  id="pp-night"
                  type="number"
                  min={0}
                  required
                  value={form.nightSurcharge}
                  onChange={(e) => setForm({ ...form, nightSurcharge: Number(e.target.value) })}
                  placeholder="VD: 30000"
                />
              </div>

              {/* effectiveDate */}
              <div className="form-field">
                <label htmlFor="pp-effective">Ngày hiệu lực *</label>
                <input
                  id="pp-effective"
                  type="date"
                  required
                  value={form.effectiveDate}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                />
              </div>

              {/* status */}
              <div className="form-field">
                <label htmlFor="pp-status">Trạng thái</label>
                <select
                  id="pp-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Active">Đang áp dụng</option>
                  <option value="Inactive">Ngừng áp dụng</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                  Huỷ
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ManagerPageShell>
  )
}
