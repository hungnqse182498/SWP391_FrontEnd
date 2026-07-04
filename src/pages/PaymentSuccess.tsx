import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { reservationApi, type ParkingSessionTicket } from '../utils/apiServices'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<ParkingSessionTicket | null>(null)
  const [reservationId, setReservationId] = useState('')

  // Lấy toàn bộ tham số từ URL của bạn
  const code = searchParams.get('code')
  const status = searchParams.get('status')
  const orderCode = searchParams.get('orderCode')
  const isCancel = searchParams.get('cancel') === 'true'

  useEffect(() => {
    let ignore = false

    // Ép kiểu chữ thường để tránh lỗi lệch Ký tự hoa/thường (PAID vs paid)
    const currentStatus = status?.toUpperCase()

    // ĐIỀU KIỆN ĂN CHẮC: Nếu có code '00' HOẶC status là 'PAID' VÀ người dùng không bấm nút hủy
    if ((code === '00' || currentStatus === 'PAID') && !isCancel) {
      const loadTicket = async () => {
        if (!orderCode) {
          setLoading(false)
          return
        }

        try {
          const res = await reservationApi.checkPayment(orderCode)
          const result = res.result as
            | (typeof res.result & {
                Ticket?: ParkingSessionTicket
                ReservationId?: string
              })
            | undefined

          if (!ignore && res.isSuccess && result) {
            setTicket(result.ticket ?? result.Ticket ?? null)
            setReservationId(result.reservationId ?? result.ReservationId ?? '')
          }
        } catch (err) {
          console.error(err)
        } finally {
          if (!ignore) setLoading(false)
        }
      }

      loadTicket()
    } else {
      // Nếu không thỏa mãn bất kỳ yếu tố thành công nào mới đá về cancel
      navigate(`/payment-cancel?orderCode=${orderCode || ''}`)
    }

    return () => {
      ignore = true
    }
  }, [code, status, orderCode, isCancel, navigate])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontSize: '16px' }}>
        Đang kiểm tra trạng thái giao dịch từ PayOS...
      </div>
    )
  }

  return (
    <section className="booking-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <motion.div 
        className="card-panel" 
        style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px 20px' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <CheckCircle size={64} style={{ color: '#2ecc71' }} />
        </div>
        
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#2ecc71' }}>Thanh Toán Thành Công!</h1>
        <p className="muted-text" style={{ marginBottom: '24px' }}>
          Đơn hàng số <strong>#{orderCode}</strong> đã được thanh toán hoàn tất trên hệ thống.
        </p>

        {ticket?.qrCodeDataUrl && (
          <div className="reservation-ticket-card success-reservation-ticket">
            <span>Đưa mã này cho staff quét khi check-in</span>
            <img src={ticket.qrCodeDataUrl} alt="Mã QR đặt trước" className="reservation-ticket-qr" />
            <code className="reservation-ticket-code">{ticket.qrPayload || reservationId}</code>
          </div>
        )}

        <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/lich-su')}>
          Xem lịch sử đặt chỗ
        </button>
      </motion.div>
    </section>
  )
}
