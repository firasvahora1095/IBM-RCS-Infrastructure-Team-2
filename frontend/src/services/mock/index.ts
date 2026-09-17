import { ACCEPTED_VIDEO_EXTENSIONS } from "../../design-tokens/videoFormats";
import { mapStatusToPublicLabel } from "../../design-tokens/statusLabels";
import { scoreToTier } from "../../design-tokens/severity";
import { ApiError } from "../types";
import type {
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
import { readDb, updateDb, type MockCase, type MockDb, type MockStaff } from "./store";

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
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      const c = findOwnCase(db, caseId, session.staffId);
      const now = new Date().toISOString();
      db.sosEvents.push({
        id: newId("SOS"),
        case_id: caseId,
        auditor_id: session.staffId,
        triggered_at: now,
        acknowledged_at: null,
        acknowledged_by: null,
        follow_up_notes: null,
        resolved_at: null,
      });
      routeToManager(db, c, "SOS");
      audit(db, session.staffId, "SOS_TRIGGERED", caseId);
      // AR-WB-12: SOS follows the S4 protocol — 30 minutes plus a mandatory check-in.
      const cooldown = startCooldown(staffById(db, session.staffId), "SOS", COOLDOWN_MINUTES.S4, true);
      return { cooldown };
    });
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
};
