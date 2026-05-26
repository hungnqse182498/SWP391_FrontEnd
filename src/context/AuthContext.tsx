import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
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
  login: (email: string, password: string) => boolean
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => RegisterResult
  updateProfile: (data: Partial<UserProfile>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const DEMO_USER: AuthUser = {
  email: 'user@easyparking.vn',
  name: 'Nguyễn Văn A',
  role: 'user',
}

function profileKey(email: string) {
  return `pbms_profile_${email}`
}

const PREDEFINED_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = {
  staff: {
    password: '1',
    user: { email: 'staff', name: 'Parking Staff', role: 'staff' },
  },
  'staff@easyparking.vn': {
    password: '1',
    user: { email: 'staff@easyparking.vn', name: 'Parking Staff', role: 'staff' },
  },
  manager: {
    password: '1',
    user: { email: 'manager', name: 'Quản lý bãi', role: 'manager' },
  },
  'manager@easyparking.vn': {
    password: '1',
    user: { email: 'manager@easyparking.vn', name: 'Quản lý bãi', role: 'manager' },
  },
  admin: {
    password: '1',
    user: { email: 'admin', name: 'Quản trị viên', role: 'admin' },
  },
  'admin@easyparking.vn': {
    password: '1',
    user: { email: 'admin@easyparking.vn', name: 'Quản trị viên', role: 'admin' },
  },
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
    const saved = sessionStorage.getItem('pbms_user')
    return saved ? (JSON.parse(saved) as AuthUser) : null
  })

  const [profile, setProfile] = useState<UserProfile | null>(() =>
    user ? loadProfile(user.email, user.name) : null,
  )

  const persistUser = useCallback((authUser: AuthUser) => {
    sessionStorage.setItem('pbms_user', JSON.stringify(authUser))
    setUser(authUser)
    setProfile(loadProfile(authUser.email, authUser.name))
  }, [])

  const login = useCallback(
    (email: string, password: string) => {
      if (!email.trim() || !password.trim()) return false
      const normalizedEmail = email.trim().toLowerCase()
      const account = PREDEFINED_ACCOUNTS[normalizedEmail]
      if (account) {
        if (password === account.password) {
          persistUser(account.user)
          return true
        }
        return false
      }
      persistUser({
        email: email.trim(),
        name: email.split('@')[0] ?? 'Người dùng',
        role: 'user',
      })
      return true
    },
    [persistUser],
  )

  const register = useCallback(
    (name: string, email: string, password: string, confirmPassword: string): RegisterResult => {
      const trimmedName = name.trim()
      const trimmedEmail = email.trim()
      if (!trimmedName) return { ok: false, message: 'Vui lòng nhập họ và tên.' }
      if (!trimmedEmail) return { ok: false, message: 'Vui lòng nhập email.' }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return { ok: false, message: 'Email không hợp lệ.' }
      }
      if (password.length < 6) return { ok: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' }
      if (password !== confirmPassword) {
        return { ok: false, message: 'Mật khẩu xác nhận không khớp.' }
      }
      persistUser({ email: trimmedEmail, name: trimmedName, role: 'user' })
      const p = loadProfile(trimmedEmail, trimmedName)
      localStorage.setItem(profileKey(trimmedEmail), JSON.stringify(p))
      return { ok: true, message: '' }
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
          sessionStorage.setItem('pbms_user', JSON.stringify(updatedUser))
          setUser(updatedUser)
        }
        return next
      })
    },
    [user],
  )

  const logout = useCallback(() => {
    sessionStorage.removeItem('pbms_user')
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      isAuthenticated: user !== null,
      login,
      register,
      updateProfile,
      logout,
    }),
    [user, profile, login, register, updateProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
