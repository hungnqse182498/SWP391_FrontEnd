import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService, type RegisterRequest } from '../utils/authService'
import type { UserProfile } from '../types/profile'

export type UserRole = 'guest' | 'user' | 'staff' | 'manager' | 'admin'

export interface AuthUser {
  email: string
  name: string
  role: UserRole
}

export interface RegisterResult {
  ok: boolean
  message: string
}

interface AuthContextValue {
  user: AuthUser | null
  profile: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (
    userName: string,
    fullName: string,
    email: string,
    phoneNumber: string,
    password: string,
    confirmPassword: string,
  ) => Promise<RegisterResult>
  updateProfile: (data: Partial<UserProfile>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Default user for demo
export const DEMO_USER: AuthUser = {
  email: 'user@easyparking.vn',
  name: 'Nguyễn Văn A',
  role: 'user',
}

function profileKey(email: string) {
  return `pbms_profile_${email}`
}

function loadProfile(email: string, name: string): UserProfile {
  const saved = localStorage.getItem(profileKey(email))
  if (saved) return JSON.parse(saved) as UserProfile
  return {
    email,
    name,
    phone: '',
    vehiclePlate: '51A-12345',
    address: '',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser = authService.getStoredUser()
    return storedUser as AuthUser | null
  })

  const [profile, setProfile] = useState<UserProfile | null>(() =>
    user ? loadProfile(user.email, user.name) : null,
  )

  const [isLoading, setIsLoading] = useState(false)

  const persistUser = useCallback((authUser: AuthUser) => {
    setUser(authUser)
    setProfile(loadProfile(authUser.email, authUser.name))
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!email.trim() || !password.trim()) return false

      setIsLoading(true)
      try {
        const response = await authService.login({
          email: email.trim(),
          password: password.trim(),
        })

        if (response.success && response.data) {
          const { user: backendUser } = response.data
          persistUser({
            email: backendUser.email,
            name: backendUser.fullName,
            role: (backendUser.role.toLowerCase() as UserRole) || 'user',
          })
          return true
        }

        return false
      } catch (error) {
        console.error('Login error:', error)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [persistUser],
  )

  const register = useCallback(
    async (
      userName: string,
      fullName: string,
      email: string,
      phoneNumber: string,
      password: string,
      confirmPassword: string,
    ): Promise<RegisterResult> => {
      const trimmedUserName = userName.trim()
      const trimmedName = fullName.trim()
      const trimmedEmail = email.trim()
      const trimmedPhone = phoneNumber.trim()

      if (!trimmedUserName) return { ok: false, message: 'Vui lòng nhập tên đăng nhập.' }
      if (!trimmedName) return { ok: false, message: 'Vui lòng nhập họ và tên.' }
      if (!trimmedEmail) return { ok: false, message: 'Vui lòng nhập email.' }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return { ok: false, message: 'Email không hợp lệ.' }
      }
      if (!trimmedPhone) return { ok: false, message: 'Vui lòng nhập số điện thoại.' }
      if (!/^[0-9\s\-\+\(\)]{10,}$/.test(trimmedPhone)) {
        return { ok: false, message: 'Số điện thoại không hợp lệ.' }
      }
      if (password.length < 6) return { ok: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' }
      if (password !== confirmPassword) {
        return { ok: false, message: 'Mật khẩu xác nhận không khớp.' }
      }

      setIsLoading(true)
      try {
        const registerData: RegisterRequest = {
          userName: trimmedUserName,
          fullName: trimmedName,
          email: trimmedEmail,
          phoneNumber: trimmedPhone,
          password,
          confirmPassword,
        }

        const response = await authService.register(registerData)

        if (response.success) {
          // Auto login after successful registration
          try {
            const loginResponse = await authService.login({
              email: trimmedEmail,
              password,
            })

            if (loginResponse.success && loginResponse.data) {
              const { user: backendUser } = loginResponse.data
              persistUser({
                email: backendUser.email,
                name: backendUser.fullName,
                role: (backendUser.role.toLowerCase() as UserRole) || 'user',
              })
              return { ok: true, message: 'Đăng ký thành công! Đang chuyển hướng...' }
            } else {
              return {
                ok: false,
                message: 'Đăng ký thành công! Vui lòng đăng nhập với tài khoản mới.',
              }
            }
          } catch (loginError) {
            console.error('Auto-login after registration failed:', loginError)
            return {
              ok: false,
              message: 'Đăng ký thành công! Vui lòng đăng nhập với tài khoản mới.',
            }
          }
        }

        return { ok: false, message: response.message || 'Đăng ký thất bại.' }
      } catch (error) {
        console.error('Register error:', error)
        return { ok: false, message: 'Lỗi đăng ký. Vui lòng thử lại.' }
      } finally {
        setIsLoading(false)
      }
    },
    [persistUser],
  )

  const updateProfile = useCallback(
    (data: Partial<UserProfile>) => {
      if (!user) return
      setProfile((prev) => {
        const next = { ...(prev ?? loadProfile(user.email, user.name)), ...data, email: user.email }
        localStorage.setItem(profileKey(user.email), JSON.stringify(next))
        if (data.name) {
          const updatedUser = { ...user, name: data.name }
          setUser(updatedUser)
        }
        return next
      })
    },
    [user],
  )

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      updateProfile,
      logout,
    }),
    [user, profile, isLoading, login, register, updateProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
