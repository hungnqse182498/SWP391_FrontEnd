import { CalendarDays, Car, LogIn, LogOut, User, UserPlus } from "lucide-react";

import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";



const LOGO_SRC = "/image/logo.png";



export default function Header() {

  const { user, isAuthenticated, logout } = useAuth();

  const navigate = useNavigate();



  const handleLogout = () => {

    logout();

    navigate("/");

  };



  return (

    <header className="site-header">

      <div className="header-inner">

        <Link to="/" className="brand" aria-label="EasyParking - về trang chủ">

          <img src={LOGO_SRC} alt="" className="brand-logo" />

          <span className="brand-name">

            <span className="brand-easy">Easy</span>

            <span className="brand-parking">Parking</span>

          </span>

        </Link>



        <nav className="main-nav" aria-label={isAuthenticated ? "Menu người dùng" : "Menu chính"}>

          {isAuthenticated ? (

            <>

              {user?.role === "staff" && <NavLink to="/staff/dashboard">Menu</NavLink>}

              {user?.role === "manager" && <NavLink to="/manager/dashboard">Menu</NavLink>}

              {user?.role === "admin" && <NavLink to="/admin/dashboard">Menu</NavLink>}

              {user?.role === "user" && (

                <>

                  <NavLink to="/dat-cho">

                    <Car size={16} strokeWidth={2} aria-hidden />

                    Đặt chỗ

                  </NavLink>

                  <NavLink to="/lich-su">

                    <CalendarDays size={16} strokeWidth={2} aria-hidden />

                    Lịch sử

                  </NavLink>

                </>

              )}

              <NavLink to="/tai-khoan">

                <User size={16} strokeWidth={2} aria-hidden />

                Tài khoản

              </NavLink>

            </>

          ) : (

            <>

              <NavLink to="/dat-cho">

                <Car size={16} strokeWidth={2} aria-hidden />

                Tìm chỗ đỗ

              </NavLink>

              <a href="/#subscriptions">Gói đăng ký</a>

              <a href="#support">Hỗ trợ</a>

            </>

          )}

        </nav>



        <div className="header-actions">

          {isAuthenticated ? (

            <>

              <span className="user-badge" title={user?.email}>

                {user?.name}

              </span>

              <button type="button" className="btn btn-ghost btn-header" onClick={handleLogout}>

                <LogOut size={18} strokeWidth={2} aria-hidden />

                Đăng xuất

              </button>

            </>

          ) : (

            <>

              <Link to="/dang-nhap" className="btn btn-outline btn-header">

                <LogIn size={18} strokeWidth={2} aria-hidden />

                Đăng nhập

              </Link>

              <Link to="/dang-ky" className="btn btn-primary btn-header">

                <UserPlus size={18} strokeWidth={2} aria-hidden />

                Bắt đầu

              </Link>

            </>

          )}

        </div>

      </div>

    </header>

  );

} 

