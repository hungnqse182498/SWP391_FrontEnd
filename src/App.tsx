import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { BookingProvider } from './context/BookingContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Payment from './pages/Payment'
import StaffDashboard from './pages/staff/Dashboard'
import StaffScanPlate from './pages/staff/ScanPlate'
import StaffCreateSession from './pages/staff/CreateSession'
import StaffCheckout from './pages/staff/Checkout'
import StaffException from './pages/staff/Exception'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminPermissions from './pages/admin/Permissions'
import AdminSystemConfig from './pages/admin/SystemConfig'
import ManagerDashboard from './pages/manager/Dashboard'
import ManagerBuildingInfo from './pages/manager/BuildingInfo'
import ManagerVehicleTypes from './pages/manager/VehicleTypes'
import ManagerFloorAssignment from './pages/manager/FloorAssignment'
import ManagerSlots from './pages/manager/Slots'
import ManagerPricing from './pages/manager/Pricing'
import ManagerReports from './pages/manager/Reports'
import ManagerAdvanced from './pages/manager/Advanced'
import UserBooking from './pages/user/Booking'
import UserBookingConfirm from './pages/user/BookingConfirm'
import UserBookingHistory from './pages/user/BookingHistory'
import UserBookingSuccess from './pages/user/BookingSuccess'
import UserProfile from './pages/user/Profile'
import UserRegister from './pages/user/Register'

export default function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dang-nhap" element={<Login />} />
              <Route path="dang-ky" element={<UserRegister />} />
              <Route path="dat-cho" element={<UserBooking />} />
              <Route path="dat-cho/xac-nhan" element={<UserBookingConfirm />} />
              <Route path="thanh-toan" element={<Payment />} />
              <Route path="dat-cho/thanh-cong" element={<UserBookingSuccess />} />
              <Route path="lich-su" element={<UserBookingHistory />} />
              <Route path="tai-khoan" element={<UserProfile />} />
              <Route path="staff/dashboard" element={<StaffDashboard />} />
              <Route path="staff/scan-plate" element={<StaffScanPlate />} />
              <Route path="staff/create-session" element={<StaffCreateSession />} />
              <Route path="staff/checkout" element={<StaffCheckout />} />
              <Route path="staff/exception" element={<StaffException />} />
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/permissions" element={<AdminPermissions />} />
              <Route path="admin/system-config" element={<AdminSystemConfig />} />
              <Route path="manager/dashboard" element={<ManagerDashboard />} />
              <Route path="manager/building" element={<ManagerBuildingInfo />} />
              <Route path="manager/vehicle-types" element={<ManagerVehicleTypes />} />
              <Route path="manager/floor-assignment" element={<ManagerFloorAssignment />} />
              <Route path="manager/slots" element={<ManagerSlots />} />
              <Route path="manager/pricing" element={<ManagerPricing />} />
              <Route path="manager/reports" element={<ManagerReports />} />
              <Route path="manager/advanced" element={<ManagerAdvanced />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BookingProvider>
    </AuthProvider>
  )
}
