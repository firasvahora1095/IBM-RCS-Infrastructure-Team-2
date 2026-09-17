import type {
  CreateReportResponse,
  PublicStatusResponse,
  StaffLoginResponse,
  AuditorCaseListItem,
  AuditorCaseDetail,
  ResolveCaseResponse,
  ManagerDashboardResponse,
  FinalOutcome,
} from "./types";
import { ApiError } from "./types";

// Read once from the environment rather than hard-coding the URL in every
// function — this is the one line that changes when the real Sprint 2
// backend is deployed in Week 3 (Task 104).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Shared helper: every endpoint needs the same "parse JSON, throw a typed
 * ApiError on failure" logic, so page components only ever handle one
 * error shape.
 */
async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  // A gateway error (e.g. Code Engine returning an HTML 502 page while the
  // container restarts) has no JSON body. Treat an unparseable body as
  // "no detail" instead of letting a SyntaxError escape to the page.
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // FastAPI puts the message in `detail`: a plain string for errors the
    // backend raises itself, or an array of {msg, loc, type} for validation
    // errors.
    const detail = (body as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg: string }) => d.msg).join("; ")
          : GENERIC_ERROR;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

/** Normal User uploads a video and gets back a Case ID. Public — no auth. */
export async function createReport(videoFile: File): Promise<CreateReportResponse> {
  // The backend expects multipart/form-data with a single field named "video".
  const formData = new FormData();
  formData.append("video", videoFile);

  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: "POST",
    body: formData,
    // Deliberately no Content-Type header — the browser adds the multipart
    // boundary itself when the body is FormData. Setting it by hand drops
    // the boundary and the server can't parse the upload.
  });
  return parseJsonOrThrow<CreateReportResponse>(response);
}

/** Public status lookup by Case ID. No auth, no signup, ever (UR-VU-02). */
export async function getStatus(caseId: string): Promise<PublicStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/status/${encodeURIComponent(caseId)}`);
  return parseJsonOrThrow<PublicStatusResponse>(response);
}

/**
 * Staff login. The live backend takes query parameters, not a JSON body —
 * unusual for a login endpoint, but that's what it expects.
 */
export async function staffLogin(auditorId: string, password: string): Promise<StaffLoginResponse> {
  const params = new URLSearchParams({ auditor_id: auditorId, password });
  const response = await fetch(`${API_BASE_URL}/api/staff/login?${params.toString()}`, {
    method: "POST",
  });
  return parseJsonOrThrow<StaffLoginResponse>(response);
}

/** Cases assigned to the logged-in Auditor only (AR-AS-01 — enforced server-side). */
export async function getAuditorCases(token: string): Promise<AuditorCaseListItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/auditor/cases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<AuditorCaseListItem[]>(response);
}

/** Full detail (severity/summary/timeline) for one case, Auditor-only. */
export async function getAuditorCaseDetail(caseId: string, token: string): Promise<AuditorCaseDetail> {
  const response = await fetch(`${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<AuditorCaseDetail>(response);
}

/**
 * Submit the Auditor's final decision. `auditorSeverityScore` is only sent
 * when the Auditor changed the AI's rating, and the backend rejects that
 * without a comment (AR-AI-07) — the UI enforces the same rule before
 * submitting, so an Auditor never has to hit that server error.
 */
export async function resolveCase(
  caseId: string,
  token: string,
  finalOutcome: FinalOutcome,
  auditorSeverityScore?: number,
  auditorComment?: string
): Promise<ResolveCaseResponse> {
  const params = new URLSearchParams({ final_outcome: finalOutcome });
  if (auditorSeverityScore !== undefined) {
    params.set("auditor_severity_score", String(auditorSeverityScore));
  }
  if (auditorComment !== undefined) {
    params.set("auditor_comment", auditorComment);
  }
  const response = await fetch(
    `${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}/resolve?${params.toString()}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  return parseJsonOrThrow<ResolveCaseResponse>(response);
}

/** Manager dashboard data. Sprint 2 renders this as an honest scaffold (Task 10). */
export async function getManagerDashboard(): Promise<ManagerDashboardResponse> {
  const response = await fetch(`${API_BASE_URL}/api/manager/dashboard`);
  return parseJsonOrThrow<ManagerDashboardResponse>(response);
}
