import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'

interface Gate {
  gateId: string
  gateName: string
  location: string
  status: string
  gateType?: string
  floorId?: string
  floorName?: string
}

interface ApiResponse<T> {
  isSuccess: boolean
  result: T
  message?: string
}

const EMPTY_FORM = {
  gateName: '',
  location: '',
  status: 'Active',
}

export default function ManagerGates() {
  const [gates, setGates] = useState<Gate[]>([])
  const [floors, setFloors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Gate | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Load supporting floors list to map floor names/locations to floorId
  const fetchFloors = async () => {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>('/Floor')
      if (res.isSuccess && res.result) {
        setFloors(res.result)
      }
    } catch (err) {
      console.error('Không thể tải danh sách tầng để đối chiếu vị trí:', err)
    }
  }

  // Load gates list
  const fetchGates = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<ApiResponse<any[]>>('/Gate')
      if (res.isSuccess && res.result) {
        const mapped = res.result.map((g: any) => ({
          gateId: g.gateId,
          gateName: g.gateName,
          location: g.location || g.floorName || '—',
          status: g.status || (g.gateType === 'Entry' ? 'Active' : 'Inactive'),
          gateType: g.gateType,
          floorId: g.floorId,
          floorName: g.floorName,
        }))
        setGates(mapped)
      } else {
        alert('Không thể tải danh sách cổng.')
        setError('Không thể tải danh sách cổng.')
      }
    } catch (err: any) {
      console.error(err)
      alert('Không thể tải danh sách cổng.')
      setError('Không thể tải danh sách cổng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFloors()
    fetchGates()
  }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (g: Gate) => {
    setEditTarget(g)
    setForm({
      gateName: g.gateName,
      location: g.location,
      status: g.status,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  // Helper to match input text location to floor ID
  const resolveFloorId = (loc: string) => {
    const norm = loc.toLowerCase().trim()
    const match = floors.find((f) => f.floorName.toLowerCase().trim() === norm)
    if (match) return match.floorId

    const partial = floors.find(
      (f) => f.floorName.toLowerCase().includes(norm) || norm.includes(f.floorName.toLowerCase())
    )
    if (partial) return partial.floorId

    return floors[0]?.floorId || '00000000-0000-0000-0000-000000000000'
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const floorId = resolveFloorId(form.location)
      const gateType = form.status === 'Active' ? 'Entry' : 'Exit'

      const payload = {
        gateName: form.gateName.trim(),
        location: form.location.trim(),
        status: form.status,
        gateType,
        floorId,
      }

      if (editTarget) {
        const body = {
          gateId: editTarget.gateId,
          ...payload,
        }
        try {
          // Attempt specified /Gate/{id} first for spec compliance
          await apiClient.put<ApiResponse<unknown>>(`/Gate/${editTarget.gateId}`, body)
        } catch (err: any) {
          const errMsg = String(err?.message || err)
          if (errMsg.includes('404') || errMsg.includes('405')) {
            // Fall back to standard /Gate body-based endpoint
            await apiClient.put<ApiResponse<unknown>>('/Gate', body)
          } else {
            throw err
          }
        }
      } else {
        await apiClient.post<ApiResponse<unknown>>('/Gate', payload)
      }

      closeModal()
      await fetchGates()
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Lưu thất bại. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xóa cổng "${name}"?`)) return
    try {
      await apiClient.delete<ApiResponse<unknown>>(`/Gate/${id}`)
      await fetchGates()
    } catch (err) {
      console.error(err)
      alert('Xóa thất bại. Vui lòng thử lại.')
    }
  }

  return (
    <ManagerPageShell activeItem="gates">
      <div className="staff-content-wrapper">
        <div className="staff-section">
          <h2>Quản lý cổng ra vào</h2>
          <p className="section-desc">Thêm, sửa, xóa cổng ra vào bãi xe.</p>

          <div className="toolbar-row card-panel">
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {loading ? 'Đang tải...' : `${gates.length} cổng ra vào`}
            </p>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} aria-hidden />
              Thêm cổng
            </button>
          </div>

          {error && (
            <div className="card-panel" style={{ color: 'var(--danger, #ef4444)', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div className="card-panel" style={{ marginTop: '1rem' }}>
            {loading && gates.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</p>
            ) : (
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Tên cổng</th>
                    <th>Vị trí</th>
                    <th>Trạng thái</th>
                    <th style={{ width: '150px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {gates.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có cổng ra vào nào.
                      </td>
                    </tr>
                  ) : (
                    gates.map((g) => (
                      <tr key={g.gateId}>
                        <td>{g.gateName}</td>
                        <td>{g.location}</td>
                        <td>
                          <span
                            className={`badge ${
                              g.status === 'Active' ? 'badge-paid' : 'badge-unpaid'
                            }`}
                            style={{
                              backgroundColor: g.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: g.status === 'Active' ? '#10b981' : '#ef4444',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: '600',
                            }}
                          >
                            {g.status === 'Active' ? 'Hoạt động' : 'Tạm dừng'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => openEdit(g)}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ borderColor: 'var(--danger, #ef4444)', color: 'var(--danger, #ef4444)' }}
                              onClick={() => handleDelete(g.gateId, g.gateName)}
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
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="modal-panel">
            <h3 className="modal-title">{editTarget ? 'Sửa cổng' : 'Thêm cổng'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-field">
                <label htmlFor="gate-name">Tên cổng *</label>
                <input
                  id="gate-name"
                  type="text"
                  required
                  value={form.gateName}
                  onChange={(e) => setForm({ ...form, gateName: e.target.value })}
                  placeholder="VD: Cổng chính"
                />
              </div>
              <div className="form-field">
                <label htmlFor="gate-location">Vị trí *</label>
                <input
                  id="gate-location"
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="VD: Tầng B1"
                />
              </div>
              <div className="form-field">
                <label htmlFor="gate-status">Trạng thái</label>
                <select
                  id="gate-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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
