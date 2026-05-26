import { useState } from 'react'
import StaffLayout from '../../components/StaffLayout'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Car, LogOut, AlertCircle } from 'lucide-react'

interface StaffMenuItem {
  id: string
  label: string
  icon: React.ReactNode
}

const menuItems: StaffMenuItem[] = [
  { id: 'scan', label: 'Quét biển số', icon: <Smartphone size={18} /> },
  {
    id: 'checkin',
    label: 'Tạo lượt gửi xe',
    icon: <Car size={18} />,
  },
  {
    id: 'checkout',
    label: 'Xử lý xe ra bãi',
    icon: <LogOut size={18} />,
  },
  {
    id: 'exception',
    label: 'Xử lý ngoại lệ',
    icon: <AlertCircle size={18} />,
  },
]

export default function Exception() {
  const navigate = useNavigate()
  const [exceptionType, setExceptionType] = useState('lost-card')

  const exceptionTypes = [
    { id: 'lost-card', label: 'Mất thẻ xe' },
    { id: 'wrong-info', label: 'Sai thông tin xe' },
    { id: 'overdue', label: 'Xe quá hạn gửi' },
    { id: 'wrong-zone', label: 'Xe gửi sai khu vực' },
  ]

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <StaffLayout items={menuItems} activeItem="exception" onSelectItem={(id) => {
        if (id === 'scan') navigate('/staff/scan-plate')
        else if (id === 'checkin') navigate('/staff/create-session')
        else if (id === 'checkout') navigate('/staff/checkout')
        else if (id === 'exception') navigate('/staff/exception')
      }}>
        <div className="staff-content-wrapper">
          <div className="staff-section">
            <h2>Xử lý ngoại lệ</h2>
            <p className="section-desc">Mất thẻ xe, sai thông tin xe, xe quá hạn gửi, xe gửi sai khu vực, cập nhật trạng thái slot.</p>

            <div className="staff-exception-grid">
              {exceptionTypes.map((exc) => (
                <button
                  key={exc.id}
                  type="button"
                  className={`exception-card card-panel ${exceptionType === exc.id ? 'active' : ''}`}
                  onClick={() => setExceptionType(exc.id)}
                >
                  <AlertCircle size={24} />
                  <h3>{exc.label}</h3>
                </button>
              ))}
            </div>

            <div className="exception-form card-panel">
              <h3>Điền thông tin xử lý</h3>
              <div className="form-field">
                <label htmlFor="exception-plate">Biển số xe</label>
                <input
                  id="exception-plate"
                  type="text"
                  className="input-standalone"
                  placeholder="51A-12345"
                />
              </div>

              <div className="form-field">
                <label htmlFor="exception-note">Ghi chú</label>
                <textarea
                  id="exception-note"
                  className="input-standalone textarea"
                  rows={4}
                  placeholder="Mô tả chi tiết sự cố..."
                />
              </div>

              <button type="button" className="btn btn-primary btn-block">
                Gửi báo cáo ngoại lệ
              </button>
            </div>
          </div>

          
        </div>
      </StaffLayout>
    </ProtectedRoute>
  )
}
