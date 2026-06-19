import { CalendarDays, Car, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function HeroSection() {
  const [startTime, setStartTime] = useState("");

  return (
    <section className="home-hero">
      <div className="home-hero-media" aria-hidden>
        <img src="/image/banner.jpg" alt="" className="home-hero-img" />
        <div className="home-hero-overlay" />
      </div>

      <div className="home-hero-inner">
        <div className="home-hero-copy">
          <div className="location-pill">
            <MapPin size={18} strokeWidth={2.2} aria-hidden />
            01 Lưu Hữu Phước, Đông Hòa, Bình Dương
          </div>

          <h1>
            Giải pháp đỗ xe
            <span>hiện đại & tiện lợi</span>
          </h1>

          <p className="home-hero-lead">
            Cập nhật chỗ trống theo thời gian thực, đăng ký thẻ tháng nhanh chóng
            và ra vào không tiếp xúc bằng hệ thống nhận diện biển số.
          </p>

          <div className="availability-card">
            <div className="availability-head">
              <div className="availability-count">
                <span className="live-dot" />
                <strong>156/200</strong>
                <span>Chỗ trống hiện có</span>
              </div>

              <div className="vehicle-toggle vehicle-toggle--single" aria-label="Loại xe">
                <button type="button" className="active" disabled>
                  <Car size={18} strokeWidth={2.2} aria-hidden />
                  Ô tô — đặt trước
                </button>
              </div>
            </div>

            <div className="search-grid">
              <label className="hero-field">
                <span>Loại xe</span>
                <div>
                  <Car size={18} strokeWidth={2.2} aria-hidden />
                  <span className="hero-field-static">Ô tô</span>
                </div>
              </label>

              <label className="hero-field">
                <span>Thời gian đến</span>
                <div>
                  <CalendarDays size={18} strokeWidth={2.2} aria-hidden />
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </label>
            </div>

            <Link
              to="/dat-cho"
              state={{ vehicle: 'car', startTime }}
              className="hero-search-btn"
            >
              Tìm chỗ ngay
              <Search size={20} strokeWidth={2.3} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
