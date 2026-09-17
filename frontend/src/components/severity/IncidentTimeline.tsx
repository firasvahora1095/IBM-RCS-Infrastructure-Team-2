import { useEffect, useRef, useState } from "react";
import type { IncidentTimelineEntry } from "../../api/types";
import { getSeverityInfo } from "../../design-tokens/severity";
import { formatTimestamp } from "../../utils/formatTimestamp";
import { SeverityTag } from "./SeverityTag";

interface IncidentTimelineProps {
  entries: IncidentTimelineEntry[];
}

/** Width of one time label + tag, used to stop labels overlapping. */
const LABEL_WIDTH_PX = 120;
/** Vertical space per label row (time on one line, tag on the next). */
const LABEL_ROW_HEIGHT_PX = 48;
const LABELS_TOP_PX = 40;
/**
 * Even an instantaneous flagged moment (start === end) must stay visible:
 * AR-AI-04 gives every AI-flagged moment a marker, "however brief".
 */
const MIN_SEGMENT_WIDTH_PX = 6;
/** Used before the first measurement, and in jsdom (which has no layout). */
const FALLBACK_WIDTH_PX = 1104;

/**
 * The proportional incident timeline on the AI Analysis Summary (Figma
 * node 437:232, Sprint 2 Week 2 Task 78). Each flagged range sits at its
 * true position along the track, coloured by severity tier, instead of the
 * evenly spaced boxes of the first draft.
 *
 * Two constraints from the real API shape:
 * - Entries are {start, end, severity_tier} ranges with no tag name, so
 *   each label shows the time range and tier rather than the Figma mockup's
 *   point-in-time tag labels like "weapon_use".
 * - There's no total video duration field, so the track spans the latest
 *   `end` plus 20% (minimum 10s). That is a scale, not the video's length,
 *   and the caption says so rather than implying the video ends there.
 *
 * Positions are percentages so the track fits any container width. Label
 * collision avoidance uses the measured width: each label takes the first
 * row where it doesn't overlap an earlier label (the Figma redesign's
 * two-row stagger, generalised to however many rows are needed).
 */
export function IncidentTimeline({ entries }: IncidentTimelineProps) {
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
  const totalSpan = Math.max(10, latestEnd * 1.2);

  const positioned = [...entries]
    .sort((a, b) => a.start - b.start)
    .map((entry) => {
      const leftPct = (entry.start / totalSpan) * 100;
      const widthPct = Math.max(((entry.end - entry.start) / totalSpan) * 100, (MIN_SEGMENT_WIDTH_PX / widthPx) * 100);
      // Centre the label under its segment, clamped inside the track.
      const centerPx = ((leftPct + widthPct / 2) / 100) * widthPx;
      const labelLeftPx = Math.min(Math.max(0, centerPx - LABEL_WIDTH_PX / 2), Math.max(0, widthPx - LABEL_WIDTH_PX));
      return { entry, leftPct, widthPct, labelLeftPx };
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
    top: 12,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#525252",
  } as const;

  return (
    <div className="flex flex-col gap-2">
      {/* Screen readers get the same information as an ordered list; the
          drawn track below is decorative for them. */}
      <ol className="cds--visually-hidden">
        {positioned.map(({ entry }, i) => (
          <li key={i}>
            {`${formatTimestamp(entry.start)} to ${formatTimestamp(entry.end)}, ${entry.severity_tier} ${getSeverityInfo(entry.severity_tier).label}`}
          </li>
        ))}
      </ol>

      <div ref={containerRef} aria-hidden="true" style={{ position: "relative", height, width: "100%" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: "#c6c6c6",
            borderRadius: 2,
          }}
        />
        <span style={{ ...axisLabelStyle, left: 0 }}>00:00</span>
        <span style={{ ...axisLabelStyle, right: 0 }}>{formatTimestamp(totalSpan)}</span>

        {withRows.map(({ entry, leftPct, widthPct, labelLeftPx, row }, i) => {
          const info = getSeverityInfo(entry.severity_tier);
          return (
            <div key={i}>
              <div
                data-testid="timeline-segment"
                title={`${formatTimestamp(entry.start)}–${formatTimestamp(entry.end)} · ${entry.severity_tier} ${info.label}`}
                style={{
                  position: "absolute",
                  top: -2,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: 8,
                  backgroundColor: info.background,
                  // A thin dark outline keeps the pale S1 fill visible against the grey track.
                  boxShadow: "0 0 0 1px #161616",
                  borderRadius: 2,
                }}
              />
              <div
                className="flex flex-col items-center gap-1"
                style={{
                  position: "absolute",
                  top: LABELS_TOP_PX + row * LABEL_ROW_HEIGHT_PX,
                  left: labelLeftPx,
                  width: LABEL_WIDTH_PX,
                }}
              >
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#161616" }}>
                  {formatTimestamp(entry.start)}–{formatTimestamp(entry.end)}
                </span>
                <SeverityTag tier={entry.severity_tier} size="sm" />
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, lineHeight: "16px", color: "#6f6f6f" }}>
        Every AI-flagged moment gets a marker, however brief — no minimum-duration threshold (AR-AI-04). The scale ends
        shortly after the last flagged moment; the video&apos;s full length isn&apos;t available yet.
      </p>
    </div>
  );
}
