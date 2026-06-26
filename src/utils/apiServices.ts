import { apiClient } from '../config/api'

export interface ApiResponse<T = unknown> {
  statusCode: number
  message: string
  isSuccess: boolean
  result?: T
}

export interface UserDto {
  userId: string
  userName: string
  email: string
  fullName: string
  phoneNumber: string
  status: string
  roleName: string
  createdAt: string
  updatedAt: string
}

export interface VehicleTypeDto {
  vehicleTypeId: string
  typeName: string
}

export interface CreateReservationResponse {
  reservationId: string
  paymentId: string
  depositAmount: number
  paymentLinkId: string
  paymentUrl: string
  orderCode: string
}

export interface ReservationDto {
  reservationId: string
  userId: string
  vehicleTypeId: string
  expectedEntryTime: string
  status: string
  createdAt?: string
  licensePlate?: string
  user?: {
    fullName?: string
    email?: string
    phoneNumber?: string
  }
  vehicleType?: { typeName: string }
  payments?: Array<{ amount: number; paymentStatus: string }>
  parkingSessions?: ParkingSessionDto[]
}

export interface MonthlySubscriptionDto {
  subscriptionId: string
  userId: string
  vehicleTypeId: string
  vehicleTypeName?: string
  licensePlate: string
  startDate: string
  endDate: string
  price: number
  status: string
}

export interface ParkingFeePreview {
  sessionId: string
  licensePlate: string
  entryTime: string
  exitTime: string
  totalHours: number
  amount: number
}

export interface ParkingSessionDto {
  sessionId: string
  cardId?: string
  cardCode?: string
  driverUserId?: string
  driverFullName?: string
  licensePlateIn: string
  licensePlateOut?: string
  entryImageUrl?: string
  exitImageUrl?: string
  vehicleTypeId: string
  vehicleTypeName?: string
  entryTime: string
  exitTime?: string
  entryGateId: string
  entryGateName?: string
  exitGateId?: string
  exitGateName?: string
  assignedSlotId?: string
  assignedSlotCode?: string
  actualSlotId?: string
  actualSlotCode?: string
  status: string
}

export const profileApi = {
  get: () => apiClient.get<ApiResponse<UserDto>>('/profile'),
  update: (data: { fullName?: string; phoneNumber?: string; password?: string }) =>
    apiClient.put<ApiResponse<UserDto>>('/profile', data),
}

export const reservationApi = {
  create: (data: {
    expectedEntryTime: string
    vehicleTypeName: string
    licensePlate: string
  }) => apiClient.post<ApiResponse<CreateReservationResponse>>('/reservations', data),

  getMy: () => apiClient.get<ApiResponse<ReservationDto[]>>('/reservations/my-reservations'),

  getAll: (params?: { status?: string; date?: string }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.date) query.set('date', params.date)
    const q = query.toString()
    return apiClient.get<ApiResponse<ReservationDto[]>>(`/reservations${q ? `?${q}` : ''}`)
  },

  cancel: (id: string) => apiClient.put<ApiResponse>(`/reservations/${id}/cancel`),

  changeTime: (id: string, newExpectedTime: string) =>
    apiClient.put<ApiResponse>(`/reservations/${id}/change-time`, newExpectedTime),

  recreatePayment: (id: string) =>
    apiClient.post<ApiResponse<CreateReservationResponse>>(`/reservations/${id}/recreate-payment`),

  checkPayment: (orderCode: string) =>
    apiClient.get<ApiResponse>(`/reservations/check-payment-status/${orderCode}`),
}

export const subscriptionApi = {
  subscribe: (data: {
    vehicleTypeName: string
    licensePlate: string
    months: number
    price: number
    preferredSlotId?: string
    preferredFloorName?: string
    preferredSlotLabel?: string
  }) => apiClient.post<ApiResponse<MonthlySubscriptionDto>>('/MonthlySubscription/subscribe', data),

  getMy: () => apiClient.get<ApiResponse<MonthlySubscriptionDto[]>>('/MonthlySubscription/my'),
}

export const vehicleTypeApi = {
  getAll: () => apiClient.get<ApiResponse<VehicleTypeDto[]>>('/VehicleType'),
}

export const parkingOperationApi = {
  guestCheckIn: (data: {
    licensePlate: string
    vehicleTypeId: string
    gateName: string
    cardCode?: string
  }) => apiClient.post<ApiResponse>('/ParkingOperation/guest/check-in', data),

  guestCheckOutPreview: (data: { licensePlate?: string; cardCode?: string }) =>
    apiClient.post<ApiResponse<ParkingFeePreview>>('/ParkingOperation/guest/check-out/preview', data),

  guestCheckOut: (data: {
    licensePlate?: string
    cardCode?: string
    gateName: string
    paymentMethod: string
  }) => apiClient.post<ApiResponse>('/ParkingOperation/guest/check-out', data),

  residentCheckIn: (data: {
    licensePlate: string
    vehicleTypeId: string
    gateName: string
    cardCode?: string
  }) => apiClient.post<ApiResponse>('/ParkingOperation/resident/check-in', data),

  residentCheckOut: (data: {
    licensePlate?: string
    cardCode?: string
    gateName: string
  }) => apiClient.post<ApiResponse>('/ParkingOperation/resident/check-out', data),

  getAvailability: (vehicleTypeId?: string, floorKeyword?: string) => {
    const params = new URLSearchParams()
    if (vehicleTypeId) params.set('vehicleTypeId', vehicleTypeId)
    if (floorKeyword) params.set('floorKeyword', floorKeyword)
    const q = params.toString()
    return apiClient.get<ApiResponse>(`/ParkingOperation/availability${q ? `?${q}` : ''}`)
  },
}

export const parkingSessionApi = {
  getAll: () => apiClient.get<ApiResponse<ParkingSessionDto[]>>('/ParkingSession'),
}
