import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Car,
  CarFront,
  CircleParking,
  Clock3,
  CreditCard,
  DoorOpen,
  Eye,
  Fingerprint,
  Hash,
  Image as ImageIcon,
  MapPin,
  ParkingSquare,
  QrCode,
  ShieldAlert,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import ParkingTicketModal from "../../components/ParkingTicketModal";
import ProtectedRoute from "../../components/ProtectedRoute";
import {
  formatUtcToVietnamDateTime,
  parseBackendUtcDate,
} from "../../utils/dateTime";
import {
  parkingSessionApi,
  subscriptionApi,
  type MonthlySubscriptionDto,
  type ParkingSessionDto,
} from "../../utils/apiServices";
import { normalizeLicensePlate } from "../../utils/licensePlate";
import { formatCurrency } from "../../utils/pricing";

type SessionFilter = "all" | "active" | "completed";

function statusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "Đang gửi";
    case "completed":
      return "Đã hoàn tất";
    case "cancelled":
      return "Đã huỷ";
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "badge-history-success";
    case "completed":
      return "badge-history-neutral";
    case "cancelled":
      return "badge-history-cancelled";
    default:
      return "badge-history-pending";
  }
}

function durationLabel(session: ParkingSessionDto) {
  const start = parseBackendUtcDate(session.entryTime).getTime();
  const end = session.exitTime
    ? parseBackendUtcDate(session.exitTime).getTime()
    : Date.now();
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days ? `${days} ngày` : "",
    hours ? `${hours} giờ` : "",
    `${minutes} phút`,
  ]
    .filter(Boolean)
    .join(" ");
}

function paymentStatusLabel(status?: string) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized === "success") return "Đã thanh toán";
  if (normalized === "pending") return "Chờ thanh toán";
  if (normalized === "failed") return "Thanh toán thất bại";
  return status || "Chưa có thanh toán";
}

function customerLabel(session: ParkingSessionDto) {
  if (session.reservationId) return "Xe đặt trước";
  if (session.driverUserId) return "Khách thành viên";
  return "Khách vãng lai";
}

function subscriptionForSession(
  session: ParkingSessionDto,
  subscriptions: MonthlySubscriptionDto[],
) {
  if (session.reservationId) return undefined;

  const sessionPlate = normalizeLicensePlate(session.licensePlateIn);
  const sessionVehicleType = session.vehicleTypeName?.trim().toLowerCase();
  const coverageTime = session.exitTime
    ? parseBackendUtcDate(session.exitTime).getTime()
    : Date.now();

  return subscriptions.find((subscription) => {
    const status = subscription.status.toLowerCase();
    const sameVehicleType =
      !sessionVehicleType ||
      !subscription.vehicleType ||
      subscription.vehicleType.trim().toLowerCase() === sessionVehicleType;

    return (
      status !== "pendingpayment" &&
      status !== "cancelled" &&
      normalizeLicensePlate(subscription.licensePlate) === sessionPlate &&
      sameVehicleType &&
      parseBackendUtcDate(subscription.startDate).getTime() <= coverageTime &&
      parseBackendUtcDate(subscription.endDate).getTime() >= coverageTime
    );
  });
}

