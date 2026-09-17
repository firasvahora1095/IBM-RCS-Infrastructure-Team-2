import { describe, it, expect } from "vitest";
import { getSeverityInfo } from "./severity";

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
