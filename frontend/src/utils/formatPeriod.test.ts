import { describe, expect, it } from "vitest";
import { formatClockTime, formatDateTime } from "./formatRelativeTime";
import { formatShortDateTime } from "./formatPeriod";

/** Sprint 3 Week 3, microcopy pass: a time of day is written one way on every screen, with AM and PM in capitals. */
describe("time of day", () => {
  const morning = "2026-10-02T10:41:00";
  const evening = "2026-10-02T22:02:00";

  it("is written with capital AM and PM by every formatter", () => {
    for (const iso of [morning, evening]) {
      expect(formatShortDateTime(iso)).toMatch(/\d{1,2}:\d{2} (AM|PM)$/);
      expect(formatDateTime(iso)).toMatch(/\d{1,2}:\d{2} (AM|PM)$/);
      expect(formatClockTime(iso)).toMatch(/\d{1,2}:\d{2} (AM|PM)$/);
    }
  });

  it("agrees across formatters, so two screens never show the same moment two ways", () => {
    const clock = formatClockTime(evening);
    expect(formatShortDateTime(evening).endsWith(clock)).toBe(true);
    expect(formatDateTime(evening).endsWith(clock)).toBe(true);
  });

  it("keeps the day, month and year in the short form", () => {
    expect(formatShortDateTime(morning)).toMatch(/^2 Oct 2026, /);
  });
});
