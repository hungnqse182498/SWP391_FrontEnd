// Authentication Service
import { apiClient, API_ENDPOINTS, type ApiClient } from '../config/api'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  statusCode: number
  message: string
  isSuccess: boolean
  result?: {
    user: {
      userId: string
      userName: string
      email: string
      fullName: string
      phoneNumber: string
      roleName: string
    }
    accessToken: string
    refreshToken: string
  }
}

export interface RegisterRequest {
  userName: string
  fullName: string
  email: string
  phoneNumber: string
  password: string
  confirmPassword: string
}

export interface RegisterResponse {
  statusCode: number
  message: string
  isSuccess: boolean
  result?: {
    userId: string
    email: string
    userName: string
    fullName: string
    phoneNumber: string
  }
}

export interface RefreshTokenRequest {
  RefreshTokenKey: string
}

export interface RefreshTokenResponse {
  statusCode: number
  message: string
  isSuccess: boolean
  result?: {
    accessToken: string
    refreshToken: string
  }
}

export class AuthService {
  constructor(private api: ApiClient = apiClient) {}

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.api.post<LoginResponse>(
        API_ENDPOINTS.AUTH_LOGIN,
        credentials,
      )

      if (response.isSuccess && response.result?.accessToken) {
        this.api.setToken(response.result.accessToken)
        localStorage.setItem('refresh_token', response.result.refreshToken)
        localStorage.setItem('user_email', response.result.user.email)
        localStorage.setItem('user_name', response.result.user.fullName)
        localStorage.setItem('user_role', response.result.user.roleName)
        localStorage.setItem('user_id', response.result.user.userId)
        localStorage.setItem('user_phone', response.result.user.phoneNumber ?? '')
        return response
      }

      // Handle success: false response
      return {
        statusCode: response.statusCode || 400,
        message: response.message || 'Login failed',
        isSuccess: false,
      }
    } catch (error) {
      console.error('Login error:', error)
      // Return error response instead of throwing
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      return {
        statusCode: 400,
        message: errorMessage,
        isSuccess: false,
      }
    }
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await this.api.post<RegisterResponse>(
        API_ENDPOINTS.AUTH_REGISTER,
        data,
      )
      return response
    } catch (error) {
      console.error('Register error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      return {
        statusCode: 400,
        message: errorMessage,
        isSuccess: false,
      }
    }
  }

  async logout() {
    this.api.clearToken()
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_phone')
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) throw new Error('No refresh token found')

      const response = await this.api.post<RefreshTokenResponse>(
        API_ENDPOINTS.AUTH_REFRESH,
        { RefreshTokenKey: refreshToken } as RefreshTokenRequest,
      )

      if (response.isSuccess && response.result?.accessToken) {
        this.api.setToken(response.result.accessToken)
        localStorage.setItem('refresh_token', response.result.refreshToken)
      }

      return response
    } catch (error) {
      console.error('Refresh token error:', error)
      this.logout()
      throw error
    }
  }

  // Get stored user info
  getStoredUser() {
    const email = localStorage.getItem('user_email')
    const name = localStorage.getItem('user_name')
    const role = localStorage.getItem('user_role')
    const userId = localStorage.getItem('user_id')
    const phone = localStorage.getItem('user_phone')

    if (!email) return null

    return {
      userId,
      email,
      name: name || email,
      role: (role?.toLowerCase() as import('../context/AuthContext').UserRole) || 'user',
      phone: phone || undefined,
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token')
  }
}

export const authService = new AuthService()
