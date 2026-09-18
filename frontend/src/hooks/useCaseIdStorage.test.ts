import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveCaseId, loadCaseId } from "./useCaseIdStorage";

describe("case ID storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips a case ID through localStorage", () => {
    saveCaseId("INSZNNJI4P");
    expect(loadCaseId()?.caseId).toBe("INSZNNJI4P");
  });

  it("returns null when nothing is stored (simulates a fresh browser)", () => {
    expect(loadCaseId()).toBeNull();
  });

  it("survives being read back after a simulated page refresh", () => {
    saveCaseId("ABC123");
    // Nothing is held in memory — only localStorage — so re-reading it is
    // exactly what a fresh page load does.
    expect(loadCaseId()?.caseId).toBe("ABC123");
  });

  it("returns null for corrupted or unexpected stored content", () => {
    localStorage.setItem("rcs_last_case", "{not json");
    expect(loadCaseId()).toBeNull();
    localStorage.setItem("rcs_last_case", JSON.stringify({ something: "else" }));
    expect(loadCaseId()).toBeNull();
  });

  it("doesn't throw when storage is unavailable (e.g. private browsing)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => saveCaseId("ABC123")).not.toThrow();
  });
});
