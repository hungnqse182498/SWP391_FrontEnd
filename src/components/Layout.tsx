import { Outlet, useLocation } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isStaffOrAdmin = location.pathname.startsWith('/staff') || location.pathname.startsWith('/admin')

  return (
    <div className="app-shell">
      <Header />
      <main className={isHome ? 'app-main app-main--home' : 'app-main'}>
        <Outlet />
      </main>
      {!isStaffOrAdmin && <Footer />}
    </div>
  )
}
