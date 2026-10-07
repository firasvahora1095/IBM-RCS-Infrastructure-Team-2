import { useEffect, useRef, useState } from "react";
import { Tooltip } from "@carbon/react";
import type { IncidentTimelineEntry } from "../../services/types";
import { getSeverityInfo } from "../../design-tokens/severity";
import { formatTimestamp } from "../../utils/formatTimestamp";
import { timelineTooltipAlign } from "../../utils/tooltipAlign";
import { SeverityTag } from "./SeverityTag";

interface IncidentTimelineProps {
  entries: IncidentTimelineEntry[];
  /** The video's real length, when the data source provides it. */
  durationSeconds?: number | null;
}

/** Width of one label, used to stop labels overlapping. */
const LABEL_WIDTH_PX = 120;
/** Minimum space per label row; grouped tags can grow the row naturally. */
const LABEL_ROW_HEIGHT_PX = 48;
const LABELS_TOP_PX = 44;
/**
 * Even a brief flagged range must stay visible: AR-AI-04 gives every
 * AI-flagged moment a marker, "however brief". A range this narrow in real
 * pixels would otherwise round away next to a multi-minute span.
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
 * - a range is a segment coloured by severity tier, as wide as its duration
 *   (restored after a merge collapsed ranges back to dots; see the Sprint 2
 *   live-build visual QA, P1 §2.2);
 * - entries with the same start and end share one time label and list all tags.
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

  // Match exact intervals, not rounded display times or just the start time.
  const groups = new Map<string, IncidentTimelineEntry[]>();
  for (const entry of [...entries].sort((a, b) => a.start - b.start)) {
    const key = `${entry.start}:${entry.end}`;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  const positioned = [...groups.values()].map((group) => {
    // A shared marker shows the highest severity; each tag stays in the list.
    const entry = group.reduce((highest, item) => (item.severity_tier > highest.severity_tier ? item : highest));

    const isPoint = entry.start === entry.end;
    const leftPct = (entry.start / totalSpan) * 100;
    const widthPct = isPoint
      ? 0
      : Math.max(((entry.end - entry.start) / totalSpan) * 100, (MIN_SEGMENT_WIDTH_PX / widthPx) * 100);
    // Centre the label under its marker, or under the middle of a range.
    const centerPx = ((leftPct + widthPct / 2) / 100) * widthPx;
    const labelLeftPx = Math.min(Math.max(0, centerPx - LABEL_WIDTH_PX / 2), Math.max(0, widthPx - LABEL_WIDTH_PX));
    return { entry, group, isPoint, leftPct, widthPct, labelLeftPx };
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
        {positioned.map(({ entry, group }, i) => (
          <li key={i}>
            {`${entry.start === entry.end ? `At ${formatTimestamp(entry.start)}` : `${formatTimestamp(entry.start)} to ${formatTimestamp(entry.end)}`}, ${group.map((item) => `${item.tag ? `${item.tag}, ` : ""}${item.severity_tier} ${getSeverityInfo(item.severity_tier).label}`).join("; ")}`}
          </li>
        ))}
      </ol>

      <div
        ref={containerRef}
        aria-hidden="true"
        style={{
          position: "relative",
          paddingTop: LABELS_TOP_PX,
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          rowGap: 8,
        }}
      >
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

        {withRows.map(({ entry, group, isPoint, leftPct, widthPct, labelLeftPx, row }, i) => {
          const info = getSeverityInfo(entry.severity_tier);
          // Shown on hover: when, what the AI flagged, and how severe (e.g. "00:30–01:04 · physical_violence · S3 High").
          const title = `${timeLabel(entry)} · ${group.map((item) => item.tag ?? "Flagged").join(", ")} · ${entry.severity_tier} ${info.label}`;
          return (
            <div key={i} style={{ display: "contents" }}>
              {isPoint ? (
                <Tooltip
                  label={title}
                  align={timelineTooltipAlign(leftPct / 100)}
                  data-testid="timeline-marker"
                  style={{ position: "absolute", top: 0, left: `calc(${leftPct}% - 5px)` }}
                >
                  <div style={{ cursor: "help" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: info.background }} />
                    <div style={{ width: 1, height: 8, backgroundColor: "var(--cds-border-inverse)", margin: "0 auto" }} />
                  </div>
                </Tooltip>
              ) : (
                <Tooltip
                  label={title}
                  align={timelineTooltipAlign((leftPct + widthPct / 2) / 100)}
                  data-testid="timeline-segment"
                  style={{ position: "absolute", top: 1, left: `${leftPct}%`, width: `${widthPct}%`, height: 8 }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      cursor: "help",
                      backgroundColor: info.background,
                      // A thin dark outline keeps the pale S1 fill visible against the track.
                      boxShadow: "0 0 0 1px var(--cds-border-inverse)",
                    }}
                  />
                </Tooltip>
              )}
              <div
                className="flex flex-col items-center gap-1"
                style={{
                  gridRow: row + 1,
                  gridColumn: 1,
                  marginLeft: labelLeftPx,
                  width: LABEL_WIDTH_PX,
                  minHeight: LABEL_ROW_HEIGHT_PX,
                  overflowWrap: "anywhere",
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 12, color: "var(--cds-text-primary)" }}>
                  {timeLabel(entry)}
                </span>
                {group.map((item, tagIndex) =>
                  item.tag ? (
                    <span key={tagIndex} style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>
                      {item.tag}
                    </span>
                  ) : (
                    <SeverityTag key={tagIndex} tier={item.severity_tier} size="sm" />
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-helper)" }}>
        Every AI-flagged moment gets a marker, however brief — no minimum-duration threshold.
        {!knownDuration &&
          " The scale ends shortly after the last flagged moment; the video's full length isn't available yet."}
      </p>
    </div>
  );
}
