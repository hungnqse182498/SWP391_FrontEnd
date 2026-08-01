import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowLeft, FileText, Shield, DollarSign, CalendarCheck, RotateCcw } from "lucide-react";
import { ApiRequestError, apiClient } from "../../config/api";
import { formatUtcToVietnamDate, parseBackendUtcDate } from "../../utils/dateTime";

const NAV_ITEMS = [
  { id: "terms", label: "Điều khoản sử dụng", icon: FileText },
  { id: "privacy", label: "Chính sách bảo mật", icon: Shield },
  { id: "pricing-policy", label: "Chính sách giá", icon: DollarSign },
  { id: "booking-rules", label: "Quy định đặt chỗ", icon: CalendarCheck },
  { id: "cancellation", label: "Chính sách hủy đặt chỗ", icon: RotateCcw },
];

interface PricingPolicy {
  policyId: string;
  vehicleTypeId: string;
  vehicleTypeName?: string | null;
  basePrice: number;
  baseHours: number;
  extraHourPrice: number;
  nightSurcharge?: number | null;
  effectiveDate: string;
  status: string;
}

interface ApiResponse<T> {
  isSuccess: boolean;
  result: T;
  message?: string;
}

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function LegalHub() {
  const { hash } = useLocation();
  const [pricingPolicies, setPricingPolicies] = useState<PricingPolicy[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState("");

  useEffect(() => {
    apiClient.get<ApiResponse<PricingPolicy[]>>("/PricingPolicy")
      .then((response) => {
        if (!response.isSuccess || !Array.isArray(response.result)) {
          throw new Error(response.message || "Không thể tải chính sách giá.");
        }
        setPricingPolicies(response.result);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiRequestError && error.statusCode === 404) {
          setPricingPolicies([]);
          return;
        }
        setPricingError(error instanceof Error ? error.message : "Không thể tải chính sách giá.");
      })
      .finally(() => setPricingLoading(false));
  }, []);

  const activePricingPolicies = useMemo(() => {
    const now = Date.now();
    const latestByVehicleType = new Map<string, PricingPolicy>();

    pricingPolicies
      .filter((policy) =>
        policy.status.toLowerCase() === "active" &&
        parseBackendUtcDate(policy.effectiveDate).getTime() <= now)
      .sort((a, b) =>
        parseBackendUtcDate(b.effectiveDate).getTime() - parseBackendUtcDate(a.effectiveDate).getTime())
      .forEach((policy) => {
        if (!latestByVehicleType.has(policy.vehicleTypeId)) {
          latestByVehicleType.set(policy.vehicleTypeId, policy);
        }
      });

    return Array.from(latestByVehicleType.values());
  }, [pricingPolicies]);

  const latestPricingDate = activePricingPolicies.reduce<PricingPolicy | null>((latest, policy) =>
    !latest || parseBackendUtcDate(policy.effectiveDate) > parseBackendUtcDate(latest.effectiveDate)
      ? policy
      : latest, null);

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [hash]);

  return (
    <section className="legal-page">
      <header className="page-header">
        <div>
          <Link to="/" className="legal-back-link">
            <ArrowLeft size={18} strokeWidth={2} aria-hidden /> Trang chủ
          </Link>
          <h1>Thông tin pháp lý</h1>
          <p>
            Các điều khoản, chính sách và quy định áp dụng tại hệ thống bãi đỗ xe EasyParking –
            Tòa nhà 01 Lưu Hữu Phước, TP. Thủ Dầu Một, Bình Dương.
          </p>
        </div>
      </header>

      <div className="legal-layout">
        {/* Left column / Sidebar */}
        <aside className="legal-sidebar-wrap">
          <nav className="legal-sidebar-nav card-panel">
            <strong>Mục lục</strong>
            <ul>
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a href={`#${id}`}>
                    <Icon size={16} strokeWidth={2} aria-hidden />
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Right column / Content */}
        <main className="legal-main-content">
          {/* ─── 1. Điều khoản sử dụng ─── */}
          <article id="terms" className="legal-section card-panel">
        <h2>
          <FileText size={22} strokeWidth={2} aria-hidden />
          Điều khoản sử dụng
        </h2>
        <p className="legal-updated">Cập nhật lần cuối: 28/07/2026</p>

        <h3>1. Giới thiệu</h3>
        <p>
          Chào mừng bạn đến với EasyParking – hệ thống đặt trước chỗ đỗ xe thông minh tại Tòa nhà
          01 Lưu Hữu Phước, Phường Hòa Phú, TP. Thủ Dầu Một, Bình Dương. Khi sử dụng dịch vụ của
          chúng tôi (bao gồm website, ứng dụng di động và hệ thống thiết bị tại bãi), bạn đồng ý
          tuân thủ toàn bộ các điều khoản được nêu dưới đây.
        </p>

        <h3>2. Đối tượng sử dụng</h3>
        <ul>
          <li>Cư dân sinh sống tại tòa nhà và các khu vực lân cận.</li>
          <li>Nhân viên làm việc tại các văn phòng trong tòa nhà.</li>
          <li>Khách vãng lai có nhu cầu đỗ xe ngắn hạn (theo giờ hoặc theo ngày).</li>
          <li>Người dùng phải từ đủ 18 tuổi trở lên và có giấy phép lái xe hợp lệ.</li>
        </ul>

        <h3>3. Tài khoản người dùng</h3>
        <p>
          Để sử dụng dịch vụ đặt chỗ, bạn cần đăng ký tài khoản với thông tin chính xác bao gồm:
          họ tên, số điện thoại, email và biển số xe. Bạn có trách nhiệm bảo mật thông tin đăng nhập
          của mình. EasyParking không chịu trách nhiệm đối với mọi thiệt hại phát sinh từ việc
          người khác truy cập trái phép tài khoản của bạn.
        </p>

        <h3>4. Dịch vụ cung cấp</h3>
        <ul>
          <li><strong>Đặt chỗ ngắn hạn:</strong> Đặt trước chỗ đỗ ô tô, thanh toán tiền cọc trực tuyến qua cổng PayOS và được hệ thống tự động phân bổ vị trí khi vào bãi.</li>
          <li><strong>Đăng ký thẻ tháng:</strong> Gói thành viên 1 tháng, 3 tháng hoặc 12 tháng dành cho xe máy và ô tô, bao gồm quyền truy cập 24/7 và nhận diện biển số tự động (ANPR).</li>
          <li><strong>Thẻ RFID:</strong> Hỗ trợ phát hành thẻ RFID để ra vào tự động. Phí phát hành thẻ: 50.000đ/thẻ (không hoàn lại).</li>
          <li><strong>Sạc xe điện (EV Charging):</strong> Trạm sạc tại tầng B2, miễn phí 5 giờ/tuần cho gói 3 tháng trở lên.</li>
        </ul>

        <h3>5. Giới hạn trách nhiệm</h3>
        <p>
          EasyParking cam kết vận hành hệ thống camera giám sát 24/7 và bảo vệ tuần tra thường
          xuyên. Tuy nhiên, chúng tôi không chịu trách nhiệm đối với:
        </p>
        <ul>
          <li>Mất mát, hư hỏng tài sản cá nhân để bên trong xe.</li>
          <li>Các sự cố do thiên tai, hỏa hoạn hoặc bất khả kháng.</li>
          <li>Trầy xước hoặc hư hại phương tiện do chính người dùng hoặc bên thứ ba gây ra.</li>
        </ul>

        <h3>6. Sửa đổi điều khoản</h3>
        <p>
          EasyParking có quyền sửa đổi các điều khoản này bất kỳ lúc nào. Mọi thay đổi sẽ được
          thông báo trước ít nhất 7 ngày qua email hoặc thông báo trên ứng dụng. Việc tiếp tục sử
          dụng dịch vụ sau khi thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận điều khoản mới.
        </p>
      </article>

      {/* ─── 2. Chính sách bảo mật ─── */}
      <article id="privacy" className="legal-section card-panel">
        <h2>
          <Shield size={22} strokeWidth={2} aria-hidden />
          Chính sách bảo mật
        </h2>
        <p className="legal-updated">Cập nhật lần cuối: 28/07/2026</p>

        <h3>1. Thông tin chúng tôi thu thập</h3>
        <p>Khi sử dụng EasyParking, chúng tôi thu thập các loại thông tin sau:</p>
        <ul>
          <li><strong>Thông tin cá nhân:</strong> Họ tên, số điện thoại, địa chỉ email, địa chỉ cư trú khi bạn đăng ký tài khoản.</li>
          <li><strong>Thông tin phương tiện:</strong> Biển số xe, loại xe (xe máy/ô tô), màu sắc phương tiện.</li>
          <li><strong>Dữ liệu giao dịch:</strong> Lịch sử đặt chỗ, thời gian vào/ra, phương thức thanh toán, số tiền thanh toán.</li>
          <li><strong>Dữ liệu kỹ thuật:</strong> Địa chỉ IP, loại trình duyệt, thiết bị truy cập, cookie phiên đăng nhập.</li>
          <li><strong>Hình ảnh camera:</strong> Hệ thống ANPR (nhận diện biển số tự động) ghi nhận hình ảnh xe tại các điểm ra/vào.</li>
        </ul>

        <h3>2. Mục đích sử dụng</h3>
        <ul>
          <li>Xác thực danh tính và xử lý giao dịch đặt chỗ.</li>
          <li>Vận hành hệ thống nhận diện biển số tự động (ANPR) để mở barrier ra/vào.</li>
          <li>Gửi thông báo xác nhận đặt chỗ, nhắc nhở thời gian đỗ xe và khuyến mãi.</li>
          <li>Phân tích dữ liệu sử dụng để cải thiện trải nghiệm và tối ưu hóa công suất bãi xe.</li>
          <li>Tuân thủ yêu cầu pháp lý của cơ quan nhà nước có thẩm quyền.</li>
        </ul>

        <h3>3. Chia sẻ thông tin</h3>
        <p>
          Chúng tôi <strong>không</strong> bán hoặc cho thuê thông tin cá nhân cho bên thứ ba vì mục
          đích thương mại. Thông tin chỉ được chia sẻ trong các trường hợp:
        </p>
        <ul>
          <li>Với Ban Quản lý Tòa nhà để phối hợp quản lý an ninh.</li>
          <li>Với đối tác cổng thanh toán PayOS để xử lý giao dịch – chỉ truyền thông tin tối thiểu cần thiết.</li>
          <li>Khi có yêu cầu bằng văn bản từ cơ quan công an hoặc tòa án.</li>
        </ul>

        <h3>4. Bảo mật dữ liệu</h3>
        <p>
          Toàn bộ dữ liệu được mã hóa bằng giao thức TLS 1.3 khi truyền tải và AES-256 khi lưu
          trữ. Hệ thống sao lưu tự động hàng ngày và lưu trữ tại máy chủ đặt tại Việt Nam. Dữ
          liệu camera (ANPR) được lưu trữ tối đa 90 ngày, sau đó tự động xóa.
        </p>

        <h3>5. Quyền của bạn</h3>
        <ul>
          <li>Truy cập, chỉnh sửa hoặc yêu cầu xóa thông tin cá nhân bất kỳ lúc nào qua mục "Tài khoản" hoặc liên hệ hotline.</li>
          <li>Từ chối nhận email/thông báo khuyến mãi (không ảnh hưởng đến thông báo giao dịch).</li>
          <li>Yêu cầu xuất dữ liệu cá nhân ở định dạng phổ biến (CSV/PDF) trong vòng 15 ngày làm việc.</li>
        </ul>
      </article>

      {/* ─── 3. Chính sách giá ─── */}
      <article id="pricing-policy" className="legal-section card-panel">
        <h2>
          <DollarSign size={22} strokeWidth={2} aria-hidden />
          Chính sách giá
        </h2>
        <p className="legal-updated">
          {latestPricingDate
            ? `Áp dụng từ: ${formatUtcToVietnamDate(latestPricingDate.effectiveDate)}`
            : "Bảng giá được cập nhật theo cấu hình hệ thống"}
        </p>

        <h3>1. Bảng giá dịch vụ gửi xe theo giờ</h3>
        {pricingLoading ? (
          <p>Đang tải bảng giá...</p>
        ) : pricingError ? (
          <p role="alert">{pricingError}</p>
        ) : activePricingPolicies.length === 0 ? (
          <p>Hiện chưa có chính sách giá đang áp dụng.</p>
        ) : (
          <ul>
            {activePricingPolicies.map((policy) => (
              <li key={policy.policyId}>
                <strong>{policy.vehicleTypeName || "Loại phương tiện"}:</strong>{" "}
                {formatVnd(policy.basePrice)} cho {policy.baseHours} giờ đầu; mỗi giờ tiếp theo {formatVnd(policy.extraHourPrice)}
                {(policy.nightSurcharge ?? 0) > 0
                  ? `; phụ thu đêm ${formatVnd(policy.nightSurcharge ?? 0)}`
                  : "; không có phụ thu đêm"}.
              </li>
            ))}
          </ul>
        )}

        <h3>2. Quy định phụ thu đêm</h3>
        <p>
          Phụ thu đêm áp dụng cho các khung giờ đỗ xe phát sinh từ <strong>22:00 đến 06:00</strong> sáng hôm sau.
        </p>

        <h3>3. Ghi chú</h3>
        <p>
          Thời gian đỗ xe được tính dựa trên lượt vào/ra thực tế ghi nhận bởi hệ thống camera ANPR hoặc thẻ RFID. Tiền cọc giữ chỗ khi đặt trước trực tuyến được khấu trừ trực tiếp vào chi phí phiên gửi.
        </p>
      </article>

      {/* ─── 4. Quy định đặt chỗ ─── */}
      <article id="booking-rules" className="legal-section card-panel">
        <h2>
          <CalendarCheck size={22} strokeWidth={2} aria-hidden />
          Quy định đặt chỗ
        </h2>
        <p className="legal-updated">Cập nhật lần cuối: 28/07/2026</p>

        <h3>1. Quy trình đặt chỗ</h3>
        <ul>
          <li>Đăng nhập tài khoản EasyParking trên website hoặc ứng dụng di động.</li>
          <li>Chọn thời gian dự kiến đưa ô tô vào bãi trong khung thời gian hệ thống cho phép.</li>
          <li>Nhập biển số xe và xác nhận tiền cọc giữ chỗ.</li>
          <li>Thanh toán tiền cọc trực tuyến qua cổng PayOS.</li>
          <li>Nhận mã QR xác nhận qua email và ứng dụng – xuất trình tại barrier để vào bãi.</li>
        </ul>

        <h3>2. Thời gian đặt chỗ</h3>
        <ul>
          <li>Bãi xe hoạt động 24/7, bao gồm ngày lễ và cuối tuần.</li>
          <li>Chỉ có thể chọn thời gian dự kiến đến trong vòng 5 giờ tính từ thời điểm hiện tại.</li>
          <li>Xe được phép vào bãi từ <strong>30 phút trước</strong> đến <strong>30 phút sau</strong> giờ đã đặt. Đến quá thời hạn này, đơn có thể bị hủy do không đến và tiền cọc không được hoàn lại.</li>
        </ul>

        <h3>3. Tiền cọc & thanh toán</h3>
        <ul>
          <li><strong>Đặt chỗ ngắn hạn:</strong> Thanh toán tiền cọc giữ chỗ khi xác nhận đơn; phần phí còn lại được tính theo phiên gửi xe.</li>
          <li><strong>Gói thẻ tháng:</strong> Thanh toán toàn bộ giá trị gói khi đăng ký. Không áp dụng trả góp.</li>
          <li>Thanh toán trực tuyến được thực hiện qua cổng PayOS theo phương thức mà PayOS hỗ trợ tại thời điểm giao dịch.</li>
        </ul>

        <h3>4. Quy tắc tại bãi xe</h3>
        <ul>
          <li>Tốc độ tối đa trong bãi: <strong>5 km/h</strong>.</li>
          <li>Đỗ đúng vị trí đã đặt. Vi phạm đỗ sai chỗ bị phạt 100.000đ/lần.</li>
          <li>Nghiêm cấm: hút thuốc, sử dụng chất dễ cháy nổ, để động cơ nổ máy quá 3 phút trong bãi kín.</li>
          <li>Xe quá khổ (chiều cao &gt; 2.0m cho ô tô, chiều rộng &gt; 2.2m) cần đặt chỗ riêng tầng B1.</li>
          <li>Phương tiện bị hư hỏng, rò rỉ dầu phải được di chuyển khỏi bãi trong vòng 4 giờ kể từ khi phát hiện.</li>
        </ul>

        <h3>5. Gia hạn & quá giờ</h3>
        <p>
          Nếu bạn cần đỗ thêm ngoài thời gian đã đặt, có thể gia hạn trực tiếp trên ứng dụng
          (nếu vị trí chưa có người đặt tiếp theo). Trường hợp không gia hạn và quá giờ, phí phụ
          thu được tính như sau:
        </p>
        <ul>
          <li>Quá giờ dưới 30 phút: miễn phí.</li>
          <li>Quá giờ từ 30 phút – 2 giờ: tính thêm 1 giờ theo giá niêm yết.</li>
          <li>Quá giờ trên 2 giờ: tính phụ thu 150% giá mỗi giờ vượt.</li>
        </ul>
      </article>

      {/* ─── 4. Chính sách hủy & hoàn tiền ─── */}
      <article id="cancellation" className="legal-section card-panel">
        <h2>
          <RotateCcw size={22} strokeWidth={2} aria-hidden />
          Chính sách hủy đặt chỗ
        </h2>
        <p className="legal-updated">Cập nhật lần cuối: 28/07/2026</p>

        <h3>1. Hủy đặt chỗ ngắn hạn</h3>
        <ul>
          <li>Người dùng có thể hủy đơn còn đủ điều kiện hủy trong mục <strong>Lịch sử đặt chỗ</strong>.</li>
          <li>Khi người dùng chủ động hủy đơn, <strong>tiền cọc không được hoàn lại</strong>, không phụ thuộc thời điểm hủy.</li>
          <li>Đơn bị hủy do không đưa xe vào bãi đúng khung giờ quy định cũng không được hoàn tiền cọc.</li>
        </ul>

        <h3>2. Hủy gói thẻ tháng</h3>
        <ul>
          <li>Người dùng có thể gửi yêu cầu hủy gói đang hoạt động trong mục <strong>Gói đăng ký của tôi</strong>.</li>
          <li>Gói đã thanh toán không được hoàn lại phần thời gian chưa sử dụng khi người dùng chủ động hủy.</li>
          <li>Sau khi hủy, gói chuyển sang trạng thái đã hủy và không thể tiếp tục gia hạn.</li>
        </ul>

        <h3>3. Trường hợp giao dịch hoặc hệ thống gặp lỗi</h3>
        <p>
          Chính sách không hoàn tiền nêu trên không loại trừ việc kiểm tra các giao dịch bất thường
          do lỗi kỹ thuật. Người dùng có thể liên hệ hỗ trợ trong các trường hợp:
        </p>
        <ul>
          <li>Thanh toán bị trừ tiền nhưng đơn đặt chỗ không được tạo (lỗi giao dịch).</li>
          <li>Giao dịch bị ghi nhận nhiều lần cho cùng một đơn.</li>
          <li>Hệ thống không thể cung cấp dịch vụ do lỗi vận hành được EasyParking xác nhận.</li>
        </ul>
        <p>Mỗi trường hợp sẽ được đối soát theo dữ liệu PayOS và trạng thái thực tế của đơn trước khi xử lý.</p>

        <h3>4. Liên hệ hỗ trợ</h3>
        <p>
          Để hủy đơn hoặc yêu cầu kiểm tra giao dịch bất thường, vui lòng thực hiện một trong các cách sau:
        </p>
        <ul>
          <li>Nhấn nút <strong>"Hủy đơn"</strong> trực tiếp trong mục Lịch sử đặt chỗ trên website.</li>
          <li>Gọi Hotline: <strong>1900 6868</strong> (08:00 – 22:00 hàng ngày).</li>
          <li>Gửi email: <strong>support@easyparking.vn</strong> kèm mã đơn hàng và lý do hủy.</li>
        </ul>
      </article>
        </main>
      </div>
    </section>
  );
}
