import { describe, it, expect } from "vitest";
import { formatRelativeTime, formatDateTime, formatDuration } from "./formatRelativeTime";

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

describe("formatDateTime", () => {
  it("produces a day-month-year date with a 12-hour time", () => {
    expect(formatDateTime("2026-08-22T04:20:00.000Z")).toMatch(/22 Aug 2026, \d{1,2}:20 (AM|PM)/);
  });
});
