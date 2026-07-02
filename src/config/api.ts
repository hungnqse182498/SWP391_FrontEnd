// API Configuration for Backend Connection
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5264/api'

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
}

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_REFRESH: '/auth/refresh-token',
  AUTH_LOGOUT: '/auth/logout',

  // Users (profile — legacy paths)
  USERS_GET_PROFILE: '/users/profile',
  USERS_UPDATE_PROFILE: '/users/profile',
  USERS_LIST: '/users',

  // User management (admin)
  USER_GET_ALL: '/User/all',
  USER_GET_ROLES: '/User/roles',
  USER_CREATE: '/User/create',
  USER_UPDATE: '/User/update',
  USER_DELETE: '/User',
  USER_STATUS: '/User',

  // Floors
  FLOORS_GET_ALL: '/floors',
  FLOORS_GET_BY_ID: '/floors/:id',
  FLOORS_CREATE: '/floors',
  FLOORS_UPDATE: '/floors/:id',
  FLOORS_DELETE: '/floors/:id',

  // Parking Slots
  SLOTS_GET_ALL: '/parking-slots',
  SLOTS_GET_BY_FLOOR: '/parking-slots/floor/:floorId',
  SLOTS_UPDATE: '/parking-slots/:id',

  // Vehicle Types
  VEHICLE_TYPES_GET_ALL: '/vehicle-types',
  VEHICLE_TYPES_CREATE: '/vehicle-types',
  VEHICLE_TYPES_UPDATE: '/vehicle-types/:id',

  // Parking Sessions
  SESSIONS_CREATE: '/parking-sessions',
  SESSIONS_GET: '/parking-sessions/:id',
  SESSIONS_CHECKOUT: '/parking-sessions/:id/checkout',

  // Pricing
  PRICING_GET: '/pricing-policies',
  PRICING_UPDATE: '/pricing-policies/:id',
}

export class ApiRequestError extends Error {
  statusCode: number
  data: unknown
  response: { status: number; data: unknown }

  constructor(statusCode: number, message: string, data: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.statusCode = statusCode
    this.data = data
    this.response = { status: statusCode, data }
  }
}

// API Client Class
export class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl
    this.loadToken()
  }

  // Load token from localStorage
  private loadToken() {
    this.token = localStorage.getItem('auth_token')
  }

  // Set token
  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  // Clear token
  clearToken() {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  // Get headers with authorization
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  // Generic request method
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: unknown,
    _isRetry = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers = this.getHeaders()
    if (data instanceof FormData) {
      delete headers['Content-Type']
    }

    const options: RequestInit = {
      method,
      headers,
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      if (data instanceof FormData) {
        options.body = data
      } else {
        options.body = JSON.stringify(data)
      }
    }

    try {
      const response = await fetch(url, options)

      // ── 401 Unauthorized → attempt token refresh BEFORE other error handling ──
      if (response.status === 401 && !_isRetry) {
        try {
          const { authService } = await import('../utils/authService')
          const refreshResult = await authService.refreshToken()

          if (refreshResult.isSuccess && refreshResult.result?.accessToken) {
            this.setToken(refreshResult.result.accessToken)
            // Retry the original request once with the new token
            return this.request<T>(method, endpoint, data, true)
          }
        } catch (e) {
          console.error('Token refresh failed:', e)
        }

        // Refresh failed or returned no token → clear session and redirect
        this.clearToken()
        window.location.href = '/dang-nhap'
        throw new Error('Session expired. Redirecting to login.')
      }

      // ── Handle all other non-OK responses ──
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (response.status === 422 && contentType?.includes('application/json')) {
          return (await response.json()) as T
        }

        if (contentType?.includes('application/json')) {
          const errorBody = await response.json()
          const message =
            typeof errorBody?.message === 'string'
              ? errorBody.message
              : `HTTP ${response.status}`
          throw new ApiRequestError(response.status, message, errorBody)
        }

        const error = await response.text()
        throw new ApiRequestError(response.status, error || `HTTP ${response.status}`, error)
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return (await response.json()) as T
      }

      return response.text() as unknown as T
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error)
      throw error
    }
  }

  // Convenience methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint)
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, data)
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, data)
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint)
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>('PATCH', endpoint, data)
  }
}

// Create a default API client instance
export const apiClient = new ApiClient()
