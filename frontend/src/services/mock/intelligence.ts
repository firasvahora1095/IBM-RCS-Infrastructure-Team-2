import type {
  AttentionKind,
  EvidenceKey,
  FailedDeliveryRow,
  ManagerIntelligence,
  MetricEvidence,
  OpenBucket,
  Provenance,
  SeverityTier,
} from "../types";
import type { MockCase, MockDelivery, MockHistoricalCase } from "./store";
import { deliveryHealth, finalTierOf, median, MIN_CASES_FOR_MEDIAN, periodBounds } from "./reportMetrics";

/**
 * Manager Intelligence Dashboard figures (Sprint 3 extras §1), calculated only
 * from stored records. A pure function that mirrors compute_intelligence in
 * backend/app/b2b.py, so both data sources tell the same story.
 */

export const EVIDENCE_CASE_ID_CAP = 200;
const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];
const OPEN_BUCKETS: OpenBucket[] = ["SUBMITTED", "AI_PROCESSING", "READY_FOR_REVIEW", "AUDITOR_REVIEW", "MANAGER_ACTION"];
const MAX_FAILED_LISTED = 5;

/** Same wording as the backend's DEFINITIONS, so evidence reads the same on both data sources. */
const DEFINITIONS: Record<EvidenceKey, string> = {
  total_cases: "Reports received by RCS during the selected period.",
  completed: "Cases that reached Complete during the selected period.",
  open_cases:
    "Cases that haven't reached Complete yet, including cases received before the period. This is the current backlog, so it isn't Total minus Completed.",
  needs_manager_action:
    "Open items that need a Manager decision or follow-up: unresolved SOS, declined cases, cases interrupted by the daily exposure cap, results that failed to reach CommunityHub after automatic retries, and support requests (a break to approve or a request to talk) waiting for a reply. SOS and support requests concern people, so they are counted here and named only in each Auditor's record.",
  case_flow:
    "Current open cases by workflow stage. A case waiting for a Manager decision counts only there. Median decision time is the middle value of time from report to final decision for cases completed in the period.",
  outcomes: "The Auditor's final outcome for each case decided during the period.",
  severity:
    "The final severity after human review for cases decided during the period: the Auditor's rating where they changed it, otherwise the AI rating they confirmed.",
  override_rate:
    "Decided cases in the period where the final Auditor severity differs from the original AI severity, divided by all decided cases that have both. Operational disagreement, not model accuracy.",
  delivery_success_rate:
    "Results for cases completed in the period that CommunityHub acknowledged, divided by those that were acknowledged or failed after automatic retries. Pending and retrying results aren't counted as failures.",
  protection:
    "Each Auditor's exposure today against their own limit, cooldown and the cases they are carrying. Ordered by protection need, never by productivity.",
};

const SOURCE_FIELDS: Record<EvidenceKey, string[]> = {
  total_cases: ["cases.created_at", "case_history.created_at", "organisation_id"],
  completed: ["cases.status", "cases.completed_at", "case_history.completed_at", "organisation_id"],
  open_cases: ["cases.status", "cases.manager_flag"],
  needs_manager_action: [
    "auditors.cooldown_trigger",
    "auditors.cooldown_check_in_done",
    "cases.manager_flag",
    "deliveries.delivery_status",
    "wellbeing_requests.kind",
    "wellbeing_requests.status",
  ],
  case_flow: ["cases.status", "cases.manager_flag", "cases.created_at", "cases.completed_at"],
  outcomes: ["cases.final_outcome", "cases.completed_at", "case_history.outcome"],
  severity: ["cases.auditor_severity_score", "cases.severity_tier", "case_history.final_tier"],
  override_rate: [
    "cases.severity_tier",
    "cases.auditor_severity_score",
    "case_history.ai_tier",
    "case_history.final_tier",
    "cases.completed_at",
  ],
  delivery_success_rate: ["deliveries.delivery_status", "deliveries.completed_at", "deliveries.organisation_id"],
  protection: [
    "auditors.exposure_minutes",
    "auditors.exposure_limit_minutes",
    "auditors.cooldown_ends_at",
    "cases.assigned_auditor_id",
  ],
};

const TITLES: Record<EvidenceKey, string> = {
  total_cases: "Total cases",
  completed: "Completed",
  open_cases: "Open cases",
  needs_manager_action: "Needs manager action",
  case_flow: "Case flow",
  outcomes: "Moderation outcomes",
  severity: "Final severity",
  override_rate: "AI–Auditor override rate",
  delivery_success_rate: "Delivery success rate",
  protection: "Auditor protection",
};

