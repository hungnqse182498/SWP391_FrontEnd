import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/Layout'

import { AuthProvider } from './context/AuthContext'

import { BookingProvider } from './context/BookingContext'

import Home from './pages/Home'

import Login from './pages/Login'

import Payment from './pages/Payment'

import PaymentSuccess from './pages/PaymentSuccess'

import PaymentCancel from './pages/PaymentCancel'

import StaffDashboard from './pages/staff/Dashboard'

import StaffScanPlate from './pages/staff/ScanPlate'

import StaffCheckout from './pages/staff/Checkout'

import StaffException from './pages/staff/Exception'

import AdminDashboard from './pages/admin/Dashboard'

import AdminUsers from './pages/admin/Users'

import AdminSystemConfig from './pages/admin/SystemConfig'

import ManagerDashboard from './pages/manager/Dashboard'

import ManagerVehicleTypes from './pages/manager/VehicleTypes'

import ManagerFloorAssignment from './pages/manager/FloorAssignment'

import ManagerSlots from './pages/manager/Slots'

import ManagerPricing from './pages/manager/Pricing'

import ManagerReports from './pages/manager/Reports'

import ManagerGates from './pages/manager/Gates'

import ManagerSubscriptionPackages from './pages/manager/SubscriptionPackages'
import ManagerMonthlySubscriptions from './pages/manager/MonthlySubscriptions'

import ManagerParkingSessions from './pages/manager/ParkingSessions'
import ManagerReservations from './pages/manager/Reservations'
import ManagerPayments from './pages/manager/Payments'
import ManagerVehicleChangeRequests from './pages/manager/VehicleChangeRequests'
import ManagerIncidents from './pages/manager/Incidents'

import UserBooking from './pages/user/Booking'

import UserBookingConfirm from './pages/user/BookingConfirm'

import UserBookingHistory from './pages/user/BookingHistory'

import UserBookingSuccess from './pages/user/BookingSuccess'

import UserProfile from './pages/user/Profile'

import UserSubscribeMonthly from './pages/user/SubscribeMonthly'
import UserRegister from './pages/user/Register'
import UserMySubscriptions from './pages/user/MySubscriptions'
import UserParkingSessions from './pages/user/ParkingSessions'
import UserIncidentReports from './pages/user/IncidentReports'

import LegalHub from './pages/user/LegalHub'



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

              <Route path="payment-success" element={<PaymentSuccess />} />

              <Route path="payment-cancel" element={<PaymentCancel />} />

              <Route path="dat-cho/thanh-cong" element={<UserBookingSuccess />} />

              <Route path="dang-ky-thang" element={<UserSubscribeMonthly />} />

              <Route path="my-subscriptions" element={<UserMySubscriptions />} />

              <Route path="phien-gui-xe" element={<UserParkingSessions />} />

              <Route path="bao-cao-su-co" element={<UserIncidentReports />} />

              <Route path="lich-su" element={<UserBookingHistory />} />

              <Route path="legal" element={<LegalHub />} />

              <Route path="tai-khoan" element={<UserProfile />} />

              <Route path="staff/dashboard" element={<StaffDashboard />} />

              <Route path="staff/scan-plate" element={<StaffScanPlate />} />

              <Route path="staff/checkout" element={<StaffCheckout />} />

              <Route path="staff/exception" element={<StaffException />} />

              <Route path="admin/dashboard" element={<AdminDashboard />} />

              <Route path="admin/users" element={<AdminUsers />} />

              <Route path="admin/system-config" element={<AdminSystemConfig />} />

              <Route path="manager/dashboard" element={<ManagerDashboard />} />

              <Route path="manager/vehicle-types" element={<ManagerVehicleTypes />} />

              <Route path="manager/floor-assignment" element={<ManagerFloorAssignment />} />

              <Route path="manager/slots" element={<ManagerSlots />} />

              <Route path="manager/pricing" element={<ManagerPricing />} />

              <Route path="manager/reports" element={<ManagerReports />} />

              <Route path="manager/gates" element={<ManagerGates />} />

              <Route path="manager/subscriptions" element={<ManagerSubscriptionPackages />} />
              <Route path="manager/monthly-subscriptions" element={<ManagerMonthlySubscriptions />} />

              <Route path="manager/sessions" element={<ManagerParkingSessions />} />

              <Route path="manager/reservations" element={<ManagerReservations />} />

              <Route path="manager/payments" element={<ManagerPayments />} />

              <Route path="manager/vehicle-change-requests" element={<ManagerVehicleChangeRequests />} />

              <Route path="manager/incidents" element={<ManagerIncidents />} />

              <Route path="*" element={<Navigate to="/" replace />} />

            </Route>

          </Routes>

        </BrowserRouter>

      </BookingProvider>

    </AuthProvider>

  )

}


