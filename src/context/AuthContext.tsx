import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService, type RegisterRequest } from '../utils/authService'
import { profileApi } from '../utils/apiServices'
import type { UserProfile } from '../types/profile'

export type UserRole = 'guest' | 'user' | 'customer' | 'staff' | 'manager' | 'admin'

export interface AuthUser {
  userId?: string
  email: string
  name: string
  role: UserRole
  phone?: string
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
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>
  refreshProfile: () => Promise<void>
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

        if (response.isSuccess && response.result) {
          const { user: backendUser } = response.result
          persistUser({
            userId: backendUser.userId,
            email: backendUser.email,
            name: backendUser.fullName,
            phone: backendUser.phoneNumber,
            role: (backendUser.roleName.toLowerCase() as UserRole) || 'user',
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

        if (response.isSuccess) {
          // Auto login after successful registration
          try {
            const loginResponse = await authService.login({
              email: trimmedEmail,
              password,
            })

            if (loginResponse.isSuccess && loginResponse.result) {
              const { user: backendUser } = loginResponse.result
              persistUser({
                userId: backendUser.userId,
                email: backendUser.email,
                name: backendUser.fullName,
                phone: backendUser.phoneNumber,
                role: (backendUser.roleName.toLowerCase() as UserRole) || 'user',
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

  const refreshProfile = useCallback(async () => {
    if (!user) return
    try {
      const res = await profileApi.get()
      if (res.isSuccess && res.result) {
        const u = res.result
        setProfile((prev) => {
          const nextProfile = {
            email: u.email,
            name: u.fullName,
            phone: u.phoneNumber ?? '',
            vehiclePlate: prev?.vehiclePlate ?? '',
            address: prev?.address ?? '',
          }
          localStorage.setItem(profileKey(u.email), JSON.stringify(nextProfile))
          return nextProfile
        })
        setUser((prev) =>
          prev
            ? {
                ...prev,
                userId: u.userId,
                name: u.fullName,
                phone: u.phoneNumber,
                role: (u.roleName.toLowerCase() as UserRole) || prev.role,
              }
            : prev,
        )
        localStorage.setItem('user_name', u.fullName)
        localStorage.setItem('user_role', u.roleName)
        localStorage.setItem('user_phone', u.phoneNumber ?? '')
        if (u.userId) localStorage.setItem('user_id', u.userId)
      }
    } catch (error) {
      console.error('Refresh profile error:', error)
    }
  }, [user])

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>): Promise<boolean> => {
      if (!user) return false
      try {
        const res = await profileApi.update({
          fullName: data.name,
          phoneNumber: data.phone,
        })
        if (res.isSuccess && res.result) {
          const u = res.result
          const nextProfile = {
            email: u.email || user.email,
            name: u.fullName,
            phone: u.phoneNumber ?? '',
            vehiclePlate: data.vehiclePlate ?? profile?.vehiclePlate ?? '',
            address: data.address ?? profile?.address ?? '',
          }
          setProfile(nextProfile)
          setUser((prev) =>
            prev ? { ...prev, name: u.fullName, phone: u.phoneNumber } : prev,
          )
          localStorage.setItem(profileKey(nextProfile.email), JSON.stringify(nextProfile))
          localStorage.setItem('user_name', u.fullName)
          localStorage.setItem('user_phone', u.phoneNumber ?? '')
          return true
        }
        return false
      } catch (error) {
        console.error('Update profile error:', error)
        return false
      }
    },
    [user, profile],
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
      refreshProfile,
      logout,
    }),
    [user, profile, isLoading, login, register, updateProfile, refreshProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
