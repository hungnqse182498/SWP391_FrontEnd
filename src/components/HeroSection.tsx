import { Bike, CalendarDays, Car, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function HeroSection() {
  const [vehicle, setVehicle] = useState<"car" | "bike">("car");

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

              <div className="vehicle-toggle" aria-label="Chọn loại xe">
                <button
                  type="button"
                  onClick={() => setVehicle("car")}
                  className={vehicle === "car" ? "active" : ""}
                >
                  <Car size={18} strokeWidth={2.2} aria-hidden />
                  Ô tô
                </button>

                <button
                  type="button"
                  onClick={() => setVehicle("bike")}
                  className={vehicle === "bike" ? "active" : ""}
                >
                  <Bike size={18} strokeWidth={2.2} aria-hidden />
                  Xe máy
                </button>
              </div>
            </div>

            <div className="search-grid">
              <label className="hero-field">
                <span>Loại xe</span>
                <div>
                  {vehicle === "car" ? (
                    <Car size={18} strokeWidth={2.2} aria-hidden />
                  ) : (
                    <Bike size={18} strokeWidth={2.2} aria-hidden />
                  )}
                  <select
                    value={vehicle}
                    onChange={(event) => setVehicle(event.target.value as "car" | "bike")}
                  >
                    <option value="car">Ô tô</option>
                    <option value="bike">Xe máy</option>
                  </select>
                </div>
              </label>

              <label className="hero-field">
                <span>Thời gian đến</span>
                <div>
                  <CalendarDays size={18} strokeWidth={2.2} aria-hidden />
                  <input type="datetime-local" />
                </div>
              </label>
            </div>

            <Link to="/dat-cho" className="hero-search-btn">
              Tìm chỗ ngay
              <Search size={20} strokeWidth={2.3} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
