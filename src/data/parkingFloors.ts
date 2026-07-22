import type { ParkingFloor, ParkingSpot } from '../types/parking'
import { MOCK_FLOOR_LAYOUTS, rowLabels } from './parkingLayoutConfig'

function buildFloorFromLayout(
  floorId: number,
  name: string,
  rowCount: number,
  colCount: number,
): ParkingFloor {
  const rows = rowLabels(rowCount)
  const spots: ParkingSpot[] = []

  rows.forEach((row) => {
    for (let col = 1; col <= colCount; col++) {
      spots.push({
        id: `F${floorId}-${row}${col}`,
        row,
        number: col,
        status: 'available',
        type: 'standard',
      })
    }
  })

  return { id: floorId, name, rows, cols: colCount, spots }
}

export const parkingFloors: ParkingFloor[] = MOCK_FLOOR_LAYOUTS.map((layout) =>
  buildFloorFromLayout(layout.floorId, layout.name, layout.rowCount, layout.colCount),
)
