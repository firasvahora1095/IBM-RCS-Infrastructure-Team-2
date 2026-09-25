/**
 * The frontend's data contract: every shape the UI reads or sends.
 *
 * The core Sprint 2 shapes (reports, status, staff login, auditor cases,
 * resolve, manager dashboard) were first captured from real responses of
 * the team's test harness (spike/week1-fullstack-experiment). Fields marked
 * "optional — UI needs" are what the Figma screens display but no backend
 * returns yet; the mock data source provides them, and the UI hides them
 * cleanly when a real backend leaves them out. See
 * docs/frontend/BACKEND-INTEGRATION.md for the endpoint-by-endpoint list.
 */

/** Internal workflow states the backend uses (BA baseline RT-02). */
export type InternalCaseStatus = "SUBMITTED" | "AI_PROCESSING" | "READY_FOR_REVIEW" | "AUDITOR_REVIEW" | "COMPLETE";

/** The only three states a Normal User is ever allowed to see (UR-ST-02). */
export type PublicCaseStatus = "Received" | "Being Reviewed" | "Complete";

export type SeverityTier = "S1" | "S2" | "S3" | "S4";

/** Final outcome values an Auditor selects, confirmed by the PM in BA baseline RT-01. */
export type FinalOutcome = "NO_VIOLATION_FOUND" | "POLICY_VIOLATION_FOUND";

/**
 * Every outcome a completed case can carry. Adds the content-neutral outcome
 * for a declined case a Manager closes with "No reassignment needed"
 * (UX decision, Normal User handoff Round 8 / Manager handoff Round 5).
 * Not yet listed in RT-01 — flagged for the BA to add.
 */
export type CaseOutcome = FinalOutcome | "CLOSED_NO_REASSIGNMENT";

export type StaffRole = "auditor" | "manager";

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
  // Optional — UI needs (Figma 7:15 "Case details" block):
  submitted_at?: string | null; // ISO 8601
  updated_at?: string | null; // ISO 8601
  content_type?: "Video" | "Link" | "Screenshot" | null;
  duration_seconds?: number | null;
  file_name?: string | null;
}

/** Response from POST /api/staff/login. */
export interface StaffLoginResponse {
  token: string;
  role: StaffRole;
}

/** One row from GET /api/auditor/cases — note `status` here IS the internal value. */
export interface AuditorCaseListItem {
  case_id: string;
  status: InternalCaseStatus;
  severity_tier: SeverityTier | null;
  // Optional — UI needs (Figma 10:6 "Assigned" column):
  assigned_at?: string | null; // ISO 8601
}

/**
 * One flagged moment or range on a case's incident timeline. A point-in-time
 * detection has start === end. `tag` is the visual tag from
 * docs/ba/severity-scale.md (e.g. "weapon_present") when the pipeline
 * provides it.
 */
export interface IncidentTimelineEntry {
  start: number; // seconds into the video
  end: number;
  severity_tier: SeverityTier;
  tag?: string | null; // optional — UI needs (Figma 437:232 tag labels)
}

/** A flagged entity with the span it appears in (Figma 18:62). */
export interface FlaggedEntity {
  label: string; // e.g. "Person A", "Object: blunt weapon"
  start: number;
  end: number;
}

/** One timestamped line of the speech-to-text transcript (Figma 18:78). */
export interface TranscriptLine {
  time: number; // seconds
  text: string;
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
  // Optional — UI needs (Figma 18:26, 20:35):
  video_duration_seconds?: number | null;
  flagged_entities?: FlaggedEntity[] | null;
  transcript?: TranscriptLine[] | null;
  /** Audio intensity per equal time bucket, each 0–1. Not an emotion measure. */
  audio_intensity?: number[] | null;
  /** Set when AI vision or speech-to-text processing failed (AR-AI-10). */
  ai_failure?: "vision" | "speech_to_text" | null;
  /** Plain-language flag reason shown in the content warning, e.g. "Graphic violence" (Figma 16:30). */
  flag_reason?: string | null;
}

/** Response from POST /api/auditor/cases/{case_id}/resolve. */
export interface ResolveCaseResponse {
  case_id: string;
  status: string;
  final_outcome: string;
  /** Optional — UI needs: the cooldown this submission started, if any (AR-WB-12). */
  cooldown?: CooldownState | null;
}

/** Response from GET /api/manager/dashboard. */
export interface ManagerDashboardResponse {
  auditors: unknown[]; // empty on the test backend — real row shape not yet observed
  pending_declined_cases: number;
}

