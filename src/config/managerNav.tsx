import {
  AlertTriangle,
  BarChart3,
  Building2,
  Car,
  Clock,
  DollarSign,
  DoorOpen,
  FileCheck,
  Layers,
  Package,
  ParkingSquare,
  RefreshCw,
} from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: ReactNode
  desc?: string
}

export const MANAGER_NAV: NavItem[] = [
  {
    id: 'building',
    label: 'Thông tin tòa nhà',
    path: '/manager/building',
    icon: <Building2 size={18} />,
    desc: 'Tòa nhà gửi xe, địa chỉ, giờ mở cửa',
  },
  {
    id: 'vehicles',
    label: 'Loại phương tiện',
    path: '/manager/vehicle-types',
    icon: <Car size={18} />,
    desc: 'Xe máy, ô tô, xe điện, SUV...',
  },
  {
    id: 'floors',
    label: 'Phân tầng theo loại xe',
    path: '/manager/floor-assignment',
    icon: <Layers size={18} />,
    desc: 'Gán tầng/khu cho từng loại xe',
  },
  {
    id: 'gates',
    label: 'Cổng ra vào',
    path: '/manager/gates',
    icon: <DoorOpen size={18} />,
    desc: 'Quản lý cổng ra vào bãi xe',
  },
  {
    id: 'subscriptions',
    label: 'Gói thuê bao',
    path: '/manager/subscriptions',
    icon: <Package size={18} />,
    desc: 'Quản lý gói đăng ký tháng',
  },
  {
    id: 'renewals',
    label: 'Gia hạn thuê bao',
    path: '/manager/renewals',
    icon: <RefreshCw size={18} />,
    desc: 'Duyệt yêu cầu gia hạn gói thuê bao',
  },
  {
    id: 'vehicle-change-requests',
    label: 'Phê duyệt biển số',
    path: '/manager/vehicle-change-requests',
    icon: <FileCheck size={18} />,
    desc: 'Duyệt yêu cầu thay đổi biển số',
  },
  {
    id: 'slots',
    label: 'Slot đỗ xe',
    path: '/manager/slots',
    icon: <ParkingSquare size={18} />,
    desc: 'Trạng thái slot: trống, đang dùng, đặt trước...',
  },
  {
    id: 'sessions',
    label: 'Phiên ra vào',
    path: '/manager/sessions',
    icon: <Clock size={18} />,
    desc: 'Theo dõi phiên gửi xe',
  },
  {
    id: 'pricing',
    label: 'Bảng giá & chính sách',
    path: '/manager/pricing',
    icon: <DollarSign size={18} />,
    desc: 'Quy định tính phí gửi xe',
  },
  {
    id: 'reports',
    label: 'Báo cáo vận hành',
    path: '/manager/reports',
    icon: <BarChart3 size={18} />,
    desc: 'Lượt xe, doanh thu, lấp đầy, giờ cao điểm',
  },
  {
    id: 'advanced',
    label: 'Quản lý nâng cao',
    path: '/manager/advanced',
    icon: <AlertTriangle size={18} />,
    desc: 'Mất vé, sai biển, quá giờ, chưa thanh toán...',
  },
]

export function navigateManagerNav(id: string, navigate: (path: string) => void) {
  const item = MANAGER_NAV.find((n) => n.id === id)
  if (item) navigate(item.path)
}
