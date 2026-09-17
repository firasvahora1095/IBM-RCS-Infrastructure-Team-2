import type {
  CaseOutcome,
  CooldownState,
  DeclineReason,
  WellbeingRequestKind,
  FlaggedEntity,
  IncidentTimelineEntry,
  InternalCaseStatus,
  SeverityTier,
  StaffRole,
  TranscriptLine,
} from "../types";
import { createSeedDb, MOCK_DB_VERSION } from "./seed";

/**
 * The mock data source's "database": plain JSON kept in sessionStorage, so a
 * demo click-through (upload a case, resolve it, look it up) survives page
 * reloads within the tab but never leaks between browser sessions or users.
 *
 * Everything in here is synthetic demo data. Nothing is sent anywhere.
 */

export interface MockCase {
  case_id: string;
  status: InternalCaseStatus;
  assigned_auditor: string | null;
  content_type: "Video" | "Link" | "Screenshot";
  file_name: string | null;
  duration_seconds: number | null;
  created_at: string;
  assigned_at: string | null;
  updated_at: string;
  /** When the simulated AI analysis finishes; the case becomes READY_FOR_REVIEW after this. */
  ai_ready_at: string | null;
  watson_severity_score: number | null;
  effective_severity_score: number | null;
  severity_tier: SeverityTier | null;
  narrative_summary: string | null;
  incident_timeline: IncidentTimelineEntry[] | null;
  flagged_entities: FlaggedEntity[] | null;
  transcript: TranscriptLine[] | null;
  audio_intensity: number[] | null;
  ai_failure: "vision" | "speech_to_text" | null;
  flag_reason: string | null;
  final_outcome: CaseOutcome | null;
  auditor_severity_score: number | null;
  auditor_comment: string | null;
  completed_at: string | null;
  /** Measured playback exposure on this case, all reviewers combined. */
  exposure: { active_seconds: number; replay_seconds: number };
  /**
   * Set when the case left the standard flow and needs a Manager decision
   * (AR-AI-09). RT-02 has no internal state for this yet, so it is modelled as
   * a flag alongside the status — flagged for the BA.
   */
  manager_flag: "DECLINED" | "SOS" | null;
  decline: { reason: DeclineReason; other_text: string | null; declined_by: string; declined_at: string } | null;
}

export interface MockStaff {
  staff_id: string;
  password: string;
  role: StaffRole;
  display_name: string;
  active_case_count: number;
  /** Stored in seconds so short playback sessions add up exactly; shown in whole minutes. */
  exposure_seconds_today: number;
  exposure_limit_minutes: number;
  cases_reviewed_today: number;
  last_assigned_at: string | null;
  cooldown: CooldownState | null;
}

export interface MockSosEvent {
  id: string;
  case_id: string;
  auditor_id: string;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  follow_up_notes: string | null;
  resolved_at: string | null;
}

export interface MockWellbeingRequest {
  id: string;
  auditor_id: string;
  case_id: string | null;
  kind: WellbeingRequestKind;
  created_at: string;
  resolved_at: string | null;
}

/** AR-AI-12 audit history entry. Never edited or removed once written. */
export interface MockAuditEntry {
  at: string;
  actor: string;
  case_id: string | null;
  action: string;
  detail: string | null;
}

export interface MockDb {
  version: number;
  cases: MockCase[];
  staff: MockStaff[];
  /** token → session */
  sessions: Record<string, { staffId: string; role: StaffRole }>;
  /** UR-ST-07 status-lookup lockout state for this browser session. */
  statusLookup: { failureTimes: number[]; lockedUntil: number | null };
  /** Opt-in email/SMS update requests (UR-ID-05). Nothing is ever sent from mock mode. */
  statusUpdateRequests: { case_id: string; email: string | null; phone: string | null; requested_at: string }[];
  /** Follow-up context added to a case by the reporter (UR-NTH-05). File contents are never stored. */
  caseAdditions: { case_id: string; details: string; attachment_name: string | null; added_at: string }[];
  /** Staff login lockout, keyed by the staff ID that was typed. */
  loginAttempts: Record<string, { failureTimes: number[]; lockedUntil: number | null }>;
  sosEvents: MockSosEvent[];
  wellbeingRequests: MockWellbeingRequest[];
  auditLog: MockAuditEntry[];
  /** Edge states forced from the demo scenario menu (mock mode only). */
  demo: { failNextSubmission: boolean };
}

const STORAGE_KEY = "rcs_mock_db";

export function readDb(): MockDb {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === MOCK_DB_VERSION) return parsed;
    }
  } catch {
    // Unreadable or unavailable storage: fall through to a fresh seed.
  }
  const seeded = createSeedDb(Date.now());
  writeDb(seeded);
  return seeded;
}

export function writeDb(db: MockDb): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage unavailable: the demo still works for this page view.
  }
}

/** Restores the original demo data (used by the demo scenario panel and tests). */
export function resetDb(): MockDb {
  const seeded = createSeedDb(Date.now());
  writeDb(seeded);
  return seeded;
}

/**
 * Reads, applies a change, and saves in one step. Saves even when the change
 * throws: an operation can record state and then reject the request (e.g. a
 * failed status lookup counts towards the UR-ST-07 lockout, then returns 404),
 * and that record must persist. Operations validate before mutating, so a
 * rejected request never leaves a half-applied change.
 */
export function updateDb<T>(change: (db: MockDb) => T): T {
  const db = readDb();
  try {
    return change(db);
  } finally {
    writeDb(db);
  }
}
