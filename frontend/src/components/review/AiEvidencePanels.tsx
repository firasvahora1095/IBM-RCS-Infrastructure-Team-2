import type { FlaggedEntity, TranscriptLine } from "../../services/types";
import { formatTimestamp } from "../../utils/formatTimestamp";

const sectionHeading = { fontSize: 14, lineHeight: "18px", fontWeight: 600, color: "#161616" } as const;
const mono = "'IBM Plex Mono', monospace";

/** "Flagged entities" pills with the span each appears in (Figma 18:62). */
export function FlaggedEntities({ entities }: { entities: FlaggedEntity[] }) {
  if (entities.length === 0) return null;
  return (
    <section aria-labelledby="flagged-entities-title" className="flex flex-col gap-2">
      <h2 id="flagged-entities-title" style={sectionHeading}>
        Flagged entities
      </h2>
      <ul className="flex flex-wrap gap-2">
        {entities.map((entity, i) => (
          <li
            key={i}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              backgroundColor: "#e0e0e0",
              color: "#161616",
              fontSize: 12,
              lineHeight: "16px",
            }}
          >
            {entity.label} · {formatTimestamp(entity.start)}–{formatTimestamp(entity.end)}
          </li>
        ))}
      </ul>
    </section>
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

      {hasTranscript && (
        <dl
          className="flex flex-col gap-1.5 px-4 py-3"
          style={{ backgroundColor: "#f4f4f4", fontFamily: mono, fontSize: 12, lineHeight: "16px" }}
        >
          {transcript.map((line, i) => (
            <div key={i} className="flex gap-3">
              {/* Gray 60 rather than Figma's Gray 50, which fails contrast on Gray 10. */}
              <dt style={{ width: 48, flexShrink: 0, color: "#6f6f6f" }}>{formatTimestamp(line.time)}</dt>
              <dd style={{ color: "#161616" }}>{line.text}</dd>
            </div>
          ))}
        </dl>
      )}

      {hasAudio && <AudioIntensityGraph values={audioIntensity} durationSeconds={durationSeconds} />}
    </section>
  );
}

function AudioIntensityGraph({ values, durationSeconds }: { values: number[]; durationSeconds?: number | null }) {
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
              backgroundColor: "#0f62fe",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 12, lineHeight: "16px", color: "#6f6f6f" }}>
        Timestamped audio-intensity graph, not an emotion graph.
      </p>
    </div>
  );
}
