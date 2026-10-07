import type { ReactNode } from "react";

/**
 * Hand-built, token-coloured charts (no chart dependency, matching the
 * existing Validation View pattern). Every value is also visible as text, so
 * the bars are decorative and colour is never the only signal.
 */

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  /** Text shown at the end of the row; defaults to the value. */
  display?: ReactNode;
  /** A Carbon token, e.g. "var(--cds-support-error)". */
  color?: string;
}

export function BarList({ rows, max, label }: { rows: BarRow[]; max?: number; label: string }) {
  const top = Math.max(1, max ?? Math.max(0, ...rows.map((r) => r.value)));
  return (
    <ul className="rcs-barlist" aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className="rcs-barlist-row">
          <span className="rcs-barlist-label">{row.label}</span>
          <span className="rcs-barlist-track" aria-hidden="true">
            <span
              className="rcs-barlist-fill"
              style={{
                inlineSize: `${(row.value / top) * 100}%`,
                backgroundColor: row.color ?? "var(--cds-support-info)",
              }}
            />
          </span>
          <span className="rcs-barlist-value">{row.display ?? row.value}</span>
        </li>
      ))}
    </ul>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Adds a stripe so adjacent segments differ by pattern as well as colour. */
  striped?: boolean;
}

/** A single 100% stacked bar with a text legend that carries every value. */
export function SegmentedBar({ segments, label, height = 12 }: { segments: Segment[]; label: string; height?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <figure className="flex flex-col gap-3" style={{ margin: 0 }}>
      <div className="rcs-segbar" style={{ blockSize: height }} aria-hidden="true">
        {total === 0 ? (
          <span style={{ flex: 1, backgroundColor: "var(--cds-border-subtle-01)" }} />
        ) : (
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <span
                key={s.key}
                style={{
                  flexGrow: s.value,
                  backgroundColor: s.color,
                  backgroundImage: s.striped
                    ? "repeating-linear-gradient(135deg, transparent 0 4px, rgba(255,255,255,0.45) 4px 7px)"
                    : undefined,
                }}
              />
            ))
        )}
      </div>
      <figcaption>
        <span className="cds--visually-hidden">{label}: </span>
        <ul className="rcs-legend">
          {segments.map((s) => (
            <li key={s.key}>
              <span
                className="rcs-legend-swatch"
                aria-hidden="true"
                style={{
                  backgroundColor: s.color,
                  backgroundImage: s.striped
                    ? "repeating-linear-gradient(135deg, transparent 0 3px, rgba(255,255,255,0.5) 3px 5px)"
                    : undefined,
                }}
              />
              <span>{s.label}</span>
              <span className="rcs-legend-value">{s.value}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
