import type {
  CreateReportResponse,
  PublicStatusResponse,
  StaffLoginResponse,
  AuditorCaseListItem,
  AuditorCaseDetail,
  ResolveCaseResponse,
  ManagerDashboardResponse,
  FinalOutcome,
} from "../types";

import { ApiError } from "../types";

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

  // A successful status with no JSON body means the request never reached the
  // API — typically a wrong VITE_API_BASE_URL, where the web server answers
  // with its HTML page. Fail loudly instead of handing the page `null`.
  if (body === null && response.status !== 204) {
    throw new ApiError(
      "The server sent an unexpected response. Check the API address and try again.",
      502,
    );
  }

  return body as T;
}

/** Normal User uploads a video and gets back a Case ID. Public — no auth. */
export async function createReport(
  videoFile: File,
): Promise<CreateReportResponse> {
  // The backend expects multipart/form-data with a single field named "video".
  const formData = new FormData();
  formData.append("video", videoFile);

  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: "POST",
    body: formData,
    // Deliberately no Content-Type header — the browser adds the multipart
    // boundary itself when the body is FormData.
  });

  return parseJsonOrThrow<CreateReportResponse>(response);
}

/** Public status lookup by Case ID. No auth, no signup. */
export async function getStatus(
  caseId: string,
): Promise<PublicStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/status/${encodeURIComponent(caseId)}`,
  );

  return parseJsonOrThrow<PublicStatusResponse>(response);
}

/**
 * Staff login.
 * Backend expects a JSON body with staff_id and password.
 */
export async function staffLogin(
  staffId: string,
  password: string,
): Promise<StaffLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/staff/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      staff_id: staffId,
      password,
    }),
  });

  return parseJsonOrThrow<StaffLoginResponse>(response);
}

/** Cases assigned to the logged-in Auditor only. */
export async function getAuditorCases(
  token: string,
): Promise<AuditorCaseListItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/auditor/cases`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJsonOrThrow<AuditorCaseListItem[]>(response);
}

/** Full detail for one Auditor-owned case. */
export async function getAuditorCaseDetail(
  caseId: string,
  token: string,
): Promise<AuditorCaseDetail> {
  const response = await fetch(
    `${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return parseJsonOrThrow<AuditorCaseDetail>(response);
}

/**
 * Submit the Auditor's final decision.
 *
 * Backend expects JSON:
 * {
 *   final_outcome,
 *   auditor_severity_score?,
 *   auditor_comment?
 * }
 */
export async function resolveCase(
  caseId: string,
  token: string,
  finalOutcome: FinalOutcome,
  auditorSeverityScore?: number,
  auditorComment?: string,
): Promise<ResolveCaseResponse> {
  const body: Record<string, unknown> = {
    final_outcome: finalOutcome,
  };

  if (auditorSeverityScore !== undefined) {
    body.auditor_severity_score = auditorSeverityScore;
  }

  if (auditorComment !== undefined) {
    body.auditor_comment = auditorComment;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}/resolve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  return parseJsonOrThrow<ResolveCaseResponse>(response);
}

/**
 * Manager dashboard data.
 * Backend requires a Manager Bearer token.
 */
export async function getManagerDashboard(
  token: string,
): Promise<ManagerDashboardResponse> {
  const response = await fetch(`${API_BASE_URL}/api/manager/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJsonOrThrow<ManagerDashboardResponse>(response);
}