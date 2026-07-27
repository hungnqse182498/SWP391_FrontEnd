import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Home,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { reservationApi, type ParkingSessionTicket } from '../utils/apiServices'

export type PaymentResultStatus = 'success' | 'cancel'

interface PaymentResultProps {
  status: PaymentResultStatus
}

interface PaymentReturnContext {
  type?: 'subscription-registration' | 'subscription-renewal' | string
  subscriptionId?: string
}

function readPaymentContext() {
  const raw = sessionStorage.getItem('payment_return_context')
  if (!raw) return null

  try {
    return JSON.parse(raw) as PaymentReturnContext
  } catch {
    return null
  }
}

export default function PaymentResult({ status: resultStatus }: PaymentResultProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(resultStatus === 'success')
  const [ticket, setTicket] = useState<ParkingSessionTicket | null>(null)
  const [reservationId, setReservationId] = useState('')
  const [paymentContext] = useState<PaymentReturnContext | null>(readPaymentContext)

  const code = searchParams.get('code')
  const paymentStatus = searchParams.get('status')
  const orderCode = searchParams.get('orderCode')
  const isCancelledCallback = searchParams.get('cancel') === 'true'
  const isSubscription = paymentContext?.type?.startsWith('subscription-') ?? false
  const isRenewal = paymentContext?.type === 'subscription-renewal'
  const isSuccess =
    resultStatus === 'success' &&
    !isCancelledCallback &&
    (code === '00' || paymentStatus?.toUpperCase() === 'PAID')

  useEffect(() => {
    let ignore = false

    if (resultStatus === 'cancel') {
      sessionStorage.removeItem('payment_return_context')
      return
    }

    if (!isSuccess) {
      const query = new URLSearchParams()
      if (orderCode) query.set('orderCode', orderCode)
      navigate(`/payment-cancel${query.size ? `?${query.toString()}` : ''}`, {
        replace: true,
      })
      return
    }

    sessionStorage.removeItem('payment_return_context')

    if (isSubscription || !orderCode) {
      const timer = window.setTimeout(() => setLoading(false), 0)
      return () => window.clearTimeout(timer)
    }

    const loadTicket = async () => {
      try {
        const response = await reservationApi.checkPayment(orderCode)
        const result = response.result as
          | (typeof response.result & {
              Ticket?: ParkingSessionTicket
              ReservationId?: string
            })
          | undefined

        if (!ignore && response.isSuccess && result) {
          setTicket(result.ticket ?? result.Ticket ?? null)
          setReservationId(result.reservationId ?? result.ReservationId ?? '')
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void loadTicket()
    return () => {
      ignore = true
    }
  }, [isSubscription, isSuccess, navigate, orderCode, resultStatus])

  const goToPrimaryAction = () => {
    if (resultStatus === 'success') {
      navigate(isSubscription ? '/my-subscriptions' : '/lich-su')
      return
    }

    if (isRenewal) {
      navigate('/my-subscriptions')
      return
    }

    navigate(isSubscription ? '/dang-ky-thang' : '/dat-cho')
  }

  if (loading) {
    return (
      <section className="payment-result-page" aria-live="polite">
        <div className="payment-result-card payment-result-card--loading">
          <span className="payment-result-spinner" aria-hidden />
          <strong>Đang xác nhận giao dịch</strong>
          <p>Hệ thống đang đối chiếu trạng thái thanh toán với PayOS.</p>
        </div>
      </section>
    )
  }

  const success = resultStatus === 'success'
  const title = success
    ? isRenewal
      ? 'Gia hạn thành công'
      : isSubscription
        ? 'Đăng ký gói thành công'
        : 'Thanh toán thành công'
    : 'Thanh toán chưa hoàn tất'
  const description = success
    ? isRenewal
      ? 'Giao dịch gia hạn đã được ghi nhận. Thời hạn mới sẽ được cập nhật sau khi PayOS xác nhận.'
      : isSubscription
        ? 'Gói gửi xe tháng của bạn đã được ghi nhận và sẽ sẵn sàng sau khi hệ thống hoàn tất xác nhận.'
        : 'Đặt chỗ của bạn đã được thanh toán và xác nhận trên hệ thống.'
    : isSubscription
      ? 'Giao dịch gói tháng đã bị hủy hoặc chưa thể hoàn tất. Bạn có thể thực hiện lại khi sẵn sàng.'
      : 'Giao dịch đặt chỗ đã bị hủy hoặc chưa thể hoàn tất. Không có khoản thanh toán mới nào được ghi nhận.'
  const primaryLabel = success
    ? isSubscription
      ? 'Xem gói tháng của tôi'
      : 'Xem lịch sử đặt chỗ'
    : isRenewal
      ? 'Quay lại gói của tôi'
      : isSubscription
        ? 'Đăng ký lại gói tháng'
        : 'Thử đặt chỗ lại'

  return (
    <section className={`payment-result-page payment-result-page--${resultStatus}`}>
      <motion.div
        className="payment-result-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="payment-result-accent" aria-hidden />
        <div className={`payment-result-icon payment-result-icon--${resultStatus}`}>
          {success ? <CheckCircle2 size={38} /> : <XCircle size={38} />}
        </div>

        <span className="payment-result-eyebrow">
          {success ? <ShieldCheck size={15} /> : <Clock3 size={15} />}
          {success ? 'Giao dịch đã xác nhận' : 'Giao dịch chưa ghi nhận'}
        </span>
        <h1>{title}</h1>
        <p className="payment-result-description">{description}</p>

        <div className="payment-result-summary">
          <div>
            <ReceiptText size={18} aria-hidden />
            <span>Mã đơn hàng</span>
            <strong>{orderCode ? `#${orderCode}` : 'Không có thông tin'}</strong>
          </div>
          <div>
            {success ? <CheckCircle2 size={18} aria-hidden /> : <RefreshCw size={18} aria-hidden />}
            <span>Trạng thái</span>
            <strong>{success ? 'Đã thanh toán' : 'Đã hủy / chưa hoàn tất'}</strong>
          </div>
        </div>

        {success && ticket?.qrCodeDataUrl && (
          <div className="payment-result-ticket">
            <div>
              <QrCode size={20} aria-hidden />
              <span>Vé check-in của bạn</span>
            </div>
            <img src={ticket.qrCodeDataUrl} alt="Mã QR vé đặt chỗ" />
            <code>{ticket.qrPayload || reservationId}</code>
            <small>Đưa mã này cho nhân viên quét khi check-in.</small>
          </div>
        )}

        {!success && (
          <div className="payment-result-note">
            <ShieldCheck size={18} aria-hidden />
            <span>Tài khoản của bạn không bị ghi nhận thanh toán cho giao dịch này.</span>
          </div>
        )}

        <div className="payment-result-actions">
          <button type="button" className="btn btn-primary" onClick={goToPrimaryAction}>
            {primaryLabel}
            <ArrowRight size={17} />
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>
            <Home size={17} />
            Về trang chủ
          </button>
        </div>
      </motion.div>
    </section>
  )
}
