import { describe, it, expect, beforeEach } from "vitest";
import {
  loadDraftResolution,
  saveDraftResolution,
  clearDraftResolution,
  clearAllDraftResolutions,
} from "./useDraftResolution";

describe("draft resolution storage", () => {
  beforeEach(() => sessionStorage.clear());

  it("round-trips a full draft", () => {
    const draft = {
      auditorScore: 88,
      comment: "Weapon clearly used to threaten, not just present.",
      outcome: "POLICY_VIOLATION_FOUND" as const,
      step: "severity" as const,
    };
    saveDraftResolution("AR-2026-00417", draft);
    expect(loadDraftResolution("AR-2026-00417")).toEqual(draft);
  });

  it("keeps drafts for different cases separate", () => {
    saveDraftResolution("AR-2026-00417", {
      auditorScore: 88,
      comment: "Case A comment",
      outcome: "POLICY_VIOLATION_FOUND",
      step: "severity",
    });
    saveDraftResolution("AR-2026-00500", { auditorScore: 20, comment: "", outcome: null, step: "summary" });

    expect(loadDraftResolution("AR-2026-00417")?.comment).toBe("Case A comment");
    expect(loadDraftResolution("AR-2026-00500")?.comment).toBe("");
  });

  it("returns null for a case with no saved draft", () => {
    expect(loadDraftResolution("NEVER-OPENED")).toBeNull();
  });

  it("rejects a malformed draft instead of restoring an impossible state", () => {
    sessionStorage.setItem(
      "rcs_draft_resolution_BAD",
      JSON.stringify({ auditorScore: 250, comment: "", outcome: null, step: "severity" })
    );
    sessionStorage.setItem(
      "rcs_draft_resolution_STEP",
      JSON.stringify({ auditorScore: 50, comment: "", outcome: null, step: "confirmation" })
    );
    sessionStorage.setItem("rcs_draft_resolution_JSON", "{nope");

    expect(loadDraftResolution("BAD")).toBeNull();
    expect(loadDraftResolution("STEP")).toBeNull();
    expect(loadDraftResolution("JSON")).toBeNull();
  });

  it("clears one draft, or all of them on sign-out", () => {
    const draft = { auditorScore: 88, comment: "done", outcome: null, step: "severity" as const };
    saveDraftResolution("A", draft);
    saveDraftResolution("B", draft);

    clearDraftResolution("A");
    expect(loadDraftResolution("A")).toBeNull();
    expect(loadDraftResolution("B")).not.toBeNull();

    clearAllDraftResolutions();
    expect(loadDraftResolution("B")).toBeNull();
  });
});
