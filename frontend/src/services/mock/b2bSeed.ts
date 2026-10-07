import type { ClientMessage, DeliveredOutcome, FinalOutcome, GovernanceLogRow, ReportAccessEntry, ServiceReport, SeverityTier } from "../types";
import { computeMetrics } from "./reportMetrics";
import type { MockCase, MockClientUser, MockDelivery, MockHistoricalCase, MockOrganisation } from "./store";

/**
 * Synthetic B2B demo data: the CommunityHub customer, ~two months of older
 * completed cases (just the fields reports and deliveries need), one
 * delivery per completed case, a released and a draft service report, the
 * client user, and the simplified governance call log.
 *
 * Generated from a fixed seed, so every reset produces the same story; dates
 * are relative to "now" so the demo always looks current. All of it is
 * synthetic. Nothing here describes a real person, case or organisation.
 */

export const COMMUNITYHUB_ID = "COMMUNITYHUB";
export const COMMUNITYHUB_NAME = "CommunityHub";

/** Retry gap between automatic delivery attempts, and the number of automatic attempts before Manager review. */
export const DELIVERY_RETRY_GAP_MS = 6_000;
export const DELIVERY_MAX_AUTO_ATTEMPTS = 3;
export const DELIVERY_TIMEOUT_REASON = "CommunityHub's endpoint didn't respond (timeout)";
export const DELIVERY_UNAVAILABLE_REASON = "CommunityHub's endpoint was unavailable (503)";

/** mulberry32: a tiny deterministic PRNG, so the seed is identical on every reset. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];

function pick<T>(random: () => number, weighted: [T, number][]): T {
  const total = weighted.reduce((sum, [, w]) => sum + w, 0);
  let roll = random() * total;
  for (const [value, weight] of weighted) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return weighted[weighted.length - 1][0];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** yyyy-mm-dd in local time. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** First and last day (yyyy-mm-dd) of the calendar month `offset` months from `now`'s month. */
export function monthPeriod(now: number, offset: number): { start: string; end: string } {
  const base = new Date(now);
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const last = new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);
  return { start: isoDate(first), end: isoDate(last) };
}

/** Readable report ID: a whole month is RPT-CH-2026-09, any other period uses both dates. */
export function reportIdFor(start: string, end: string, version: number): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const lastOfMonth = new Date(sy, sm, 0).getDate();
  const wholeMonth = sd === 1 && end === `${sy}-${pad(sm)}-${pad(lastOfMonth)}`;
  const base = wholeMonth ? `RPT-CH-${sy}-${pad(sm)}` : `RPT-CH-${start.replaceAll("-", "")}-${end.replaceAll("-", "")}`;
  return version > 1 ? `${base}-v${version}` : base;
}

function historicalCases(now: number, random: () => number): MockHistoricalCase[] {
  const startOfWindow = new Date(new Date(now).getFullYear(), new Date(now).getMonth() - 2, 1).getTime();
  const result: MockHistoricalCase[] = [];
  const dayMs = 24 * 60 * 60_000;
  for (let day = startOfWindow; day < now - dayMs; day += dayMs) {
    const count = pick(random, [
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 1],
    ]);
    for (let i = 0; i < count; i += 1) {
      const created = day + (8 + random() * 9) * 60 * 60_000;
      const turnaroundMinutes = pick(random, [
        [20 + random() * 40, 5],
        [60 + random() * 120, 4],
        [180 + random() * 420, 2],
      ]);
      const completed = created + turnaroundMinutes * 60_000;
      if (completed >= now - 60 * 60_000) continue;
      const aiTier = pick<SeverityTier>(random, [
        ["S1", 35],
        ["S2", 35],
        ["S3", 22],
        ["S4", 8],
      ]);
      // Most Auditors confirm the AI tier; some move it one step either way.
      const shift = pick(random, [
        [0, 85],
        [1, 10],
        [-1, 5],
      ]);
      const finalTier = TIERS[Math.min(3, Math.max(0, TIERS.indexOf(aiTier) + shift))];
      const violationChance = { S1: 0.1, S2: 0.5, S3: 0.9, S4: 0.95 }[finalTier];
      const outcome: FinalOutcome = random() < violationChance ? "POLICY_VIOLATION_FOUND" : "NO_VIOLATION_FOUND";
      let id = "RCS-";
      for (let k = 0; k < 8; k += 1) {
        if (k === 4) id += "-";
        id += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)];
      }
      result.push({
        case_id: id,
        created_at: new Date(created).toISOString(),
        completed_at: new Date(completed).toISOString(),
        ai_tier: aiTier,
        final_tier: finalTier,
        outcome,
        declined_reassigned: random() < 0.05,
      });
    }
  }
  return result.sort((a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at));
}

