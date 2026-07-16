import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'
import { formatCurrency } from '../../utils/pricing'

interface SubscriptionPackage {
  packageId: string
  packageName: string
  price: number
  duration?: number
  durationMonths?: number
  description?: string
  vehicleTypeId?: string
  vehicleTypeName?: string
  requireFixedSlot?: boolean
  status?: string
}

interface ApiResponse<T> {
  isSuccess: boolean
  result: T
  message?: string
}

const EMPTY_FORM = {
  packageName: '',
  price: '',
  duration: '',
  description: '',
}

export default function ManagerSubscriptionPackages() {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<SubscriptionPackage | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchPackages = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<ApiResponse<SubscriptionPackage[]>>('/SubscriptionPackage')
      if (res.isSuccess) {
        setPackages(res.result)
      } else {
        setError(res.message ?? 'Không thể tải danh sách gói thuê bao.')
      }
    } catch (e) {
      console.error(e)
      setError('Không thể tải danh sách gói thuê bao.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (p: SubscriptionPackage) => {
    setEditTarget(p)
    const dur = p.durationMonths !== undefined ? p.durationMonths : p.duration ?? 0
    setForm({
      packageName: p.packageName,
      price: String(p.price),
      duration: String(dur),
      description: p.description ?? '',
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
      const payload: Record<string, unknown> = {
        packageName: form.packageName.trim(),
        price: Number(form.price),
        duration: Number(form.duration),
        durationMonths: Number(form.duration),
        description: form.description.trim() || null,
        vehicleTypeId: editTarget?.vehicleTypeId ?? null,
        requireFixedSlot: editTarget?.requireFixedSlot ?? false,
        status: editTarget?.status ?? 'Active',
      }

      if (editTarget) {
        await apiClient.put<ApiResponse<unknown>>(
          `/SubscriptionPackage/${editTarget.packageId}`,
          payload,
        )
      } else {
        await apiClient.post<ApiResponse<unknown>>('/SubscriptionPackage', payload)
      }
      closeModal()
      await fetchPackages()
    } catch (e: any) {
      console.error(e)
      alert(e?.message || 'Lưu thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xóa gói "${name}"?`)) return
    try {
      await apiClient.delete<ApiResponse<unknown>>(`/SubscriptionPackage/${id}`)
      await fetchPackages()
    } catch (e) {
      console.error(e)
      alert('Xóa thất bại. Vui lòng thử lại.')
    }
  }

  const getDuration = (p: SubscriptionPackage) =>
    p.durationMonths !== undefined ? p.durationMonths : p.duration ?? 0

  return (
    <ManagerPageShell activeItem="subscriptions">
      <div className="staff-content-wrapper">
        <div className="staff-section">
          <h2>Quản lý gói</h2>
          <p className="section-desc">
            Thêm, sửa, xóa các gói đăng ký tháng cho khách hàng.
          </p>

          <div className="toolbar-row card-panel">
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {loading ? 'Đang tải...' : `${packages.length} gói thuê bao`}
            </p>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} aria-hidden />
              Thêm gói
            </button>
          </div>

          {error && (
            <div className="card-panel" style={{ color: 'var(--danger, #ef4444)', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div className="card-panel" style={{ marginTop: '1rem' }}>
            {loading && packages.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</p>
            ) : (
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Tên gói</th>
                    <th>Giá</th>
                    <th>Thời hạn (tháng)</th>
                    <th>Mô tả</th>
                    <th style={{ width: '150px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có gói thuê bao nào.
                      </td>
                    </tr>
                  ) : (
                    packages.map((p) => (
                      <tr key={p.packageId}>
                        <td>{p.packageName}</td>
                        <td>{formatCurrency(p.price)}</td>
                        <td>{getDuration(p)}</td>
                        <td>{p.description || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => openEdit(p)}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ borderColor: 'var(--danger, #ef4444)', color: 'var(--danger, #ef4444)' }}
                              onClick={() => handleDelete(p.packageId, p.packageName)}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
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
            <h3 className="modal-title">{editTarget ? 'Sửa gói thuê bao' : 'Thêm gói thuê bao'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-field">
                <label htmlFor="pkg-name">Tên gói *</label>
                <input
                  id="pkg-name"
                  type="text"
                  required
                  value={form.packageName}
                  onChange={(e) => setForm({ ...form, packageName: e.target.value })}
                  placeholder="VD: Gói cơ bản"
                />
              </div>
              <div className="form-field">
                <label htmlFor="pkg-price">Giá (VNĐ) *</label>
                <input
                  id="pkg-price"
                  type="number"
                  required
                  min={1}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="VD: 200000"
                />
              </div>
              <div className="form-field">
                <label htmlFor="pkg-duration">Thời hạn (tháng) *</label>
                <input
                  id="pkg-duration"
                  type="number"
                  required
                  min={1}
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="VD: 1"
                />
              </div>
              <div className="form-field">
                <label htmlFor="pkg-desc">Mô tả</label>
                <textarea
                  id="pkg-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Nhập mô tả chi tiết về gói thuê bao..."
                />
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
