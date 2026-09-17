import type { MockCase, MockDb, MockStaff } from "./store";

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
    final_outcome: null,
    auditor_severity_score: null,
    auditor_comment: null,
    completed_at: null,
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
    final_outcome: null,
    auditor_severity_score: null,
    auditor_comment: null,
    completed_at: null,
    ...overrides,
  };
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
  ];

  return {
    version: 1,
    cases,
    staff,
    sessions: {},
    statusLookup: { failureTimes: [], lockedUntil: null },
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
    exposure_minutes_today: exposureMinutes,
    exposure_limit_minutes: 120,
    last_assigned_at: lastAssignedMinutesAgo === null ? null : minutesAgo(now, lastAssignedMinutesAgo),
  };
}
