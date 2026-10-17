interface ExposureBarProps {
  minutes: number;
  limit: number;
  /** "dark" for the Gray 100 staff header, "light" for page content. */
  surface: "dark" | "light";
  /** Label under the bar, e.g. "62 / 120 min today" (header) or "94 / 120 min" (Manager table). */
  label: string;
  /** Shorter label shown on phone-width screens instead of `label`, e.g. "62/120 min". */
  compactLabel?: string;
  /** Header variant switches the fill to Carbon support-warning at the limit (Figma 34:121). */
  warnAtLimit?: boolean;
  width?: number | string;
  /** Marks 80% with a tick and colours the fill by risk: blue under 80%, yellow from 80%, red at the limit. */
  thresholds?: boolean;
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
  compactLabel,
  warnAtLimit = false,
  width = 200,
  thresholds = false,
  ariaLabel,
}: ExposureBarProps) {
  const safeLimit = Math.max(1, limit);
  const percent = Math.min(100, Math.round((minutes / safeLimit) * 100));
  const atLimit = minutes >= safeLimit;
  const fill = thresholds
    ? atLimit
      ? "var(--cds-support-error)"
      : minutes / safeLimit >= 0.8
        ? "var(--cds-support-warning)"
        : "var(--cds-interactive)"
    : warnAtLimit && atLimit
      ? "var(--cds-support-warning)"
      : "var(--cds-interactive)";
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
        style={{ height: 8, backgroundColor: track, overflow: "hidden", position: "relative" }}
      >
        <div style={{ height: 8, width: `${percent}%`, backgroundColor: fill }} />
        {thresholds && (
          <div
            aria-hidden="true"
            style={{ position: "absolute", insetBlock: 0, insetInlineStart: "80%", width: 1, backgroundColor: "var(--cds-border-strong-01)" }}
          />
        )}
      </div>
      <span
        style={{
          fontSize: 12,
          lineHeight: "16px",
          color: surface === "dark" ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
          fontFamily: surface === "light" ? "'IBM Plex Mono', monospace" : undefined,
          whiteSpace: "nowrap",
        }}
      >
        {compactLabel ? (
          <>
            <span className="sm:hidden">{compactLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </>
        ) : (
          label
        )}
      </span>
    </div>
  );
}
