import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  ImageOff,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import ProtectedRoute from "../../components/ProtectedRoute";
import {
  formatUtcToVietnamDateTime,
  parseBackendUtcDate,
} from "../../utils/dateTime";
import {
  incidentReportApi,
  parkingSessionApi,
  type IncidentReportDto,
  type ParkingSessionDto,
} from "../../utils/apiServices";

const ISSUE_TYPES = [
  { value: "LostTicket", label: "Mất vé hoặc mã QR" },
  { value: "PlateMismatch", label: "Thông tin biển số không đúng" },
  { value: "PaymentIssue", label: "Vấn đề thanh toán" },
  { value: "SlotIssue", label: "Vấn đề vị trí đỗ xe" },
  { value: "VehicleDamage", label: "Xe bị hư hỏng hoặc va quẹt" },
  { value: "Other", label: "Sự cố khác" },
];

const STATUS_LABELS: Record<string, string> = {
  open: "Chờ tiếp nhận",
  inprogress: "Đang xử lý",
  resolved: "Đã giải quyết",
  cancelled: "Đã hủy",
};

function normalize(value?: string) {
  return (value || "").replace(/[\s_-]/g, "").toLowerCase();
}

function issueLabel(value?: string) {
  return (
    ISSUE_TYPES.find((item) => normalize(item.value) === normalize(value))
      ?.label ||
    value ||
    "Sự cố khác"
  );
}

function statusLabel(value?: string) {
  return STATUS_LABELS[normalize(value)] || value || "Không rõ";
}

