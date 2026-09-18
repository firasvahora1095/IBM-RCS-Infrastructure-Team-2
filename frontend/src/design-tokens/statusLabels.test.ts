import { describe, it, expect } from "vitest";
import { mapStatusToPublicLabel, mapStatusToStaffLabel } from "./statusLabels";

describe("mapStatusToPublicLabel", () => {
  it("maps every internal state to one of the three allowed public labels (RT-02)", () => {
    expect(mapStatusToPublicLabel("SUBMITTED")).toBe("Received");
    expect(mapStatusToPublicLabel("AI_PROCESSING")).toBe("Being Reviewed");
    expect(mapStatusToPublicLabel("READY_FOR_REVIEW")).toBe("Being Reviewed");
    expect(mapStatusToPublicLabel("AUDITOR_REVIEW")).toBe("Being Reviewed");
    expect(mapStatusToPublicLabel("COMPLETE")).toBe("Complete");
  });

  it("passes through an already-public label unchanged", () => {
    expect(mapStatusToPublicLabel("Being Reviewed")).toBe("Being Reviewed");
  });

  it("never leaks an unrecognized string — falls back to Being Reviewed", () => {
    expect(mapStatusToPublicLabel("SOME_FUTURE_INTERNAL_STATE")).toBe("Being Reviewed");
  });
});

describe("mapStatusToStaffLabel", () => {
  it("gives staff RT-02's readable label, not the raw enum", () => {
    expect(mapStatusToStaffLabel("AI_PROCESSING")).toBe("AI Processing");
    expect(mapStatusToStaffLabel("READY_FOR_REVIEW")).toBe("Ready for Review");
  });
});
