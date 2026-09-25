import { ACCEPTED_VIDEO_EXTENSIONS } from "../../design-tokens/videoFormats";
import { mapStatusToPublicLabel } from "../../design-tokens/statusLabels";
import { scoreToTier } from "../../design-tokens/severity";
import { ApiError } from "../types";
import type {
  AuditorDetail,
  AuditorOverviewRow,
  DeclinedCaseRow,
  ExposureState,
  ManagerCaseReview,
  ManagerCaseRow,
  ReassignmentContext,
  SosAlert,
  SosAlertDetail,
  SosFollowUpOutcome,
  SosSummary,
  SosTrigger,
  UnexpectedExposureReason,
  ValidationSummary,
  AuditorCaseDetail,
  AuditorWellbeing,
  AuditorCaseListItem,
  CooldownState,
  CreateReportResponse,
  DataService,
  DeclineReason,
  ExposureSample,
  FinalOutcome,
  ManagerDashboardResponse,
  PublicStatusResponse,
  ResolveCaseResponse,
  SeverityTier,
  StaffLoginResponse,
  StatusUpdateContact,
  WellbeingRequestKind,
} from "../types";
import { readDb, updateDb, type MockCase, type MockDb, type MockSosEvent, type MockStaff } from "./store";

/**
 * The `mock` data source: a self-contained stand-in for the backend that
 * follows the same business rules the real one must (BA baseline), so the
 * whole UI can be demoed and tested before Aiden's API is connected.
 */

/** Simulated network latency, skipped under Vitest so tests stay fast. */
const LATENCY_MS = import.meta.env.MODE === "test" ? 0 : 250;
const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

/** How long simulated AI analysis takes after a new upload. */
const SIMULATED_AI_SECONDS = 20;

/** UR-ST-07: 5 invalid lookups within 10 minutes locks lookups for 15 minutes. */
const LOOKUP_MAX_FAILURES = 5;
const LOOKUP_WINDOW_MS = 10 * 60_000;
const LOOKUP_LOCKOUT_MS = 15 * 60_000;

/** Staff login lockout (Figma 36:129 "Too many attempts. Try again in 15 minutes."). Same thresholds. */
const LOGIN_MAX_FAILURES = 5;

/** AR-WB-12 cooldown lengths in minutes. S1 has none. */
const COOLDOWN_MINUTES: Record<Exclude<SeverityTier, "S1">, number> = { S2: 5, S3: 15, S4: 30 };
/** AR-WB-12: S2 counts as sustained after ~2 minutes of exposure in one case… */
const S2_SUSTAINED_SECONDS = 120;
/** …or on a second S2 case inside the 45-minute review-block window (closed 2026-09-09). */
const S2_REVIEW_BLOCK_MS = 45 * 60_000;

const CASE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const TIER_RANK: Record<SeverityTier, number> = { S1: 1, S2: 2, S3: 3, S4: 4 };

