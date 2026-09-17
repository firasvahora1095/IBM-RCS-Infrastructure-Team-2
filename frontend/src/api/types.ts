/**
 * Every type below is copied from a REAL request/response captured while
 * testing the live test backend on 2026-09-16/17, cross-checked against the
 * backend source on the team's spike/week1-fullstack-experiment branch.
 * Most of these endpoints don't have typed response models in the OpenAPI
 * schema yet, so the schema alone wouldn't have been enough.
 */

/** Internal workflow states the backend uses (BA baseline RT-02). */
export type InternalCaseStatus = "SUBMITTED" | "AI_PROCESSING" | "READY_FOR_REVIEW" | "AUDITOR_REVIEW" | "COMPLETE";

/** The only three states a Normal User is ever allowed to see (UR-ST-02). */
export type PublicCaseStatus = "Received" | "Being Reviewed" | "Complete";

export type SeverityTier = "S1" | "S2" | "S3" | "S4";

/** Final outcome values confirmed by the PM in BA baseline RT-01. */
export type FinalOutcome = "NO_VIOLATION_FOUND" | "POLICY_VIOLATION_FOUND";

/** Response from POST /api/reports (creating a case from an uploaded video). */
export interface CreateReportResponse {
  case_id: string;
  status: string; // already public-safe from this endpoint, e.g. "Being Reviewed"
  assigned_auditor: string | null;
}

/** Response from GET /api/status/{case_id}. */
export interface PublicStatusResponse {
  case_id: string;
  status: string; // public-safe from this endpoint — still mapped defensively before display
  final_outcome: string | null; // only non-null once the case is Complete
}

/** Response from POST /api/staff/login. */
export interface StaffLoginResponse {
  token: string;
  role: "auditor" | "manager";
}

/** One row from GET /api/auditor/cases — note `status` here IS the internal value. */
export interface AuditorCaseListItem {
  case_id: string;
  status: InternalCaseStatus;
  severity_tier: SeverityTier | null;
}

/** One flagged range on a case's incident timeline. */
export interface IncidentTimelineEntry {
  start: number; // seconds into the video
  end: number;
  severity_tier: SeverityTier;
}

/** Response from GET /api/auditor/cases/{case_id}. */
export interface AuditorCaseDetail {
  case_id: string;
  status: InternalCaseStatus;
  watson_severity_score: number | null; // raw model score — audit trail only, never shown as "the" score
  effective_severity_score: number | null; // post-floor score — THIS is what the Auditor sees
  severity_tier: SeverityTier | null;
  narrative_summary: string | null;
  incident_timeline: IncidentTimelineEntry[] | null;
}

/** Response from POST /api/auditor/cases/{case_id}/resolve. */
export interface ResolveCaseResponse {
  case_id: string;
  status: string;
  final_outcome: string;
}

/** Response from GET /api/manager/dashboard. */
export interface ManagerDashboardResponse {
  auditors: unknown[]; // empty on the test backend — real row shape not yet observed
  pending_declined_cases: number;
}

/**
 * Shown when a request fails before any response arrives (offline, DNS,
 * TLS or CORS failure). Pages use it as the detail line under their own
 * error title, so the notice never just repeats the title.
 */
export const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

/** Thrown by the API client on any non-2xx response, so pages handle one error type. */
export class ApiError extends Error {
  // Declared as a normal field rather than a `public status` constructor
  // parameter property: the project's tsconfig enables erasableSyntaxOnly,
  // which rejects parameter properties because they emit runtime code.
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
