import type { FlaggedEntity, TranscriptLine } from "../../services/types";
import { formatTimestamp } from "../../utils/formatTimestamp";

const sectionHeading = { fontSize: 14, lineHeight: "18px", fontWeight: 600, color: "var(--cds-text-primary)" } as const;
const mono = "'IBM Plex Mono', monospace";

/** "Flagged entities" pills with the span each appears in (Figma 18:62). */
export function FlaggedEntities({ entities }: { entities: FlaggedEntity[] }) {
  if (entities.length === 0) return null;
  return (
    <section aria-labelledby="flagged-entities-title" className="flex flex-col gap-2">
      <h2 id="flagged-entities-title" style={sectionHeading}>
        Flagged entities
      </h2>
      <EntityPills entities={entities} />
    </section>
  );
}

/** The entity pills on their own, for the Review Workspace context rail. */
export function EntityPills({ entities }: { entities: FlaggedEntity[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {entities.map((entity, i) => (
        <li
          key={i}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            backgroundColor: "var(--cds-tag-background-gray)",
            color: "var(--cds-tag-color-gray)",
            fontSize: 12,
            lineHeight: "16px",
          }}
        >
          {entity.label} · {formatTimestamp(entity.start)}{entity.end !== entity.start ? `–${formatTimestamp(entity.end)}` : ""}
        </li>
      ))}
    </ul>
  );
}

interface TranscriptAndAudioProps {
  transcript: TranscriptLine[] | null | undefined;
  audioIntensity: number[] | null | undefined;
  durationSeconds?: number | null;
}

/**
 * "Transcript & audio intensity" (Figma 18:76): timestamped speech-to-text
 * lines, then a bar graph of audio intensity over time. The caption from the
 * design ("not an emotion graph") is kept, because audio never feeds the
 * automated CVI score (docs/ba/severity-scale.md §4).
 */
export function TranscriptAndAudio({ transcript, audioIntensity, durationSeconds }: TranscriptAndAudioProps) {
  const hasTranscript = transcript != null && transcript.length > 0;
  const hasAudio = audioIntensity != null && audioIntensity.length > 0;
  if (!hasTranscript && !hasAudio) return null;

  return (
    <section aria-labelledby="transcript-title" className="flex flex-col gap-2">
      <h2 id="transcript-title" style={sectionHeading}>
        Transcript &amp; audio intensity
      </h2>

      {hasTranscript && <TranscriptList transcript={transcript} />}

      {hasAudio && <AudioIntensityGraph values={audioIntensity} durationSeconds={durationSeconds} />}
    </section>
  );
}

interface TranscriptListProps {
  transcript: TranscriptLine[];
  /** Playback position; the line being spoken at that moment is highlighted (Figma 20:84). */
  currentTime?: number;
}

/** Timestamped transcript lines. */
export function TranscriptList({ transcript, currentTime }: TranscriptListProps) {
  const currentIndex =
    currentTime === undefined ? -1 : transcript.reduce((found, line, i) => (line.time <= currentTime ? i : found), -1);
  return (
    <dl
      className="flex flex-col gap-1.5 px-4 py-3"
      style={{ backgroundColor: "var(--cds-layer-01)", fontFamily: mono, fontSize: 12, lineHeight: "16px" }}
    >
      {transcript.map((line, i) => (
        <div
          key={i}
          className="flex gap-3 px-1"
          aria-current={i === currentIndex ? "true" : undefined}
          style={i === currentIndex ? { backgroundColor: "var(--cds-highlight)" } : undefined}
        >
          {/* Carbon text-helper rather than Figma's Gray 50, which fails contrast on layer-01. */}
          <dt
            style={{
              width: 48,
              flexShrink: 0,
              // text-helper fails contrast on the highlight fill, so the current line uses text-secondary.
              color: i === currentIndex ? "var(--cds-text-secondary)" : "var(--cds-text-helper)",
            }}
          >
            {formatTimestamp(line.time)}
          </dt>
          <dd style={{ color: "var(--cds-text-primary)" }}>{line.text}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AudioIntensityGraph({
  values,
  durationSeconds,
}: {
  values: number[];
  durationSeconds?: number | null;
}) {
  const peakIndex = values.indexOf(Math.max(...values));
  // Text equivalent so the graph never relies on sight alone.
  const bucketSeconds = durationSeconds ? durationSeconds / values.length : null;
  const peakDescription = bucketSeconds
    ? `, loudest around ${formatTimestamp(peakIndex * bucketSeconds)}`
    : `, loudest in segment ${peakIndex + 1} of ${values.length}`;

  return (
    <div className="flex flex-col gap-1">
      <div
        role="img"
        aria-label={`Audio intensity across ${values.length} time segments${peakDescription}.`}
        className="flex items-end gap-1"
        style={{ height: 48, maxWidth: 600 }}
      >
        {values.map((value, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 0",
              maxWidth: 32,
              height: `${Math.max(4, Math.min(1, value) * 100)}%`,
              backgroundColor: "var(--cds-interactive)",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-helper)" }}>
        Timestamped audio-intensity graph, not an emotion graph.
      </p>
    </div>
  );
}
