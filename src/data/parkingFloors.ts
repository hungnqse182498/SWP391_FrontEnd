import type { ParkingFloor, ParkingSpot, SpotStatus } from '../types/parking'
import { MOCK_FLOOR_LAYOUTS, rowLabels } from './parkingLayoutConfig'

function seedStatus(rowIndex: number, col: number, offset: number): SpotStatus {
  const hash = (rowIndex * 17 + col * 31 + offset) % 100
  if (hash < 12) return 'occupied'
  if (hash < 18) return 'reserved'
  if (hash < 22) return 'disabled'
  return 'available'
}

function buildFloorFromLayout(
  floorId: number,
  name: string,
  rowCount: number,
  colCount: number,
  offset: number,
): ParkingFloor {
  const rows = rowLabels(rowCount)
  const spots: ParkingSpot[] = []

  rows.forEach((row, rowIndex) => {
    for (let col = 1; col <= colCount; col++) {
      spots.push({
        id: `F${floorId}-${row}${col}`,
        row,
        number: col,
        status: seedStatus(rowIndex, col, offset),
        type: 'standard',
      })
    }
  })

  return { id: floorId, name, rows, cols: colCount, spots }
}

export const parkingFloors: ParkingFloor[] = MOCK_FLOOR_LAYOUTS.map((layout, index) =>
  buildFloorFromLayout(layout.floorId, layout.name, layout.rowCount, layout.colCount, index * 5),
)
