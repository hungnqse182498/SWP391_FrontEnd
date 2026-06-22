/**
 * Cấu hình lưới chỗ đỗ do Admin/Manager nhập (mock — sau này lấy từ API).
 * Mỗi tầng có số hàng (row) và số cột (col) riêng.
 */
export interface FloorLayoutConfig {
  floorId: number
  name: string
  rowCount: number
  colCount: number
}

export const MOCK_FLOOR_LAYOUTS: FloorLayoutConfig[] = [
  { floorId: 1, name: 'Tầng B1', rowCount: 4, colCount: 8 },
  { floorId: 2, name: 'Tầng B2', rowCount: 6, colCount: 10 },
  { floorId: 3, name: 'Tầng B3', rowCount: 8, colCount: 12 },
]

export function rowLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i))
}

export function spotLabel(row: string, col: number): string {
  return `${row}${col}`
}
