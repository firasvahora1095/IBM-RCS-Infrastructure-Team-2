/** Formatting for report periods and short dates (B2B screens). Dates are yyyy-mm-dd, local time. */

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "1–30 Sep 2026", "7 Oct 2026" for one day, "28 Aug – 3 Sep 2026" across months, or full dates across years. */
export function formatPeriod(start: string, end: string): string {
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  const day = (d: Date) => d.getDate();
  const month = (d: Date) => d.toLocaleDateString("en-AU", { month: "short" });
  if (start === end) return `${day(s)} ${month(s)} ${s.getFullYear()}`;
  if (s.getFullYear() !== e.getFullYear()) {
    return `${day(s)} ${month(s)} ${s.getFullYear()} – ${day(e)} ${month(e)} ${e.getFullYear()}`;
  }
  if (s.getMonth() !== e.getMonth()) {
    return `${day(s)} ${month(s)} – ${day(e)} ${month(e)} ${e.getFullYear()}`;
  }
  return `${day(s)}–${day(e)} ${month(e)} ${e.getFullYear()}`;
}

/** "September 2026" when the period is exactly one calendar month, otherwise null. */
export function wholeMonthName(start: string, end: string): string | null {
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  const lastDay = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate();
  if (s.getDate() === 1 && e.getMonth() === s.getMonth() && e.getFullYear() === s.getFullYear() && e.getDate() === lastDay) {
    return s.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  }
  return null;
}

/** "2 Oct 2026, 10:41 am" */
export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "2 Oct 2026" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/** Minutes as "3 h 25 min" / "42 min". */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** How long something has waited: "42 min", "5 h 12 min", or whole days after two days. */
export function formatAge(minutes: number): string {
  if (minutes < 48 * 60) return formatMinutes(minutes);
  return `${Math.floor(minutes / (24 * 60))} days`;
}
