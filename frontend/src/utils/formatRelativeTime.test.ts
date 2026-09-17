import { describe, it, expect } from "vitest";
import {
  formatRelativeTime,
  formatDateTime,
  formatDuration,
  formatClockTime,
  formatDayTime,
} from "./formatRelativeTime";

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-09-17T10:00:00Z");
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  it("matches the Figma queue formats", () => {
    expect(formatRelativeTime(ago(0), now)).toBe("just now");
    expect(formatRelativeTime(ago(9), now)).toBe("9 min ago");
    expect(formatRelativeTime(ago(250), now)).toBe("4h 10m ago");
    expect(formatRelativeTime(ago(120), now)).toBe("2h ago");
    expect(formatRelativeTime(ago(60 * 24), now)).toBe("1 day ago");
    expect(formatRelativeTime(ago(60 * 72), now)).toBe("3 days ago");
  });
});

describe("formatDuration", () => {
  it("writes video lengths as MM:SS, adding hours only when needed", () => {
    expect(formatDuration(272)).toBe("04:32");
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});

describe("formatClockTime and formatDayTime", () => {
  // Local-time dates, so calendar-day boundaries hold in any test time zone.
  const now = new Date(2026, 8, 18, 9, 18).getTime();
  const at = (day: number, h: number, m: number) => new Date(2026, 8, day, h, m).toISOString();

  it("writes clock times with capital AM/PM, as in Figma", () => {
    expect(formatClockTime(at(18, 9, 14))).toBe("9:14 AM");
    expect(formatClockTime(at(18, 16, 32))).toBe("4:32 PM");
  });

  it("uses today / Yesterday / days ago like the Declined Queue (Figma 119:289)", () => {
    expect(formatDayTime(at(18, 9, 14), now)).toBe("9:14 AM");
    expect(formatDayTime(at(17, 14, 15), now)).toBe("Yesterday, 2:15 PM");
    expect(formatDayTime(at(16, 23, 50), now)).toBe("2 days ago");
  });

  it("adds how long ago for today's SOS alerts (Figma 103:151)", () => {
    expect(formatDayTime(at(18, 9, 14), now, { withAgo: true })).toBe("9:14 AM — 4 min ago");
    expect(formatDayTime(at(17, 16, 32), now, { withAgo: true })).toBe("Yesterday, 4:32 PM");
  });
});

describe("formatDateTime", () => {
  it("produces a day-month-year date with a 12-hour time", () => {
    expect(formatDateTime("2026-08-22T04:20:00.000Z")).toMatch(/22 Aug 2026, \d{1,2}:20 (AM|PM)/);
  });
});
