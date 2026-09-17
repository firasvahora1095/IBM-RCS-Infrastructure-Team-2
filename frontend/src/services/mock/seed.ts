import type { MockCase, MockDb, MockSosEvent, MockStaff } from "./store";

/** Bump when the seed shape changes, so stale demo data from an older build is replaced. */
export const MOCK_DB_VERSION = 6;

/**
 * Synthetic demo data for the mock data source.
 *
 * Names, case IDs and analysis text mirror the sample content already in the
 * approved Figma prototypes, so a demo matches the designs. None of it is
 * real: there is no real person, case or footage behind any record, and the
 * UI shows a "Demo data" badge whenever this data source is active.
 */

/** Shared demo password for every seeded staff account (mock mode only). */
export const DEMO_PASSWORD = "testpassword123";

const minutesAgo = (now: number, minutes: number) => new Date(now - minutes * 60_000).toISOString();

/** The fully analysed S3 case used throughout the Auditor Figma screens (18:26, 20:35, 25:53). */
function figmaHighSeverityCase(now: number): MockCase {
  return {
    case_id: "AR-2026-00417",
    status: "READY_FOR_REVIEW",
    assigned_auditor: "auditor-1",
    content_type: "Video",
    file_name: "incident_video.mp4",
    duration_seconds: 150,
    created_at: minutesAgo(now, 12),
    assigned_at: minutesAgo(now, 9),
    updated_at: minutesAgo(now, 6),
    ai_ready_at: minutesAgo(now, 6),
    watson_severity_score: 71,
    effective_severity_score: 71,
    severity_tier: "S3",
    narrative_summary:
      "The video shows a physical altercation between two individuals beginning at 00:42. A weapon-like object becomes visible at 01:15 and appears to be used to threaten the other individual shortly after. Visible signs of injury are apparent from approximately 02:03 onward. The incident involves two people throughout; no wider crowd conflict was detected.",
    incident_timeline: [
      { start: 42, end: 42, severity_tier: "S2", tag: "physical_violence" },
      { start: 75, end: 75, severity_tier: "S3", tag: "weapon_present" },
      { start: 82, end: 82, severity_tier: "S3", tag: "weapon_use" },
      { start: 123, end: 123, severity_tier: "S3", tag: "visible_injury" },
    ],
    flagged_entities: [
      { label: "Person A", start: 42, end: 134 },
      { label: "Person B", start: 42, end: 134 },
      { label: "Object: blunt weapon", start: 75, end: 100 },
    ],
    transcript: [
      { time: 41, text: "Wait — hey, get off—" },
      { time: 44, text: "[raised voices, overlapping]" },
      { time: 76, text: "Put it down! Put it down now!" },
      { time: 125, text: "[crying, indistinct]" },
    ],
    // Bar heights from the Figma audio-intensity graph, normalised to 0–1.
    audio_intensity: [5, 9, 21, 27.5, 15, 30, 40, 32.5, 10, 7.5, 17.5, 35, 45, 30, 12.5].map((h) => h / 45),
    ai_failure: null,
    flag_reason: "Graphic violence",
    final_outcome: null,
    auditor_severity_score: null,
    auditor_comment: null,
    completed_at: null,
    exposure: { active_seconds: 0, replay_seconds: 0 },
    manager_flag: null,
    decline: null,
  };
}

function baseCase(now: number, overrides: Partial<MockCase> & Pick<MockCase, "case_id">): MockCase {
  return {
    status: "READY_FOR_REVIEW",
    assigned_auditor: "auditor-1",
    content_type: "Video",
    file_name: "submitted_clip.mp4",
    duration_seconds: 96,
    created_at: minutesAgo(now, 40),
    assigned_at: minutesAgo(now, 30),
    updated_at: minutesAgo(now, 20),
    ai_ready_at: minutesAgo(now, 20),
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
    ...overrides,
  };
}

/** An SOS follows the S4 protocol: 30 minutes plus a mandatory check-in (AR-WB-12). */
function sosCooldown(now: number, triggeredMinutesAgo: number) {
  return {
    started_at: minutesAgo(now, triggeredMinutesAgo),
    ends_at: new Date(now + (30 - triggeredMinutesAgo) * 60_000).toISOString(),
    trigger: "SOS" as const,
    requires_check_in: true,
    check_in_completed_at: null,
  };
}

function sosEvent(id: string, caseId: string, auditorId: string, triggeredAt: string): MockSosEvent {
  return {
    id,
    case_id: caseId,
    auditor_id: auditorId,
    triggered_at: triggeredAt,
    acknowledged_at: null,
    acknowledged_by: null,
    follow_up_notes: null,
    follow_up_outcome: null,
    resolved_at: null,
  };
}

