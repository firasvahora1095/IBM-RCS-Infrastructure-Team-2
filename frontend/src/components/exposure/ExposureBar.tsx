interface ExposureBarProps {
  minutes: number;
  limit: number;
  /** "dark" for the Gray 100 staff header, "light" for page content. */
  surface: "dark" | "light";
  /** Label under the bar, e.g. "62 / 120 min today" (header) or "94 / 120 min" (Manager table). */
  label: string;
  /** Header variant turns the fill Yellow 30 at the limit (Figma 34:121). */
  warnAtLimit?: boolean;
  width?: number | string;
  /** Accessible name, e.g. "Your exposure today" or "Reese Patel's exposure today". */
  ariaLabel: string;
}

/**
 * Exposure against the applicable limit (AR-WB-01, MR-OV-02), matching the
 * Figma "ProgressBar=Exposure" component: 8px bar, Blue 70 fill, and a
 * Yellow 30 fill once the limit is reached in the Auditor header.
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
  const fill = warnAtLimit && atLimit ? "#f1c21b" : "#0043ce";
  const track = surface === "dark" ? "#525252" : "#e0e0e0";

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
          color: surface === "dark" ? "#ffffff" : "#525252",
          fontFamily: surface === "light" ? "'IBM Plex Mono', monospace" : undefined,
        }}
      >
        {label}
      </span>
    </div>
  );
}