/** Optional contact details for case status updates (UR-ID-05, UR-ST-05/06 — Nice-to-Have). */
export interface StatusUpdateContact {
  email?: string;
  /** Country code and national number, e.g. "+61 0400 000 000". */
  phone?: string;
}

/** An Auditor's own exposure and cooldown state (AR-WB-01, AR-WB-02, AR-WB-12). */
export interface AuditorWellbeing {
  /** Active source-video playback minutes counted today (AR-WB-01). */
  exposure_minutes_today: number;
  /** Applicable daily limit; 120 by default for testing (AR-WB-02, MR-OV-04). */
  exposure_limit_minutes: number;
  cooldown: CooldownState | null;
  /** Optional — UI needs: cases completed today (Cooldown screen, Figma 31:117). */
  cases_reviewed_today?: number;
}

export interface CooldownState {
  /** ISO 8601 time the cooldown started. Optional: the UI falls back to the tier's standard length. */
  started_at?: string;
  /** ISO 8601 time the cooldown ends. */
  ends_at: string;
  /** What triggered it: a tier (AR-WB-12) or an SOS, which follows the S4 protocol. */
  trigger: SeverityTier | "SOS";
  /** S4 and SOS require a Manager/support check-in (AR-WB-12). */
  requires_check_in: boolean;
  /** When the Manager recorded that check-in; the queue stays locked until then. */
  check_in_completed_at?: string | null;
}

/** AR-DF-03 structured decline reasons, in the adopted order. None is ever pre-selected. */
export type DeclineReason = "MORE_SEVERE_THAN_AI" | "NEAR_EXPOSURE_LIMIT" | "PERSONAL_TRIGGER" | "OTHER";

/**
 * Exposure measured in the Review Workspace since the last report. Only active
 * source-video playback counts, whatever the blur, grayscale or mute state;
 * replaying a clip counts again (Auditor assumptions note, adopted 27 Aug 2026).
 */
export interface ExposureSample {
  active_seconds: number;
  replay_seconds: number;
}

/** AR-WB-16 low-friction wellbeing check-in, distinct from SOS. */
export type WellbeingRequestKind = "TALK_TO_MANAGER" | "BREAK_REQUEST";

/** MR-OV-05: comfortably below, approaching (from 75%), or at the exposure limit. */
export type ExposureState = "UNDER" | "APPROACHING" | "AT_LIMIT";

/** One row of the Manager Oversight Dashboard (Figma 78:69, MR-OV-01–05). */
export interface AuditorOverviewRow {
  auditor_id: string;
  display_name: string;
  exposure_minutes_today: number;
  exposure_limit_minutes: number;
  exposure_state: ExposureState;
  cooldown: CooldownState | null;
  cases_today: number;
}

/** Unresolved SOS alerts, for the persistent banner and header badge (MR-SOS-03). */
export interface SosSummary {
  unresolved_count: number;
  most_recent: { auditor_name: string; triggered_at: string } | null;
}

export interface WellbeingRequestRecord {
  id: string;
  kind: WellbeingRequestKind;
  case_id: string | null;
  created_at: string;
  status: "OPEN" | "APPROVED";
}

/** Auditor Detail (Figma 86:94): summary, limit, recent activity and check-ins (MR-OV-04, MR-SOS-07). */
export interface AuditorDetail extends AuditorOverviewRow {
  /** A private wellbeing pattern marker visible only to the Manager. */
  pattern_flagged: boolean;
  recent_cases: { case_id: string; severity_tier: SeverityTier | null; completed_at: string }[];
  wellbeing_requests: WellbeingRequestRecord[];
}

/** One row of Consolidated Case Oversight (Figma 86:198, MR-OV-06, MR-CR-06). */
export interface ManagerCaseRow {
  case_id: string;
  auditor_name: string | null;
  severity_tier: SeverityTier | null;
  status: InternalCaseStatus;
  manager_flag: "DECLINED" | "SOS" | null;
  /** The SOS alert behind a SOS-flagged row, so it can link to the alert. */
  sos_alert_id: string | null;
}

export type SosAlertStatus = "UNACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED";

/**
 * Why an unexpected-exposure event was raised without the Auditor pressing SOS.
 * AR-AI-11: AI/STT processing that fails after review has begun.
 */
export type UnexpectedExposureReason = "AI_FAILURE_MID_REVIEW";

