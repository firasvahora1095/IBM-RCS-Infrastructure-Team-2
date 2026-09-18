import { useEffect, useRef, useState } from "react";
import type { IncidentTimelineEntry } from "../../services/types";
import { getSeverityInfo } from "../../design-tokens/severity";
import { formatTimestamp } from "../../utils/formatTimestamp";
import { SeverityTag } from "./SeverityTag";

interface IncidentTimelineProps {
  entries: IncidentTimelineEntry[];
  /** The video's real length, when the data source provides it. */
  durationSeconds?: number | null;
}

/** Width of one label, used to stop labels overlapping. */
const LABEL_WIDTH_PX = 120;
/** Vertical space per label row (time on one line, tag or tier on the next). */
const LABEL_ROW_HEIGHT_PX = 48;
const LABELS_TOP_PX = 44;
/**
 * Even an instantaneous flagged moment must stay visible: AR-AI-04 gives
 * every AI-flagged moment a marker, "however brief".
 */
const MIN_SEGMENT_WIDTH_PX = 6;
/** Used before the first measurement, and in jsdom (which has no layout). */
const FALLBACK_WIDTH_PX = 1104;

const mono = "'IBM Plex Mono', monospace";

/**
 * The proportional incident timeline on the AI Analysis Summary (Figma
 * 437:232, Sprint 2 Week 2 Task 78). Every flagged moment sits at its true
 * position along the track:
 * - a point detection (start === end) is a dot with a tick, labelled with
 *   its time and tag, e.g. "01:15 · weapon_present", as in Figma;
 * - a range is a segment coloured by severity tier.
 *
 * The track spans the video's real duration when it's known. Otherwise it
 * spans the latest flagged moment plus 20% (minimum 10s), and the caption
 * says it's a scale, so it never implies a video length nobody provided.
 *
 * Positions are percentages so the track fits any width. Labels take the
 * first row where they don't overlap an earlier label (the Figma redesign's
 * two-row stagger, generalised to as many rows as needed).
 */
export function IncidentTimeline({ entries, durationSeconds }: IncidentTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widthPx, setWidthPx] = useState(FALLBACK_WIDTH_PX);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidthPx(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (entries.length === 0) return null;

  const latestEnd = Math.max(...entries.map((e) => e.end));
  const knownDuration = durationSeconds != null && durationSeconds >= latestEnd && durationSeconds > 0;
  const totalSpan = knownDuration ? durationSeconds : Math.max(10, latestEnd * 1.2);

  const positioned = [...entries]
    .sort((a, b) => a.start - b.start)
    .map((entry) => {
      const isPoint = entry.start === entry.end;
      const leftPct = (entry.start / totalSpan) * 100;
      const widthPct = isPoint
        ? 0
        : Math.max(((entry.end - entry.start) / totalSpan) * 100, (MIN_SEGMENT_WIDTH_PX / widthPx) * 100);
      // Centre the label under its marker, clamped inside the track.
      const centerPx = ((leftPct + widthPct / 2) / 100) * widthPx;
      const labelLeftPx = Math.min(Math.max(0, centerPx - LABEL_WIDTH_PX / 2), Math.max(0, widthPx - LABEL_WIDTH_PX));
      return { entry, isPoint, leftPct, widthPct, labelLeftPx };
    });

  // Greedy row assignment: rowEnds[r] is where the last label in row r ends.
  const rowEnds: number[] = [];
  const withRows = positioned.map((p) => {
    let row = rowEnds.findIndex((end) => p.labelLeftPx >= end);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(0);
    }
    rowEnds[row] = p.labelLeftPx + LABEL_WIDTH_PX;
    return { ...p, row };
  });

  const height = LABELS_TOP_PX + rowEnds.length * LABEL_ROW_HEIGHT_PX;
  const axisLabelStyle = {
    position: "absolute",
    top: 16,
    fontFamily: mono,
    fontSize: 11,
    color: "var(--cds-text-secondary)",
  } as const;
  const timeLabel = (e: IncidentTimelineEntry) =>
    e.start === e.end ? formatTimestamp(e.start) : `${formatTimestamp(e.start)}–${formatTimestamp(e.end)}`;

  return (
    <div className="flex flex-col gap-2">
      {/* Screen readers get the same information as an ordered list; the
          drawn track below is decorative for them. */}
      <ol className="cds--visually-hidden">
        {positioned.map(({ entry }, i) => (
          <li key={i}>
            {`${entry.start === entry.end ? `At ${formatTimestamp(entry.start)}` : `${formatTimestamp(entry.start)} to ${formatTimestamp(entry.end)}`}, ${entry.tag ? `${entry.tag}, ` : ""}${entry.severity_tier} ${getSeverityInfo(entry.severity_tier).label}`}
          </li>
        ))}
      </ol>

      <div ref={containerRef} aria-hidden="true" style={{ position: "relative", height, width: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: 3,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: "var(--cds-layer-accent-01)",
          }}
        />
        <span style={{ ...axisLabelStyle, left: 0 }}>00:00</span>
        <span style={{ ...axisLabelStyle, right: 0 }}>{formatTimestamp(totalSpan)}</span>

        {withRows.map(({ entry, isPoint, leftPct, widthPct, labelLeftPx, row }, i) => {
          const info = getSeverityInfo(entry.severity_tier);
          const labelTop = LABELS_TOP_PX + row * LABEL_ROW_HEIGHT_PX;
          return (
            <div key={i}>
              {isPoint ? (
                <>
                  <div
                    data-testid="timeline-marker"
                    title={`${formatTimestamp(entry.start)} · ${entry.tag ?? info.label}`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: `calc(${leftPct}% - 5px)`,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: info.background,
                      boxShadow: "0 0 0 1px var(--cds-border-inverse)",
                    }}
                  />
                  {/* Tick from the dot down to its label. */}
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      left: `${leftPct}%`,
                      width: 1,
                      height: labelTop - 12,
                      backgroundColor: "var(--cds-border-inverse)",
                    }}
                  />
                </>
              ) : (
                <div
                  data-testid="timeline-segment"
                  title={`${timeLabel(entry)} · ${entry.severity_tier} ${info.label}`}
                  style={{
                    position: "absolute",
                    top: 1,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    height: 8,
                    backgroundColor: info.background,
                    // A thin dark outline keeps the pale S1 fill visible against the grey track.
                    boxShadow: "0 0 0 1px var(--cds-border-inverse)",
                  }}
                />
              )}
              <div
                className="flex flex-col items-center gap-1"
                style={{ position: "absolute", top: labelTop, left: labelLeftPx, width: LABEL_WIDTH_PX }}
              >
                <span style={{ fontFamily: mono, fontSize: 12, color: "var(--cds-text-primary)" }}>
                  {timeLabel(entry)}
                </span>
                {entry.tag ? (
                  <span style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>{entry.tag}</span>
                ) : (
                  <SeverityTag tier={entry.severity_tier} size="sm" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-helper)" }}>
        Every AI-flagged moment gets a marker, however brief — no minimum-duration threshold (AR-AI-04).
        {!knownDuration &&
          " The scale ends shortly after the last flagged moment; the video's full length isn't available yet."}
      </p>
    </div>
  );
}
