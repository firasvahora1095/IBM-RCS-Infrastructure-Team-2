import type { PeriodKey } from "../services/types";

/** The dashboard's period presets, in menu order. "This week" is the default. */
export const PERIOD_OPTIONS: readonly { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
];

export const DEFAULT_PERIOD: PeriodKey = "this-week";

export function isPeriodKey(value: string | null): value is PeriodKey {
  return PERIOD_OPTIONS.some((option) => option.key === value);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A local calendar date as yyyy-mm-dd (toISOString would shift it to UTC). */
function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The inclusive yyyy-mm-dd range a preset covers on `now`'s date. Weeks run Monday to Sunday. */
export function periodFor(key: PeriodKey, now: Date): { start: string; end: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (key) {
    case "today":
      return { start: localDate(now), end: localDate(now) };
    case "this-week": {
      const sinceMonday = (now.getDay() + 6) % 7;
      return { start: localDate(new Date(y, m, d - sinceMonday)), end: localDate(new Date(y, m, d - sinceMonday + 6)) };
    }
    case "this-month":
      return { start: localDate(new Date(y, m, 1)), end: localDate(new Date(y, m + 1, 0)) };
    case "last-month":
      return { start: localDate(new Date(y, m - 1, 1)), end: localDate(new Date(y, m, 0)) };
  }
}
