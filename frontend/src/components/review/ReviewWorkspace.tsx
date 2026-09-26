import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionItem, Button, IconButton, InlineNotification, Link, Slider, Toggle } from "@carbon/react";
import { Pause, Play, VolumeMute, VolumeUp } from "@carbon/icons-react";
import type { AuditorCaseDetail, ExposureSample, SeverityTier } from "../../services/types";
import { isMockData } from "../../services";
import { DEMO_CONNECTION_LOST_EVENT } from "../../services/mock/demo";
import { getSeverityInfo } from "../../design-tokens/severity";
import { formatTimestamp } from "../../utils/formatTimestamp";
import { SeverityTag } from "../severity/SeverityTag";
import { AudioIntensityGraph, EntityPills, TranscriptList } from "./AiEvidencePanels";
import type { ViewerSettings } from "./viewerSettings";

/**
 * The AI's suggested blur level, shown only as a reference next to the
 * slider ("AI suggests, auditor decides"). The S3 value matches the marker in
 * Figma 20:35; the others are placeholders pending UX/BA sign-off.
 */
const SUGGESTED_BLUR: Record<SeverityTier, number> = { S1: 20, S2: 40, S3: 70, S4: 90 };

/** Used when the data source doesn't say how long the video is. */
const FALLBACK_DURATION_SECONDS = 120;
/** How often measured exposure is reported while reviewing. */
const EXPOSURE_FLUSH_MS = 15_000;