/**
 * Cases behind the Manager screens: SOS-triggering cases, the declined queue
 * (Figma 119:289, same reasons and tiers), and Reese Patel's completed cases
 * for "Recent case activity" (86:127). All synthetic.
 */
function managerSeedCases(now: number): MockCase[] {
  const managerCase = (overrides: Partial<MockCase> & Pick<MockCase, "case_id">) =>
    baseCase(now, { status: "AUDITOR_REVIEW", assigned_auditor: null, ...overrides });
  const declined = (
    caseId: string,
    auditorId: string,
    tier: "S1" | "S2" | "S3",
    score: number,
    reason: NonNullable<MockCase["decline"]>["reason"],
    minutes: number,
    extra: Partial<MockCase> = {},
  ) =>
    managerCase({
      case_id: caseId,
      watson_severity_score: score,
      effective_severity_score: score,
      severity_tier: tier,
      manager_flag: "DECLINED",
      decline: {
        reason,
        other_text: reason === "OTHER" ? "Mock: I reviewed a very similar case earlier today." : null,
        declined_by: auditorId,
        declined_at: minutesAgo(now, minutes),
      },
      updated_at: minutesAgo(now, minutes),
      ...extra,
    });
  const completed = (caseId: string, tier: "S1" | "S2" | "S3", score: number, minutes: number) =>
    baseCase(now, {
      case_id: caseId,
      status: "COMPLETE",
      assigned_auditor: "auditor-4",
      watson_severity_score: score,
      effective_severity_score: score,
      severity_tier: tier,
      narrative_summary: "Mock: completed standard case.",
      final_outcome: "NO_VIOLATION_FOUND",
      created_at: minutesAgo(now, minutes + 30),
      updated_at: minutesAgo(now, minutes),
      completed_at: minutesAgo(now, minutes),
    });

  return [
    managerCase({
      case_id: "AR-2026-00431",
      watson_severity_score: 78,
      effective_severity_score: 78,
      severity_tier: "S3",
      manager_flag: "SOS",
      narrative_summary:
        "Mock: sustained physical confrontation between two individuals detected between 00:41–01:12, escalating in intensity. Multi-person conflict flagged at 01:05. No weapon detected. Auditor activated SOS during active playback at 00:58.",
      incident_timeline: [{ start: 41, end: 72, severity_tier: "S3", tag: "multi_person_conflict" }],
    }),
    managerCase({
      case_id: "AR-2026-00428",
      watson_severity_score: 55,
      effective_severity_score: 55,
      severity_tier: "S2",
      manager_flag: "SOS",
      narrative_summary: "Mock: a heated confrontation with repeated shoving. No weapon detected.",
      incident_timeline: [{ start: 20, end: 48, severity_tier: "S2", tag: "physical_violence" }],
    }),
    managerCase({
      case_id: "AR-2026-00425",
      watson_severity_score: 86,
      effective_severity_score: 86,
      severity_tier: "S4",
      manager_flag: "SOS",
      narrative_summary:
        "Mock: an assault with visible injury. The Auditor activated SOS shortly after playback began.",
      incident_timeline: [{ start: 15, end: 40, severity_tier: "S4", tag: "visible_injury" }],
    }),
    baseCase(now, {
      case_id: "AR-2026-00390",
      status: "COMPLETE",
      assigned_auditor: null,
      watson_severity_score: 66,
      effective_severity_score: 66,
      severity_tier: "S3",
      manager_flag: "SOS",
      narrative_summary: "Mock: a fight between several people outside a venue.",
      final_outcome: "CLOSED_NO_REASSIGNMENT",
      completed_at: minutesAgo(now, 1600),
    }),
    declined("AR-2026-00398", "auditor-2", "S2", 58, "NEAR_EXPOSURE_LIMIT", 35, {
      narrative_summary:
        "Mock: verbal confrontation escalating to a single shove between two individuals at 00:34. No weapon detected. Aggressive posturing continues intermittently through 01:20.",
      incident_timeline: [
        { start: 34, end: 34, severity_tier: "S2", tag: "physical_violence" },
        { start: 40, end: 80, severity_tier: "S2", tag: "multi_person_conflict" },
      ],
      auditor_comment:
        "Rating not changed, but I'm close to my exposure limit for today and would prefer this case go to someone with more headroom.",
    }),
    declined("AR-2026-00386", "auditor-1", "S3", 72, "MORE_SEVERE_THAN_AI", 1150, {
      narrative_summary: "Mock: a physical altercation; the Auditor judged it more severe than the AI indicated.",
    }),
    declined("AR-2026-00379", "auditor-3", "S2", 49, "PERSONAL_TRIGGER", 1340, {
      narrative_summary: "Mock: a confrontation between two people in a car park.",
    }),
    declined("AR-2026-00371", "auditor-5", "S1", 24, "OTHER", 2900, {
      narrative_summary: "Mock: a verbal disagreement in a queue. No physical contact detected.",
    }),
    completed("AR-2026-00412", "S2", 51, 300),
    completed("AR-2026-00409", "S1", 18, 250),
    completed("AR-2026-00404", "S3", 69, 150),
    completed("AR-2026-00399", "S1", 27, 60),
  ];
}

