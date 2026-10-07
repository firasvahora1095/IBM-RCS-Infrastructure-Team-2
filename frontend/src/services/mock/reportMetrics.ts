import { scoreToTier } from "../../design-tokens/severity";
import type {
  DeliveryHealth,
  FinalOutcome,
  MetricEvidence,
  ReportEvidenceKey,
  ReportMetrics,
  SeverityTier,
} from "../types";
import type { MockCase, MockDelivery, MockHistoricalCase } from "./store";

/**
 * Report figures, calculated only from stored case and delivery records
 * (Sprint 3 extras §6.1: the report must not invent or recalculate values
 * from thin air). Pure functions, so the seed and the live mock service
 * produce exactly the same numbers for the same data.
 */

interface CaseRecord {
  caseId: string;
  created: number;
  completed: number | null;
  aiTier: SeverityTier | null;
  finalTier: SeverityTier | null;
  outcome: FinalOutcome | "CLOSED_NO_REASSIGNMENT" | null;
  declined: boolean;
}

export interface MetricsSource {
  history: MockHistoricalCase[];
  cases: MockCase[];
  deliveries: MockDelivery[];
}

/** The final human severity: the Auditor's rating when they gave one, otherwise the AI tier they confirmed. */
export function finalTierOf(c: MockCase): SeverityTier | null {
  return c.auditor_severity_score !== null ? scoreToTier(c.auditor_severity_score) : c.severity_tier;
}

function records(source: MetricsSource): CaseRecord[] {
  const fromHistory = source.history.map((h) => ({
    caseId: h.case_id,
    created: Date.parse(h.created_at),
    completed: Date.parse(h.completed_at),
    aiTier: h.ai_tier,
    finalTier: h.final_tier,
    outcome: h.outcome,
    declined: h.declined_reassigned,
  }));
  const fromLive = source.cases.map((c) => ({
    caseId: c.case_id,
    created: Date.parse(c.created_at),
    completed: c.status === "COMPLETE" && c.completed_at ? Date.parse(c.completed_at) : null,
    aiTier: c.severity_tier,
    finalTier: finalTierOf(c),
    outcome: c.final_outcome,
    declined: c.decline !== null,
  }));
  return [...fromHistory, ...fromLive];
}