function IncidentReportsContent() {
  const location = useLocation();
  const routeState = location.state as { sessionId?: string } | null;
  const [reports, setReports] = useState<IncidentReportDto[]>([]);
  const [sessions, setSessions] = useState<ParkingSessionDto[]>([]);
  const [sessionId, setSessionId] = useState(routeState?.sessionId || "");
  const [issueType, setIssueType] = useState("LostTicket");
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedReport, setSelectedReport] =
    useState<IncidentReportDto | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [reportResponse, sessionResponse] = await Promise.all([
        incidentReportApi.getMy(),
        parkingSessionApi.getMy(),
      ]);
      setReports(
        reportResponse.isSuccess && reportResponse.result
          ? [...reportResponse.result].sort((left, right) => {
              const leftTime = left.resolvedAt
                ? parseBackendUtcDate(left.resolvedAt).getTime()
                : 0;
              const rightTime = right.resolvedAt
                ? parseBackendUtcDate(right.resolvedAt).getTime()
                : 0;
              return rightTime - leftTime;
            })
          : [],
      );
      setSessions(
        sessionResponse.isSuccess && sessionResponse.result
          ? [...sessionResponse.result].sort(
              (left, right) =>
                parseBackendUtcDate(right.entryTime).getTime() -
                parseBackendUtcDate(left.entryTime).getTime(),
            )
          : [],
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải dữ liệu báo cáo sự cố.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const reportCounts = useMemo(
    () => ({
      open: reports.filter((item) => normalize(item.status) === "open").length,
      inProgress: reports.filter(
        (item) => normalize(item.status) === "inprogress",
      ).length,
      resolved: reports.filter((item) => normalize(item.status) === "resolved")
        .length,
    }),
    [reports],
  );

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim()) {
      setError("Vui lòng mô tả chi tiết sự cố.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let proofImageUrl: string | undefined;
      if (proofFile) {
        const upload = await incidentReportApi.uploadProof(proofFile);
        proofImageUrl = upload.imageUrl;
      }
      const response = await incidentReportApi.create({
        sessionId: sessionId || undefined,
        issueType,
        description: description.trim(),
        proofImageUrl,
        status: "Open",
      });
      if (!response.isSuccess)
        throw new Error(response.message || "Không thể gửi báo cáo sự cố.");
      setSessionId("");
      setIssueType("LostTicket");
      setDescription("");
      setProofFile(null);
      setSuccess(
        "Báo cáo đã được gửi. Nhân viên bãi xe sẽ tiếp nhận trong thời gian sớm nhất.",
      );
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể gửi báo cáo sự cố.",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectProof = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 5 * 1024 * 1024) {
      setError("Ảnh minh chứng không được vượt quá 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setProofFile(file);
  };

  const selectedSession = selectedReport
    ? sessions.find((session) => session.sessionId === selectedReport.sessionId)
    : undefined;

  return (
    <section className="user-incident-page">
      <header className="page-header user-incident-heading">
        <div>
          <h1>Báo cáo sự cố</h1>
          <p>
            Thông báo vấn đề phát sinh trong quá trình đặt chỗ, gửi xe hoặc
            thanh toán.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => void loadData()}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "spin" : ""} /> Làm mới
        </button>
      </header>

      <div className="user-incident-summary">
        <article className="card-panel">
          <AlertTriangle size={21} />
          <span>Chờ tiếp nhận</span>
          <strong>{reportCounts.open}</strong>
        </article>
        <article className="card-panel user-incident-summary--progress">
          <Clock3 size={21} />
          <span>Đang xử lý</span>
          <strong>{reportCounts.inProgress}</strong>
        </article>
        <article className="card-panel user-incident-summary--resolved">
          <ShieldCheck size={21} />
          <span>Đã giải quyết</span>
          <strong>{reportCounts.resolved}</strong>
        </article>
      </div>

      <div className="user-incident-layout">
        <form className="card-panel user-incident-form" onSubmit={submitReport}>
          <div className="user-incident-section-title">
            <span>
              <Plus size={18} />
            </span>
            <div>
              <h2>Tạo báo cáo mới</h2>
              <p>Cung cấp đủ thông tin để nhân viên kiểm tra nhanh hơn.</p>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="incident-session-user">
              Phiên gửi xe liên quan
            </label>
            <select
              id="incident-session-user"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
            >
              <option value="">Không gắn với phiên cụ thể</option>
              {sessions.map((session) => (
                <option key={session.sessionId} value={session.sessionId}>
                  {session.licensePlateIn} ·{" "}
                  {session.vehicleTypeName || "Phương tiện"} ·{" "}
                  {formatUtcToVietnamDateTime(session.entryTime)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="incident-type-user">Loại sự cố *</label>
            <select
              id="incident-type-user"
              value={issueType}
              onChange={(event) => setIssueType(event.target.value)}
            >
              {ISSUE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="incident-description-user">Mô tả chi tiết *</label>
            <textarea
              id="incident-description-user"
              rows={5}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Mô tả thời gian, vị trí và tình huống đã xảy ra..."
            />
            <small className="field-hint">
              {description.length}/1000 ký tự
            </small>
          </div>
          <div className="form-field">
            <label htmlFor="incident-proof-user">Ảnh minh chứng</label>
            <label
              className="user-incident-upload"
              htmlFor="incident-proof-user"
            >
              <Camera size={20} />
              <span>
                {proofFile ? proofFile.name : "Chọn ảnh JPG, PNG hoặc WEBP"}
              </span>
            </label>
            <input
              id="incident-proof-user"
              className="upload-input-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selectProof}
            />
          </div>
          {error && (
            <div className="alert-inline alert-error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="alert-inline alert-success" role="status">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={saving || !description.trim()}
          >
            {saving ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <AlertTriangle size={17} />
            )}
            {saving ? "Đang gửi..." : "Gửi báo cáo sự cố"}
          </button>
        </form>

        <section className="card-panel user-incident-history">
          <div className="user-incident-section-title">
            <span>
              <Clock3 size={18} />
            </span>
            <div>
              <h2>Báo cáo của tôi</h2>
              <p>Theo dõi tiến độ và kết quả xử lý.</p>
            </div>
          </div>
          {loading && reports.length === 0 ? (
            <div className="user-incident-empty">Đang tải báo cáo...</div>
          ) : reports.length === 0 ? (
            <div className="user-incident-empty">
              <ShieldCheck size={35} />
              <strong>Chưa có báo cáo nào</strong>
              <span>Các báo cáo bạn gửi sẽ xuất hiện tại đây.</span>
            </div>
          ) : (
            <div className="user-incident-list">
              {reports.map((report) => (
                <article
                  key={report.incidentId}
                  className={`user-incident-card status-${normalize(report.status)}`}
                >
                  <div className="user-incident-card-head">
                    <div>
                      <strong>{issueLabel(report.issueType)}</strong>
                      {report.sessionId && (
                        <small>
                          Phiên {report.sessionId.slice(0, 8).toUpperCase()}
                        </small>
                      )}
                    </div>
                    <span>{statusLabel(report.status)}</span>
                  </div>
                  <p>{report.description}</p>
                  {report.handledByStaffFullName && (
                    <small>
                      Nhân viên phụ trách:{" "}
                      <strong>{report.handledByStaffFullName}</strong>
                    </small>
                  )}
                  {report.resolutionNotes && (
                    <div className="user-incident-resolution">
                      <CheckCircle2 size={15} />
                      <span>
                        <strong>Kết quả xử lý</strong>
                        {report.resolutionNotes}
                      </span>
                    </div>
                  )}
                  {report.resolvedAt && (
                    <time>
                      Hoàn tất: {formatUtcToVietnamDateTime(report.resolvedAt)}
                    </time>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm user-incident-detail-button"
                    onClick={() => setSelectedReport(report)}
                  >
                    <Eye size={15} /> Xem chi tiết
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedReport && (
        <div
          className="modal-overlay"
          onClick={(event) =>
            event.target === event.currentTarget && setSelectedReport(null)
          }
        >
          <div
            className="modal-panel manager-form-modal manager-incident-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-incident-detail-title"
          >
            <div className="manager-modal-header">
              <div>
                <div className="manager-incident-detail-title-row">
                  <h3 id="user-incident-detail-title" className="modal-title">
                    Chi tiết báo cáo sự cố
                  </h3>
                  <span
                    className={`manager-session-status status-${normalize(selectedReport.status)}`}
                  >
                    <i />
                    {statusLabel(selectedReport.status)}
                  </span>
                </div>
                <p>
                  {issueLabel(selectedReport.issueType)} · Mã{" "}
                  {selectedReport.incidentId.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Đóng"
                onClick={() => setSelectedReport(null)}
              >
                <X size={20} />
              </button>
            </div>

            <section className="manager-incident-detail-section">
              <h4>Thông tin báo cáo</h4>
              <div className="manager-incident-detail-grid">
                <div>
                  <span>Mã báo cáo</span>
                  <strong>{selectedReport.incidentId}</strong>
                </div>
                <div>
                  <span>Loại sự cố</span>
                  <strong>{issueLabel(selectedReport.issueType)}</strong>
                </div>
                <div>
                  <span>Nhân viên phụ trách</span>
                  <strong>
                    {selectedReport.handledByStaffFullName ||
                      "Chưa có nhân viên tiếp nhận"}
                  </strong>
                </div>
                <div>
                  <span>Trạng thái</span>
                  <strong>{statusLabel(selectedReport.status)}</strong>
                </div>
                <div className="form-field--full manager-incident-description-box">
                  <span>Mô tả chi tiết</span>
                  <strong>{selectedReport.description}</strong>
                </div>
              </div>
            </section>

            <section className="manager-incident-detail-section">
              <h4>Phiên gửi xe liên quan</h4>
              {selectedSession ? (
                <div className="manager-incident-detail-grid">
                  <div>
                    <span>Biển số</span>
                    <strong>{selectedSession.licensePlateIn}</strong>
                  </div>
                  <div>
                    <span>Loại phương tiện</span>
                    <strong>
                      {selectedSession.vehicleTypeName || "Chưa rõ"}
                    </strong>
                  </div>
                  <div>
                    <span>Thời gian vào</span>
                    <strong>
                      {formatUtcToVietnamDateTime(selectedSession.entryTime)}
                    </strong>
                  </div>
                  <div>
                    <span>Thời gian ra</span>
                    <strong>
                      {selectedSession.exitTime
                        ? formatUtcToVietnamDateTime(selectedSession.exitTime)
                        : "Xe chưa ra"}
                    </strong>
                  </div>
                  <div>
                    <span>Cổng vào</span>
                    <strong>
                      {selectedSession.entryGateName || "Chưa rõ"}
                    </strong>
                  </div>
                  <div>
                    <span>Vị trí đỗ</span>
                    <strong>
                      {selectedSession.actualSlotCode ||
                        selectedSession.assignedSlotCode ||
                        "Chưa gán"}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="manager-incident-no-session">
                  Báo cáo này không gắn với phiên gửi xe cụ thể.
                </div>
              )}
            </section>

            <section className="manager-incident-detail-section">
              <h4>Ảnh minh chứng và kết quả xử lý</h4>
              {selectedReport.proofImageUrl ? (
                <a
                  className="manager-incident-proof"
                  href={selectedReport.proofImageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={selectedReport.proofImageUrl}
                    alt="Ảnh minh chứng sự cố"
                  />
                  <span>
                    <ExternalLink size={16} /> Mở ảnh đầy đủ
                  </span>
                </a>
              ) : (
                <div className="manager-incident-no-proof">
                  <ImageOff size={26} />
                  <div>
                    <strong>Chưa có ảnh minh chứng</strong>
                    <span>Báo cáo này không có ảnh đính kèm.</span>
                  </div>
                </div>
              )}
              {selectedReport.resolutionNotes && (
                <div className="manager-incident-resolution-detail">
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>Kết quả xử lý</strong>
                    <p>{selectedReport.resolutionNotes}</p>
                    {selectedReport.resolvedAt && (
                      <small>
                        Hoàn tất lúc{" "}
                        {formatUtcToVietnamDateTime(selectedReport.resolvedAt)}
                      </small>
                    )}
                  </div>
                </div>
              )}
            </section>

            <div className="manager-incident-detail-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedReport(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function IncidentReports() {
  return (
    <ProtectedRoute>
      <IncidentReportsContent />
    </ProtectedRoute>
  );
}
