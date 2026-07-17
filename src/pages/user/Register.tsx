import { AlertCircle, ArrowLeft, KeyRound, Lock, Mail, Phone, User, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import FormField from '../../components/FormField'
import { useAuth } from '../../context/AuthContext'

const LOGO_SRC = '/image/logo.png'

export default function Register() {
  const { register, verifyRegisterOtp, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (isAuthenticated) return <Navigate to="/dat-cho" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')

    try {
      if (otpSent) {
        const result = await verifyRegisterOtp(email, otp, password)
        if (result.ok) {
          navigate(result.authenticated ? '/dat-cho' : '/dang-nhap', {
            replace: true,
            state: result.authenticated ? undefined : { message: result.message },
          })
        } else {
          setError(result.message)
        }
        return
      }

      const result = await register(userName, fullName, email, phoneNumber, password, confirmPassword)
      if (result.ok) {
        setOtpSent(true)
        setNotice(result.message)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('Lỗi đăng ký. Vui lòng thử lại.')
      console.error('Register error:', err)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src={LOGO_SRC} alt="EasyParking" className="auth-logo" />
          <h1>{otpSent ? 'Xác nhận email' : 'Đăng ký'}</h1>
          <p>
            {otpSent
              ? `Nhập mã OTP 6 chữ số đã gửi đến ${email.trim()}.`
              : 'Tạo tài khoản người dùng để đặt chỗ đỗ xe trước.'}
          </p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {otpSent ? (
            <>
              <FormField label="Mã OTP" name="otp" id="otp" type="text" icon={KeyRound} autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Nhập 6 chữ số" disabled={isLoading} />
              <button type="button" className="btn btn-ghost btn-block" disabled={isLoading} onClick={() => { setOtpSent(false); setOtp(''); setError(''); setNotice('') }}>
                Sửa thông tin đăng ký
              </button>
            </>
          ) : (
            <>
              <FormField label="Tên đăng nhập" name="userName" id="userName" type="text" icon={User} autoComplete="username" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="username123" disabled={isLoading} />
              <FormField label="Họ và tên" name="fullName" id="fullName" type="text" icon={User} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" disabled={isLoading} />
              <FormField label="Email" name="email" id="email" type="email" icon={Mail} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" disabled={isLoading} />
              <FormField label="Số điện thoại" name="phoneNumber" id="phoneNumber" type="tel" icon={Phone} autoComplete="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))} placeholder="0912345678" disabled={isLoading} />
              <FormField label="Mật khẩu" name="password" id="password" type="password" icon={Lock} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" disabled={isLoading} />
              <FormField label="Xác nhận mật khẩu" name="confirmPassword" id="confirmPassword" type="password" icon={Lock} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu" disabled={isLoading} />
            </>
          )}
          {notice && <p className="form-success form-success--row">{notice}</p>}
          {error && <p className="form-error form-error--row"><AlertCircle size={16} strokeWidth={2} aria-hidden />{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
            {otpSent ? <KeyRound size={18} strokeWidth={2} aria-hidden /> : <UserPlus size={18} strokeWidth={2} aria-hidden />}
            {isLoading ? 'Đang xử lý...' : otpSent ? 'Xác nhận OTP' : 'Gửi mã OTP'}
          </button>
        </form>
        <p className="auth-switch">Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link></p>
        <p className="auth-footer-link"><Link to="/"><ArrowLeft size={16} strokeWidth={2} aria-hidden />Về trang chủ</Link></p>
      </div>
    </section>
  )
}
