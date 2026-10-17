import { describe, expect, it } from "vitest";
import * as c from "@carbon/colors";

/** WCAG relative luminance and contrast ratio. */
function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// The pairs declared in index.scss (--rcs-tag-* and --rcs-sev-*), as Carbon palette values.
const PAIRS: Record<string, [string, string]> = {
  error: [c.red60, c.white],
  warning: [c.yellow20, c.gray100],
  info: [c.blue20, c.blue80],
  success: [c.green60, c.white],
  request: [c.teal20, c.teal80],
  neutral: [c.gray20, c.gray100],
  "severity S1": [c.gray20, c.gray100],
  "severity S2": [c.purple30, c.purple90],
  "severity S3": [c.purple60, c.white],
  "severity S4": [c.purple90, c.white],
};

describe("tag palette", () => {
  it.each(Object.entries(PAIRS))("%s text passes WCAG AA (4.5:1)", (_name, [bg, fg]) => {
    expect(ratio(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });

  it("gives every status family its own background", () => {
    const status = ["error", "warning", "info", "success", "request", "neutral"].map((k) => PAIRS[k][0]);
    expect(new Set(status).size).toBe(status.length);
  });

  it("keeps severity off every status colour", () => {
    const status = new Set(["error", "warning", "info", "success", "request", "neutral"].map((k) => PAIRS[k][0]));
    for (const tier of ["S2", "S3", "S4"]) expect(status.has(PAIRS[`severity ${tier}`][0])).toBe(false);
  });
});
