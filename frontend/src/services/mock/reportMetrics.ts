import { scoreToTier } from "../../design-tokens/severity";
import type { DeliveryHealth, FinalOutcome, ReportMetrics, SeverityTier } from "../types";
import type { MockCase, MockDelivery, MockHistoricalCase } from "./store";

/**
 * Report figures, calculated only from stored case and delivery records
 * (Sprint 3 extras §6.1: the report must not invent or recalculate values
 * from thin air). Pure functions, so the seed and the live mock service
 * produce exactly the same numbers for the same data.
 */

interface CaseRecord {
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
    created: Date.parse(h.created_at),
    completed: Date.parse(h.completed_at),
    aiTier: h.ai_tier,
    finalTier: h.final_tier,
    outcome: h.outcome,
    declined: h.declined_reassigned,
  }));
  const fromLive = source.cases.map((c) => ({
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

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Below this many completed cases, a median timing figure isn't stated (spec S9b "unreliable timing" state). */
const MIN_CASES_FOR_MEDIAN = 3;

export function deliveryHealth(deliveries: MockDelivery[]): DeliveryHealth {
  return {
    success: deliveries.filter((d) => d.delivery_status === "SUCCESS").length,
    pending: deliveries.filter((d) => d.delivery_status === "PENDING").length,
    retrying: deliveries.filter((d) => d.delivery_status === "RETRYING").length,
    needs_attention: deliveries.filter((d) => d.delivery_status === "NEEDS_ATTENTION").length,
  };
}

export function computeMetrics(source: MetricsSource, periodStart: string, periodEnd: string): ReportMetrics {
  const { start, end } = periodBounds(periodStart, periodEnd);
  const all = records(source);
  const inPeriod = (t: number | null) => t !== null && t >= start && t <= end;
  const completed = all.filter((r) => inPeriod(r.completed));
  const decided = completed.filter((r) => r.outcome === "POLICY_VIOLATION_FOUND" || r.outcome === "NO_VIOLATION_FOUND");

  const severity: Record<SeverityTier, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
  for (const r of decided) if (r.finalTier) severity[r.finalTier] += 1;

  const comparable = decided.filter((r) => r.aiTier && r.finalTier);
  const overrides = comparable.filter((r) => r.aiTier !== r.finalTier).length;
  const minutes = completed.map((r) => (r.completed! - r.created) / 60_000).filter((m) => m >= 0);

  return {
    cases_received: all.filter((r) => inPeriod(r.created)).length,
    cases_completed: completed.length,
    open_at_end: all.filter((r) => r.created <= end && (r.completed === null || r.completed > end)).length,
    violation_count: decided.filter((r) => r.outcome === "POLICY_VIOLATION_FOUND").length,
    no_violation_count: decided.filter((r) => r.outcome === "NO_VIOLATION_FOUND").length,
    severity_breakdown: severity,
    median_report_to_decision_minutes:
      minutes.length >= MIN_CASES_FOR_MEDIAN ? Math.round(median(minutes)) : null,
    override_count: overrides,
    override_rate: comparable.length ? overrides / comparable.length : 0,
    declined_reassigned: completed.filter((r) => r.declined).length,
    delivery: deliveryHealth(source.deliveries.filter((d) => inPeriod(Date.parse(d.completed_at)))),
  };
}
