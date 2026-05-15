import type { ParkingFloor, ParkingSpot, SpotStatus } from '../types/parking'

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const COLS = 12

function seedStatus(row: string, col: number, offset: number): SpotStatus {
  const hash = (row.charCodeAt(0) * 17 + col * 31 + offset) % 100
  if (hash < 12) return 'occupied'
  if (hash < 18) return 'reserved'
  if (hash < 22) return 'disabled'
  return 'available'
}

function spotType(row: string, col: number): ParkingSpot['type'] {
  if (row === 'A' && col <= 2) return 'handicap'
  if (col >= 11) return 'ev'
  return 'standard'
}

function buildFloor(id: number, name: string, offset: number): ParkingFloor {
  const spots: ParkingSpot[] = []
  for (const row of ROWS) {
    for (let col = 1; col <= COLS; col++) {
      spots.push({
        id: `F${id}-${row}${col}`,
        row,
        number: col,
        status: seedStatus(row, col, offset),
        type: spotType(row, col),
      })
    }
  }
  return { id, name, rows: ROWS, cols: COLS, spots }
}

export const parkingFloors: ParkingFloor[] = [
  buildFloor(1, 'Tầng B1', 0),
  buildFloor(2, 'Tầng B2', 3),
  buildFloor(3, 'Tầng B3', 7),
]
