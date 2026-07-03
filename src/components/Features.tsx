import { BatteryCharging, Camera, Nfc, PiggyBank } from "lucide-react";

export default function Features() {
  return (
    <section className="features-section">
      <div className="section-inner">
        <div className="section-heading">
          <h2>Tại sao chọn chúng tôi?</h2>
        </div>

        <div className="features-grid">
          <article className="feature-card feature-card--hero">
            <div>
              <Camera size={36} strokeWidth={2.2} aria-hidden />
              <h3>An ninh tuyệt đối</h3>
              <p>
                Hệ thống camera AI giám sát 24/7 cùng đội ngũ vận hành chuyên
                nghiệp tại tòa nhà 01 Lưu Hữu Phước.
              </p>
            </div>
          </article>

          <article className="feature-card feature-card--wide">
            <span className="feature-icon">
              <Nfc size={32} strokeWidth={2.2} aria-hidden />
            </span>
            <div>
              <h3>Ra vào không chạm</h3>
              <p>
                RFID và nhận diện biển số giúp xe ra vào nhanh chóng mà không
                cần dừng lại quẹt thẻ.
              </p>
            </div>
          </article>

          <article className="feature-card feature-card--accent">
            <PiggyBank size={32} strokeWidth={2.2} aria-hidden />
            <h3>Tiết kiệm đến 40%</h3>
          </article>

          <article className="feature-card feature-card--warm">
            <BatteryCharging size={32} strokeWidth={2.2} aria-hidden />
            <h3>Trạm sạc xe điện</h3>
          </article>
        </div>
      </div>
    </section>
  );
}