/** What raised an SOS alert: the Auditor's own SOS (AR-WB-06), or an AR-AI-11 failure treated the same way. */
export type SosTrigger = "AUDITOR_SOS" | UnexpectedExposureReason;

/** One SOS event in the Manager's inbox (Figma 103:151, MR-SOS-01). */
export interface SosAlert {
  id: string;
  auditor_id: string;
  auditor_name: string;
  case_id: string;
  triggered_at: string;
  status: SosAlertStatus;
  trigger: SosTrigger;
}

/** SOS Alert Detail (Figma 103:197): context without raw footage (MR-SOS-05). */
export interface SosAlertDetail extends SosAlert {
  exposure_minutes_today: number;
  exposure_limit_minutes: number;
  severity_tier: SeverityTier | null;
  effective_severity_score: number | null;
  narrative_summary: string | null;
  follow_up_notes: string | null;
}

/** Structured follow-up outcomes (Figma 103:228, MR-SOS-04/06). */
export type SosFollowUpOutcome = "NO_FURTHER_ACTION" | "REASSIGNED_REMAINING_CASES" | "AUDITOR_STOPPED_SHIFT";

/** One declined case awaiting a Manager decision (Figma 119:289, MR-CR-02/04). No per-Auditor counts, by design. */
export interface DeclinedCaseRow {
  case_id: string;
  auditor_name: string;
  severity_tier: SeverityTier | null;
  reason: DeclineReason;
  declined_at: string;
}

/** Case Review Detail (Figma 118:198, MR-CR-01). */
export interface ManagerCaseReview {
  case_id: string;
  status: InternalCaseStatus;
  manager_flag: "DECLINED" | "SOS" | null;
  severity_tier: SeverityTier | null;
  effective_severity_score: number | null;
  narrative_summary: string | null;
  flagged_entities: FlaggedEntity[];
  auditor_name: string | null;
  auditor_severity_score: number | null;
  auditor_comment: string | null;
  decline: { reason: DeclineReason; other_text: string | null } | null;
}

/** Exposure context for a reassignment decision (Figma 119:405, MR-CR-03). */
export interface ReassignmentContext {
  case_id: string;
  declining_auditor: { name: string; exposure_minutes_today: number; exposure_limit_minutes: number } | null;
  candidates: {
    auditor_id: string;
    name: string;
    headroom_minutes: number;
    /** Under 30 minutes of headroom. */
    limited_headroom: boolean;
    /** False when at their limit or in a cooldown; such Auditors can't be chosen. */
    available: boolean;
  }[];
}

/**
 * Validation View data (Figma 136:257, MR-OV-08). Always flagged as a
 * placeholder until the pipeline produces real results against the
 * labelled ground-truth set.
 */
export interface ValidationSummary {
  is_placeholder: boolean;
  tiers: { tier: SeverityTier; ai_predicted_pct: number; ground_truth_pct: number }[];
  match_rate_pct: number;
  validation_set_size: number;
}

/**
 * Every data operation the UI performs. Both data sources — `mock` (default,
 * synthetic demo data) and `api` (the real backend, connected by Firas)
 * implement this interface, so pages never know which one they're using.
 */
