import { AlertCircle, ArrowLeft, Lock, Mail, User, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import { useAuth } from '../context/AuthContext'

const LOGO_SRC = '/image/logo.png'

export default function Register() {
  const { register, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) {
    if (user?.role === 'staff') return <Navigate to="/staff/dashboard" replace />
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/dat-cho" replace />
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const result = register(name, email, password, confirmPassword)
    if (result.ok) navigate('/dat-cho')
    else setError(result.message)
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={LOGO_SRC} alt="EasyParking" className="auth-logo" />
          <h1>Đăng ký</h1>
          <p>Tạo tài khoản người dùng để đặt chỗ đỗ xe trước. Tài khoản nhân viên và quản trị viên đã có sẵn.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField label="Họ và tên" name="name" id="name" type="text" icon={User} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" />
          <FormField label="Email" name="reg-email" id="reg-email" type="email" icon={Mail} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          <FormField label="Mật khẩu" name="reg-password" id="reg-password" type="password" icon={Lock} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
          <FormField label="Xác nhận mật khẩu" name="confirm-password" id="confirm-password" type="password" icon={Lock} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu" />
          {error && <p className="form-error form-error--row"><AlertCircle size={16} strokeWidth={2} aria-hidden />{error}</p>}
          <button type="submit" className="btn btn-primary btn-block"><UserPlus size={18} strokeWidth={2} aria-hidden />Đăng ký</button>
        </form>
        <p className="auth-switch">Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link></p>
        <p className="auth-footer-link"><Link to="/"><ArrowLeft size={16} strokeWidth={2} aria-hidden />Về trang chủ</Link></p>
      </div>
    </section>
  )
}
