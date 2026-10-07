import { describe, expect, it } from "vitest";
import { computeIntelligence, type IntelligenceSource } from "./intelligence";
import type { MockCase, MockDelivery, MockHistoricalCase } from "./store";
import type { DeliveryStatus, InternalCaseStatus, SeverityTier } from "../types";

const NOW = Date.parse("2026-10-07T10:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const PERIOD = ["2026-10-06", "2026-10-08"] as const;

function liveCase(case_id: string, status: InternalCaseStatus, extra: Partial<MockCase> = {}): MockCase {
  return {
    case_id,
    status,
    created_at: hoursAgo(1),
    completed_at: null,
    severity_tier: "S2",
    auditor_severity_score: null,
    final_outcome: null,
    manager_flag: null,
    ...extra,
  } as MockCase;
}

function history(case_id: string, ai_tier: SeverityTier, final_tier: SeverityTier): MockHistoricalCase {
  return {
    case_id,
    created_at: hoursAgo(2),
    completed_at: hoursAgo(1),
    ai_tier,
    final_tier,
    outcome: "POLICY_VIOLATION_FOUND",
    declined_reassigned: false,
  };
}

function delivery(case_id: string, delivery_status: DeliveryStatus): MockDelivery {
  return {
    delivery_id: `DEL-${case_id}`,
    case_id,
    organisation_id: "COMMUNITYHUB",
    outcome: "POLICY_VIOLATION_FOUND",
    final_severity: "S2",
    completed_at: hoursAgo(0.5),
    delivery_status,
    attempts: [],
    failure_reason: delivery_status === "NEEDS_ATTENTION" ? "Endpoint unavailable (503)" : null,
    next_attempt_at: null,
    escalated_at: null,
    escalation_note: null,
    source_url: null,
    simulate_failure: false,
  };
}

function source(partial: Partial<IntelligenceSource>): IntelligenceSource {
  return {
    history: [],
    cases: [],
    deliveries: [],
    openSosAuditors: 0,
    openBreakRequests: 0,
    auditorCount: 4,
    organisation: { organisation_id: "COMMUNITYHUB", name: "CommunityHub" },
    provenance: "DEMO",
    ...partial,
  };
}

const run = (s: IntelligenceSource) => computeIntelligence(s, PERIOD[0], PERIOD[1], NOW);

describe("computeIntelligence", () => {
  it("follows the KPI definitions: Open is the current backlog, not Total minus Completed", () => {
    const body = run(
      source({
        cases: [
          liveCase("RCS-IN-00001", "COMPLETE", {
            created_at: hoursAgo(2),
            completed_at: hoursAgo(1),
            final_outcome: "POLICY_VIOLATION_FOUND",
          }),
          liveCase("RCS-IN-00002", "AUDITOR_REVIEW"),
          liveCase("RCS-OLD-00003", "SUBMITTED", { created_at: hoursAgo(240) }),
        ],
      }),
    );
    expect(body.kpis).toEqual({ total_cases: 2, completed: 1, open_cases: 2, needs_manager_action: 0 });
    expect(body.evidence.completed.case_ids).toEqual(["RCS-IN-00001"]);
    expect(body.evidence.completed.source_fields).toContain("cases.completed_at");
  });

  it("puts each open case in exactly one stage, Manager decisions first", () => {
    const body = run(
      source({
        cases: [
          liveCase("A", "AUDITOR_REVIEW", { manager_flag: "DECLINED" }),
          liveCase("B", "AUDITOR_REVIEW"),
          liveCase("C", "AI_PROCESSING"),
        ],
      }),
    );
    expect(body.open_breakdown.MANAGER_ACTION).toBe(1);
    expect(body.open_breakdown.AUDITOR_REVIEW).toBe(1);
    expect(Object.values(body.open_breakdown).reduce((a, b) => a + b, 0)).toBe(body.kpis.open_cases);
  });

  it("counts only items that need the Manager to act", () => {
    const body = run(
      source({
        openSosAuditors: 1,
        openBreakRequests: 1,
        cases: [
          liveCase("A", "AUDITOR_REVIEW", { manager_flag: "DECLINED" }),
          liveCase("B", "AUDITOR_REVIEW", { manager_flag: "CAP_REACHED" }),
        ],
        deliveries: [delivery("C", "NEEDS_ATTENTION")],
      }),
    );
    expect(Object.fromEntries(body.attention.map((a) => [a.kind, a.count]))).toEqual({
      SOS: 1,
      BREAK_REQUEST: 1,
      REASSIGNMENT: 1,
      CAP_INTERRUPTED: 1,
      FAILED_HANDOFF: 1,
    });
    expect(body.kpis.needs_manager_action).toBe(5);
    expect(body.delivery.failed[0].case_id).toBe("C");
  });

  it("builds the AI-to-final severity matrix and the override rate", () => {
    const pairs: [SeverityTier, SeverityTier][] = [
      ["S2", "S2"],
      ["S2", "S3"],
      ["S2", "S3"],
      ["S1", "S1"],
      ["S3", "S2"],
    ];
    const body = run(source({ history: pairs.map(([ai, f], i) => history(`H${i}`, ai, f)) }));
    expect(body.comparison.eligible).toBe(5);
    expect(body.comparison.overrides).toBe(3);
    expect(body.comparison.override_rate).toBeCloseTo(0.6);
    expect(body.comparison.matrix.S2.S3).toBe(2);
    expect(body.comparison.top_transition).toEqual({ from: "S2", to: "S3", count: 2 });
  });

  it("states timing only with enough cases, and treats pending deliveries as not failed", () => {
    const body = run(
      source({
        history: [history("H1", "S1", "S1")],
        cases: [liveCase("OLD", "READY_FOR_REVIEW", { created_at: hoursAgo(3) })],
        deliveries: [
          delivery("D1", "SUCCESS"),
          delivery("D2", "SUCCESS"),
          delivery("D3", "NEEDS_ATTENTION"),
          delivery("D4", "PENDING"),
        ],
      }),
    );
    expect(body.flow.median_decision_minutes).toBeNull();
    expect(body.flow.oldest_unresolved_case_id).toBe("OLD");
    expect(body.flow.oldest_unresolved_minutes).toBe(180);
    expect(body.delivery.success_rate).toBeCloseTo(2 / 3);
  });

  it("lists at most 200 contributing case IDs and says when it cut the list", () => {
    const many = Array.from({ length: 205 }, (_, i) => history(`H${String(i).padStart(3, "0")}`, "S1", "S1"));
    const evidence = run(source({ history: many })).evidence.total_cases;
    expect(evidence.records_included).toBe(205);
    expect(evidence.case_ids).toHaveLength(200);
    expect(evidence.case_ids_truncated).toBe(true);
  });
});
