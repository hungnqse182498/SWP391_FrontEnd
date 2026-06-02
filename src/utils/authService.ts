// Authentication Service
import { apiClient, API_ENDPOINTS, type ApiClient } from '../config/api'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      email: string
      userName: string
      fullName: string
      phoneNumber: string
      role: string
    }
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
  success: boolean
  message: string
  data?: {
    id: string
    email: string
    userName: string
    fullName: string
    phoneNumber: string
  }
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  success: boolean
  message: string
  data: {
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

      if (response.success && response.data?.accessToken) {
        this.api.setToken(response.data.accessToken)
        localStorage.setItem('refresh_token', response.data.refreshToken)
        localStorage.setItem('user_email', response.data.user.email)
        localStorage.setItem('user_name', response.data.user.fullName)
        localStorage.setItem('user_role', response.data.user.role)
        return response
      }

      // Handle success: false response
      return {
        success: false,
        message: response.message || 'Login failed',
        data: {
          accessToken: '',
          refreshToken: '',
          user: {
            id: '',
            email: '',
            userName: '',
            fullName: '',
            phoneNumber: '',
            role: '',
          },
        },
      }
    } catch (error) {
      console.error('Login error:', error)
      // Return error response instead of throwing
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      return {
        success: false,
        message: errorMessage,
        data: {
          accessToken: '',
          refreshToken: '',
          user: {
            id: '',
            email: '',
            userName: '',
            fullName: '',
            phoneNumber: '',
            role: '',
          },
        },
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
        success: false,
        message: errorMessage,
      }
    }
  }

  async logout() {
    this.api.clearToken()
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_role')
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) throw new Error('No refresh token found')

      const response = await this.api.post<RefreshTokenResponse>(
        API_ENDPOINTS.AUTH_REFRESH,
        { refreshToken } as RefreshTokenRequest,
      )

      if (response.success && response.data.accessToken) {
        this.api.setToken(response.data.accessToken)
        localStorage.setItem('refresh_token', response.data.refreshToken)
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

    if (!email) return null

    return { email, name: name || email, role: (role as any) || 'user' }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token')
  }
}

export const authService = new AuthService()
