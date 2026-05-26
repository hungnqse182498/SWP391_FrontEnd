import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BookingDraft, BookingRecord, PaymentMethod } from '../types/booking'
import { addHours, calcTotal, PRICE_PER_HOUR } from '../utils/pricing'
import { useAuth } from './AuthContext'

const BOOKINGS_KEY = 'pbms_bookings'

function loadAllBookings(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    return raw ? (JSON.parse(raw) as BookingRecord[]) : []
  } catch {
    return []
  }
}

function saveAllBookings(list: BookingRecord[]) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list))
}

interface BookingContextValue {
  draft: BookingDraft | null
  setDraft: (draft: BookingDraft | null) => void
  bookings: BookingRecord[]
  getAllBookings: () => BookingRecord[]
  getMyBookings: () => BookingRecord[]
  completePayment: (method: PaymentMethod) => BookingRecord | null
  cancelBooking: (id: string) => void
  updateBookingStatus: (id: string, status: BookingRecord['status']) => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [draft, setDraft] = useState<BookingDraft | null>(null)
  const [bookings, setBookings] = useState<BookingRecord[]>(() => loadAllBookings())

  const getMyBookings = useCallback(() => {
    if (!user) return []
    return bookings
      .filter((b) => b.userEmail === user.email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [bookings, user])

  const getAllBookings = useCallback(() => {
    return [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [bookings])

  const completePayment = useCallback(
    (method: PaymentMethod): BookingRecord | null => {
      if (!user || !draft || draft.spots.length === 0) return null

      const endTime = addHours(draft.startTime, draft.hours)
      const total = calcTotal(draft.spots.length, draft.hours)
      const now = new Date().toISOString()

      const record: BookingRecord = {
        id: `BK-${Date.now()}`,
        userEmail: user.email,
        floorId: draft.floorId,
        floorName: draft.floorName,
        spots: draft.spots,
        startTime: draft.startTime,
        endTime,
        hours: draft.hours,
        pricePerHour: PRICE_PER_HOUR,
        totalAmount: total,
        vehiclePlate: draft.vehiclePlate,
        status: 'paid',
        paymentMethod: method,
        createdAt: now,
        paidAt: now,
      }

      const next = [record, ...bookings]
      setBookings(next)
      saveAllBookings(next)
      setDraft(null)
      return record
    },
    [user, draft, bookings],
  )

  const cancelBooking = useCallback((id: string) => {
    setBookings((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b))
      saveAllBookings(next)
      return next
    })
  }, [])

  const updateBookingStatus = useCallback((id: string, status: BookingRecord['status']) => {
    setBookings((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, status } : b))
      saveAllBookings(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      bookings,
      getAllBookings,
      getMyBookings,
      completePayment,
      cancelBooking,
      updateBookingStatus,
    }),
    [draft, bookings, getAllBookings, getMyBookings, completePayment, cancelBooking, updateBookingStatus],
  )

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used within BookingProvider')
  return ctx
}
