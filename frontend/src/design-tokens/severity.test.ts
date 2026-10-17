import { describe, it, expect } from "vitest";
import { getSeverityInfo, scoreToTier } from "./severity";

describe("getSeverityInfo", () => {
  it("returns the label and the purple severity ramp for each real tier", () => {
    expect(getSeverityInfo("S1")).toMatchObject({ label: "Low", background: "var(--rcs-sev-1-bg)", text: "var(--rcs-sev-1-fg)" });
    expect(getSeverityInfo("S2")).toMatchObject({ label: "Moderate", background: "var(--rcs-sev-2-bg)", text: "var(--rcs-sev-2-fg)" });
    expect(getSeverityInfo("S3")).toMatchObject({ label: "High", background: "var(--rcs-sev-3-bg)", text: "var(--rcs-sev-3-fg)" });
    expect(getSeverityInfo("S4")).toMatchObject({ label: "Critical", background: "var(--rcs-sev-4-bg)", text: "var(--rcs-sev-4-fg)" });
  });

  it("throws on an unknown tier instead of failing silently", () => {
    // @ts-expect-error deliberately passing an invalid value to test the guard
    expect(() => getSeverityInfo("S5")).toThrow("Unknown severity tier");
  });
});

describe("scoreToTier", () => {
  it("maps each band boundary correctly — these exact numbers matter", () => {
    expect(scoreToTier(0)).toBe("S1");
    expect(scoreToTier(39)).toBe("S1");
    expect(scoreToTier(40)).toBe("S2");
    expect(scoreToTier(64)).toBe("S2");
    expect(scoreToTier(65)).toBe("S3");
    expect(scoreToTier(84)).toBe("S3");
    expect(scoreToTier(85)).toBe("S4");
    expect(scoreToTier(100)).toBe("S4");
  });

  it("rejects an out-of-range score instead of returning a wrong tier", () => {
    expect(() => scoreToTier(101)).toThrow("out of range");
    expect(() => scoreToTier(-1)).toThrow("out of range");
    expect(() => scoreToTier(Number.NaN)).toThrow("out of range");
  });
});
