import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function SubscriptionPlans() {
  const [isMotorbike, setIsMotorbike] = useState(false);

  const prices = {
    car: {
      m1: "1.000.000đ",
      m3: "2.500.000đ",
      m12: "10.000.000đ",
    },
    bike: {
      m1: "200.000đ",
      m3: "500.000đ",
      m12: "1.000.000đ",
    },
  };

  const current = isMotorbike ? prices.bike : prices.car;

  return (
    <section id="subscriptions" className="plans-section">
      <div className="section-inner">
        <div className="section-heading">
          <h2>Gói đăng ký thành viên</h2>
          <p>
            Tiết kiệm hơn với các gói đăng ký theo tháng, dành cho cư dân và
            nhân viên làm việc tại tòa nhà.
          </p>
        </div>

        <div className="pricing-toggle">
          <span>Ô tô</span>
          <button
            type="button"
            onClick={() => setIsMotorbike(!isMotorbike)}
            className={isMotorbike ? "active" : ""}
            aria-label="Đổi bảng giá theo loại xe"
          >
            <span />
          </button>
          <span>Xe máy</span>
        </div>

        <div className="plans-grid">
          <PlanCard
            tag="Linh hoạt"
            title="1 Tháng"
            description="Phù hợp cho khách vãng lai thường xuyên"
            price={current.m1}
            features={["Truy cập 24/7 không giới hạn", "Nhận diện biển số tự động"]}
            disabledFeature="Vị trí đỗ cố định"
          />

          <PlanCard
            tag="Tiết kiệm"
            title="3 Tháng"
            description="Lựa chọn tối ưu cho cư dân"
            price={current.m3}
            features={[
              "Ưu tiên vị trí đỗ thuận tiện",
              "Miễn phí sạc xe điện 5h/tuần",
              "Giảm 10% phí rửa xe tại hầm",
            ]}
            popular
          />

          <PlanCard
            tag="Cao cấp"
            title="12 Tháng"
            description="Cam kết dài hạn, ưu đãi tối đa"
            price={current.m12}
            features={[
              "Vị trí đỗ riêng biệt, cố định",
              "Miễn phí rửa xe hằng tháng",
              "Hỗ trợ kỹ thuật tận nơi",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

interface PlanCardProps {
  tag: string;
  title: string;
  description: string;
  price: string;
  features: string[];
  disabledFeature?: string;
  popular?: boolean;
}

function PlanCard({
  tag,
  title,
  description,
  price,
  features,
  disabledFeature,
  popular,
}: PlanCardProps) {
  return (
    <article className={`plan-card ${popular ? "plan-card--popular" : ""}`}>
      {popular && <div className="popular-badge">Phổ biến nhất</div>}

      <span className="plan-tag">{tag}</span>
      <h3>{title}</h3>
      <p>{description}</p>

      <div className="plan-price">
        <strong>{price}</strong>
      </div>

      <ul className="plan-features">
        {features.map((feature) => (
          <li key={feature}>
            <CheckCircle size={19} strokeWidth={2.4} aria-hidden />
            {feature}
          </li>
        ))}
        {disabledFeature && (
          <li className="muted-feature">
            <XCircle size={19} strokeWidth={2.2} aria-hidden />
            {disabledFeature}
          </li>
        )}
      </ul>

      <Link
        to="/dang-ky-thang"
        className={popular ? "btn btn-primary btn-block" : "btn btn-plan btn-block"}
      >
        {popular ? "Chọn gói này" : "Đăng ký ngay"}
      </Link>
    </article>
  );
}
