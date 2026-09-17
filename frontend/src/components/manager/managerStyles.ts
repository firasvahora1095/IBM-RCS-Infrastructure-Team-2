/** Shared text styles for the Manager screens (Manager Figma type ramp). */
export const pageTitle = { fontSize: 28, lineHeight: "36px", fontWeight: 600 } as const;
export const secondaryText = { fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" } as const;
export const mono = { fontFamily: "'IBM Plex Mono', monospace" } as const;

/** "9:14 AM" */
export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}
