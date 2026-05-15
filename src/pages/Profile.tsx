import { motion } from 'framer-motion'
import { Mail, MapPin, Phone, Save, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import FormField from '../components/FormField'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../context/AuthContext'

function ProfileContent() {
  const { user, profile, updateProfile } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [plate, setPlate] = useState(profile?.vehiclePlate ?? '')
  const [address, setAddress] = useState(profile?.address ?? '')
  const [saved, setSaved] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    updateProfile({ name, phone, vehiclePlate: plate, address })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="profile-page">
      <header className="page-header">
        <div>
          <h1>Thông tin cá nhân</h1>
          <p>Cập nhật hồ sơ và biển số xe mặc định khi đặt chỗ.</p>
        </div>
      </header>

      <motion.form
        className="profile-form card-panel"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-email">
          <Mail size={18} strokeWidth={2} aria-hidden />
          <span>{user?.email}</span>
        </div>

        <FormField label="Họ và tên" name="name" id="p-name" icon={User} value={name} onChange={(e) => setName(e.target.value)} required />
        <FormField label="Số điện thoại" name="phone" id="p-phone" type="tel" icon={Phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
        <FormField label="Biển số xe" name="plate" id="p-plate" icon={User} value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="51A-12345" />
        <div className="form-field">
          <label htmlFor="p-address">
            <MapPin size={16} strokeWidth={2} aria-hidden /> Địa chỉ
          </label>
          <textarea
            id="p-address"
            className="input-standalone textarea"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {saved && <p className="alert-inline">Đã lưu thông tin.</p>}

        <button type="submit" className="btn btn-primary btn-block">
          <Save size={18} strokeWidth={2} aria-hidden />
          Lưu thay đổi
        </button>
      </motion.form>
    </section>
  )
}

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