export function createSeedDb(now: number): MockDb {
  const staff: MockStaff[] = [
    // Auditors, named as in the Manager Figma screens (78:69, 86:198).
    staffMember("auditor-1", "auditor", "Jordan Lee", 3, 62, now, 9),
    staffMember("auditor-2", "auditor", "Priya Shah", 2, 68, now, 20),
    staffMember("auditor-3", "auditor", "Sam Nguyen", 4, 120, now, 45),
    staffMember("auditor-4", "auditor", "Reese Patel", 2, 94, now, 35),
    staffMember("auditor-5", "auditor", "Marcus Webb", 3, 105, now, 50),
    staffMember("manager-1", "manager", "Alex Morgan", 0, 0, now, null),
  ];

  const cases: MockCase[] = [
    figmaHighSeverityCase(now),
    baseCase(now, {
      case_id: "AR-2026-00418",
      status: "AI_PROCESSING",
      created_at: minutesAgo(now, 3),
      assigned_at: minutesAgo(now, 2),
      updated_at: minutesAgo(now, 2),
      // Finishes simulated AI analysis a few minutes into the demo.
      ai_ready_at: new Date(now + 3 * 60_000).toISOString(),
    }),
    baseCase(now, {
      case_id: "AR-2026-00419",
      assigned_at: minutesAgo(now, 24),
      watson_severity_score: 22,
      effective_severity_score: 22,
      severity_tier: "S1",
      narrative_summary:
        "Mock: a verbal disagreement between two people in a public space. No physical contact detected.",
      incident_timeline: [{ start: 18, end: 31, severity_tier: "S1", tag: null }],
      flagged_entities: [
        { label: "Person A", start: 10, end: 60 },
        { label: "Person B", start: 12, end: 58 },
      ],
      transcript: [{ time: 20, text: "[raised voices]" }],
      audio_intensity: [0.2, 0.3, 0.5, 0.4, 0.3, 0.2, 0.1, 0.1],
      flag_reason: "Verbal conflict",
    }),
    baseCase(now, {
      case_id: "AR-2026-00420",
      assigned_at: minutesAgo(now, 31),
      duration_seconds: 188,
      watson_severity_score: 78,
      effective_severity_score: 88,
      severity_tier: "S4",
      narrative_summary:
        "Mock: a sustained assault involving a weapon. The weapon-use floor rule raised the effective score above the model's original figure.",
      incident_timeline: [
        { start: 30, end: 64, severity_tier: "S3", tag: "physical_violence" },
        { start: 70, end: 70, severity_tier: "S4", tag: "weapon_use" },
        { start: 96, end: 140, severity_tier: "S4", tag: "visible_injury" },
      ],
      flagged_entities: [
        { label: "Person A", start: 25, end: 170 },
        { label: "Object: knife", start: 68, end: 90 },
      ],
      transcript: null,
      audio_intensity: [0.3, 0.6, 0.9, 0.8, 1, 0.7, 0.5, 0.4],
      flag_reason: "Graphic violence, weapon use",
    }),
    // AR-AI-10 pre-screen failure (Figma 25:212): no score, summary or timeline.
    baseCase(now, {
      case_id: "AR-2026-00421",
      assigned_at: minutesAgo(now, 16),
      duration_seconds: 74,
      file_name: "uploaded_clip.mov",
      ai_failure: "vision",
    }),
    baseCase(now, {
      case_id: "AR-2026-00402",
      status: "COMPLETE",
      created_at: minutesAgo(now, 300),
      assigned_at: minutesAgo(now, 290),
      updated_at: minutesAgo(now, 240),
      watson_severity_score: 45,
      effective_severity_score: 45,
      severity_tier: "S2",
      narrative_summary: "Mock: a pushing incident between two people outside a venue.",
      incident_timeline: [{ start: 12, end: 20, severity_tier: "S2", tag: "physical_violence" }],
      final_outcome: "POLICY_VIOLATION_FOUND",
      auditor_severity_score: null,
      completed_at: minutesAgo(now, 240),
    }),
    // Public status lookup samples (the Normal User Figma uses RCS-7Q3M-K91X).
    baseCase(now, {
      case_id: "RCS-7Q3M-K91X",
      status: "AUDITOR_REVIEW",
      assigned_auditor: "auditor-2",
      file_name: "incident_video.mp4",
      duration_seconds: 272,
      created_at: "2026-08-22T04:20:00.000Z",
      updated_at: "2026-08-22T05:05:00.000Z",
      watson_severity_score: 58,
      effective_severity_score: 58,
      severity_tier: "S2",
      narrative_summary: "Mock: a confrontation between two people on public transport.",
      incident_timeline: [{ start: 40, end: 72, severity_tier: "S2", tag: "multi_person_conflict" }],
    }),
    baseCase(now, {
      case_id: "RCS-4H8P-2DXC",
      status: "COMPLETE",
      assigned_auditor: "auditor-4",
      file_name: "reported_clip.mp4",
      duration_seconds: 64,
      created_at: minutesAgo(now, 2880),
      updated_at: minutesAgo(now, 1440),
      watson_severity_score: 30,
      effective_severity_score: 30,
      severity_tier: "S1",
      narrative_summary: "Mock: no violent behaviour detected.",
      incident_timeline: [],
      final_outcome: "NO_VIOLATION_FOUND",
      completed_at: minutesAgo(now, 1440),
    }),
    ...managerSeedCases(now),
  ];

  // Manager screens (Figma 78:69, 86:94, 103:151): cooldowns and states that
  // match the seeded SOS events below. auditor-1, the main Auditor demo
  // account, is deliberately left free of any cooldown.
  const byId = (id: string) => staff.find((s) => s.staff_id === id)!;
  byId("auditor-2").cooldown = {
    started_at: minutesAgo(now, 3),
    ends_at: new Date(now + 12 * 60_000).toISOString(),
    trigger: "S3",
    requires_check_in: false,
    check_in_completed_at: null,
  };
  byId("auditor-3").cooldown = sosCooldown(now, 26);
  byId("auditor-4").cooldown = sosCooldown(now, 68);
  byId("auditor-4").pattern_flagged = true;
  byId("auditor-5").cooldown = sosCooldown(now, 4);

  const sosEvents: MockSosEvent[] = [
    sosEvent("SOS-demo0001", "AR-2026-00431", "auditor-5", minutesAgo(now, 4)),
    sosEvent("SOS-demo0002", "AR-2026-00428", "auditor-3", minutesAgo(now, 26)),
    {
      ...sosEvent("SOS-demo0003", "AR-2026-00425", "auditor-4", minutesAgo(now, 68)),
      acknowledged_at: minutesAgo(now, 60),
      acknowledged_by: "manager-1",
    },
    {
      ...sosEvent("SOS-demo0004", "AR-2026-00390", "auditor-1", minutesAgo(now, 1720)),
      acknowledged_at: minutesAgo(now, 1710),
      acknowledged_by: "manager-1",
      follow_up_notes: "Mock: checked in by phone; no further action needed.",
      follow_up_outcome: "NO_FURTHER_ACTION",
      resolved_at: minutesAgo(now, 1690),
    },
  ];

  return {
    version: MOCK_DB_VERSION,
    cases,
    staff,
    sessions: {},
    statusLookup: { failureTimes: [], lockedUntil: null },
    statusUpdateRequests: [],
    caseAdditions: [],
    loginAttempts: {},
    sosEvents,
    wellbeingRequests: [
      {
        id: "WB-demo0001",
        auditor_id: "auditor-4",
        case_id: null,
        kind: "TALK_TO_MANAGER",
        created_at: minutesAgo(now, 150),
        resolved_at: null,
      },
      {
        id: "WB-demo0002",
        auditor_id: "auditor-4",
        case_id: null,
        kind: "BREAK_REQUEST",
        created_at: minutesAgo(now, 45),
        resolved_at: null,
      },
    ],
    auditLog: [],
    demo: { failNextSubmission: false, nextReassignTargetUnavailable: false },
  };
}

function staffMember(
  staffId: string,
  role: MockStaff["role"],
  displayName: string,
  activeCases: number,
  exposureMinutes: number,
  now: number,
  lastAssignedMinutesAgo: number | null,
): MockStaff {
  return {
    staff_id: staffId,
    password: DEMO_PASSWORD,
    role,
    display_name: displayName,
    active_case_count: activeCases,
    exposure_seconds_today: exposureMinutes * 60,
    exposure_limit_minutes: 120,
    cases_reviewed_today: role === "auditor" ? Math.round(exposureMinutes / 20) : 0,
    pattern_flagged: false,
    last_assigned_at: lastAssignedMinutesAgo === null ? null : minutesAgo(now, lastAssignedMinutesAgo),
    cooldown: null,
  };
}
