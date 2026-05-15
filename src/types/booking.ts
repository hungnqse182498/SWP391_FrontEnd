export type BookingStatus = 'pending_payment' | 'paid' | 'cancelled' | 'completed'

export type PaymentMethod = 'momo' | 'vnpay' | 'card'

export interface BookingSpot {
  id: string
  label: string
  row: string
  number: number
  type: string
}

export interface BookingRecord {
  id: string
  userEmail: string
  floorId: number
  floorName: string
  spots: BookingSpot[]
  startTime: string
  endTime: string
  hours: number
  pricePerHour: number
  totalAmount: number
  vehiclePlate: string
  status: BookingStatus
  paymentMethod?: PaymentMethod
  createdAt: string
  paidAt?: string
}

export interface BookingDraft {
  floorId: number
  floorName: string
  spots: BookingSpot[]
  startTime: string
  hours: number
  vehiclePlate: string
}
