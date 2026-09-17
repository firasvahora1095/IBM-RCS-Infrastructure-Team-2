import { describe, it, expect } from "vitest";
import { getSeverityInfo, scoreToTier } from "./severity";

describe("getSeverityInfo", () => {
  it("returns the Figma label and colours for each real tier", () => {
    expect(getSeverityInfo("S1")).toMatchObject({ label: "Low", background: "#e0e0e0", text: "#161616" });
    expect(getSeverityInfo("S2")).toMatchObject({ label: "Moderate", background: "#f1c21b", text: "#161616" });
    expect(getSeverityInfo("S3")).toMatchObject({ label: "High", background: "#ff832b", text: "#161616" });
    expect(getSeverityInfo("S4")).toMatchObject({ label: "Critical", background: "#da1e28", text: "#ffffff" });
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
