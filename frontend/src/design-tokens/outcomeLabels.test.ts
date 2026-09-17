import { describe, it, expect } from "vitest";
import { mapOutcomeToDisplay, OUTCOME_OPTIONS } from "./outcomeLabels";

describe("mapOutcomeToDisplay", () => {
  it("maps both RT-01 internal values to their public heading and message", () => {
    expect(mapOutcomeToDisplay("POLICY_VIOLATION_FOUND")).toEqual({
      title: "Policy Violation Found",
      body: "Your report has been reviewed and a policy violation was identified. Thank you for taking the time to submit your report.",
    });
    expect(mapOutcomeToDisplay("NO_VIOLATION_FOUND")?.title).toBe("No Violation Found");
  });

  it("maps the OLD test-backend value to the SAME current copy", () => {
    // Existing test data was stored as "Violation Found" before RT-01 was
    // confirmed; a user looking up that case must still see RT-01's wording.
    expect(mapOutcomeToDisplay("Violation Found")?.title).toBe("Policy Violation Found");
  });

  it("accepts the human-readable labels, case-insensitively", () => {
    expect(mapOutcomeToDisplay("no violation found")?.title).toBe("No Violation Found");
    expect(mapOutcomeToDisplay("Policy Violation Found")?.title).toBe("Policy Violation Found");
  });

  it("shows the content-neutral closing copy for a Manager's no-reassignment decision", () => {
    // The approved sentence, split into heading and body with no words changed.
    const display = mapOutcomeToDisplay("CLOSED_NO_REASSIGNMENT");
    expect(`${display?.title} ${display?.body}`).toBe(
      "This case has been reviewed and closed. No further action is required from you.",
    );
  });

  it("returns null for an unrecognized value instead of crashing a public page", () => {
    expect(mapOutcomeToDisplay("Something Else Entirely")).toBeNull();
  });
});

describe("OUTCOME_OPTIONS", () => {
  it("sends RT-01 internal values while showing the Auditor labels", () => {
    expect(OUTCOME_OPTIONS).toEqual([
      { value: "NO_VIOLATION_FOUND", label: "No Violation Found" },
      { value: "POLICY_VIOLATION_FOUND", label: "Policy Violation Found" },
    ]);
  });
});
