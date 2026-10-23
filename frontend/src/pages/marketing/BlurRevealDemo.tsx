import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, Slider, Theme, Toggle } from "@carbon/react";
import { SeverityTag } from "../../components/severity/SeverityTag";

type Stage = "warning" | "reviewing" | "declined" | "sos";

const ANNOUNCE: Record<Stage, string> = {
  warning: "Content warning shown. Nothing from this case is visible yet.",
  reviewing: "Footage shown at 100 percent blur. Lower the blur to see more, or turn on grayscale.",
  declined: "Case declined. Your Manager decides what happens next.",
  sos: "SOS sent. The content is hidden and your Manager has been alerted.",
};

/** The entities the AI flagged on the demo case, as the real content warning lists them. */
const FLAGS = ["physical_violence", "weapon_present", "weapon_use", "visible_injury"] as const;

/** Max blur in px at 100%; enough that nothing in the frame can be made out. */
const MAX_BLUR_PX = 28;

/**
 * The Reviewer's first look at a flagged case, made interactive. Wording, tags and rules match the real Reviewer
 * workspace (case AR-2026-00417 in the demo data): the content warning names the flag, severity and CVI score, Proceed
 * stays disabled until the Reviewer consents, declining goes to the Manager, footage opens at 100% blur in grayscale
 * with a continuous blur slider (BA decision, 27 Aug), and SOS sits on the video. The frame is a drawn landscape, never
 * footage.
 */
export function BlurRevealDemo() {
  const [stage, setStage] = useState<Stage>("warning");
  const [consent, setConsent] = useState(false);
  const [blur, setBlur] = useState(100);
  // Off by default here: the drawn sample frame reads better blurred in colour. The real workspace opens in grayscale.
  const [grayscale, setGrayscale] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const lastStage = useRef<Stage>(stage);

  // Move focus to the control that matters in each state, so a keyboard user is never left on a button that vanished.
  // Only on a change of stage: the page must not pull focus into the card on load.
  useEffect(() => {
    if (lastStage.current === stage) return;
    lastStage.current = stage;
    const selector =
      stage === "reviewing" ? '[role="slider"]' : stage === "warning" ? "#reveal-consent" : "[data-focus-first]";
    const target = card.current?.querySelector<HTMLElement>(selector);
    target?.focus();
  }, [stage]);

  function restart() {
    setBlur(100);
    setGrayscale(false);
    setConsent(false);
    setStage("warning");
  }

  const filters = [`blur(${(blur / 100) * MAX_BLUR_PX}px)`, grayscale ? "grayscale(1)" : ""].join(" ");

  return (
    <Theme theme="g100" className="rcs-reveal-theme">
      <div ref={card} className="rcs-reveal" role="group" aria-labelledby="reveal-title">
        <div className="rcs-reveal-bar">
          <h2 id="reveal-title" className="rcs-reveal-title">
            Try it: a flagged case
          </h2>
          <span className="rcs-reveal-case">Case AR-2026-00417</span>
        </div>

        <div className="rcs-reveal-frame">
          <svg
            className="rcs-reveal-art"
            style={{ filter: filters }}
            viewBox="0 0 480 320"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id="reveal-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c4a3ff" />
                <stop offset="0.6" stopColor="#a6c8ff" />
                <stop offset="1" stopColor="#b6f2e0" />
              </linearGradient>
            </defs>
            <rect width="480" height="320" fill="url(#reveal-sky)" />
            <circle cx="360" cy="92" r="40" fill="#fff1c9" />
            <path d="M0 220 120 140 210 200 300 130 400 190 480 160V320H0Z" fill="#8f7cff" />
            <path d="M0 260 140 200 260 250 380 210 480 245V320H0Z" fill="#5b45d6" />
            <path d="M0 295 160 265 320 300 480 275V320H0Z" fill="#0b7a75" />
          </svg>

          <span className="rcs-reveal-time" aria-hidden="true">
            00:00 / 02:30
          </span>

          {stage === "reviewing" && (
            <>
              <span className="rcs-reveal-sample">Sample frame, not real footage</span>
              <Button size="md" kind="danger" className="rcs-reveal-sos" onClick={() => setStage("sos")}>
                SOS
              </Button>
            </>
          )}

          {stage === "warning" && (
            <div className="rcs-reveal-overlay">
              <span className="rcs-reveal-tag">Content warning</span>
              <p className="rcs-reveal-lead">Graphic violence</p>
              <div className="rcs-reveal-flags">
                <SeverityTag tier="S3" size="sm" />
                <span className="rcs-reveal-cvi">CVI score (71 of 100)</span>
              </div>
              <div className="rcs-reveal-flags">
                {FLAGS.map((f) => (
                  <span key={f} className="rcs-reveal-flag">
                    {f.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
              <p className="rcs-reveal-question">Would you like to proceed?</p>
              <Checkbox
                id="reveal-consent"
                labelText="I understand this content may be disturbing. I am trained to review this material and I consent to proceed."
                checked={consent}
                onChange={(_, { checked }) => setConsent(checked)}
              />
              <div className="rcs-reveal-actions">
                <Button size="md" kind="secondary" onClick={() => setStage("declined")}>
                  Decline
                </Button>
                <Button size="md" disabled={!consent} onClick={() => setStage("reviewing")}>
                  Proceed
                </Button>
              </div>
              <p className="rcs-reveal-note">Declining is a normal part of the job. Your Manager decides what happens next.</p>
            </div>
          )}

          {stage === "declined" && (
            <div className="rcs-reveal-overlay">
              <p className="rcs-reveal-lead">Case declined.</p>
              <p className="rcs-reveal-copy">
                Declining is a normal part of the job. Your Manager decides what happens next.
              </p>
              <div className="rcs-reveal-actions">
                <Button size="md" kind="ghost" data-focus-first onClick={restart}>
                  Start again
                </Button>
              </div>
            </div>
          )}

          {stage === "sos" && (
            <div className="rcs-reveal-overlay">
              <p className="rcs-reveal-lead">SOS sent. The content is hidden at once.</p>
              <p className="rcs-reveal-copy">Your Manager is alerted and a cooldown starts.</p>
              <div className="rcs-reveal-actions">
                <Button size="md" kind="ghost" data-focus-first onClick={restart}>
                  Start again
                </Button>
              </div>
            </div>
          )}
        </div>

        {stage === "reviewing" && (
          <div className="rcs-reveal-controls">
            <Slider
              id="reveal-blur"
              labelText="Blur intensity"
              min={0}
              max={100}
              step={5}
              value={blur}
              onChange={({ value }) => setBlur(value)}
              formatLabel={(v: number) => `${v}%`}
              hideTextInput
            />
            <div className="rcs-reveal-controls-row">
              <Toggle
                id="reveal-grayscale"
                size="sm"
                labelText="Grayscale"
                hideLabel
                toggled={grayscale}
                onToggle={setGrayscale}
              />
              <Button size="sm" kind="ghost" onClick={restart}>
                Cover again
              </Button>
            </div>
          </div>
        )}

        <p className="cds--visually-hidden" aria-live="polite">
          {ANNOUNCE[stage]}
        </p>
      </div>
    </Theme>
  );
}
