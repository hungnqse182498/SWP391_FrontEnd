export const PRICE_PER_HOUR = 15_000

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function calcTotal(spotCount: number, hours: number): number {
  return spotCount * hours * PRICE_PER_HOUR
}

export function addHours(isoStart: string, hours: number): string {
  const d = new Date(isoStart)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}