export interface DataService {
  createReport(videoFile: File): Promise<CreateReportResponse>;
  /** Screen 1b: report a public video link instead of uploading (UR-NTH-01). */
  createLinkReport(url: string): Promise<CreateReportResponse>;
  /** Screen 1c: report with a screenshot image (UR-NTH-02). */
  createScreenshotReport(image: File): Promise<CreateReportResponse>;
  /** Figma 80:31: add context (and optionally a file) to an existing case (UR-NTH-05). */
  addCaseInformation(caseId: string, details: string, attachment?: File): Promise<{ added: true }>;
  getStatus(caseId: string): Promise<PublicStatusResponse>;
  requestStatusUpdates(caseId: string, contact: StatusUpdateContact): Promise<{ enabled: true }>;
  staffLogin(staffId: string, password: string): Promise<StaffLoginResponse>;
  getAuditorCases(token: string): Promise<AuditorCaseListItem[]>;
  getAuditorCaseDetail(caseId: string, token: string): Promise<AuditorCaseDetail>;
  resolveCase(
    caseId: string,
    token: string,
    finalOutcome: FinalOutcome,
    auditorSeverityScore?: number,
    auditorComment?: string,
  ): Promise<ResolveCaseResponse>;
  getManagerDashboard(token: string): Promise<ManagerDashboardResponse>;
  getMyWellbeing(token: string): Promise<AuditorWellbeing>;
  /** AR-PV-01/08: records the Auditor's deliberate Proceed and moves the case into review. */
  acknowledgeContentWarning(caseId: string, token: string): Promise<{ acknowledged: true }>;
  /** AR-DF-01–03: routes the case straight to the Manager, never auto-reassigned. */
  declineCase(caseId: string, token: string, reason: DeclineReason, otherText?: string): Promise<{ declined: true }>;
  /** AR-WB-01: adds measured playback time to the case and the Auditor's daily total. */
  recordExposure(caseId: string, token: string, sample: ExposureSample): Promise<{ recorded: true }>;
  /** AR-WB-05/06/09: pauses the case, notifies the Manager and starts the S4-equivalent cooldown. */
  triggerSos(caseId: string, token: string): Promise<{ cooldown: CooldownState }>;
  /**
   * AR-AI-11: AI/STT processing failed after review began. Handled exactly like
   * an SOS (AR-WB-07): the case is paused and routed to the Manager, the alert
   * is logged with its reason, and the S4-equivalent cooldown starts.
   */
  reportUnexpectedExposure(
    caseId: string,
    token: string,
    reason: UnexpectedExposureReason,
  ): Promise<{ cooldown: CooldownState }>;
  /** AR-WB-16: "Talk to my manager" or a break request, optionally about one case. */
  requestWellbeingSupport(token: string, kind: WellbeingRequestKind, caseId?: string): Promise<{ received: true }>;

  // Manager (Sprint 3 screens)
  getAuditorOverview(token: string): Promise<AuditorOverviewRow[]>;
  getSosSummary(token: string): Promise<SosSummary>;
  getAuditorDetail(auditorId: string, token: string): Promise<AuditorDetail>;
  /** MR-OV-04 */
  setExposureLimit(auditorId: string, token: string, minutes: number): Promise<{ exposure_limit_minutes: number }>;
  /** MR-SOS-07 */
  approveBreakRequest(requestId: string, token: string): Promise<{ approved: true }>;
  getCaseOversight(token: string): Promise<ManagerCaseRow[]>;
  listSosAlerts(token: string): Promise<SosAlert[]>;
  getSosAlert(alertId: string, token: string): Promise<SosAlertDetail>;
  /** MR-SOS-04 */
  acknowledgeSosAlert(alertId: string, token: string): Promise<{ acknowledged: true }>;
  /** MR-SOS-04/06: resolves the alert and records the Manager check-in the cooldown was waiting for. */
  logSosFollowUp(
    alertId: string,
    token: string,
    notes: string,
    outcome: SosFollowUpOutcome,
  ): Promise<{ resolved: true }>;
  listDeclinedCases(token: string): Promise<DeclinedCaseRow[]>;
  getManagerCaseReview(caseId: string, token: string): Promise<ManagerCaseReview>;
  getReassignmentContext(caseId: string, token: string): Promise<ReassignmentContext>;
  /** MR-CR-03: re-validates the target at confirm time (Figma 197:321). */
  reassignCase(caseId: string, token: string, auditorId: string): Promise<{ assigned_to_name: string }>;
  /** Round 4/5 rule: closes the case as Complete with the content-neutral outcome, note kept for the audit trail. */
  closeWithoutReassignment(caseId: string, token: string, note: string): Promise<{ status: string }>;
  /** MR-CR-08: exceptional raw-content access, logged, behind the same content warning. */
  getCaseForExceptionalAccess(caseId: string, token: string): Promise<AuditorCaseDetail>;
  recordExceptionalAccess(caseId: string, token: string): Promise<{ recorded: true }>;
  getValidationSummary(token: string): Promise<ValidationSummary>;
}

/**
 * Shown when a request fails before any response arrives (offline, DNS,
 * TLS or CORS failure). Pages use it as the detail line under their own
 * error title, so the notice never just repeats the title.
 */
export const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

/** Thrown by a data source on any failed request, so pages handle one error type. */
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

/**
 * Thrown by the `api` data source for an operation no backend endpoint
 * exists for yet. It's an ApiError (HTTP 501) so every page's existing error
 * handling shows a readable notice instead of crashing, and searching for
 * `notConnected(` in services/api lists every integration gap.
 */
export class NotImplementedError extends ApiError {
  readonly operation: string;

  constructor(operation: string) {
    super("This feature isn't connected to the backend yet.", 501);
    this.name = "NotImplementedError";
    this.operation = operation;
  }
}