function successfulDelivery(
  caseId: string,
  outcome: DeliveredOutcome,
  tier: SeverityTier | null,
  completedAt: string,
  random: () => number,
): MockDelivery {
  const completed = Date.parse(completedAt);
  // A few deliveries needed one automatic retry before succeeding.
  const firstFailed = random() < 0.06;
  const attempts = firstFailed
    ? [
        {
          attempt: 1,
          at: new Date(completed + 2_000).toISOString(),
          result: "FAILED" as const,
          reason: DELIVERY_TIMEOUT_REASON,
          manual: false,
        },
        { attempt: 2, at: new Date(completed + 8_000).toISOString(), result: "SUCCESS" as const, reason: null, manual: false },
      ]
    : [{ attempt: 1, at: new Date(completed + 2_000).toISOString(), result: "SUCCESS" as const, reason: null, manual: false }];
  return {
    delivery_id: `DEL-${caseId}`,
    case_id: caseId,
    organisation_id: COMMUNITYHUB_ID,
    outcome,
    final_severity: tier,
    completed_at: completedAt,
    delivery_status: "SUCCESS",
    attempts,
    failure_reason: null,
    next_attempt_at: null,
    escalated_at: null,
    escalation_note: null,
    source_url: null,
    simulate_failure: false,
  };
}

/** Three failed automatic attempts, now waiting for the Manager (extras §4.4). */
function failedDelivery(base: MockDelivery, reason: string): MockDelivery {
  const completed = Date.parse(base.completed_at);
  return {
    ...base,
    delivery_status: "NEEDS_ATTENTION",
    attempts: [1, 2, 3].map((n) => ({
      attempt: n,
      at: new Date(completed + 2_000 + (n - 1) * 5 * 60_000).toISOString(),
      result: "FAILED" as const,
      reason,
      manual: false,
    })),
    failure_reason: reason,
    simulate_failure: true,
  };
}

const GOVERNANCE_MODEL = "watsonx.ai multimodal vision model";

function governanceLog(now: number, caseIds: string[], random: () => number): GovernanceLogRow[] {
  return caseIds.slice(-24).map((caseId, i) => {
    const success = !(i === 7 || i === 18);
    const leakage = 0.9 + random() * 0.09;
    const attribution = 0.72 + random() * 0.24;
    return {
      entry_id: `GOV-${String(1000 + i)}`,
      case_id: caseId,
      at: new Date(now - (24 - i) * 47 * 60_000).toISOString(),
      model_id: GOVERNANCE_MODEL,
      model_version: "2026-09",
      prompt_version: i < 10 ? "frame-severity v2" : "frame-severity v3",
      success,
      prompt_leakage: success ? Number(leakage.toFixed(2)) : 0,
      source_attribution: success ? Number(attribution.toFixed(2)) : 0,
      accumulated_score: success ? Number(((leakage + attribution) / 2).toFixed(2)) : 0,
      tokens_in: 1800 + Math.round(random() * 1400),
      tokens_out: success ? 220 + Math.round(random() * 260) : 0,
      reasoning: success
        ? "Mock: frame-level analysis returned tags and a severity score with a short reasoning string."
        : "Mock: the model call timed out; the case was flagged for the AI-failure path.",
    };
  });
}

