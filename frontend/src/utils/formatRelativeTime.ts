/**
 * "9 min ago", "4h 10m ago", "2 days ago" — the compact relative times used in
 * the Figma queue and oversight tables (e.g. Auditor 10:6, 34:121).
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h ago` : `${hours}h ${rest}m ago`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/** "22 Aug 2026, 2:20 PM" — the absolute format in the Figma status page (7:15). */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(new Date(iso))
    .replace(/\s?(am|pm)$/i, (m) => m.toUpperCase());
}

/** "9:14 AM" — a 12-hour clock time, with AM/PM in capitals as every Figma file writes it. */
export function formatClockTime(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
}

/**
 * "9:40 AM" today, "Yesterday, 2:15 PM", then "2 days ago" — the day-relative
 * times in the Manager Declined Queue and SOS Inbox (Figma 119:289, 103:151).
 * Days are calendar days in the viewer's time zone, not 24-hour periods.
 * With `withAgo`, today's times also say how long ago: "9:14 AM — 4 min ago".
 */
export function formatDayTime(iso: string, now: number = Date.now(), { withAgo = false } = {}): string {
  const then = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(then)) / 86_400_000);
  if (days <= 0) return withAgo ? `${formatClockTime(iso)} — ${formatRelativeTime(iso, now)}` : formatClockTime(iso);
  if (days === 1) return `Yesterday, ${formatClockTime(iso)}`;
  return `${days} days ago`;
}

/** "04:32" or "1:02:05" — a duration in seconds, as Figma writes video lengths. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
