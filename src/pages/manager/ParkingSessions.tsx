import { useEffect, useState, useMemo } from 'react'
import ManagerPageShell from '../../components/ManagerPageShell'
import { apiClient } from '../../config/api'
import { formatUtcToVietnamDateTime, formatUtcToVietnamDate } from '../../utils/dateTime'
import type { ApiResponse, ParkingSessionDto } from '../../utils/apiServices'

const STATUS_MAP: Record<string, { text: string; className: string }> = {
  active: { text: 'Đang hoạt động', className: 'badge-paid' },
  completed: { text: 'Hoàn thành', className: '' },
  pending: { text: 'Chờ xử lý', className: 'badge-cancelled' },
}

export default function ManagerParkingSessions() {
  const [sessions, setSessions] = useState<ParkingSessionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all')

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<ApiResponse<ParkingSessionDto[]>>('/ParkingSession')
      if (res.isSuccess) {
        setSessions(res.result || [])
      } else {
        setError(res.message || 'Không thể tải danh sách phiên gửi xe.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRefresh = async () => {
    setStatusFilter('all')
    setDateFilter('all')
    setVehicleTypeFilter('all')
    await fetchSessions()
  }

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((session) => {
        // 1. Status Filter
        if (statusFilter !== 'all') {
          if ((session.status || '').toLowerCase() !== statusFilter) {
            return false
          }
        }

        // 2. Date Filter
        if (dateFilter !== 'all') {
          const entryTime = session.entryTime
          if (!entryTime) return false

          if (dateFilter === 'today') {
            const sessionDate = formatUtcToVietnamDate(entryTime)
            const todayDate = formatUtcToVietnamDate(new Date().toISOString())
            if (sessionDate !== todayDate) return false
          } else if (dateFilter === '7days') {
            const diffMs = Date.now() - new Date(entryTime).getTime()
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
            if (diffMs < 0 || diffMs > sevenDaysMs) return false
          } else if (dateFilter === '30days') {
            const diffMs = Date.now() - new Date(entryTime).getTime()
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
            if (diffMs < 0 || diffMs > thirtyDaysMs) return false
          }
        }

        // 3. Vehicle Type Filter
        if (vehicleTypeFilter !== 'all') {
          const typeName = (session.vehicleTypeName || '').toLowerCase()
          if (vehicleTypeFilter === 'car') {
            const isCar = typeName.includes('ô tô') || typeName.includes('suv') || typeName === 'car'
            if (!isCar) return false
          } else if (vehicleTypeFilter === 'motorcycle') {
            const isMotor = typeName.includes('xe máy') || typeName.includes('xe may') || typeName === 'motorcycle'
            if (!isMotor) return false
          }
        }

        return true
      })
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
  }, [sessions, statusFilter, dateFilter, vehicleTypeFilter])

  return (
    <ManagerPageShell activeItem="sessions">
      <div className="staff-content-wrapper">
        <div className="staff-section">
          <h2>Quản lý phiên ra vào</h2>
          <p className="section-desc">
            Theo dõi các phiên gửi xe đang hoạt động và lịch sử ra vào.
          </p>

          <div className="toolbar-row card-panel">
            <div className="form-field" style={{ margin: 0, flex: 1, maxWidth: 200 }}>
              <label htmlFor="filter-status">Trạng thái</label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="completed">Hoàn thành</option>
                <option value="pending">Chờ xử lý</option>
              </select>
            </div>

            <div className="form-field" style={{ margin: 0, flex: 1, maxWidth: 200 }}>
              <label htmlFor="filter-date">Ngày</label>
              <select
                id="filter-date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
              </select>
            </div>

            <div className="form-field" style={{ margin: 0, flex: 1, maxWidth: 200 }}>
              <label htmlFor="filter-vehicle-type">Loại xe</label>
              <select
                id="filter-vehicle-type"
                value={vehicleTypeFilter}
                onChange={(e) => setVehicleTypeFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="car">Ô tô</option>
                <option value="motorcycle">Xe máy</option>
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

          <div className="card-panel table-wrap" style={{ marginTop: '1.5rem' }}>
            {loading && sessions.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                Đang tải phiên gửi xe...
              </p>
            ) : filteredSessions.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 0' }}>
                <p>Không có phiên gửi xe nào.</p>
              </div>
            ) : (
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Chủ xe</th>
                    <th>Loại xe</th>
                    <th>Thời gian vào</th>
                    <th>Thời gian ra</th>
                    <th>Cổng</th>
                    <th>Slot</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => {
                    const plateIn = session.licensePlateIn
                    const plateOut = session.licensePlateOut
                    const licensePlateDisplay =
                      plateOut && plateOut !== plateIn ? `${plateIn} → ${plateOut}` : plateIn

                    const gateIn = session.entryGateName || '—'
                    const gateOut = session.exitGateName
                    const gatesDisplay = gateOut ? `${gateIn} → ${gateOut}` : gateIn

                    const slotDisplay = session.actualSlotCode || session.assignedSlotCode || '—'

                    const lowerStatus = (session.status || '').toLowerCase()
                    const statusInfo = STATUS_MAP[lowerStatus] || { text: session.status || '—', className: '' }

                    return (
                      <tr key={session.sessionId}>
                        <td>
                          <strong>{licensePlateDisplay}</strong>
                        </td>
                        <td>{session.driverFullName || '—'}</td>
                        <td>{session.vehicleTypeName || '—'}</td>
                        <td>{formatUtcToVietnamDateTime(session.entryTime)}</td>
                        <td>
                          {session.exitTime ? formatUtcToVietnamDateTime(session.exitTime) : '—'}
                        </td>
                        <td>{gatesDisplay}</td>
                        <td>{slotDisplay}</td>
                        <td>
                          <span className={`badge ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ManagerPageShell>
  )
}