export interface IntelligenceSource {
  history: MockHistoricalCase[];
  cases: MockCase[];
  deliveries: MockDelivery[];
  /** Auditors with an unresolved SOS (counted, never named). */
  openSosAuditors: number;
  /** Support requests waiting for the Manager, by kind. */
  openSupportRequests: { break_requests: number; talk_requests: number };
  auditorCount: number;
  organisation: { organisation_id: string; name: string };
  provenance: Provenance;
}

interface CaseRecord {
  caseId: string;
  live: boolean;
  status: string;
  flag: MockCase["manager_flag"];
  created: number;
  completed: number | null;
  aiTier: SeverityTier | null;
  finalTier: SeverityTier | null;
  outcome: string | null;
}

function records(source: IntelligenceSource): CaseRecord[] {
  return [
    ...source.history.map((h) => ({
      caseId: h.case_id,
      live: false,
      status: "COMPLETE",
      flag: null,
      created: Date.parse(h.created_at),
      completed: Date.parse(h.completed_at),
      aiTier: h.ai_tier,
      finalTier: h.final_tier,
      outcome: h.outcome,
    })),
    ...source.cases.map((c) => ({
      caseId: c.case_id,
      live: true,
      status: c.status,
      flag: c.manager_flag,
      created: Date.parse(c.created_at),
      completed: c.status === "COMPLETE" && c.completed_at ? Date.parse(c.completed_at) : null,
      aiTier: c.severity_tier,
      finalTier: finalTierOf(c),
      outcome: c.final_outcome,
    })),
  ];
}

function evidence(
  key: EvidenceKey,
  ids: string[],
  now: number,
  options: { eligible?: number; included?: number } = {},
): MetricEvidence {
  const ordered = [...ids].sort();
  return {
    title: TITLES[key],
    definition: DEFINITIONS[key],
    source_fields: SOURCE_FIELDS[key],
    records_included: options.included ?? ordered.length,
    records_eligible: options.eligible ?? null,
    calculated_at: new Date(now).toISOString(),
    case_ids: ordered.slice(0, EVIDENCE_CASE_ID_CAP),
    case_ids_truncated: ordered.length > EVIDENCE_CASE_ID_CAP,
  };
}

function openBucket(r: CaseRecord): OpenBucket {
  if (r.flag) return "MANAGER_ACTION";
  return (OPEN_BUCKETS as string[]).includes(r.status) ? (r.status as OpenBucket) : "SUBMITTED";
}

const isDecided = (r: CaseRecord) => r.outcome === "POLICY_VIOLATION_FOUND" || r.outcome === "NO_VIOLATION_FOUND";
const isTier = (t: SeverityTier | null): t is SeverityTier => t !== null && TIERS.includes(t);
const ids = (rows: CaseRecord[]) => rows.map((r) => r.caseId);

