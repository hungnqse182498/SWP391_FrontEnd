import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { XCircle } from 'lucide-react'

export default function PaymentCancel() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Lấy mã đơn hàng từ URL để hiển thị cho user biết chính xác đơn nào bị hủy
  const orderCode = searchParams.get('orderCode')

  return (
    <section className="booking-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <motion.div 
        className="card-panel" 
        style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px 20px' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <XCircle size={64} style={{ color: '#e74c3c' }} />
        </div>
        
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#e74c3c' }}>Thanh Toán Bị Hủy</h1>
        <p className="muted-text" style={{ marginBottom: '24px' }}>
          {orderCode ? (
            <>Giao dịch cho đơn hàng <strong>#{orderCode}</strong> đã bị hủy.</>
          ) : (
            'Giao dịch thanh toán đã bị hủy hoặc không thể hoàn tất.'
          )}
          <br />
          <span style={{ fontSize: '14px', display: 'block', marginTop: '8px' }}>
            Tài khoản ngân hàng của bạn chưa bị trừ tiền.
          </span>
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/dat-cho')}>
            Thử đặt chỗ lại
          </button>
          <button type="button" className="btn btn-block" style={{ border: '1px solid #ccc', background: '#fff' }} onClick={() => navigate('/')}>
            Quay về trang chủ
          </button>
        </div>
      </motion.div>
    </section>
  )
}