import { Outlet, useLocation } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'

export default function Layout() {
  const isHome = useLocation().pathname === '/'

  return (
    <div className="app-shell">
      <Header />
      <main className={isHome ? 'app-main app-main--home' : 'app-main'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
