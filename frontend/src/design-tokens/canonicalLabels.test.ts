import { describe, it, expect } from "vitest";
import type { InternalCaseStatus } from "../services/types";
import { mapStatusToPublicLabel, mapStatusToStaffLabel } from "./statusLabels";
import { mapOutcomeToDisplay, OUTCOME_OPTIONS } from "./outcomeLabels";
import { getSeverityInfo, scoreToTier } from "./severity";
import { DECLINE_REASON_OPTIONS } from "./declineReasons";
import { EXPOSURE_STATE_LABEL, SOS_FOLLOW_UP_OPTIONS, SOS_STATUS_LABEL } from "./managerLabels";

/**
 * Task 100 — microcopy correctness. Every literal below is pasted from the
 * confirmed source named above its block, so a wording drift in code fails
 * CI instead of reaching a user. If a source document changes, update the
 * literal here in the same commit and cite the change.
 */

describe("RT-02 status labels (docs/ba/ba-requirements-sprint2-final.md, RT-02 table)", () => {
  // Internal API/DB State | Staff-Facing Label | Public Status
  const RT_02: [InternalCaseStatus, string, string][] = [
    ["SUBMITTED", "Submitted", "Received"],
    ["AI_PROCESSING", "AI Processing", "Being Reviewed"],
    ["READY_FOR_REVIEW", "Ready for Review", "Being Reviewed"],
    ["AUDITOR_REVIEW", "Auditor Review", "Being Reviewed"],
    ["COMPLETE", "Complete", "Complete"],
  ];

  it.each(RT_02)("%s → staff %s, public %s", (internal, staff, publicLabel) => {
    expect(mapStatusToStaffLabel(internal)).toBe(staff);
    expect(mapStatusToPublicLabel(internal)).toBe(publicLabel);
  });

  it("only ever produces the three public labels RT-02 allows", () => {
    const produced = new Set(RT_02.map(([internal]) => mapStatusToPublicLabel(internal)));
    expect([...produced].sort()).toEqual(["Being Reviewed", "Complete", "Received"]);
  });
});

describe("RT-01 final outcome taxonomy (docs/ba/ba-requirements-sprint2-final.md, RT-01 table)", () => {
  it("shows the exact public heading and supporting message for NO_VIOLATION_FOUND", () => {
    expect(mapOutcomeToDisplay("NO_VIOLATION_FOUND")).toEqual({
      title: "No Violation Found",
      body: "Your report has been reviewed and no policy violation was identified based on the available information.",
    });
  });

  it("shows the exact public heading and supporting message for POLICY_VIOLATION_FOUND", () => {
    expect(mapOutcomeToDisplay("POLICY_VIOLATION_FOUND")).toEqual({
      title: "Policy Violation Found",
      body: "Your report has been reviewed and a policy violation was identified. Thank you for taking the time to submit your report.",
    });
  });

  it("offers Auditors exactly the two RT-01 outcomes, with RT-01's Auditor labels", () => {
    expect(OUTCOME_OPTIONS).toEqual([
      { value: "NO_VIOLATION_FOUND", label: "No Violation Found" },
      { value: "POLICY_VIOLATION_FOUND", label: "Policy Violation Found" },
    ]);
  });

  it("never implies removal or reporting to authorities in public outcome copy (RT-01 scope note)", () => {
    for (const value of ["NO_VIOLATION_FOUND", "POLICY_VIOLATION_FOUND", "CLOSED_NO_REASSIGNMENT"]) {
      const display = mapOutcomeToDisplay(value);
      expect(`${display?.title} ${display?.body}`).not.toMatch(/remov|taken down|police|authorit|actioned/i);
    }
  });
});

describe("Severity scale (docs/ba/severity-scale.md, tier table)", () => {
  it.each([
    ["S1", "Low"],
    ["S2", "Moderate"],
    ["S3", "High"],
    ["S4", "Critical"],
  ] as const)("%s is named %s", (tier, name) => {
    expect(getSeverityInfo(tier).label).toBe(name);
  });

  it("uses the CVI band edges 0–39, 40–64, 65–84, 85–100", () => {
    expect([39, 40, 64, 65, 84, 85].map(scoreToTier)).toEqual(["S1", "S2", "S2", "S3", "S3", "S4"]);
  });
});

describe("AR-DF-03 decline reasons (docs/ba/ba-requirements-sprint2-final.md, AR-DF-03 notes)", () => {
  it("lists the four adopted reasons in the adopted order", () => {
    expect(DECLINE_REASON_OPTIONS.map((o) => o.label)).toEqual([
      "Content more severe than AI indicated",
      "Near my exposure limit",
      "Personal Trigger",
      "Other",
    ]);
  });
});

describe("Manager labels (Manager Figma prototype 0qMhTLDlozGkcdqcgbwyse)", () => {
  it("uses the Oversight Dashboard exposure states (78:69)", () => {
    expect(EXPOSURE_STATE_LABEL).toEqual({ UNDER: "Under", APPROACHING: "Approaching", AT_LIMIT: "At limit" });
  });

  it("uses the SOS Inbox status column wording (103:151)", () => {
    expect(SOS_STATUS_LABEL.IN_PROGRESS).toBe("Acknowledged — in progress");
    expect(SOS_STATUS_LABEL.RESOLVED).toBe("Resolved");
  });

  it("lists the follow-up outcomes in Figma order (103:228)", () => {
    expect(SOS_FOLLOW_UP_OPTIONS.map((o) => o.label)).toEqual([
      "Followed up — no further action",
      "Followed up — reassigned remaining cases",
      "Followed up — Auditor stopped shift",
    ]);
  });
});
