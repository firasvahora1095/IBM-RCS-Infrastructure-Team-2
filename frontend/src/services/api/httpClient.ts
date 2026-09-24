import type {
  AuditorCaseDetail,
  AuditorCaseListItem,
  AuditorDetail,
  AuditorOverviewRow,
  AuditorWellbeing,
  CooldownState,
  CreateReportResponse,
  DeclinedCaseRow,
  DeclineReason,
  ExposureSample,
  FinalOutcome,
  ManagerCaseReview,
  ManagerCaseRow,
  ManagerDashboardResponse,
  PublicStatusResponse,
  ReassignmentContext,
  ResolveCaseResponse,
  SosAlert,
  SosAlertDetail,
  SosFollowUpOutcome,
  SosSummary,
  StaffLoginResponse,
  UnexpectedExposureReason,
  ValidationSummary,
  WellbeingRequestKind,
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

// ---------------------------------------------------------------------------
// Auditor wellbeing
// ---------------------------------------------------------------------------

export async function getMyWellbeing(token: string): Promise<AuditorWellbeing> {
  const r = await fetch(`${API_BASE_URL}/api/auditor/wellbeing`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<AuditorWellbeing>(r);
}

export async function acknowledgeContentWarning(
  caseId: string,
  token: string,
): Promise<{ acknowledged: true }> {
  const r = await fetch(
    `${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}/acknowledge-content-warning`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<{ acknowledged: true }>(r);
}

export async function declineCase(
  caseId: string,
  token: string,
  reason: DeclineReason,
  otherText?: string,
): Promise<{ declined: true }> {
  const r = await fetch(
    `${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}/decline`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason, other_text: otherText ?? null }),
    },
  );
  return parseJsonOrThrow<{ declined: true }>(r);
}

export async function recordExposure(
  caseId: string,
  token: string,
  sample: ExposureSample,
): Promise<{ recorded: true }> {
  const r = await fetch(
    `${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}/exposure`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ seconds: sample.seconds }),
    },
  );
  return parseJsonOrThrow<{ recorded: true }>(r);
}

export async function triggerSos(
  caseId: string,
  token: string,
): Promise<{ cooldown: CooldownState }> {
  const r = await fetch(
    `${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}/sos`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<{ cooldown: CooldownState }>(r);
}

export async function reportUnexpectedExposure(
  caseId: string,
  token: string,
  reason: UnexpectedExposureReason,
): Promise<{ cooldown: CooldownState }> {
  const r = await fetch(
    `${API_BASE_URL}/api/auditor/cases/${encodeURIComponent(caseId)}/unexpected-exposure`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
  );
  return parseJsonOrThrow<{ cooldown: CooldownState }>(r);
}

export async function requestWellbeingSupport(
  token: string,
  kind: WellbeingRequestKind,
  caseId?: string,
): Promise<{ received: true }> {
  const r = await fetch(`${API_BASE_URL}/api/auditor/wellbeing-support`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ kind, case_id: caseId ?? null }),
  });
  return parseJsonOrThrow<{ received: true }>(r);
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export async function getAuditorOverview(token: string): Promise<AuditorOverviewRow[]> {
  const r = await fetch(`${API_BASE_URL}/api/manager/auditors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<AuditorOverviewRow[]>(r);
}

export async function getSosSummary(token: string): Promise<SosSummary> {
  const r = await fetch(`${API_BASE_URL}/api/manager/sos-summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<SosSummary>(r);
}

export async function getAuditorDetail(auditorId: string, token: string): Promise<AuditorDetail> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/auditors/${encodeURIComponent(auditorId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<AuditorDetail>(r);
}

export async function setExposureLimit(
  auditorId: string,
  token: string,
  minutes: number,
): Promise<{ exposure_limit_minutes: number }> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/auditors/${encodeURIComponent(auditorId)}/exposure-limit`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    },
  );
  return parseJsonOrThrow<{ exposure_limit_minutes: number }>(r);
}

export async function approveBreakRequest(
  requestId: string,
  token: string,
): Promise<{ approved: true }> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/auditors/_/break-requests/${encodeURIComponent(requestId)}/approve`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<{ approved: true }>(r);
}

export async function getCaseOversight(token: string): Promise<ManagerCaseRow[]> {
  const r = await fetch(`${API_BASE_URL}/api/manager/cases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<ManagerCaseRow[]>(r);
}

export async function listSosAlerts(token: string): Promise<SosAlert[]> {
  const r = await fetch(`${API_BASE_URL}/api/manager/sos-alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<SosAlert[]>(r);
}

export async function getSosAlert(alertId: string, token: string): Promise<SosAlertDetail> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/sos-alerts/${encodeURIComponent(alertId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<SosAlertDetail>(r);
}

export async function acknowledgeSosAlert(
  alertId: string,
  token: string,
): Promise<{ acknowledged: true }> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/sos-alerts/${encodeURIComponent(alertId)}/acknowledge`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<{ acknowledged: true }>(r);
}

export async function logSosFollowUp(
  alertId: string,
  token: string,
  notes: string,
  outcome: SosFollowUpOutcome,
): Promise<{ resolved: true }> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/sos-alerts/${encodeURIComponent(alertId)}/follow-up`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ notes, outcome }),
    },
  );
  return parseJsonOrThrow<{ resolved: true }>(r);
}

export async function listDeclinedCases(token: string): Promise<DeclinedCaseRow[]> {
  const r = await fetch(`${API_BASE_URL}/api/manager/declined-cases`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<DeclinedCaseRow[]>(r);
}

export async function getManagerCaseReview(
  caseId: string,
  token: string,
): Promise<ManagerCaseReview> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/cases/${encodeURIComponent(caseId)}/review`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<ManagerCaseReview>(r);
}

export async function getReassignmentContext(
  caseId: string,
  token: string,
): Promise<ReassignmentContext> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/cases/${encodeURIComponent(caseId)}/reassignment`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<ReassignmentContext>(r);
}

export async function reassignCase(
  caseId: string,
  token: string,
  auditorId: string,
): Promise<{ assigned_to_name: string }> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/cases/${encodeURIComponent(caseId)}/reassign`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ auditor_id: auditorId }),
    },
  );
  return parseJsonOrThrow<{ assigned_to_name: string }>(r);
}

export async function closeWithoutReassignment(
  caseId: string,
  token: string,
  note: string,
): Promise<{ status: string }> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/cases/${encodeURIComponent(caseId)}/close`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    },
  );
  return parseJsonOrThrow<{ status: string }>(r);
}

export async function getCaseForExceptionalAccess(
  caseId: string,
  token: string,
): Promise<AuditorCaseDetail> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/cases/${encodeURIComponent(caseId)}/exceptional-access`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<AuditorCaseDetail>(r);
}

export async function recordExceptionalAccess(
  caseId: string,
  token: string,
): Promise<{ recorded: true }> {
  const r = await fetch(
    `${API_BASE_URL}/api/manager/cases/${encodeURIComponent(caseId)}/exceptional-access`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  return parseJsonOrThrow<{ recorded: true }>(r);
}

export async function getValidationSummary(token: string): Promise<ValidationSummary> {
  const r = await fetch(`${API_BASE_URL}/api/manager/validation`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJsonOrThrow<ValidationSummary>(r);
}