function ParkingSessionsContent() {
  const [sessions, setSessions] = useState<ParkingSessionDto[]>([]);
  const [subscriptions, setSubscriptions] = useState<MonthlySubscriptionDto[]>(
    [],
  );
  const [ticketSession, setTicketSession] =
    useState<ParkingSessionDto | null>(null);
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [selected, setSelected] = useState<ParkingSessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSessions = async () => {
    setLoading(true);
    setError("");
    try {
      const [res, subscriptionResult] = await Promise.all([
        parkingSessionApi.getMy(),
        subscriptionApi.getMy().catch(() => null),
      ]);
      if (res.isSuccess) {
        setSessions(
          [...(res.result || [])].sort(
            (left, right) =>
              parseBackendUtcDate(right.entryTime).getTime() -
              parseBackendUtcDate(left.entryTime).getTime(),
          ),
        );
        setSubscriptions(
          subscriptionResult?.isSuccess &&
            Array.isArray(subscriptionResult.result)
            ? subscriptionResult.result
            : [],
        );
      } else {
        setError(res.message || "Không thể tải danh sách phiên gửi xe.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Không thể kết nối đến máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadSessions(), 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  const activeCount = sessions.filter(
    (item) => item.status.toLowerCase() === "active",
  ).length;
  const completedCount = sessions.filter(
    (item) => item.status.toLowerCase() === "completed",
  ).length;
  const filteredSessions = useMemo(() => {
    if (filter === "active")
      return sessions.filter((item) => item.status.toLowerCase() === "active");
    if (filter === "completed")
      return sessions.filter(
        (item) => item.status.toLowerCase() === "completed",
      );
    return sessions;
  }, [filter, sessions]);
  const selectedSubscription = useMemo(
    () =>
      selected ? subscriptionForSession(selected, subscriptions) : undefined,
    [selected, subscriptions],
  );

  return (
    <section className="parking-sessions-page">
      <header className="page-header parking-sessions-heading">
        <div>
          <h1>Phiên gửi xe</h1>
          <p>Theo dõi xe đang trong bãi và lịch sử các lượt gửi xe của bạn.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => void loadSessions()}
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </header>

      <div className="parking-session-summary">
        <div className="card-panel">
          <CircleParking size={22} />
          <span>Tổng phiên</span>
          <strong>{sessions.length}</strong>
        </div>
        <div className="card-panel parking-session-summary--active">
          <Car size={22} />
          <span>Đang trong bãi</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="card-panel">
          <Clock3 size={22} />
          <span>Đã hoàn tất</span>
          <strong>{completedCount}</strong>
        </div>
      </div>

      <div
        className="parking-session-filters"
        role="group"
        aria-label="Lọc phiên gửi xe"
      >
        {(
          [
            ["all", `Tất cả (${sessions.length})`],
            ["active", `Đang gửi (${activeCount})`],
            ["completed", `Đã hoàn tất (${completedCount})`],
          ] as Array<[SessionFilter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && sessions.length === 0 ? (
        <div className="empty-state card-panel">
          <p>Đang tải phiên gửi xe...</p>
        </div>
      ) : error ? (
        <div className="empty-state card-panel">
          <ShieldAlert size={40} />
          <p>{error}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void loadSessions()}
          >
            Thử lại
          </button>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="empty-state card-panel">
          <CircleParking size={44} />
          <p>Không có phiên gửi xe phù hợp.</p>
        </div>
      ) : (
        <div className="parking-session-list">
          {filteredSessions.map((session) => (
            <article
              key={session.sessionId}
              className="parking-session-card card-panel"
            >
              <div className="parking-session-plate">
                {session.licensePlateIn}
              </div>
              <div className="parking-session-card-main">
                <div className="parking-session-card-title">
                  <div>
                    <strong>{session.vehicleTypeName || "Phương tiện"}</strong>
                    <small>{durationLabel(session)}</small>
                  </div>
                  <span className={`badge ${statusClass(session.status)}`}>
                    {statusLabel(session.status)}
                  </span>
                </div>
                <div className="parking-session-meta">
                  <span>
                    <Clock3 size={15} />
                    Vào: {formatUtcToVietnamDateTime(session.entryTime)}
                  </span>
                  <span>
                    <MapPin size={15} />
                    Vị trí:{" "}
                    {session.actualSlotCode ||
                      session.assignedSlotCode ||
                      "Chưa xếp chỗ"}
                  </span>
                  <span>
                    <DoorOpen size={15} />
                    Cổng vào: {session.entryGateName || "—"}
                  </span>
                </div>
              </div>
              <div className="parking-session-actions">
                {session.ticket?.qrCodeDataUrl && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm staff-ticket-button"
                    onClick={() => setTicketSession(session)}
                  >
                    <QrCode size={16} aria-hidden /> Xem mã vé
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSelected(session)}
                >
                  <Eye size={15} aria-hidden /> Chi tiết
                </button>
                <Link
                  className="btn btn-outline btn-sm"
                  to="/bao-cao-su-co"
                  state={{ sessionId: session.sessionId }}
                >
                  <TriangleAlert size={15} /> Báo sự cố
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div
            className="modal-panel manager-session-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="parking-session-detail-title"
          >
            <div className="manager-modal-header">
              <div>
                <h3 id="parking-session-detail-title" className="modal-title">
                  Chi tiết phiên gửi xe
                </h3>
                <p>Toàn bộ thông tin phiên gửi xe của bạn.</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelected(null)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="manager-session-modal-hero">
              <div className="manager-session-plate">
                <small>VIỆT NAM</small>
                <strong>{selected.licensePlateIn}</strong>
                {selected.licensePlateOut &&
                  selected.licensePlateOut !== selected.licensePlateIn && (
                    <span>Ra: {selected.licensePlateOut}</span>
                  )}
              </div>
              <div>
                <strong>{selected.driverFullName || "Khách vãng lai"}</strong>
                <span>
                  {selected.vehicleTypeName || "Chưa rõ loại xe"} ·{" "}
                  {customerLabel(selected)}
                </span>
                <span
                  className={`manager-session-status status-${selected.status.toLowerCase()}`}
                >
                  <i />
                  {statusLabel(selected.status)}
                </span>
              </div>
            </div>

            <section className="manager-session-detail-section">
              <div className="manager-session-section-heading">
                <Hash size={17} aria-hidden />
                <div>
                  <h4>Thông tin định danh</h4>
                  <p>Các mã liên kết của phiên gửi xe trong hệ thống.</p>
                </div>
              </div>
              <div className="manager-session-detail-grid manager-session-detail-grid--ids">
                <div>
                  <Fingerprint size={17} aria-hidden />
                  <span>Mã phiên</span>
                  <code>{selected.sessionId}</code>
                </div>
                <div>
                  <QrCode size={17} aria-hidden />
                  <span>Mã đặt chỗ</span>
                  <code>{selected.reservationId || "Không có"}</code>
                </div>
                <div>
                  <UserRound size={17} aria-hidden />
                  <span>Mã người lái</span>
                  <code>{selected.driverUserId || "Khách vãng lai"}</code>
                </div>
                <div>
                  <CarFront size={17} aria-hidden />
                  <span>Mã loại phương tiện</span>
                  <code>{selected.vehicleTypeId || "—"}</code>
                </div>
              </div>
            </section>

            <section className="manager-session-detail-section">
              <div className="manager-session-section-heading">
                <CalendarDays size={17} aria-hidden />
                <div>
                  <h4>Thời gian và biển số</h4>
                  <p>Thông tin check-in, checkout và thời lượng gửi xe.</p>
                </div>
              </div>
              <div className="manager-session-detail-grid">
                <div>
                  <CalendarDays size={17} aria-hidden />
                  <span>Thời gian vào</span>
                  <strong>{formatUtcToVietnamDateTime(selected.entryTime)}</strong>
                </div>
                <div>
                  <CalendarDays size={17} aria-hidden />
                  <span>Thời gian ra</span>
                  <strong>
                    {selected.exitTime
                      ? formatUtcToVietnamDateTime(selected.exitTime)
                      : "Chưa checkout"}
                  </strong>
                </div>
                <div>
                  <Clock3 size={17} aria-hidden />
                  <span>Tổng thời lượng</span>
                  <strong>{durationLabel(selected)}</strong>
                </div>
                <div>
                  <CarFront size={17} aria-hidden />
                  <span>Biển số vào → ra</span>
                  <strong>
                    {selected.licensePlateIn || "—"} →{" "}
                    {selected.licensePlateOut || "Chưa ghi nhận"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="manager-session-detail-section">
              <div className="manager-session-section-heading">
                <CreditCard size={17} aria-hidden />
                <div>
                  <h4>Thanh toán</h4>
                  <p>Khoản phí checkout được liên kết với phiên gửi xe.</p>
                </div>
              </div>
              <div className="manager-session-detail-grid">
                <div>
                  <CreditCard size={17} aria-hidden />
                  <span>
                    {selectedSubscription
                      ? "Quyền lợi gói tháng"
                      : "Phí gửi xe"}
                  </span>
                  <strong>
                    {selectedSubscription
                      ? `Đã bao gồm trong ${selectedSubscription.packageName || "gói tháng"} · 0 ₫`
                      : typeof selected.paymentAmount === "number"
                      ? formatCurrency(selected.paymentAmount)
                      : selected.status.toLowerCase() === "active"
                        ? "Sẽ được tính khi checkout"
                        : "Chưa có thanh toán"}
                  </strong>
                </div>
                <div>
                  <Activity size={17} aria-hidden />
                  <span>Trạng thái</span>
                  <strong>
                    {selectedSubscription
                      ? "Không cần thanh toán riêng"
                      : paymentStatusLabel(selected.paymentStatus)}
                  </strong>
                </div>
                <div>
                  <CreditCard size={17} aria-hidden />
                  <span>Phương thức</span>
                  <strong>
                    {selectedSubscription
                      ? "Gói tháng"
                      : selected.paymentMethod || "Chưa ghi nhận"}
                  </strong>
                </div>
                <div>
                  <CalendarDays size={17} aria-hidden />
                  <span>Thời gian thanh toán</span>
                  <strong>
                    {selectedSubscription
                      ? "Đã thanh toán khi đăng ký gói"
                      : selected.paymentTime
                      ? formatUtcToVietnamDateTime(selected.paymentTime)
                      : "Chưa ghi nhận"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="manager-session-detail-section">
              <div className="manager-session-section-heading">
                <MapPin size={17} aria-hidden />
                <div>
                  <h4>Cổng và vị trí đỗ</h4>
                  <p>Đối chiếu vị trí được phân bổ với vị trí đỗ thực tế.</p>
                </div>
              </div>
              <div className="manager-session-detail-grid manager-session-detail-grid--route">
                <div>
                  <MapPin size={17} aria-hidden />
                  <span>Cổng vào</span>
                  <strong>{selected.entryGateName || "Chưa xác định"}</strong>
                  <code>{selected.entryGateId}</code>
                </div>
                <div>
                  <MapPin size={17} aria-hidden />
                  <span>Cổng ra</span>
                  <strong>{selected.exitGateName || "Chưa checkout"}</strong>
                  <code>{selected.exitGateId || "Chưa có"}</code>
                </div>
                <div>
                  <ParkingSquare size={17} aria-hidden />
                  <span>Slot được xếp</span>
                  <strong>{selected.assignedSlotCode || "Chưa xếp slot"}</strong>
                  <code>{selected.assignedSlotId || "Chưa có"}</code>
                </div>
                <div>
                  <ParkingSquare size={17} aria-hidden />
                  <span>Slot thực tế</span>
                  <strong>{selected.actualSlotCode || "Chưa ghi nhận"}</strong>
                  <code>{selected.actualSlotId || "Chưa có"}</code>
                </div>
              </div>
            </section>

            <section className="manager-session-detail-section">
              <div className="manager-session-section-heading">
                <ImageIcon size={17} aria-hidden />
                <div>
                  <h4>Ảnh phương tiện vào / ra</h4>
                  <p>Ảnh được nhân viên ghi nhận khi check-in và checkout.</p>
                </div>
              </div>
              <div className="manager-session-image-grid">
                <article>
                  <div>
                    {selected.entryImageUrl ? (
                      <a
                        href={selected.entryImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Mở ảnh xe lúc vào"
                      >
                        <img
                          src={selected.entryImageUrl}
                          alt={`Xe ${selected.licensePlateIn} lúc vào`}
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <span className="manager-session-image-empty">
                        <ImageIcon size={28} aria-hidden />
                        Chưa có ảnh lúc vào
                      </span>
                    )}
                  </div>
                  <strong>Ảnh lúc vào</strong>
                  <small>{formatUtcToVietnamDateTime(selected.entryTime)}</small>
                </article>
                <article>
                  <div>
                    {selected.exitImageUrl ? (
                      <a
                        href={selected.exitImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Mở ảnh xe lúc ra"
                      >
                        <img
                          src={selected.exitImageUrl}
                          alt={`Xe ${selected.licensePlateOut || selected.licensePlateIn} lúc ra`}
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <span className="manager-session-image-empty">
                        <ImageIcon size={28} aria-hidden />
                        Chưa có ảnh lúc ra
                      </span>
                    )}
                  </div>
                  <strong>Ảnh lúc ra</strong>
                  <small>
                    {selected.exitTime
                      ? formatUtcToVietnamDateTime(selected.exitTime)
                      : "Xe chưa checkout"}
                  </small>
                </article>
              </div>
            </section>

            {selected.ticket?.qrCodeDataUrl && (
              <div className="manager-session-ticket">
                <QrCode size={21} aria-hidden />
                <div>
                  <strong>Mã vé phiên đang hoạt động</strong>
                  <code>{selected.ticket.qrPayload}</code>
                </div>
                <img
                  src={selected.ticket.qrCodeDataUrl}
                  alt={`QR vé xe ${selected.licensePlateIn}`}
                />
              </div>
            )}

            <div className="form-actions manager-session-modal-actions">
              <Link
                className="btn btn-outline manager-session-report-button"
                to="/bao-cao-su-co"
                state={{ sessionId: selected.sessionId }}
                onClick={() => setSelected(null)}
              >
                <TriangleAlert size={16} /> Báo cáo sự cố cho phiên này
              </Link>
            </div>
          </div>
        </div>
      )}
      <ParkingTicketModal
        session={ticketSession}
        allowPrint={false}
        onClose={() => setTicketSession(null)}
      />
    </section>
  );
}

export default function ParkingSessions() {
  return (
    <ProtectedRoute>
      <ParkingSessionsContent />
    </ProtectedRoute>
  );
}
