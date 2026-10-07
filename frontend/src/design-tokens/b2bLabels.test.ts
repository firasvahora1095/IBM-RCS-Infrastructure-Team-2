import { describe, it, expect } from "vitest";
import { DELIVERY_STATUS_LABEL, PAYLOAD_OUTCOME_LABEL, RESPONSIBILITY_BOUNDARY } from "./deliveryLabels";
import { NOT_IN_CLIENT_REPORT, REPORT_STATUS_LABEL, RELEASE_CONFIRM_BODY } from "./reportLabels";

/** Pins the B2B wording in docs/ux/b2b-end-to-end-flow-spec.md §7. */
describe("B2B labels", () => {
  it("names every delivery status in plain words", () => {
    expect(DELIVERY_STATUS_LABEL).toEqual({
      SUCCESS: "Successful",
      PENDING: "Pending",
      RETRYING: "Retrying",
      NEEDS_ATTENTION: "Needs attention",
    });
  });

  it("keeps outcome wording neutral (no removal or enforcement claims)", () => {
    for (const label of Object.values(PAYLOAD_OUTCOME_LABEL)) {
      expect(label).not.toMatch(/remov|actioned|enforce|report(ed)? to/i);
    }
  });

  it("states the RCS / customer responsibility boundary", () => {
    expect(RESPONSIBILITY_BOUNDARY).toBe(
      "RCS decides the moderation finding. CommunityHub decides what enforcement to apply.",
    );
  });

  it("lists what never goes in a client report", () => {
    expect(NOT_IN_CLIENT_REPORT).toHaveLength(6);
    expect(NOT_IN_CLIENT_REPORT.join(" ")).toMatch(/wellbeing/);
    expect(NOT_IN_CLIENT_REPORT.join(" ")).toMatch(/footage/);
  });

  it("uses Draft and Released for report status", () => {
    expect(REPORT_STATUS_LABEL).toEqual({ DRAFT: "Draft", RELEASED: "Released" });
    expect(RELEASE_CONFIRM_BODY).toMatch(/can't edit a released report/);
  });
});
