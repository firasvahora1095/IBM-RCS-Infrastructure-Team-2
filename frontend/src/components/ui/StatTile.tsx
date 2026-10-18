import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

export type Tone = "neutral" | "error";

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** One line under the value, e.g. "All clear" or "View deliveries". */
  helper?: ReactNode;
  /** "error" adds the 3px red accent the SOS inbox uses for rows that need action. */
  tone?: Tone;
  /** A control for the tile, e.g. "Evidence", always in the top-right corner. */
  corner?: ReactNode;
  /** Makes the whole tile a link. */
  to?: string;
  /** Accessible name for the link; defaults to "{label}: {value}". */
  linkLabel?: string;
}

/**
 * A summary figure in the existing Manager Panel style: white, 1px subtle
 * border, small label over a monospace value (as Figure in ManagerBits).
 */
export function StatTile({ label, value, helper, tone = "neutral", corner, to, linkLabel }: StatTileProps) {
  const body = (
    <>
      <span className="rcs-stat-label">{label}</span>
      <span className="rcs-stat-value">{value}</span>
      {helper && <span className="rcs-stat-helper">{helper}</span>}
    </>
  );
  const className = `rcs-stat-tile rcs-tone-${tone}`;
  if (to) {
    return (
      <RouterLink
        to={to}
        className={className}
        aria-label={linkLabel ?? `${label}: ${typeof value === "string" || typeof value === "number" ? value : ""}`}
      >
        {body}
      </RouterLink>
    );
  }
  if (corner) {
    // Label left, control right, on one row: the same arrangement as a section's title row.
    return (
      <div className={className}>
        <div className="rcs-stat-top">
          <span className="rcs-stat-label">{label}</span>
          {corner}
        </div>
        <span className="rcs-stat-value">{value}</span>
        {helper && <span className="rcs-stat-helper">{helper}</span>}
      </div>
    );
  }
  return <div className={className}>{body}</div>;
}