const mono = { fontFamily: "'IBM Plex Mono', monospace" } as const;
const secondaryText = { fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" } as const;

interface ReviewWorkspaceProps {
  caseDetail: AuditorCaseDetail;
  settings: ViewerSettings;
  onSettingsChange: (settings: ViewerSettings) => void;
  /** Set while something outside the workspace (session re-auth) must stop playback. */
  pausedReason: "session" | null;
  /** Receives measured playback exposure every few seconds and when the workspace closes. */
  onExposure?: (sample: ExposureSample) => void;
  onContinue: () => void;
  /** "Continue to severity & comment" for Auditors; the Manager's exceptional access returns to its decision. */
  continueLabel?: string;
  /** Absent for an AI-failure case, which has no summary to go back to. */
  onBack?: () => void;
  /** Auditor only. Omitted in the Manager's exceptional-access session, with SOS and the exposure counter (Manager handoff screen 14). */
  onTalkToManager?: () => void;
  onSos?: () => void;
  /** Signed URL for the real source video from COS. When provided, replaces the test pattern. */
  videoUrl?: string | null;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Review Workspace (Figma 20:35), with its connection-lost (42:352) and
 * session-timed-out (36:235) states.
 *
 * Content safety:
 * - It never shows real footage. The video area is a synthetic test pattern;
 *   in mock mode a reviewer can preview a local file, which stays in the
 *   browser and is never uploaded.
 * - Maximum blur by default, with a 0–100% slider, a grayscale toggle and
 *   independent mute (AR-PV-03 to 06).
 * - SOS is always in reach: the video column stays in view while the context
 *   rail scrolls (AR-WB-05).
 *
 * Exposure (AR-WB-01) counts active playback only, whatever the blur,
 * grayscale or mute state; paused time doesn't count; replaying counts again.
 */
export function ReviewWorkspace({
  caseDetail,
  settings,
  onSettingsChange,
  pausedReason,
  onExposure,
  onContinue,
  continueLabel = "Continue to severity & comment",
  onBack,
  onTalkToManager,
  onSos,
  videoUrl,
}: ReviewWorkspaceProps) {
  const duration = caseDetail.video_duration_seconds ?? FALLBACK_DURATION_SECONDS;
  const aiFailed = caseDetail.ai_failure === "vision";

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totals, setTotals] = useState<ExposureSample>({ active_seconds: 0, replay_seconds: 0 });
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const activeVideoUrl = videoUrl ?? localVideoUrl;
  const [blurStart] = useState(settings.blur);

  const positionRef = useRef(0);
  const maxReachedRef = useRef(0);
  const pendingRef = useRef<ExposureSample>({ active_seconds: 0, replay_seconds: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [trackBox, setTrackBox] = useState<{ left: number; width: number } | null>(null);
  const onExposureRef = useRef(onExposure);
  const canPlayRef = useRef(true);

  const canPlay = pausedReason === null && !offline;
  const isPlaying = playing && canPlay;

  useEffect(() => {
    onExposureRef.current = onExposure;
    canPlayRef.current = canPlay;
  });

  // Connection loss: real browser events, plus the demo scenario.
  useEffect(() => {
    let demoTimer: number | undefined;
    const goOffline = () => {
      setOffline(true);
      setPlaying(false);
    };
    const goOnline = () => setOffline(false);
    const demoDrop = (e: Event) => {
      goOffline();
      const seconds = (e as CustomEvent<{ seconds?: number }>).detail?.seconds ?? 8;
      window.clearTimeout(demoTimer);
      demoTimer = window.setTimeout(goOnline, seconds * 1000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    window.addEventListener(DEMO_CONNECTION_LOST_EVENT, demoDrop);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener(DEMO_CONNECTION_LOST_EVENT, demoDrop);
      window.clearTimeout(demoTimer);
    };
  }, []);

  // The playback clock. Anything that stops playback from outside (a session
  // time-out) stops it here too, and it never resumes on its own afterwards.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (!canPlayRef.current) {
        setPlaying(false);
        return;
      }
      const current = positionRef.current;
      if (current >= duration) {
        setPlaying(false);
        return;
      }
      const isReplay = current < maxReachedRef.current;
      const next = Math.min(duration, current + 1);
      positionRef.current = next;
      maxReachedRef.current = Math.max(maxReachedRef.current, next);
      const key = isReplay ? "replay_seconds" : "active_seconds";
      pendingRef.current = { ...pendingRef.current, [key]: pendingRef.current[key] + 1 };
      setPosition(next);
      setTotals((t) => ({ ...t, [key]: t[key] + 1 }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, duration]);

  // Report exposure periodically, and whatever is left when the workspace closes.
  useEffect(() => {
    const flush = () => {
      const sample = pendingRef.current;
      if (sample.active_seconds + sample.replay_seconds === 0) return;
      pendingRef.current = { active_seconds: 0, replay_seconds: 0 };
      onExposureRef.current?.(sample);
    };
    const id = window.setInterval(flush, EXPOSURE_FLUSH_MS);
    return () => {
      window.clearInterval(id);
      flush();
    };
  }, []);

  // Line the flagged-moment markers up with Carbon's slider track, which sits
  // between the min/max labels rather than spanning the whole column.
  useEffect(() => {
    const wrapper = scrubberRef.current;
    if (!wrapper || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const track = wrapper.querySelector<HTMLElement>(".cds--slider__track");
      if (!track) return;
      const outer = wrapper.getBoundingClientRect();
      const inner = track.getBoundingClientRect();
      if (inner.width > 0) setTrackBox({ left: inner.left - outer.left, width: inner.width });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // Keep a previewed local file in step with the controls.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = settings.muted;
    if (isPlaying) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [isPlaying, settings.muted, localVideoUrl]);

  useEffect(() => {
    return () => {
      if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    };
  }, [localVideoUrl]);

  function seek(seconds: number) {
    const clamped = Math.max(0, Math.min(duration, Math.round(seconds)));
    positionRef.current = clamped;
    setPosition(clamped);
    if (videoRef.current) videoRef.current.currentTime = clamped;
  }

  const overlayMessage =
    pausedReason === "session"
      ? "Playback paused — session timed out"
      : offline
        ? "Playback paused — reconnecting"
        : settings.blur >= 80
          ? "Blurred — reduce the slider below to view"
          : null;

  const timeline = caseDetail.incident_timeline ?? [];

  return (
    <div className="flex flex-col gap-3">
      {offline && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          role="status"
          title="Connection lost — reconnecting…"
          subtitle="Your blur, grayscale, and mute settings are unchanged."
          style={{ maxWidth: "100%" }}
        />
      )}
      {onExposure && (
        <p style={{ fontSize: 14, lineHeight: "18px", color: "var(--cds-text-secondary)" }}>
          This case: {formatDuration(totals.active_seconds + totals.replay_seconds)} ({formatDuration(totals.active_seconds)} active,{" "}
          {formatDuration(totals.replay_seconds)} replay) · {isPlaying ? "● Counting" : "○ Paused"}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,760px)_minmax(280px,1fr)]">
        {/* Video column: stays in view while the rail scrolls, so SOS is always reachable.
            Capped at the viewport height and scrollable inside: on a short laptop screen the
            pinned column was taller than the window, so its blur controls and Continue button
            could never be scrolled into view and the page looked frozen. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto">
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: "16 / 9", backgroundColor: "var(--cds-background-inverse)" }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                filter: `blur(${(settings.blur / 100) * 30}px) grayscale(${settings.grayscale ? 1 : 0})`,
                transform: "scale(1.1)",
              }}
            >
              {activeVideoUrl ? (
                <video
                  ref={videoRef}
                  src={activeVideoUrl}
                  className="h-full w-full object-contain"
                  playsInline
                  onLoadedMetadata={(e) => seek(Math.min(positionRef.current, e.currentTarget.duration))}
                  onEnded={() => setPlaying(false)}
                />
              ) : (
                <SyntheticTestPattern position={position} />
              )}
            </div>

            {overlayMessage && (
              <p
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 text-center"
                style={{
                  fontSize: 14,
                  lineHeight: "18px",
                  fontWeight: 600,
                  color: "var(--cds-text-inverse)",
                  backgroundColor: "var(--cds-background-inverse)",
                }}
              >
                {overlayMessage}
              </p>
            )}

            {onSos && (
              <div className="absolute right-4 top-4">
                <Button
                  kind="secondary"
                  size="md"
                  onClick={onSos}
                  aria-label="SOS: pause this case and notify my manager"
                >
                  SOS
                </Button>
              </div>
            )}
          </div>

          <div ref={scrubberRef} className="rcs-full-width-slider flex flex-col gap-1">
            <Slider
              id="playback-position"
              labelText="Playback position"
              min={0}
              max={duration}
              step={1}
              value={position}
              hideTextInput
              formatLabel={(value: number) => formatTimestamp(value)}
              onChange={({ value }) => seek(Number(value))}
            />
            {timeline.length > 0 && (
              <div
                className="relative"
                style={{ height: 16, marginLeft: trackBox?.left ?? 0, width: trackBox?.width ?? "100%" }}
                role="group"
                aria-label="Flagged moments"
              >
                {timeline.map((entry, i) => {
                  const info = getSeverityInfo(entry.severity_tier);
                  const label = `Jump to ${formatTimestamp(entry.start)}, ${entry.tag ?? "flagged"}, ${entry.severity_tier} ${info.label}`;
                  const sameStart = timeline.filter((e) => e.start === entry.start);
                  const indexInGroup = sameStart.indexOf(entry);
                  const groupOffset = (indexInGroup - (sameStart.length - 1) / 2) * 5;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={label}
                      title={label}
                      onClick={() => seek(entry.start)}
                      className="absolute top-0 flex cursor-pointer justify-center"
                      style={{
                        left: `calc(${(entry.start / duration) * 100}% - 8px + ${groupOffset}px)`,
                        width: 16,
                        height: 16,
                        background: "none",
                        border: 0,
                        padding: 0,
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: 4,
                          height: 14,
                          backgroundColor: info.background,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <IconButton
              kind="secondary"
              label={isPlaying ? "Pause" : "Play"}
              disabled={!canPlay}
              onClick={() => setPlaying((p) => !p)}
            >
              {isPlaying ? <Pause /> : <Play />}
            </IconButton>
            <div className="min-w-0 flex-1 basis-[300px]">
              <Slider
                id="blur-intensity"
                labelText="Blur intensity"
                min={0}
                max={100}
                step={5}
                value={blurStart}
                formatLabel={(value: number) => `${value}%`}
                onChange={({ value }) => {
                  const raw: unknown = value;
                  const blur = typeof raw === "number" ? raw : Number.NaN;
                  if (Number.isFinite(blur) && blur >= 0 && blur <= 100) {
                    onSettingsChange({ ...settings, blur: Math.round(blur) });
                  }
                }}
              />
              <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-helper)" }}>
                {aiFailed || !caseDetail.severity_tier
                  ? "No AI suggestion — severity is unknown for this case."
                  : `AI-suggested reference: ${SUGGESTED_BLUR[caseDetail.severity_tier]}%. You decide what's comfortable.`}
              </p>
            </div>
            <Toggle
              id="grayscale-toggle"
              size="sm"
              labelText="Grayscale"
              labelA="Off"
              labelB="On"
              toggled={settings.grayscale}
              onToggle={(on) => onSettingsChange({ ...settings, grayscale: on })}
            />
            <IconButton
              kind="ghost"
              label={settings.muted ? "Unmute" : "Mute"}
              onClick={() => onSettingsChange({ ...settings, muted: !settings.muted })}
            >
              {settings.muted ? <VolumeMute /> : <VolumeUp />}
            </IconButton>
          </div>

          {isMockData && (
            <div className="flex flex-wrap items-center gap-2">
              <Button kind="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                Preview a local video file
              </Button>
              <span style={{ fontSize: 12, color: "var(--cds-text-helper)" }}>
                Demo only — the file stays in this browser and is never uploaded.
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                aria-label="Choose a local video to preview"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPlaying(false);
                    setLocalVideoUrl(URL.createObjectURL(file));
                  }
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {onTalkToManager && (
            <p>
              <Link
                href="#check-in"
                onClick={(e) => {
                  e.preventDefault();
                  onTalkToManager();
                }}
              >
                Something about this one? Talk to your manager
              </Link>
            </p>
          )}

          <div className="flex flex-col items-start gap-4">
            <Button onClick={onContinue}>{continueLabel}</Button>
            {onBack && (
              <Button kind="tertiary" onClick={onBack}>
                ← Back to AI Analysis Summary
              </Button>
            )}
          </div>
        </div>

        {/* Context rail */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 p-4" style={{ backgroundColor: "var(--cds-layer-01)" }}>
            {aiFailed || !caseDetail.severity_tier ? (
              <p style={secondaryText}>Severity unknown — AI analysis unavailable for this case</p>
            ) : (
              <>
                <div>
                  <SeverityTag tier={caseDetail.severity_tier} />
                </div>
                <p style={{ ...mono, fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  CVI {caseDetail.effective_severity_score} / 100 (AI pre-screen)
                </p>
              </>
            )}
          </div>

          {!aiFailed && (
            <Accordion className="rcs-evidence-rail">
              {caseDetail.narrative_summary && (
                <AccordionItem title="AI Summary" open>
                  <p style={secondaryText}>{caseDetail.narrative_summary}</p>
                </AccordionItem>
              )}
              {caseDetail.flagged_entities && caseDetail.flagged_entities.length > 0 && (
                <AccordionItem title="Flagged entities" open>
                  <EntityPills entities={caseDetail.flagged_entities} />
                </AccordionItem>
              )}
              {caseDetail.transcript && caseDetail.transcript.length > 0 && (
                <AccordionItem title="Transcript" open>
                  <TranscriptList transcript={caseDetail.transcript} currentTime={position} />
                </AccordionItem>
              )}
              {caseDetail.audio_intensity && caseDetail.audio_intensity.length > 0 && (
                <AccordionItem title="Audio intensity" open>
                  <AudioIntensityGraph values={caseDetail.audio_intensity} durationSeconds={duration} />
                </AccordionItem>
              )}
            </Accordion>
          )}

          {onSos && (
            <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-helper)" }}>
              SOS is available at every scroll position in this workspace.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A synthetic, obviously artificial moving test pattern in Carbon's support
 * colours. It stands in for source video so no real footage is ever bundled
 * or shown by this frontend.
 */
function SyntheticTestPattern({ position }: { position: number }) {
  const bars = [
    "var(--cds-support-info)",
    "var(--cds-support-success)",
    "var(--cds-support-warning)",
    "var(--cds-support-caution-major)",
    "var(--cds-support-error)",
    "var(--cds-support-caution-undefined)",
  ];
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${bars.map((c, i) => `${c} ${i * 60}px ${(i + 1) * 60}px`).join(", ")})`,
          backgroundPositionX: `${position * 12}px`,
        }}
      />
      <p
        className="absolute bottom-4 left-4 px-2 py-1"
        style={{
          ...mono,
          fontSize: 14,
          color: "var(--cds-text-inverse)",
          backgroundColor: "var(--cds-background-inverse)",
        }}
      >
        Synthetic test pattern · {formatTimestamp(position)}
      </p>
    </div>
  );
}