function newCaseId(): string {
  // Non-sequential, non-guessable (UR-ID-08), in the RCS-XXXX-XXXX format
  // the Normal User Figma screens show.
  const pick = () => CASE_ID_ALPHABET[Math.floor(Math.random() * CASE_ID_ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `RCS-${block()}-${block()}`;
}

function newToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newId(prefix: string): string {
  return `${prefix}-${newToken().slice(0, 8)}`;
}

/** Finishes simulated AI analysis for any case whose time has come. */
function advanceSimulatedAi(db: MockDb): void {
  const now = Date.now();
  for (const c of db.cases) {
    if (c.status === "AI_PROCESSING" && c.ai_ready_at && Date.parse(c.ai_ready_at) <= now) {
      Object.assign(c, simulatedAnalysis(c.case_id), { status: "READY_FOR_REVIEW", updated_at: c.ai_ready_at });
    }
  }
}

/** A neutral synthetic analysis for newly uploaded demo cases. */
function simulatedAnalysis(caseId: string): Partial<MockCase> {
  const variant = [...caseId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 2;
  return variant === 0
    ? {
        watson_severity_score: 48,
        effective_severity_score: 48,
        severity_tier: "S2",
        flag_reason: "Physical conflict",
        narrative_summary: "Mock: two people in a heated confrontation; brief pushing detected.",
        incident_timeline: [{ start: 12, end: 20, severity_tier: "S2", tag: "physical_violence" }],
        flagged_entities: [
          { label: "Person A", start: 5, end: 40 },
          { label: "Person B", start: 8, end: 38 },
        ],
        transcript: [{ time: 13, text: "[raised voices]" }],
        audio_intensity: [0.2, 0.5, 0.7, 0.4, 0.2],
      }
    : {
        watson_severity_score: 72,
        effective_severity_score: 72,
        severity_tier: "S3",
        flag_reason: "Graphic violence",
        narrative_summary: "Mock: physical altercation detected between two people.",
        incident_timeline: [{ start: 12, end: 20, severity_tier: "S3", tag: "physical_violence" }],
        flagged_entities: [{ label: "Person A", start: 10, end: 30 }],
        transcript: null,
        audio_intensity: [0.3, 0.8, 0.6, 0.3],
      };
}

function exposureMinutes(staff: MockStaff): number {
  return Math.floor(staff.exposure_seconds_today / 60);
}

function inCooldown(staff: MockStaff, now = Date.now()): boolean {
  const cd = staff.cooldown;
  if (!cd) return false;
  return Date.parse(cd.ends_at) > now || (cd.requires_check_in && !cd.check_in_completed_at);
}

/**
 * AR-AS-02: lowest (0.6 × exposure ratio + 0.4 × case ratio) wins; ties go to
 * whoever waited longest. At-limit (AR-WB-03) and cooling-down (AR-WB-04)
 * Auditors are skipped.
 */
function selectAuditor(db: MockDb): string | null {
  const eligible = db.staff.filter(
    (s) => s.role === "auditor" && exposureMinutes(s) < s.exposure_limit_minutes && !inCooldown(s),
  );
  if (eligible.length === 0) return null;
  const score = (s: MockStaff) => 0.6 * (exposureMinutes(s) / 120) + 0.4 * (s.active_case_count / 10);
  const lastAssigned = (s: MockStaff) => (s.last_assigned_at ? Date.parse(s.last_assigned_at) : 0);
  eligible.sort((a, b) => score(a) - score(b) || lastAssigned(a) - lastAssigned(b));
  return eligible[0].staff_id;
}

function requireSession(db: MockDb, token: string, role: "auditor" | "manager") {
  const session = db.sessions[token];
  if (!session) throw new ApiError("Not authenticated", 401);
  if (session.role !== role) throw new ApiError("Not authorised for this action", 403);
  return session;
}

function findOwnCase(db: MockDb, caseId: string, staffId: string): MockCase {
  const found = db.cases.find((c) => c.case_id === caseId);
  // AR-AS-01: someone else's case is indistinguishable from a missing one.
  if (!found || found.assigned_auditor !== staffId) throw new ApiError("Case not found", 404);
  return found;
}

function staffById(db: MockDb, staffId: string): MockStaff {
  const member = db.staff.find((s) => s.staff_id === staffId);
  if (!member) throw new ApiError("Not authenticated", 401);
  return member;
}

/** AR-AI-12: append-only audit history. */
function audit(db: MockDb, actor: string, action: string, caseId: string | null, detail: string | null = null): void {
  db.auditLog.push({ at: new Date().toISOString(), actor, case_id: caseId, action, detail });
}

function startCooldown(
  staff: MockStaff,
  trigger: SeverityTier | "SOS",
  minutes: number,
  requiresCheckIn: boolean,
): CooldownState {
  const now = Date.now();
  // A new cooldown never shortens one already running.
  const existingEnd = staff.cooldown ? Date.parse(staff.cooldown.ends_at) : 0;
  const cooldown: CooldownState = {
    started_at: new Date(now).toISOString(),
    ends_at: new Date(Math.max(existingEnd, now + minutes * 60_000)).toISOString(),
    trigger,
    requires_check_in: requiresCheckIn || (staff.cooldown?.requires_check_in ?? false),
    check_in_completed_at: null,
  };
  staff.cooldown = cooldown;
  return cooldown;
}

/**
 * AR-WB-12 / AR-WB-15: the cooldown a completed case earns. Uses the worse of
 * the AI tier and the Auditor's own rating, so an Auditor who rates a case
 * higher than the AI still gets the protection (post-submission
 * reconciliation, Auditor assumptions note 27 Aug 2026).
 */
function cooldownForResolvedCase(
  db: MockDb,
  c: MockCase,
  staff: MockStaff,
  auditorScore: number | null,
): CooldownState | null {
  const tiers = [c.severity_tier, auditorScore === null ? null : scoreToTier(auditorScore)].filter(
    (t): t is SeverityTier => t !== null,
  );
  if (tiers.length === 0) return null;
  const tier = tiers.reduce((worst, t) => (TIER_RANK[t] > TIER_RANK[worst] ? t : worst));
  if (tier === "S1") return null;
  if (tier === "S2") {
    const sustained = c.exposure.active_seconds + c.exposure.replay_seconds >= S2_SUSTAINED_SECONDS;
    const windowStart = Date.now() - S2_REVIEW_BLOCK_MS;
    const repeated = db.auditLog.some(
      (e) =>
        e.actor === staff.staff_id &&
        e.action === "CASE_RESOLVED" &&
        e.detail === "tier:S2" &&
        e.case_id !== c.case_id &&
        Date.parse(e.at) >= windowStart,
    );
    if (!sustained && !repeated) return null;
  }
  return startCooldown(staff, tier, COOLDOWN_MINUTES[tier], tier === "S4");
}

/** Screen 1c placeholder limit: "Max size: 10MB (placeholder) — to be confirmed with Dev." */
const SCREENSHOT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Creates a case from any evidence type and assigns it straight away
 * (AR-AS-03), starting simulated AI analysis when an Auditor is available.
 */
function openCase(db: MockDb, contentType: MockCase["content_type"], fileName: string): CreateReportResponse {
  const now = new Date();
  const assigned = selectAuditor(db);
  const caseId = newCaseId();
  db.cases.push({
    case_id: caseId,
    status: assigned ? "AI_PROCESSING" : "SUBMITTED",
    assigned_auditor: assigned,
    content_type: contentType,
    file_name: fileName,
    duration_seconds: null,
    created_at: now.toISOString(),
    assigned_at: assigned ? now.toISOString() : null,
    updated_at: now.toISOString(),
    ai_ready_at: assigned ? new Date(now.getTime() + SIMULATED_AI_SECONDS * 1000).toISOString() : null,
    watson_severity_score: null,
    effective_severity_score: null,
    severity_tier: null,
    narrative_summary: null,
    incident_timeline: null,
    flagged_entities: null,
    transcript: null,
    audio_intensity: null,
    ai_failure: null,
    flag_reason: null,
    final_outcome: null,
    auditor_severity_score: null,
    auditor_comment: null,
    completed_at: null,
    exposure: { active_seconds: 0, replay_seconds: 0 },
    manager_flag: null,
    decline: null,
  });
  const auditor = db.staff.find((s) => s.staff_id === assigned);
  if (auditor) {
    auditor.active_case_count += 1;
    auditor.last_assigned_at = now.toISOString();
  }
  audit(db, "system", "CASE_CREATED", caseId, assigned ? `assigned:${assigned}` : "unassigned");
  return {
    case_id: caseId,
    status: mapStatusToPublicLabel(assigned ? "AI_PROCESSING" : "SUBMITTED"),
    assigned_auditor: assigned,
  };
}

/** Takes a case off an Auditor's queue and hands it to the Manager (AR-AI-09, AR-DF-02). */
function routeToManager(db: MockDb, c: MockCase, flag: "DECLINED" | "SOS"): void {
  const auditor = db.staff.find((s) => s.staff_id === c.assigned_auditor);
  if (auditor) auditor.active_case_count = Math.max(0, auditor.active_case_count - 1);
  c.assigned_auditor = null;
  c.manager_flag = flag;
  c.updated_at = new Date().toISOString();
}

/** MR-OV-05: Approaching from 75% of the limit (Manager handoff traceability), At limit at 100%. */
function exposureState(staff: MockStaff): ExposureState {
  const ratio = exposureMinutes(staff) / Math.max(1, staff.exposure_limit_minutes);
  if (ratio >= 1) return "AT_LIMIT";
  if (ratio >= 0.75) return "APPROACHING";
  return "UNDER";
}

function overviewRow(staff: MockStaff): AuditorOverviewRow {
  return {
    auditor_id: staff.staff_id,
    display_name: staff.display_name,
    exposure_minutes_today: exposureMinutes(staff),
    exposure_limit_minutes: staff.exposure_limit_minutes,
    exposure_state: exposureState(staff),
    cooldown: inCooldown(staff) ? staff.cooldown : null,
    cases_today: staff.cases_reviewed_today,
  };
}

function displayName(db: MockDb, staffId: string | null | undefined): string | null {
  return staffId ? (db.staff.find((s) => s.staff_id === staffId)?.display_name ?? staffId) : null;
}

function sosStatus(event: MockSosEvent): SosAlert["status"] {
  if (event.resolved_at) return "RESOLVED";
  return event.acknowledged_at ? "IN_PROGRESS" : "UNACKNOWLEDGED";
}

function sosAlert(db: MockDb, event: MockSosEvent): SosAlert {
  return {
    id: event.id,
    auditor_id: event.auditor_id,
    auditor_name: displayName(db, event.auditor_id) ?? event.auditor_id,
    case_id: event.case_id,
    triggered_at: event.triggered_at,
    status: sosStatus(event),
    trigger: event.trigger,
  };
}

function findCase(db: MockDb, caseId: string): MockCase {
  const found = db.cases.find((c) => c.case_id === caseId);
  if (!found) throw new ApiError("Case not found", 404);
  return found;
}

function findSos(db: MockDb, alertId: string): MockSosEvent {
  const found = db.sosEvents.find((e) => e.id === alertId);
  if (!found) throw new ApiError("SOS alert not found", 404);
  return found;
}

/**
 * AR-WB-06/07 and AR-AI-11: one path for every unexpected-exposure event. The
 * alert is logged with what raised it, the case goes to the Manager, and the
 * S4 protocol applies (AR-WB-12) — 30 minutes plus a mandatory check-in.
 */
function raiseSos(db: MockDb, token: string, caseId: string, trigger: SosTrigger): { cooldown: CooldownState } {
  const session = requireSession(db, token, "auditor");
  const c = findOwnCase(db, caseId, session.staffId);
  db.sosEvents.push({
    id: newId("SOS"),
    case_id: caseId,
    auditor_id: session.staffId,
    triggered_at: new Date().toISOString(),
    trigger,
    acknowledged_at: null,
    acknowledged_by: null,
    follow_up_notes: null,
    follow_up_outcome: null,
    resolved_at: null,
  });
  routeToManager(db, c, "SOS");
  audit(db, session.staffId, "SOS_TRIGGERED", caseId, trigger === "AUDITOR_SOS" ? null : trigger);
  const cooldown = startCooldown(staffById(db, session.staffId), "SOS", COOLDOWN_MINUTES.S4, true);
  return { cooldown };
}

/** The Auditor who handed a case to the Manager, by decline or SOS. */
function routingAuditor(db: MockDb, c: MockCase): string | null {
  if (c.decline) return c.decline.declined_by;
  const sos = [...db.sosEvents].reverse().find((e) => e.case_id === c.case_id);
  return sos?.auditor_id ?? null;
}

function caseDetailFor(c: MockCase): AuditorCaseDetail {
  return {
    case_id: c.case_id,
    status: c.status,
    watson_severity_score: c.watson_severity_score,
    effective_severity_score: c.effective_severity_score,
    severity_tier: c.severity_tier,
    narrative_summary: c.narrative_summary,
    incident_timeline: c.incident_timeline,
    video_duration_seconds: c.duration_seconds,
    flagged_entities: c.flagged_entities,
    transcript: c.transcript,
    audio_intensity: c.audio_intensity,
    ai_failure: c.ai_failure,
    flag_reason: c.flag_reason,
  };
}

/** Candidates with less headroom than this are marked "Limited headroom" (Figma 119:405). */
const LIMITED_HEADROOM_MINUTES = 30;

/** Figma 136:257 sample values. Always flagged as placeholder data. */
const PLACEHOLDER_VALIDATION: ValidationSummary = {
  is_placeholder: true,
  tiers: [
    { tier: "S1", ai_predicted_pct: 90, ground_truth_pct: 85 },
    { tier: "S2", ai_predicted_pct: 60, ground_truth_pct: 55 },
    { tier: "S3", ai_predicted_pct: 40, ground_truth_pct: 45 },
    { tier: "S4", ai_predicted_pct: 20, ground_truth_pct: 22 },
  ],
  match_rate_pct: 82,
  validation_set_size: 14,
};

/** Consumes the one-shot "fail the next save" demo scenario. */
function consumeDemoFailure(): boolean {
  return updateDb((db) => {
    const fail = db.demo.failNextSubmission;
    db.demo.failNextSubmission = false;
    return fail;
  });
}

export const mockDataService: DataService = {
  async createReport(videoFile: File): Promise<CreateReportResponse> {
    await delay();
    const dot = videoFile.name.lastIndexOf(".");
    const extension = dot >= 0 ? videoFile.name.slice(dot).toLowerCase() : "";
    if (!ACCEPTED_VIDEO_EXTENSIONS.includes(extension)) {
      throw new ApiError(`Unsupported video format '${extension}'. Accepted formats: MP4, MOV, WEBM, AVI.`, 400);
    }
    if (videoFile.size === 0) {
      throw new ApiError("File is too small to be a valid video", 400);
    }
    return updateDb((db) => openCase(db, "Video", videoFile.name));
  },

  async createLinkReport(url: string): Promise<CreateReportResponse> {
    await delay();
    let parsed: URL | null = null;
    try {
      parsed = new URL(url.trim());
    } catch {
      parsed = null;
    }
    if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
      throw new ApiError(
        "That link doesn't look right. Make sure it's a public video link, not a private or password-protected page.",
        400,
      );
    }
    return updateDb((db) => openCase(db, "Link", parsed.href));
  },

  async createScreenshotReport(image: File): Promise<CreateReportResponse> {
    await delay();
    if (!/\.(png|jpe?g)$/i.test(image.name)) {
      throw new ApiError("That image format isn't supported. Try PNG or JPG instead.", 400);
    }
    if (image.size > SCREENSHOT_MAX_BYTES) {
      throw new ApiError("That image is larger than 10MB. Try a smaller screenshot.", 400);
    }
    return updateDb((db) => openCase(db, "Screenshot", image.name));
  },

  async addCaseInformation(caseId: string, details: string, attachment?: File): Promise<{ added: true }> {
    await delay();
    if (!details.trim() && !attachment) {
      throw new ApiError("Add some details or attach a file before submitting.", 400);
    }
    return updateDb((db) => {
      const found = db.cases.find((c) => c.case_id === caseId);
      if (!found) throw new ApiError("Case not found", 404);
      // Adds to the case only; it can never remove what was submitted (Figma 80:39).
      db.caseAdditions.push({
        case_id: caseId,
        details: details.trim(),
        attachment_name: attachment?.name ?? null,
        added_at: new Date().toISOString(),
      });
      found.updated_at = new Date().toISOString();
      return { added: true as const };
    });
  },

  async getStatus(caseId: string): Promise<PublicStatusResponse> {
    await delay();
    return updateDb((db) => {
      advanceSimulatedAi(db);
      const now = Date.now();
      const lookup = db.statusLookup;
      if (lookup.lockedUntil && now < lookup.lockedUntil) {
        throw new ApiError("Too many invalid attempts. Try again later.", 429);
      }
      const found = db.cases.find((c) => c.case_id.toUpperCase() === caseId.trim().toUpperCase());
      if (!found) {
        lookup.failureTimes = [...lookup.failureTimes.filter((t) => now - t < LOOKUP_WINDOW_MS), now];
        if (lookup.failureTimes.length >= LOOKUP_MAX_FAILURES) {
          lookup.lockedUntil = now + LOOKUP_LOCKOUT_MS;
          lookup.failureTimes = [];
        }
        // UR-ST-08: the same generic answer for a malformed or unknown ID.
        throw new ApiError("Case not found", 404);
      }
      lookup.failureTimes = [];
      return {
        case_id: found.case_id,
        status: mapStatusToPublicLabel(found.status),
        final_outcome: found.status === "COMPLETE" ? found.final_outcome : null,
        submitted_at: found.created_at,
        updated_at: found.updated_at,
        content_type: found.content_type,
        duration_seconds: found.duration_seconds,
        file_name: found.file_name,
      };
    });
  },

  async requestStatusUpdates(caseId: string, contact: StatusUpdateContact): Promise<{ enabled: true }> {
    await delay();
    const email = contact.email?.trim() || null;
    const phone = contact.phone?.trim() || null;
    if (!email && !phone) throw new ApiError("Add an email or phone number to get updates.", 400);
    return updateDb((db) => {
      if (!db.cases.some((c) => c.case_id === caseId)) throw new ApiError("Case not found", 404);
      // Recorded for the demo only; mock mode never sends an email or SMS.
      db.statusUpdateRequests.push({ case_id: caseId, email, phone, requested_at: new Date().toISOString() });
      return { enabled: true as const };
    });
  },

  async staffLogin(staffId: string, password: string): Promise<StaffLoginResponse> {
    await delay();
    return updateDb((db) => {
      const key = staffId.trim().toLowerCase();
      const now = Date.now();
      const attempts = (db.loginAttempts[key] ??= { failureTimes: [], lockedUntil: null });
      if (attempts.lockedUntil && now < attempts.lockedUntil) {
        throw new ApiError("Too many attempts. Try again in 15 minutes.", 429);
      }
      const member = db.staff.find((s) => s.staff_id === staffId.trim());
      if (!member || member.password !== password) {
        attempts.failureTimes = [...attempts.failureTimes.filter((t) => now - t < LOOKUP_WINDOW_MS), now];
        if (attempts.failureTimes.length >= LOGIN_MAX_FAILURES) {
          attempts.lockedUntil = now + LOOKUP_LOCKOUT_MS;
          attempts.failureTimes = [];
          throw new ApiError("Too many attempts. Try again in 15 minutes.", 429);
        }
        throw new ApiError("Invalid credentials", 401);
      }
      delete db.loginAttempts[key];
      const token = newToken();
      db.sessions[token] = { staffId: member.staff_id, role: member.role };
      return { token, role: member.role };
    });
  },

  async getAuditorCases(token: string): Promise<AuditorCaseListItem[]> {
    await delay();
    return updateDb((db) => {
      advanceSimulatedAi(db);
      const session = requireSession(db, token, "auditor");
      return db.cases
        .filter((c) => c.assigned_auditor === session.staffId)
        .sort((a, b) => Date.parse(a.assigned_at ?? a.created_at) - Date.parse(b.assigned_at ?? b.created_at))
        .map((c) => ({
          case_id: c.case_id,
          status: c.status,
          severity_tier: c.severity_tier,
          assigned_at: c.assigned_at,
        }));
    });
  },

  async getAuditorCaseDetail(caseId: string, token: string): Promise<AuditorCaseDetail> {
    await delay();
    return updateDb((db) => {
      advanceSimulatedAi(db);
      const session = requireSession(db, token, "auditor");
      const c = findOwnCase(db, caseId, session.staffId);
      return {
        case_id: c.case_id,
        status: c.status,
        watson_severity_score: c.watson_severity_score,
        effective_severity_score: c.effective_severity_score,
        severity_tier: c.severity_tier,
        narrative_summary: c.narrative_summary,
        incident_timeline: c.incident_timeline,
        video_duration_seconds: c.duration_seconds,
        flagged_entities: c.flagged_entities,
        transcript: c.transcript,
        audio_intensity: c.audio_intensity,
        ai_failure: c.ai_failure,
        flag_reason: c.flag_reason,
      };
    });
  },

  async acknowledgeContentWarning(caseId: string, token: string): Promise<{ acknowledged: true }> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      const c = findOwnCase(db, caseId, session.staffId);
      if (inCooldown(staffById(db, session.staffId))) {
        throw new ApiError("Raw content can't be opened during a cooldown.", 409);
      }
      if (c.status === "READY_FOR_REVIEW") c.status = "AUDITOR_REVIEW";
      c.updated_at = new Date().toISOString();
      audit(db, session.staffId, "CONTENT_WARNING_ACKNOWLEDGED", caseId);
      return { acknowledged: true as const };
    });
  },

  async declineCase(
    caseId: string,
    token: string,
    reason: DeclineReason,
    otherText?: string,
  ): Promise<{ declined: true }> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      const c = findOwnCase(db, caseId, session.staffId);
      c.decline = {
        reason,
        other_text: reason === "OTHER" && otherText?.trim() ? otherText.trim() : null,
        declined_by: session.staffId,
        declined_at: new Date().toISOString(),
      };
      routeToManager(db, c, "DECLINED");
      audit(db, session.staffId, "CASE_DECLINED", caseId, reason);
      return { declined: true as const };
    });
  },

  async recordExposure(caseId: string, token: string, sample: ExposureSample): Promise<{ recorded: true }> {
    await delay();
    const active = Math.max(0, Math.round(sample.active_seconds));
    const replay = Math.max(0, Math.round(sample.replay_seconds));
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      const c = db.cases.find((x) => x.case_id === caseId);
      if (!c) throw new ApiError("Case not found", 404);
      c.exposure.active_seconds += active;
      c.exposure.replay_seconds += replay;
      staffById(db, session.staffId).exposure_seconds_today += active + replay;
      return { recorded: true as const };
    });
  },

  async triggerSos(caseId: string, token: string): Promise<{ cooldown: CooldownState }> {
    await delay();
    return updateDb((db) => raiseSos(db, token, caseId, "AUDITOR_SOS"));
  },

  async reportUnexpectedExposure(
    caseId: string,
    token: string,
    reason: UnexpectedExposureReason,
  ): Promise<{ cooldown: CooldownState }> {
    await delay();
    return updateDb((db) => raiseSos(db, token, caseId, reason));
  },

  async requestWellbeingSupport(
    token: string,
    kind: WellbeingRequestKind,
    caseId?: string,
  ): Promise<{ received: true }> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      db.wellbeingRequests.push({
        id: newId("WB"),
        auditor_id: session.staffId,
        case_id: caseId ?? null,
        kind,
        created_at: new Date().toISOString(),
        resolved_at: null,
      });
      audit(db, session.staffId, "WELLBEING_REQUEST", caseId ?? null, kind);
      return { received: true as const };
    });
  },

  async resolveCase(
    caseId: string,
    token: string,
    finalOutcome: FinalOutcome,
    auditorSeverityScore?: number,
    auditorComment?: string,
  ): Promise<ResolveCaseResponse> {
    await delay();
    const failThisTime = updateDb((db) => {
      const fail = db.demo.failNextSubmission;
      db.demo.failNextSubmission = false;
      return fail;
    });
    // Demo scenario (Figma 42:405): behaves exactly like a dropped request.
    if (failThisTime) throw new TypeError("Failed to fetch");
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      const c = findOwnCase(db, caseId, session.staffId);
      // AR-AI-07: changing the AI's rating needs a comment — mirrors the backend rule.
      const isOverride =
        auditorSeverityScore !== undefined &&
        c.effective_severity_score !== null &&
        auditorSeverityScore !== c.effective_severity_score;
      if (isOverride && !auditorComment?.trim()) {
        throw new ApiError("A comment is required when overriding the AI severity score", 400);
      }
      const now = new Date().toISOString();
      Object.assign(c, {
        status: "COMPLETE",
        final_outcome: finalOutcome,
        auditor_severity_score: auditorSeverityScore ?? null,
        auditor_comment: auditorComment ?? null,
        completed_at: now,
        updated_at: now,
      });
      const auditor = staffById(db, session.staffId);
      auditor.active_case_count = Math.max(0, auditor.active_case_count - 1);
      auditor.cases_reviewed_today += 1;
      const cooldown = cooldownForResolvedCase(db, c, auditor, auditorSeverityScore ?? null);
      const finalTier =
        auditorSeverityScore !== undefined ? scoreToTier(auditorSeverityScore) : (c.severity_tier ?? null);
      audit(db, session.staffId, "CASE_RESOLVED", caseId, finalTier ? `tier:${finalTier}` : null);
      return {
        case_id: c.case_id,
        status: mapStatusToPublicLabel("COMPLETE"),
        final_outcome: finalOutcome,
        cooldown,
      };
    });
  },

  async getManagerDashboard(): Promise<ManagerDashboardResponse> {
    await delay();
    const db = readDb();
    return {
      auditors: db.staff.filter((s) => s.role === "auditor").map((s) => ({ auditor_id: s.staff_id })),
      pending_declined_cases: db.cases.filter((c) => c.manager_flag === "DECLINED").length,
    };
  },

  async getMyWellbeing(token: string): Promise<AuditorWellbeing> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      const me = staffById(db, session.staffId);
      if (me.cooldown && !inCooldown(me)) {
        me.cooldown = null;
      }
      return {
        exposure_minutes_today: exposureMinutes(me),
        exposure_limit_minutes: me.exposure_limit_minutes,
        cooldown: me.cooldown,
        cases_reviewed_today: me.cases_reviewed_today,
      };
    });
  },

  // ---- Manager ----

  async getAuditorOverview(token: string): Promise<AuditorOverviewRow[]> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      return db.staff
        .filter((st) => st.role === "auditor")
        .map(overviewRow)
        .sort(
          (a, b) =>
            b.exposure_minutes_today / b.exposure_limit_minutes - a.exposure_minutes_today / a.exposure_limit_minutes,
        );
    });
  },

  async getSosSummary(token: string): Promise<SosSummary> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      const unresolved = db.sosEvents
        .filter((e) => !e.resolved_at)
        .sort((a, b) => Date.parse(b.triggered_at) - Date.parse(a.triggered_at));
      return {
        unresolved_count: unresolved.length,
        most_recent: unresolved[0]
          ? {
              auditor_name: displayName(db, unresolved[0].auditor_id) ?? unresolved[0].auditor_id,
              triggered_at: unresolved[0].triggered_at,
            }
          : null,
      };
    });
  },

  async getAuditorDetail(auditorId: string, token: string): Promise<AuditorDetail> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      const auditor = db.staff.find((st) => st.staff_id === auditorId && st.role === "auditor");
      if (!auditor) throw new ApiError("Auditor not found", 404);
      const dayAgo = Date.now() - 24 * 60 * 60_000;
      return {
        ...overviewRow(auditor),
        pattern_flagged: auditor.pattern_flagged,
        recent_cases: db.cases
          .filter((c) => c.status === "COMPLETE" && c.assigned_auditor === auditorId && c.completed_at)
          .filter((c) => Date.parse(c.completed_at!) >= dayAgo)
          .sort((a, b) => Date.parse(a.completed_at!) - Date.parse(b.completed_at!))
          .map((c) => ({ case_id: c.case_id, severity_tier: c.severity_tier, completed_at: c.completed_at! })),
        wellbeing_requests: db.wellbeingRequests
          .filter((r) => r.auditor_id === auditorId)
          .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
          .map((r) => ({
            id: r.id,
            kind: r.kind,
            case_id: r.case_id,
            created_at: r.created_at,
            status: r.resolved_at ? ("APPROVED" as const) : ("OPEN" as const),
          })),
      };
    });
  },

  async setExposureLimit(
    auditorId: string,
    token: string,
    minutes: number,
  ): Promise<{ exposure_limit_minutes: number }> {
    await delay();
    // Demo scenario (Figma 197:309): behaves exactly like a dropped request.
    if (consumeDemoFailure()) throw new TypeError("Failed to fetch");
    if (!Number.isInteger(minutes) || minutes < 30 || minutes > 480) {
      throw new ApiError("Enter a limit between 30 and 480 minutes.", 400);
    }
    return updateDb((db) => {
      const session = requireSession(db, token, "manager");
      const auditor = db.staff.find((st) => st.staff_id === auditorId && st.role === "auditor");
      if (!auditor) throw new ApiError("Auditor not found", 404);
      const previous = auditor.exposure_limit_minutes;
      auditor.exposure_limit_minutes = minutes;
      audit(db, session.staffId, "EXPOSURE_LIMIT_SET", null, auditorId + ":" + previous + "->" + minutes);
      return { exposure_limit_minutes: minutes };
    });
  },

  async approveBreakRequest(requestId: string, token: string): Promise<{ approved: true }> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "manager");
      const request = db.wellbeingRequests.find((r) => r.id === requestId && r.kind === "BREAK_REQUEST");
      if (!request) throw new ApiError("Break request not found", 404);
      request.resolved_at ??= new Date().toISOString();
      audit(db, session.staffId, "BREAK_APPROVED", request.case_id, request.auditor_id);
      return { approved: true as const };
    });
  },

  async getCaseOversight(token: string): Promise<ManagerCaseRow[]> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      advanceSimulatedAi(db);
      return [...db.cases]
        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
        .map((c) => ({
          case_id: c.case_id,
          auditor_name: displayName(db, c.assigned_auditor ?? routingAuditor(db, c)),
          severity_tier: c.severity_tier,
          status: c.status,
          manager_flag: c.manager_flag,
          sos_alert_id: [...db.sosEvents].reverse().find((e) => e.case_id === c.case_id)?.id ?? null,
        }));
    });
  },

  async listSosAlerts(token: string): Promise<SosAlert[]> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      const rank = { UNACKNOWLEDGED: 0, IN_PROGRESS: 1, RESOLVED: 2 } as const;
      return db.sosEvents
        .map((e) => sosAlert(db, e))
        .sort((a, b) => rank[a.status] - rank[b.status] || Date.parse(b.triggered_at) - Date.parse(a.triggered_at));
    });
  },

  async getSosAlert(alertId: string, token: string): Promise<SosAlertDetail> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      const event = findSos(db, alertId);
      const auditor = staffById(db, event.auditor_id);
      const c = db.cases.find((x) => x.case_id === event.case_id);
      return {
        ...sosAlert(db, event),
        exposure_minutes_today: exposureMinutes(auditor),
        exposure_limit_minutes: auditor.exposure_limit_minutes,
        severity_tier: c?.severity_tier ?? null,
        effective_severity_score: c?.effective_severity_score ?? null,
        narrative_summary: c?.narrative_summary ?? null,
        follow_up_notes: event.follow_up_notes,
      };
    });
  },

  async acknowledgeSosAlert(alertId: string, token: string): Promise<{ acknowledged: true }> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "manager");
      const event = findSos(db, alertId);
      if (!event.acknowledged_at) {
        event.acknowledged_at = new Date().toISOString();
        event.acknowledged_by = session.staffId;
        audit(db, session.staffId, "SOS_ACKNOWLEDGED", event.case_id, alertId);
      }
      return { acknowledged: true as const };
    });
  },

  async logSosFollowUp(
    alertId: string,
    token: string,
    notes: string,
    outcome: SosFollowUpOutcome,
  ): Promise<{ resolved: true }> {
    await delay();
    if (consumeDemoFailure()) throw new TypeError("Failed to fetch");
    if (!notes.trim()) throw new ApiError("Add follow-up notes before logging the outcome.", 400);
    return updateDb((db) => {
      const session = requireSession(db, token, "manager");
      const event = findSos(db, alertId);
      const now = new Date().toISOString();
      event.acknowledged_at ??= now;
      event.acknowledged_by ??= session.staffId;
      event.follow_up_notes = notes.trim();
      event.follow_up_outcome = outcome;
      event.resolved_at = now;
      // AR-WB-12: this is the check-in the Auditor's cooldown was waiting for.
      const auditor = staffById(db, event.auditor_id);
      if (auditor.cooldown?.requires_check_in) auditor.cooldown.check_in_completed_at = now;
      audit(db, session.staffId, "SOS_FOLLOW_UP_LOGGED", event.case_id, outcome);
      return { resolved: true as const };
    });
  },

  async listDeclinedCases(token: string): Promise<DeclinedCaseRow[]> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      return db.cases
        .filter((c) => c.manager_flag === "DECLINED" && c.decline && c.status !== "COMPLETE" && !c.assigned_auditor)
        .sort((a, b) => Date.parse(b.decline!.declined_at) - Date.parse(a.decline!.declined_at))
        .map((c) => ({
          case_id: c.case_id,
          auditor_name: displayName(db, c.decline!.declined_by) ?? c.decline!.declined_by,
          severity_tier: c.severity_tier,
          reason: c.decline!.reason,
          declined_at: c.decline!.declined_at,
        }));
    });
  },

  async getManagerCaseReview(caseId: string, token: string): Promise<ManagerCaseReview> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      const c = findCase(db, caseId);
      return {
        case_id: c.case_id,
        status: c.status,
        manager_flag: c.manager_flag,
        severity_tier: c.severity_tier,
        effective_severity_score: c.effective_severity_score,
        narrative_summary: c.narrative_summary,
        flagged_entities: c.flagged_entities ?? [],
        auditor_name: displayName(db, routingAuditor(db, c) ?? c.assigned_auditor),
        auditor_severity_score: c.auditor_severity_score,
        auditor_comment: c.auditor_comment,
        decline: c.decline ? { reason: c.decline.reason, other_text: c.decline.other_text } : null,
      };
    });
  },

  async getReassignmentContext(caseId: string, token: string): Promise<ReassignmentContext> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      const c = findCase(db, caseId);
      const decliningId = routingAuditor(db, c);
      const declining = db.staff.find((st) => st.staff_id === decliningId);
      return {
        case_id: c.case_id,
        declining_auditor: declining
          ? {
              name: declining.display_name,
              exposure_minutes_today: exposureMinutes(declining),
              exposure_limit_minutes: declining.exposure_limit_minutes,
            }
          : null,
        candidates: db.staff
          .filter((st) => st.role === "auditor" && st.staff_id !== decliningId)
          .map((st) => {
            const headroom = Math.max(0, st.exposure_limit_minutes - exposureMinutes(st));
            return {
              auditor_id: st.staff_id,
              name: st.display_name,
              headroom_minutes: headroom,
              limited_headroom: headroom < LIMITED_HEADROOM_MINUTES,
              available: headroom > 0 && !inCooldown(st),
            };
          })
          .sort((a, b) => b.headroom_minutes - a.headroom_minutes),
      };
    });
  },

  async reassignCase(caseId: string, token: string, auditorId: string): Promise<{ assigned_to_name: string }> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "manager");
      const c = findCase(db, caseId);
      const target = db.staff.find((st) => st.staff_id === auditorId && st.role === "auditor");
      const forcedUnavailable = db.demo.nextReassignTargetUnavailable;
      db.demo.nextReassignTargetUnavailable = false;
      // Re-validated at confirm time: the target may have hit their cap or started a cooldown (Figma 197:321).
      if (
        !target ||
        forcedUnavailable ||
        exposureMinutes(target) >= target.exposure_limit_minutes ||
        inCooldown(target)
      ) {
        throw new ApiError("This Auditor is no longer available — please choose another.", 409);
      }
      const now = new Date().toISOString();
      c.assigned_auditor = target.staff_id;
      c.assigned_at = now;
      c.updated_at = now;
      if (c.severity_tier || c.ai_failure) c.status = "READY_FOR_REVIEW";
      c.manager_flag = null;
      target.active_case_count += 1;
      target.last_assigned_at = now;
      audit(db, session.staffId, "CASE_REASSIGNED", caseId, target.staff_id);
      return { assigned_to_name: target.display_name };
    });
  },

  async closeWithoutReassignment(caseId: string, token: string, note: string): Promise<{ status: string }> {
    await delay();
    if (!note.trim()) throw new ApiError("Add a note for the audit trail to confirm no reassignment.", 400);
    return updateDb((db) => {
      const session = requireSession(db, token, "manager");
      const c = findCase(db, caseId);
      const now = new Date().toISOString();
      Object.assign(c, {
        status: "COMPLETE",
        final_outcome: "CLOSED_NO_REASSIGNMENT",
        completed_at: now,
        updated_at: now,
      });
      audit(db, session.staffId, "CLOSED_NO_REASSIGNMENT", caseId, note.trim());
      return { status: mapStatusToPublicLabel("COMPLETE") };
    });
  },

  async getCaseForExceptionalAccess(caseId: string, token: string): Promise<AuditorCaseDetail> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      return caseDetailFor(findCase(db, caseId));
    });
  },

  async recordExceptionalAccess(caseId: string, token: string): Promise<{ recorded: true }> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "manager");
      findCase(db, caseId);
      audit(db, session.staffId, "EXCEPTIONAL_RAW_ACCESS", caseId);
      return { recorded: true as const };
    });
  },

  async getValidationSummary(token: string): Promise<ValidationSummary> {
    await delay();
    return updateDb((db) => {
      requireSession(db, token, "manager");
      return PLACEHOLDER_VALIDATION;
    });
  },
};
