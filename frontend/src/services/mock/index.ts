import { ACCEPTED_VIDEO_EXTENSIONS } from "../../design-tokens/videoFormats";
import { mapStatusToPublicLabel } from "../../design-tokens/statusLabels";
import { ApiError } from "../types";
import type {
  AuditorCaseDetail,
  AuditorWellbeing,
  AuditorCaseListItem,
  CreateReportResponse,
  DataService,
  FinalOutcome,
  ManagerDashboardResponse,
  PublicStatusResponse,
  ResolveCaseResponse,
  StaffLoginResponse,
  StatusUpdateContact,
} from "../types";
import { readDb, updateDb, type MockCase, type MockDb } from "./store";

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

const CASE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
        narrative_summary: "Mock: physical altercation detected between two people.",
        incident_timeline: [{ start: 12, end: 20, severity_tier: "S3", tag: "physical_violence" }],
        flagged_entities: [{ label: "Person A", start: 10, end: 30 }],
        transcript: null,
        audio_intensity: [0.3, 0.8, 0.6, 0.3],
      };
}

/** AR-AS-02: lowest (0.6 × exposure ratio + 0.4 × case ratio) wins; ties go to whoever waited longest. */
function selectAuditor(db: MockDb): string | null {
  const eligible = db.staff.filter((s) => s.role === "auditor" && s.exposure_minutes_today < s.exposure_limit_minutes);
  if (eligible.length === 0) return null;
  const score = (s: (typeof eligible)[number]) =>
    0.6 * (s.exposure_minutes_today / 120) + 0.4 * (s.active_case_count / 10);
  const lastAssigned = (s: (typeof eligible)[number]) => (s.last_assigned_at ? Date.parse(s.last_assigned_at) : 0);
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
    return updateDb((db) => {
      const now = new Date();
      const assigned = selectAuditor(db);
      const caseId = newCaseId();
      db.cases.push({
        case_id: caseId,
        status: assigned ? "AI_PROCESSING" : "SUBMITTED",
        assigned_auditor: assigned,
        content_type: "Video",
        file_name: videoFile.name,
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
        final_outcome: null,
        auditor_severity_score: null,
        auditor_comment: null,
        completed_at: null,
      });
      const auditor = db.staff.find((s) => s.staff_id === assigned);
      if (auditor) {
        auditor.active_case_count += 1;
        auditor.last_assigned_at = now.toISOString();
      }
      return {
        case_id: caseId,
        status: mapStatusToPublicLabel(assigned ? "AI_PROCESSING" : "SUBMITTED"),
        assigned_auditor: assigned,
      };
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
      const member = db.staff.find((s) => s.staff_id === staffId.trim());
      if (!member || member.password !== password) {
        throw new ApiError("Invalid credentials", 401);
      }
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
      };
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
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      const c = findOwnCase(db, caseId, session.staffId);
      // AR-AI-07: an override needs a comment — mirrors the backend rule.
      if (auditorSeverityScore !== undefined && !auditorComment?.trim()) {
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
      const auditor = db.staff.find((s) => s.staff_id === session.staffId);
      if (auditor) auditor.active_case_count = Math.max(0, auditor.active_case_count - 1);
      return { case_id: c.case_id, status: mapStatusToPublicLabel("COMPLETE"), final_outcome: finalOutcome };
    });
  },

  async getManagerDashboard(): Promise<ManagerDashboardResponse> {
    await delay();
    const db = readDb();
    return {
      auditors: db.staff.filter((s) => s.role === "auditor").map((s) => ({ auditor_id: s.staff_id })),
      pending_declined_cases: 0,
    };
  },

  async getMyWellbeing(token: string): Promise<AuditorWellbeing> {
    await delay();
    return updateDb((db) => {
      const session = requireSession(db, token, "auditor");
      const me = db.staff.find((s) => s.staff_id === session.staffId)!;
      // A cooldown without a required check-in simply ends at its end time.
      if (me.cooldown && !me.cooldown.requires_check_in && Date.parse(me.cooldown.ends_at) <= Date.now()) {
        me.cooldown = null;
      }
      return {
        exposure_minutes_today: me.exposure_minutes_today,
        exposure_limit_minutes: me.exposure_limit_minutes,
        cooldown: me.cooldown,
      };
    });
  },
};
