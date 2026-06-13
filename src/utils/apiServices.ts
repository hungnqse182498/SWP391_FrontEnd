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
  vehicleType?: { typeName: string }
  payments?: Array<{ amount: number; paymentStatus: string }>
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

  cancel: (id: string) => apiClient.put<ApiResponse>(`/reservations/${id}/cancel`),

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
    cardCode: string
  }) => apiClient.post<ApiResponse>('/ParkingOperation/guest/check-in', data),

  guestCheckOutPreview: (data: { licensePlate?: string; cardCode?: string }) =>
    apiClient.post<ApiResponse<ParkingFeePreview>>('/ParkingOperation/guest/check-out/preview', data),

  guestCheckOut: (data: {
    licensePlate?: string
    cardCode: string
    gateName: string
    paymentMethod: string
  }) => apiClient.post<ApiResponse>('/ParkingOperation/guest/check-out', data),

  residentCheckIn: (data: {
    licensePlate: string
    vehicleTypeId: string
    gateName: string
    cardCode: string
  }) => apiClient.post<ApiResponse>('/ParkingOperation/resident/check-in', data),

  residentCheckOut: (data: {
    licensePlate?: string
    cardCode: string
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