export interface B2bSeed {
  organisation: MockOrganisation;
  caseHistory: MockHistoricalCase[];
  deliveries: MockDelivery[];
  reports: ServiceReport[];
  reportAccess: ReportAccessEntry[];
  governanceLog: GovernanceLogRow[];
  clients: MockClientUser[];
  clientMessages: ClientMessage[];
}

export function createB2bSeed(now: number, liveCases: MockCase[], demoPassword: string): B2bSeed {
  const random = rng(2026);
  const caseHistory = historicalCases(now, random);

  const deliveries = caseHistory.map((h) =>
    successfulDelivery(h.case_id, h.outcome, h.final_tier, h.completed_at, random),
  );
  // The most recent older case is the one that needs Manager attention.
  const lastIndex = deliveries.length - 1;
  if (lastIndex >= 0) deliveries[lastIndex] = failedDelivery(deliveries[lastIndex], DELIVERY_UNAVAILABLE_REASON);

  // Live completed cases were handed off too, including any a Manager closed
  // without a decision, so CommunityHub is never left waiting on a post.
  for (const c of liveCases) {
    if (c.status !== "COMPLETE" || !c.completed_at || !c.final_outcome) continue;
    const tier = c.final_outcome === "CLOSED_NO_REASSIGNMENT" ? null : (c.severity_tier ?? "S1");
    let delivery = successfulDelivery(c.case_id, c.final_outcome, tier, c.completed_at, () => 1);
    if (c.case_id === "AR-2026-00404") delivery = failedDelivery(delivery, DELIVERY_TIMEOUT_REASON);
    if (c.case_id === "AR-2026-00409") {
      // One automatic retry already failed; the next attempt (a minute into the demo) succeeds.
      delivery = {
        ...delivery,
        delivery_status: "RETRYING",
        attempts: [{ ...delivery.attempts[0], result: "FAILED", reason: DELIVERY_TIMEOUT_REASON }],
        next_attempt_at: new Date(now + 60_000).toISOString(),
      };
    }
    if (c.case_id === "AR-2026-00399") {
      delivery = { ...delivery, delivery_status: "PENDING", attempts: [], next_attempt_at: new Date(now + 30_000).toISOString() };
    }
    deliveries.push(delivery);
  }

  // Reports came from CommunityHub posts, so each result carries its post link.
  deliveries.forEach((d, i) => {
    d.source_url ??= `https://communityhub.example/post/${3100 + i}`;
  });
  // CommunityHub's moderators have dealt with everything except the newest few results.
  const delivered = deliveries
    .filter((d) => d.delivery_status === "SUCCESS")
    .sort((a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at));
  delivered.slice(0, -4).forEach((d, i) => {
    d.platform_action = {
      action: d.outcome === "POLICY_VIOLATION_FOUND" ? "REMOVED" : "KEPT",
      note: i % 9 === 0 && d.outcome === "POLICY_VIOLATION_FOUND" ? "Mock: removed and the account warned." : null,
      at: new Date(Date.parse(d.completed_at) + 25 * 60_000).toISOString(),
      by: "ch-mod-04",
    };
  });

  const metricsSource = { history: caseHistory, cases: liveCases, deliveries };
  const released = monthPeriod(now, -2);
  const draft = monthPeriod(now, -1);
  const releasedAt = new Date(new Date(now).getFullYear(), new Date(now).getMonth() - 1, 2, 10, 41).toISOString();

  const reports: ServiceReport[] = [
    {
      report_id: reportIdFor(draft.start, draft.end, 1),
      organisation_id: COMMUNITYHUB_ID,
      organisation_name: COMMUNITYHUB_NAME,
      period_start: draft.start,
      period_end: draft.end,
      status: "DRAFT",
      version: 1,
      generated_at: new Date(now - 2 * 60 * 60_000).toISOString(),
      released_at: null,
      released_by: null,
      manager_note: null,
      metrics: computeMetrics(metricsSource, draft.start, draft.end),
    },
    {
      report_id: reportIdFor(released.start, released.end, 1),
      organisation_id: COMMUNITYHUB_ID,
      organisation_name: COMMUNITYHUB_NAME,
      period_start: released.start,
      period_end: released.end,
      status: "RELEASED",
      version: 1,
      generated_at: new Date(Date.parse(releasedAt) - 50 * 60_000).toISOString(),
      released_at: releasedAt,
      released_by: "Alex Morgan",
      manager_note:
        "Volumes were steady across the month. A small number of results needed an automatic retry before CommunityHub received them; all were delivered.",
      metrics: computeMetrics(metricsSource, released.start, released.end),
    },
  ];

  const releasedId = reports[1].report_id;
  const accessAt = (minutes: number) => new Date(Date.parse(releasedAt) + minutes * 60_000).toISOString();

  return {
    organisation: {
      organisation_id: COMMUNITYHUB_ID,
      name: COMMUNITYHUB_NAME,
      description: "Social platform · Customer organisation",
      status: "READY",
      destination_masked: "https://api.communityhub.example/••••••/rcs-results",
      last_tested_at: new Date(now - 3 * 60 * 60_000).toISOString(),
    },
    caseHistory,
    deliveries,
    reports,
    reportAccess: [
      {
        report_id: releasedId,
        user_id: "ch-user-17",
        organisation_id: COMMUNITYHUB_ID,
        action: "VIEW",
        access_result: "SUCCESS",
        reason: null,
        at: accessAt(26 * 60),
      },
      {
        report_id: releasedId,
        user_id: "ch-user-17",
        organisation_id: COMMUNITYHUB_ID,
        action: "DOWNLOAD",
        access_result: "SUCCESS",
        reason: null,
        at: accessAt(26 * 60 + 4),
      },
    ],
    governanceLog: governanceLog(
      now,
      caseHistory.map((h) => h.case_id),
      random,
    ),
    clients: [
      // Least privilege: each CommunityHub account sees only what its job needs.
      {
        user_id: "ch-user-17",
        password: demoPassword,
        display_name: "Taylor Brooks",
        organisation_id: COMMUNITYHUB_ID,
        role: "REPORTS",
      },
      {
        user_id: "ch-mod-04",
        password: demoPassword,
        display_name: "Jordan Kim",
        organisation_id: COMMUNITYHUB_ID,
        role: "TRUST_SAFETY",
      },
      {
        user_id: "ch-admin-01",
        password: demoPassword,
        display_name: "Sam Rivera",
        organisation_id: COMMUNITYHUB_ID,
        role: "ADMIN",
      },
    ],
    clientMessages: [
      {
        message_id: "MSG-1002",
        organisation_id: COMMUNITYHUB_ID,
        organisation_name: COMMUNITYHUB_NAME,
        user_id: "ch-user-17",
        display_name: "Taylor Brooks",
        topic: "DELIVERY_ISSUE",
        report_id: null,
        subject: "One result hasn't reached us",
        body: "Mock: our moderation queue is missing a result for a post reported yesterday. Can you check whether it was sent?",
        created_at: new Date(now - 40 * 60_000).toISOString(),
        status: "SENT",
        seen_at: null,
        reply: null,
      },
      {
        message_id: "MSG-1001",
        organisation_id: COMMUNITYHUB_ID,
        organisation_name: COMMUNITYHUB_NAME,
        user_id: "ch-user-17",
        display_name: "Taylor Brooks",
        topic: "REPORT_QUESTION",
        report_id: reports[1].report_id,
        subject: "What counts as an override?",
        body: "Mock: the report lists an override rate. Does that mean RCS changed a decision after review?",
        created_at: new Date(Date.parse(releasedAt) + 30 * 60 * 60_000).toISOString(),
        status: "ANSWERED",
        seen_at: new Date(Date.parse(releasedAt) + 31 * 60 * 60_000).toISOString(),
        reply: {
          body: "Mock: no. An override is when the reviewer's final severity differs from the AI's first estimate. The reviewer's decision is always final; it's never changed afterwards.",
          at: new Date(Date.parse(releasedAt) + 32 * 60 * 60_000).toISOString(),
          by: "Alex Morgan",
        },
      },
    ],
  };
}
