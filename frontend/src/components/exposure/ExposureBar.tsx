interface ExposureBarProps {
  minutes: number;
  limit: number;
  /** "dark" for the Gray 100 staff header, "light" for page content. */
  surface: "dark" | "light";
  /** Label under the bar, e.g. "62 / 120 min today" (header) or "94 / 120 min" (Manager table). */
  label: string;
  /** Header variant switches the fill to Carbon support-warning at the limit (Figma 34:121). */
  warnAtLimit?: boolean;
  width?: number | string;
  /** Accessible name, e.g. "Your exposure today" or "Reese Patel's exposure today". */
  ariaLabel: string;
}

/**
 * Exposure against the applicable limit (AR-WB-01, MR-OV-02), matching the
 * Figma "ProgressBar=Exposure" component: an 8px bar on Carbon theme tokens
 * (layer-accent track, interactive fill, support-warning once the limit is
 * reached in the Auditor header). Tokens follow the surrounding Carbon Theme,
 * so the same bar works in the g100 header and on white pages.
 *
 * The minutes are always written out in the label, so the amount is never
 * conveyed by bar length or colour alone (UR-NFR-01), and the bar itself is
 * exposed as a progressbar for screen readers.
 */
export function ExposureBar({
  minutes,
  limit,
  surface,
  label,
  warnAtLimit = false,
  width = 200,
  ariaLabel,
}: ExposureBarProps) {
  const safeLimit = Math.max(1, limit);
  const percent = Math.min(100, Math.round((minutes / safeLimit) * 100));
  const atLimit = minutes >= safeLimit;
  const fill = warnAtLimit && atLimit ? "var(--cds-support-warning)" : "var(--cds-interactive)";
  const track = "var(--cds-layer-accent-01)";

  return (
    <div className="flex flex-col gap-1" style={{ width }}>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={safeLimit}
        aria-valuenow={Math.min(minutes, safeLimit)}
        aria-valuetext={label}
        style={{ height: 8, borderRadius: 4, backgroundColor: track, overflow: "hidden" }}
      >
        <div style={{ height: 8, width: `${percent}%`, backgroundColor: fill }} />
      </div>
      <span
        style={{
          fontSize: 12,
          lineHeight: "16px",
          color: surface === "dark" ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
          fontFamily: surface === "light" ? "'IBM Plex Mono', monospace" : undefined,
        }}
      >
        {label}
      </span>
    </div>
  );
}
