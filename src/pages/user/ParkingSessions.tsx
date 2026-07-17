import { useEffect, useMemo, useState } from 'react'
import { Car, ChevronRight, CircleParking, Clock3, DoorOpen, Image, MapPin, QrCode, ShieldAlert, X } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import { formatUtcToVietnamDateTime } from '../../utils/dateTime'
import { parkingSessionApi, type ParkingSessionDto } from '../../utils/apiServices'

type SessionFilter = 'all' | 'active' | 'completed'

function statusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return 'Đang gửi'
    case 'completed': return 'Đã hoàn tất'
    case 'cancelled': return 'Đã huỷ'
    default: return status
  }
}

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return 'badge-history-success'
    case 'completed': return 'badge-history-neutral'
    case 'cancelled': return 'badge-history-cancelled'
    default: return 'badge-history-pending'
  }
}

function durationLabel(session: ParkingSessionDto) {
  const start = new Date(session.entryTime).getTime()
  const end = session.exitTime ? new Date(session.exitTime).getTime() : Date.now()
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return [days ? `${days} ngày` : '', hours ? `${hours} giờ` : '', `${minutes} phút`].filter(Boolean).join(' ')
}

function ParkingSessionsContent() {
  const [sessions, setSessions] = useState<ParkingSessionDto[]>([])
  const [filter, setFilter] = useState<SessionFilter>('all')
  const [selected, setSelected] = useState<ParkingSessionDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSessions = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await parkingSessionApi.getMy()
      if (res.isSuccess) {
        setSessions(
          [...(res.result || [])].sort(
            (left, right) => new Date(right.entryTime).getTime() - new Date(left.entryTime).getTime(),
          ),
        )
      } else {
        setError(res.message || 'Không thể tải danh sách phiên gửi xe.')
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadSessions(), 0)
    return () => window.clearTimeout(loadTimer)
  }, [])

  const activeCount = sessions.filter((item) => item.status.toLowerCase() === 'active').length
  const completedCount = sessions.filter((item) => item.status.toLowerCase() === 'completed').length
  const filteredSessions = useMemo(() => {
    if (filter === 'active') return sessions.filter((item) => item.status.toLowerCase() === 'active')
    if (filter === 'completed') return sessions.filter((item) => item.status.toLowerCase() === 'completed')
    return sessions
  }, [filter, sessions])

  return (
    <section className="parking-sessions-page">
      <header className="page-header parking-sessions-heading">
        <div>
          <h1>Phiên gửi xe</h1>
          <p>Theo dõi xe đang trong bãi và lịch sử các lượt gửi xe của bạn.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => void loadSessions()} disabled={loading}>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <div className="parking-session-summary">
        <div className="card-panel"><CircleParking size={22} /><span>Tổng phiên</span><strong>{sessions.length}</strong></div>
        <div className="card-panel parking-session-summary--active"><Car size={22} /><span>Đang trong bãi</span><strong>{activeCount}</strong></div>
        <div className="card-panel"><Clock3 size={22} /><span>Đã hoàn tất</span><strong>{completedCount}</strong></div>
      </div>

      <div className="parking-session-filters" role="group" aria-label="Lọc phiên gửi xe">
        {([
          ['all', `Tất cả (${sessions.length})`],
          ['active', `Đang gửi (${activeCount})`],
          ['completed', `Đã hoàn tất (${completedCount})`],
        ] as Array<[SessionFilter, string]>).map(([value, label]) => (
          <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>

      {loading && sessions.length === 0 ? (
        <div className="empty-state card-panel"><p>Đang tải phiên gửi xe...</p></div>
      ) : error ? (
        <div className="empty-state card-panel"><ShieldAlert size={40} /><p>{error}</p><button type="button" className="btn btn-primary" onClick={() => void loadSessions()}>Thử lại</button></div>
      ) : filteredSessions.length === 0 ? (
        <div className="empty-state card-panel"><CircleParking size={44} /><p>Không có phiên gửi xe phù hợp.</p></div>
      ) : (
        <div className="parking-session-list">
          {filteredSessions.map((session) => (
            <article key={session.sessionId} className="parking-session-card card-panel">
              <div className="parking-session-plate">{session.licensePlateIn}</div>
              <div className="parking-session-card-main">
                <div className="parking-session-card-title">
                  <div><strong>{session.vehicleTypeName || 'Phương tiện'}</strong><small>{durationLabel(session)}</small></div>
                  <span className={`badge ${statusClass(session.status)}`}>{statusLabel(session.status)}</span>
                </div>
                <div className="parking-session-meta">
                  <span><Clock3 size={15} />Vào: {formatUtcToVietnamDateTime(session.entryTime)}</span>
                  <span><MapPin size={15} />Vị trí: {session.actualSlotCode || session.assignedSlotCode || 'Chưa xếp chỗ'}</span>
                  <span><DoorOpen size={15} />Cổng vào: {session.entryGateName || '—'}</span>
                </div>
              </div>
              <div className="parking-session-actions">
                {session.ticket?.qrCodeDataUrl && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setSelected(session)}>
                    <QrCode size={15} /> Xem mã vé
                  </button>
                )}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelected(session)}>Chi tiết <ChevronRight size={15} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setSelected(null) }}>
          <div className="modal-panel parking-session-modal" role="dialog" aria-modal="true" aria-labelledby="parking-session-detail-title">
            <div className="parking-session-modal-head">
              <div><h3 id="parking-session-detail-title" className="modal-title">Chi tiết phiên gửi xe</h3><span className={`badge ${statusClass(selected.status)}`}>{statusLabel(selected.status)}</span></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} aria-label="Đóng"><X size={20} /></button>
            </div>

            {selected.ticket?.qrCodeDataUrl && (
              <div className="parking-session-ticket">
                <QrCode size={20} />
                <div><strong>Vé xe đang sử dụng</strong><small>Xuất trình mã này khi làm thủ tục ra bãi.</small></div>
                <img src={selected.ticket.qrCodeDataUrl} alt={`Mã QR vé xe ${selected.licensePlateIn}`} />
                <code>{selected.ticket.qrPayload}</code>
              </div>
            )}

            <div className="parking-session-detail-grid">
              <div><span>Biển số vào</span><strong>{selected.licensePlateIn}</strong></div>
              <div><span>Loại xe</span><strong>{selected.vehicleTypeName || '—'}</strong></div>
              <div><span>Thời gian vào</span><strong>{formatUtcToVietnamDateTime(selected.entryTime)}</strong></div>
              <div><span>Thời gian ra</span><strong>{selected.exitTime ? formatUtcToVietnamDateTime(selected.exitTime) : 'Chưa ra bãi'}</strong></div>
              <div><span>Cổng vào</span><strong>{selected.entryGateName || '—'}</strong></div>
              <div><span>Cổng ra</span><strong>{selected.exitGateName || '—'}</strong></div>
              <div><span>Vị trí đỗ</span><strong>{selected.actualSlotCode || selected.assignedSlotCode || '—'}</strong></div>
              <div><span>Tổng thời gian</span><strong>{durationLabel(selected)}</strong></div>
            </div>

            {(selected.entryImageUrl || selected.exitImageUrl) && (
              <div className="parking-session-images">
                {selected.entryImageUrl && <a href={selected.entryImageUrl} target="_blank" rel="noreferrer"><Image size={16} />Ảnh xe vào</a>}
                {selected.exitImageUrl && <a href={selected.exitImageUrl} target="_blank" rel="noreferrer"><Image size={16} />Ảnh xe ra</a>}
              </div>
            )}

          </div>
        </div>
      )}
    </section>
  )
}

export default function ParkingSessions() {
  return <ProtectedRoute><ParkingSessionsContent /></ProtectedRoute>
}
