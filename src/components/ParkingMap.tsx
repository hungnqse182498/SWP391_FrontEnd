import { ArrowDown, MousePointerClick, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ParkingFloor, ParkingSpot, SpotStatus } from '../types/parking'

interface ParkingMapProps {
  floors: ParkingFloor[]
  onContinue?: (spots: ParkingSpot[], floor: ParkingFloor) => void
}

const STATUS_LABEL: Record<SpotStatus, string> = {
  available: 'Trống',
  occupied: 'Đã có xe',
  reserved: 'Đã đặt',
  selected: 'Đang chọn',
  disabled: 'Không dùng',
}

export default function ParkingMap({ floors, onContinue }: ParkingMapProps) {
  const [activeFloorId, setActiveFloorId] = useState(floors[0]?.id ?? 1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const floor = floors.find((f) => f.id === activeFloorId) ?? floors[0]

  const spotMap = useMemo(() => {
    const map = new Map<string, ParkingSpot>()
    floor?.spots.forEach((s) => map.set(s.id, s))
    return map
  }, [floor])

  const selectedSpots = useMemo(
    () =>
      [...selectedIds]
        .map((id) => spotMap.get(id))
        .filter((s): s is ParkingSpot => Boolean(s)),
    [selectedIds, spotMap],
  )

  const toggleSpot = (spot: ParkingSpot) => {
    if (spot.status === 'occupied' || spot.status === 'reserved' || spot.status === 'disabled') return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(spot.id)) next.delete(spot.id)
      else next.add(spot.id)
      return next
    })
  }

  const getDisplayStatus = (spot: ParkingSpot): SpotStatus =>
    selectedIds.has(spot.id) ? 'selected' : spot.status

  if (!floor) return null

  return (
    <section className="parking-map" aria-label="Sơ đồ chọn chỗ đỗ">
      <div className="map-toolbar">
        <div className="floor-tabs" role="tablist">
          {floors.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={f.id === activeFloorId}
              className={`floor-tab${f.id === activeFloorId ? ' active' : ''}`}
              onClick={() => {
                setActiveFloorId(f.id)
                setSelectedIds(new Set())
              }}
            >
              {f.name}
            </button>
          ))}
        </div>
        <ul className="map-legend">
          <li><span className="dot available" /> Trống</li>
          <li><span className="dot selected" /> Đang chọn</li>
          <li><span className="dot reserved" /> Đã đặt</li>
          <li><span className="dot occupied" /> Có xe</li>
        </ul>
      </div>

      <div className="map-stage">
        <div className="map-entrance" aria-hidden="true">
          <ArrowDown size={16} strokeWidth={2} />
          <span>Lối vào / Thang máy</span>
        </div>
        <div className="map-grid-wrap">
          <div className="map-col-labels" aria-hidden="true">
            {Array.from({ length: floor.cols }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <div className="map-grid">
            {floor.rows.map((row) => (
              <div key={row} className="map-row">
                <span className="row-label">{row}</span>
                <div className="row-spots">
                  {floor.spots
                    .filter((s) => s.row === row)
                    .map((spot) => {
                      const status = getDisplayStatus(spot)
                      const clickable = status === 'available' || status === 'selected'
                      return (
                        <button
                          key={spot.id}
                          type="button"
                          className={`spot spot--${status} spot--${spot.type}`}
                          disabled={!clickable}
                          aria-label={`${row}${spot.number} — ${STATUS_LABEL[status]}`}
                          aria-pressed={status === 'selected'}
                          onClick={() => toggleSpot(spot)}
                        >
                          {spot.type === 'ev' ? (
                            <Zap size={12} strokeWidth={2.5} aria-hidden />
                          ) : (
                            <span className="spot-num">{spot.number}</span>
                          )}
                        </button>
                      )
                    })}
                </div>
                <span className="row-label">{row}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="map-sidebar">
        <h3>Chỗ đã chọn</h3>
        {selectedSpots.length === 0 ? (
          <p className="muted">
            <MousePointerClick size={16} strokeWidth={2} aria-hidden />
            Nhấn ô trống trên sơ đồ để chọn chỗ đỗ.
          </p>
        ) : (
          <ul className="selected-list">
            {selectedSpots.map((s) => (
              <li key={s.id}>
                <strong>{floor.name} — {s.row}{s.number}</strong>
                <span>{s.type === 'ev' ? 'Xe điện' : s.type === 'handicap' ? 'Khuyết tật' : 'Tiêu chuẩn'}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={selectedSpots.length === 0}
          onClick={() => onContinue?.(selectedSpots, floor)}
        >
          Tiếp tục xác nhận
        </button>
      </aside>
    </section>
  )
}