export function computeIntelligence(
  source: IntelligenceSource,
  periodStart: string,
  periodEnd: string,
  now: number,
): ManagerIntelligence {
  const { start, end } = periodBounds(periodStart, periodEnd);
  const inPeriod = (t: number | null) => t !== null && t >= start && t <= end;
  const all = records(source);
  const received = all.filter((r) => inPeriod(r.created));
  const completed = all.filter((r) => inPeriod(r.completed));
  const openLive = all.filter((r) => r.live && r.status !== "COMPLETE");

  const breakdown = Object.fromEntries(OPEN_BUCKETS.map((b) => [b, 0])) as Record<OpenBucket, number>;
  for (const r of openLive) breakdown[openBucket(r)] += 1;

  const declined = openLive.filter((r) => r.flag === "DECLINED");
  const capped = openLive.filter((r) => r.flag === "CAP_REACHED");
  const deliveries = source.deliveries.filter((d) => d.organisation_id === source.organisation.organisation_id);
  const failed = deliveries.filter((d) => d.delivery_status === "NEEDS_ATTENTION");
  const attention: { kind: AttentionKind; count: number }[] = [
    { kind: "SOS", count: source.openSosAuditors },
    {
      kind: "SUPPORT_REQUEST",
      count: source.openSupportRequests.break_requests + source.openSupportRequests.talk_requests,
    },
    { kind: "REASSIGNMENT", count: declined.length },
    { kind: "CAP_INTERRUPTED", count: capped.length },
    { kind: "FAILED_HANDOFF", count: failed.length },
  ];
  const needsAction = attention.reduce((sum, item) => sum + item.count, 0);

  const minutes = completed.map((r) => (r.completed! - r.created) / 60_000).filter((m) => m >= 0);
  const oldest = openLive.reduce<CaseRecord | null>((min, r) => (!min || r.created < min.created ? r : min), null);

  const decided = completed.filter(isDecided);
  const severity: Record<SeverityTier, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
  for (const r of decided) if (isTier(r.finalTier)) severity[r.finalTier] += 1;
  const comparable = decided.filter((r) => isTier(r.aiTier) && isTier(r.finalTier));
  const matrix = Object.fromEntries(
    TIERS.map((ai) => [ai, Object.fromEntries(TIERS.map((f) => [f, 0]))]),
  ) as Record<SeverityTier, Record<SeverityTier, number>>;
  for (const r of comparable) matrix[r.aiTier!][r.finalTier!] += 1;
  const overridden = comparable.filter((r) => r.aiTier !== r.finalTier);
  const transitions = TIERS.flatMap((from) =>
    TIERS.filter((to) => to !== from && matrix[from][to] > 0).map((to) => ({ from, to, count: matrix[from][to] })),
  ).sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  const periodDeliveries = deliveries.filter((d) => inPeriod(Date.parse(d.completed_at)));
  const health = deliveryHealth(periodDeliveries);
  const finished = health.success + health.needs_attention;
  const failedAttempts = deliveries.flatMap((d) => d.attempts.filter((a) => a.result === "FAILED").map((a) => Date.parse(a.at)));
  const failedRows: FailedDeliveryRow[] = failed
    .map((d) => ({
      delivery_id: d.delivery_id,
      case_id: d.case_id,
      attempts: d.attempts.length,
      reason: d.failure_reason,
      last_attempt_at: d.attempts.at(-1)?.at ?? null,
    }))
    .sort((a, b) => (b.last_attempt_at ?? "").localeCompare(a.last_attempt_at ?? ""))
    .slice(0, MAX_FAILED_LISTED);

  return {
    organisation_id: source.organisation.organisation_id,
    organisation_name: source.organisation.name,
    period_start: periodStart,
    period_end: periodEnd,
    calculated_at: new Date(now).toISOString(),
    provenance: source.provenance,
    kpis: {
      total_cases: received.length,
      completed: completed.length,
      open_cases: openLive.length,
      needs_manager_action: needsAction,
    },
    open_breakdown: breakdown,
    attention,
    support_requests: { ...source.openSupportRequests },
    flow: {
      median_decision_minutes: minutes.length >= MIN_CASES_FOR_MEDIAN ? Math.round(median(minutes)) : null,
      oldest_unresolved_minutes: oldest ? Math.round((now - oldest.created) / 60_000) : null,
      oldest_unresolved_case_id: oldest?.caseId ?? null,
    },
    outcomes: {
      violation: decided.filter((r) => r.outcome === "POLICY_VIOLATION_FOUND").length,
      no_violation: decided.filter((r) => r.outcome === "NO_VIOLATION_FOUND").length,
      severity,
      open_client_cases: openLive.length,
    },
    comparison: {
      eligible: comparable.length,
      overrides: overridden.length,
      override_rate: comparable.length ? overridden.length / comparable.length : 0,
      matrix,
      top_transition: transitions[0] ?? null,
    },
    delivery: {
      health,
      success_rate: finished ? health.success / finished : null,
      last_failed_at: failedAttempts.length ? new Date(Math.max(...failedAttempts)).toISOString() : null,
      failed: failedRows,
    },
    evidence: {
      total_cases: evidence("total_cases", ids(received), now),
      completed: evidence("completed", ids(completed), now),
      open_cases: evidence("open_cases", ids(openLive), now),
      needs_manager_action: evidence(
        "needs_manager_action",
        [...ids(declined), ...ids(capped), ...failed.map((d) => d.case_id)],
        now,
        { included: needsAction },
      ),
      case_flow: evidence("case_flow", ids(openLive), now),
      outcomes: evidence("outcomes", ids(decided), now),
      severity: evidence("severity", ids(decided.filter((r) => isTier(r.finalTier))), now),
      override_rate: evidence("override_rate", ids(overridden), now, { eligible: comparable.length }),
      delivery_success_rate: evidence(
        "delivery_success_rate",
        periodDeliveries.filter((d) => d.delivery_status === "SUCCESS").map((d) => d.case_id),
        now,
        { eligible: finished },
      ),
      protection: evidence("protection", [], now, { included: source.auditorCount }),
    },
  };
}
