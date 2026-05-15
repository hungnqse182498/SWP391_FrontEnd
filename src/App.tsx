import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { BookingProvider } from './context/BookingContext'
import Booking from './pages/Booking'
import BookingConfirm from './pages/BookingConfirm'
import BookingHistory from './pages/BookingHistory'
import BookingSuccess from './pages/BookingSuccess'
import Home from './pages/Home'
import Login from './pages/Login'
import Payment from './pages/Payment'
import Profile from './pages/Profile'
import Register from './pages/Register'

export default function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dang-nhap" element={<Login />} />
              <Route path="dang-ky" element={<Register />} />
              <Route path="dat-cho" element={<Booking />} />
              <Route path="dat-cho/xac-nhan" element={<BookingConfirm />} />
              <Route path="thanh-toan" element={<Payment />} />
              <Route path="dat-cho/thanh-cong" element={<BookingSuccess />} />
              <Route path="lich-su" element={<BookingHistory />} />
              <Route path="tai-khoan" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BookingProvider>
    </AuthProvider>
  )
}
