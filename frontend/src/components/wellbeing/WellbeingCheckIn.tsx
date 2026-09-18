import { useState } from "react";
import { Button, InlineNotification, Toggle } from "@carbon/react";
import { requestWellbeingSupport } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, type WellbeingRequestKind } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";

interface WellbeingCheckInProps {
  /** The case the check-in is about, when raised from a review. */
  caseId?: string;
  /** Session expiry is handled by the page that hosts the check-in. */
  onSessionExpired?: (err: unknown) => boolean;
}

/**
 * The optional, low-friction wellbeing check-in (AR-WB-16, Figma 31:188),
 * distinct from SOS. Deliberately calm: no red, no badge, no interruption.
 * It lets an Auditor ask to talk to their Manager, or request a break,
 * without any formal escalation. The Manager sees it on that Auditor's
 * record (MR-SOS-07), not in the SOS inbox.
 */
export function WellbeingCheckIn({ caseId, onSessionExpired }: WellbeingCheckInProps) {
  const { token } = useAuth();
  const [talkRequested, setTalkRequested] = useState(false);
  const [breakRequested, setBreakRequested] = useState(false);
  const [pending, setPending] = useState<WellbeingRequestKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(kind: WellbeingRequestKind) {
    if (!token) return;
    setPending(kind);
    setError(null);
    try {
      await requestWellbeingSupport(token, kind, caseId);
      if (kind === "TALK_TO_MANAGER") setTalkRequested(true);
      else setBreakRequested(true);
    } catch (err) {
      if (onSessionExpired?.(err)) return;
      setError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      aria-labelledby="wellbeing-check-in-title"
      className="flex flex-col gap-4 px-6 py-5"
      style={{ backgroundColor: "var(--cds-layer-01)", maxWidth: 520 }}
    >
      <h2 id="wellbeing-check-in-title" style={{ fontSize: 14, lineHeight: "20px", fontWeight: 400 }}>
        Do you want to talk to your manager about this one?
      </h2>
      <div aria-live="polite">
        {talkRequested ? (
          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
            Your manager has been asked to reach out to you.
          </p>
        ) : (
          <Button kind="tertiary" size="sm" disabled={pending !== null} onClick={() => send("TALK_TO_MANAGER")}>
            {pending === "TALK_TO_MANAGER" ? "Sending…" : "Talk to my manager"}
          </Button>
        )}
      </div>
      <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle-01)", margin: 0 }} />
      <Toggle
        id={`break-request${caseId ? `-${caseId}` : ""}`}
        size="sm"
        labelText="I'd like to take a break"
        hideLabel={false}
        labelA="No"
        labelB="Yes"
        toggled={breakRequested}
        disabled={breakRequested || pending !== null}
        onToggle={(on) => {
          if (on) void send("BREAK_REQUEST");
        }}
      />
      <div aria-live="polite">
        {breakRequested && (
          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
            Break requested. Your manager will confirm it with you.
          </p>
        )}
      </div>
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title="That request wasn't sent."
          subtitle={error}
          style={{ maxWidth: "100%" }}
        />
      )}
    </section>
  );
}
