import { describe, expect, it } from "vitest";
import { isPeriodKey, periodFor } from "./periods";

// Wednesday 7 October 2026, local time
const now = new Date(2026, 9, 7, 10, 41);

describe("periodFor", () => {
  it("today is one day", () => {
    expect(periodFor("today", now)).toEqual({ start: "2026-10-07", end: "2026-10-07" });
  });

  it("this week runs Monday to Sunday", () => {
    expect(periodFor("this-week", now)).toEqual({ start: "2026-10-05", end: "2026-10-11" });
  });

  it("this week on a Sunday still starts the Monday before", () => {
    expect(periodFor("this-week", new Date(2026, 9, 11))).toEqual({ start: "2026-10-05", end: "2026-10-11" });
  });

  it("this month", () => {
    expect(periodFor("this-month", now)).toEqual({ start: "2026-10-01", end: "2026-10-31" });
  });

  it("last month crosses the year boundary", () => {
    expect(periodFor("last-month", new Date(2026, 0, 15))).toEqual({ start: "2025-12-01", end: "2025-12-31" });
  });

  it("uses local dates, so late evening stays on the same day", () => {
    expect(periodFor("today", new Date(2026, 9, 7, 23, 59))).toEqual({ start: "2026-10-07", end: "2026-10-07" });
  });
});

describe("isPeriodKey", () => {
  it("accepts the presets and rejects anything else from the URL", () => {
    expect(isPeriodKey("this-month")).toBe(true);
    expect(isPeriodKey("all-time")).toBe(false);
    expect(isPeriodKey(null)).toBe(false);
  });
});