/** Local-time bounds for an inclusive yyyy-mm-dd period. */
export function periodBounds(periodStart: string, periodEnd: string): { start: number; end: number } {
  const [sy, sm, sd] = periodStart.split("-").map(Number);
  const [ey, em, ed] = periodEnd.split("-").map(Number);
  return { start: new Date(sy, sm - 1, sd).getTime(), end: new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime() };
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Below this many completed cases, a median timing figure isn't stated (spec S9b "unreliable timing" state). */
export const MIN_CASES_FOR_MEDIAN = 3;

export function deliveryHealth(deliveries: MockDelivery[]): DeliveryHealth {
  return {
    success: deliveries.filter((d) => d.delivery_status === "SUCCESS").length,
    pending: deliveries.filter((d) => d.delivery_status === "PENDING").length,
    retrying: deliveries.filter((d) => d.delivery_status === "RETRYING").length,
    needs_attention: deliveries.filter((d) => d.delivery_status === "NEEDS_ATTENTION").length,
  };
}

export const EVIDENCE_CASE_ID_CAP = 200;

/** How a figure was calculated: the definition, the fields read and the records counted (Sprint 3 extras §1.4). */
export function evidenceEntry(
  title: string,
  definition: string,
  sourceFields: string[],
  ids: string[],
  now: number,
  options: { eligible?: number; included?: number } = {},
): MetricEvidence {
  const ordered = [...ids].sort();
  return {
    title,
    definition,
    source_fields: sourceFields,
    records_included: options.included ?? ordered.length,
    records_eligible: options.eligible ?? null,
    calculated_at: new Date(now).toISOString(),
    case_ids: ordered.slice(0, EVIDENCE_CASE_ID_CAP),
    case_ids_truncated: ordered.length > EVIDENCE_CASE_ID_CAP,
  };
}

/** What each report figure counts. Same wording as REPORT_EVIDENCE in backend/app/b2b.py. */
const REPORT_EVIDENCE: Record<ReportEvidenceKey, [title: string, definition: string, fields: string[]]> = {
  cases_received: [
    "Reports received",
    "Reports submitted to RCS for this customer during the period.",
    ["cases.created_at", "case_history.created_at", "organisation_id"],
  ],
  cases_completed: [
    "Cases completed",
    "Cases with a final human decision recorded during the period.",
    ["cases.status", "cases.completed_at", "case_history.completed_at", "organisation_id"],
  ],
  open_at_end: [
    "Open at end of period",
    "Cases received on or before the last day of the period that weren't complete by then.",
    ["cases.created_at", "cases.completed_at", "cases.status"],
  ],
  outcomes: [
    "Moderation outcomes",
    "The Auditor's final outcome for each case completed in the period.",
    ["cases.final_outcome", "case_history.outcome", "cases.completed_at"],
  ],
  severity: [
    "Final severity",
    "The final severity after human review: the Auditor's rating where they changed it, otherwise the AI rating they confirmed.",
    ["cases.auditor_severity_score", "cases.severity_tier", "case_history.final_tier"],
  ],
  overrides: [
    "Severity changed after human review",
    "Completed cases where the final human severity differs from the AI's initial severity, out of decided cases that have both.",
    ["cases.severity_tier", "cases.auditor_severity_score", "case_history.ai_tier", "case_history.final_tier"],
  ],
  workflow: [
    "Declined and reassigned",
    "Completed cases that were declined by one reviewer and decided by another.",
    ["cases.manager_flag", "case_history.declined_reassigned", "cases.completed_at"],
  ],
  delivery: [
    "Delivery to CommunityHub",
    "Results sent to CommunityHub for cases completed in the period, by delivery status.",
    ["deliveries.delivery_status", "deliveries.completed_at", "deliveries.organisation_id"],
  ],
};

export function computeMetrics(
  source: MetricsSource,
  periodStart: string,
  periodEnd: string,
  now: number = Date.now(),
): ReportMetrics {
  const { start, end } = periodBounds(periodStart, periodEnd);
  const all = records(source);
  const inPeriod = (t: number | null) => t !== null && t >= start && t <= end;
  const completed = all.filter((r) => inPeriod(r.completed));
  const decided = completed.filter((r) => r.outcome === "POLICY_VIOLATION_FOUND" || r.outcome === "NO_VIOLATION_FOUND");

  const severity: Record<SeverityTier, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
  for (const r of decided) if (r.finalTier) severity[r.finalTier] += 1;

  const comparable = decided.filter((r) => r.aiTier && r.finalTier);
  const overridden = comparable.filter((r) => r.aiTier !== r.finalTier);
  const overrides = overridden.length;
  const received = all.filter((r) => inPeriod(r.created));
  const openAtEnd = all.filter((r) => r.created <= end && (r.completed === null || r.completed > end));
  const declined = completed.filter((r) => r.declined);
  const periodDeliveries = source.deliveries.filter((d) => inPeriod(Date.parse(d.completed_at)));
  const evidence = (key: ReportEvidenceKey, ids: string[], options?: { eligible?: number }) => {
    const [title, definition, fields] = REPORT_EVIDENCE[key];
    return evidenceEntry(title, definition, fields, ids, now, options);
  };
  const ids = (rows: CaseRecord[]) => rows.map((r) => r.caseId);
  const minutes = completed.map((r) => (r.completed! - r.created) / 60_000).filter((m) => m >= 0);

  return {
    cases_received: received.length,
    cases_completed: completed.length,
    open_at_end: openAtEnd.length,
    violation_count: decided.filter((r) => r.outcome === "POLICY_VIOLATION_FOUND").length,
    no_violation_count: decided.filter((r) => r.outcome === "NO_VIOLATION_FOUND").length,
    severity_breakdown: severity,
    median_report_to_decision_minutes: minutes.length >= MIN_CASES_FOR_MEDIAN ? Math.round(median(minutes)) : null,
    override_count: overrides,
    override_rate: comparable.length ? overrides / comparable.length : 0,
    declined_reassigned: declined.length,
    delivery: deliveryHealth(periodDeliveries),
    evidence: {
      cases_received: evidence("cases_received", ids(received)),
      cases_completed: evidence("cases_completed", ids(completed)),
      open_at_end: evidence("open_at_end", ids(openAtEnd)),
      outcomes: evidence("outcomes", ids(decided)),
      severity: evidence("severity", ids(decided.filter((r) => r.finalTier))),
      overrides: evidence("overrides", ids(overridden), { eligible: comparable.length }),
      workflow: evidence("workflow", ids(declined)),
      delivery: evidence(
        "delivery",
        periodDeliveries.map((d) => d.case_id),
      ),
    },
  };
}
