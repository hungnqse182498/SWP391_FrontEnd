import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type UserRole = 'guest' | 'user' | 'admin'

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
  isAuthenticated: boolean
  login: (email: string, password: string) => boolean
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => RegisterResult
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_USER: AuthUser = {
  email: 'user@parkease.vn',
  name: 'Nguyễn Văn A',
  role: 'user',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = sessionStorage.getItem('pbms_user')
    return saved ? (JSON.parse(saved) as AuthUser) : null
  })

  const persistUser = useCallback((authUser: AuthUser) => {
    sessionStorage.setItem('pbms_user', JSON.stringify(authUser))
    setUser(authUser)
  }, [])

  const login = useCallback(
    (email: string, password: string) => {
      if (!email.trim() || !password.trim()) return false
      const authUser: AuthUser = {
        email: email.trim(),
        name: email.split('@')[0] ?? 'Người dùng',
        role: 'user',
      }
      persistUser(authUser)
      return true
    },
    [persistUser],
  )

  const register = useCallback(
    (name: string, email: string, password: string, confirmPassword: string): RegisterResult => {
      const trimmedName = name.trim()
      const trimmedEmail = email.trim()

      if (!trimmedName) {
        return { ok: false, message: 'Vui lòng nhập họ và tên.' }
      }
      if (!trimmedEmail) {
        return { ok: false, message: 'Vui lòng nhập email.' }
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return { ok: false, message: 'Email không hợp lệ.' }
      }
      if (password.length < 6) {
        return { ok: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' }
      }
      if (password !== confirmPassword) {
        return { ok: false, message: 'Mật khẩu xác nhận không khớp.' }
      }

      const authUser: AuthUser = {
        email: trimmedEmail,
        name: trimmedName,
        role: 'user',
      }
      persistUser(authUser)
      return { ok: true, message: '' }
    },
    [persistUser],
  )

  const logout = useCallback(() => {
    sessionStorage.removeItem('pbms_user')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { DEMO_USER }
