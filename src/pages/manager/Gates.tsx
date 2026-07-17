import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'

interface Gate {
  gateId: string
  gateName: string
  gateType: 'Entry' | 'Exit' | string
  floorId: string
  floorName?: string
}

interface Floor {
  floorId: string
  floorName: string
}

interface ApiResponse<T> {
  isSuccess: boolean
  result: T
  message?: string
}

const EMPTY_FORM = {
  gateName: '',
  gateType: 'Entry',
  floorId: '',
}

export default function ManagerGates() {
  const [gates, setGates] = useState<Gate[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Gate | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Load supporting floors list for the FloorId selector.
  const fetchFloors = async () => {
    try {
      const res = await apiClient.get<ApiResponse<Floor[]>>('/Floor')
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
      const res = await apiClient.get<ApiResponse<Gate[]>>('/Gate')
      if (res.isSuccess && res.result) {
        setGates(res.result)
      } else {
        alert('Không thể tải danh sách cổng.')
        setError('Không thể tải danh sách cổng.')
      }
    } catch (err: unknown) {
      console.error(err)
      alert('Không thể tải danh sách cổng.')
      setError('Không thể tải danh sách cổng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void fetchFloors()
      void fetchGates()
    }, 0)

    return () => window.clearTimeout(loadTimer)
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
      gateType: g.gateType,
      floorId: g.floorId,
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
      const payload = {
        gateName: form.gateName.trim(),
        gateType: form.gateType,
        floorId: form.floorId,
      }

      if (editTarget) {
        const body = {
          gateId: editTarget.gateId,
          ...payload,
        }
        await apiClient.put<ApiResponse<unknown>>('/Gate', body)
      } else {
        await apiClient.post<ApiResponse<unknown>>('/Gate', payload)
      }

      closeModal()
      await fetchGates()
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Lưu thất bại. Vui lòng thử lại.')
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
                    <th>Tầng</th>
                    <th>Loại cổng</th>
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
                        <td>{g.floorName || '—'}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: g.gateType === 'Entry' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: g.gateType === 'Entry' ? '#047857' : '#1d4ed8',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontWeight: '600',
                            }}
                          >
                            {g.gateType === 'Entry' ? 'Cổng vào' : g.gateType === 'Exit' ? 'Cổng ra' : g.gateType}
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
                <label htmlFor="gate-floor">Tầng *</label>
                <select
                  id="gate-floor"
                  required
                  value={form.floorId}
                  onChange={(e) => setForm({ ...form, floorId: e.target.value })}
                >
                  <option value="" disabled>-- Chọn tầng --</option>
                  {floors.map((floor) => (
                    <option key={floor.floorId} value={floor.floorId}>{floor.floorName}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="gate-type">Loại cổng *</label>
                <select
                  id="gate-type"
                  required
                  value={form.gateType}
                  onChange={(e) => setForm({ ...form, gateType: e.target.value })}
                >
                  <option value="Entry">Cổng vào (Entry)</option>
                  <option value="Exit">Cổng ra (Exit)</option>
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
