import { useState } from "react";
import { Button, InlineNotification, RadioTile, TextArea, TileGroup } from "@carbon/react";
import { requestWellbeingSupport, withdrawWellbeingRequest } from "../../services";
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  type WellbeingRequestKind,
  type WellbeingRequestRecord,
} from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { notifyWellbeingChanged, useMyWellbeing } from "../../hooks/useMyWellbeing";
import { StatusTag } from "../ui/StatusTag";
import { WELLBEING_STATUS_LABEL, WELLBEING_TONE } from "../../design-tokens/statusTones";
import { formatClockTime } from "../../utils/formatRelativeTime";

interface WellbeingCheckInProps {
  /** The case the request is about, when raised from a review. */
  caseId?: string;
  /** Session expiry is handled by the page that hosts the check-in. */
  onSessionExpired?: (err: unknown) => boolean;
  /** Inside a modal or card that already frames it: no border or padding of its own. */
  bare?: boolean;
}

const MAX_REASON = 500;

/** What each option gives the Auditor, said before they choose (Sprint 3 extras §9). */
const OPTIONS: { kind: WellbeingRequestKind; title: string; outcome: string }[] = [
  {
    kind: "TALK_TO_MANAGER",
    title: "Talk to my Manager",
    outcome: "Your Manager will reach out today, by message or a quick call. Nothing changes on your case.",
  },
  {
    kind: "BREAK_REQUEST",
    title: "Take a break",
    outcome: "Your Manager is notified. You get no new cases until you're back, and a case you're reviewing stays with you.",
  },
];

const kindTitle = (kind: WellbeingRequestKind) => OPTIONS.find((o) => o.kind === kind)!.title;

const timeOf = formatClockTime;

/**
 * Wellbeing check-in (AR-WB-16, Figma 31:188): the calm, private path, distinct
 * from SOS. The Auditor picks what would help, sees what happens next, can add
 * a reason if they want to, and can withdraw a request they no longer need.
 * The Manager sees it on that Auditor's record (MR-SOS-07), never in the SOS
 * inbox.
 */
export function WellbeingCheckIn({ caseId, onSessionExpired, bare = false }: WellbeingCheckInProps) {
  const { token } = useAuth();
  const { wellbeing, refresh } = useMyWellbeing();
  const [kind, setKind] = useState<WellbeingRequestKind | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<"send" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choiceMissing, setChoiceMissing] = useState(false);
  const [sent, setSent] = useState<WellbeingRequestKind | null>(null);

  const requests: WellbeingRequestRecord[] = wellbeing?.requests ?? [];
  const openKinds = new Set(requests.filter((r) => r.status === "OPEN").map((r) => r.kind));
  const available = OPTIONS.filter((o) => !openKinds.has(o.kind));

  function fail(err: unknown) {
    if (onSessionExpired?.(err)) return;
    setError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
  }

  async function send() {
    if (!token) return;
    if (!kind) {
      setChoiceMissing(true);
      return;
    }
    setPending("send");
    setError(null);
    try {
      await requestWellbeingSupport(token, kind, caseId, reason.trim() || undefined);
      setSent(kind);
      setKind(null);
      setReason("");
      refresh();
      notifyWellbeingChanged();
    } catch (err) {
      fail(err);
    } finally {
      setPending(null);
    }
  }

  async function withdraw(request: WellbeingRequestRecord) {
    if (!token) return;
    setPending(request.id);
    setError(null);
    try {
      await withdrawWellbeingRequest(token, request.id);
      setSent(null);
      refresh();
      notifyWellbeingChanged();
    } catch (err) {
      fail(err);
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      aria-labelledby="wellbeing-check-in-title"
      className={bare ? "flex flex-col gap-5" : "flex flex-col gap-5 px-6 py-5"}
      style={bare ? undefined : { border: "1px solid var(--cds-border-subtle-01)", maxWidth: 560 }}
    >
      <div className="flex flex-col gap-1">
        <h2 id="wellbeing-check-in-title" style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
          What would help right now?
        </h2>
        <p className="rcs-helper" style={{ fontSize: 14, lineHeight: "20px" }}>
          This isn&apos;t an alert. Asking for support is a normal part of this job.
        </p>
      </div>

      {sent && (
        <InlineNotification
          kind="success"
          lowContrast
          hideCloseButton
          role="status"
          title="Request sent."
          subtitle={
            sent === "TALK_TO_MANAGER"
              ? "Your Manager will reach out to you today."
              : "Your Manager has been notified and will check in with you."
          }
          style={{ maxWidth: "100%" }}
        />
      )}

      {requests.length > 0 && (
        <div className="flex flex-col gap-2" aria-label="Your requests today" role="group">
          <p style={{ fontSize: 14, fontWeight: 600 }}>Your requests today</p>
          <ul className="flex flex-col gap-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                style={{ backgroundColor: "var(--cds-layer-01)" }}
              >
                <div className="flex flex-col gap-1">
                  <span style={{ fontSize: 14 }}>
                    {kindTitle(r.kind)} · <span className="rcs-helper">{timeOf(r.created_at)}</span>
                  </span>
                  {r.reason && <span className="rcs-helper">&ldquo;{r.reason}&rdquo;</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center">
                    <StatusTag tone={r.status === "OPEN" ? "neutral" : WELLBEING_TONE[r.status]}>
                      {WELLBEING_STATUS_LABEL[r.status]}
                    </StatusTag>
                  </span>
                  {r.status === "OPEN" && (
                    <Button kind="tertiary" size="sm" disabled={pending !== null} onClick={() => void withdraw(r)}>
                      {pending === r.id ? "Withdrawing…" : "Withdraw"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {available.length > 0 ? (
        <>
          <TileGroup
            className="rcs-radio-tiles"
            name={`support-kind${caseId ? `-${caseId}` : ""}`}
            legend="Choose one"
            valueSelected={kind ?? undefined}
            onChange={(value) => {
              setKind(value as WellbeingRequestKind);
              setChoiceMissing(false);
            }}
          >
            {available.map((o) => (
              <RadioTile key={o.kind} id={`support-${o.kind}${caseId ? `-${caseId}` : ""}`} value={o.kind}>
                <span className="flex flex-col gap-1">
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{o.title}</span>
                  <span className="rcs-helper">{o.outcome}</span>
                </span>
              </RadioTile>
            ))}
          </TileGroup>
          {choiceMissing && (
            <p role="alert" style={{ fontSize: 12, color: "var(--cds-text-error)", marginTop: -12 }}>
              Choose what would help, then send.
            </p>
          )}
          <TextArea
            id={`support-reason${caseId ? `-${caseId}` : ""}`}
            labelText="What's going on? (optional)"
            helperText="Only your Manager sees this. You don't need to give a reason."
            rows={3}
            maxCount={MAX_REASON}
            enableCounter
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div>
            <Button disabled={pending !== null} onClick={() => void send()}>
              {pending === "send" ? "Sending…" : "Request support"}
            </Button>
          </div>
        </>
      ) : (
        <p className="rcs-helper" style={{ fontSize: 14 }}>
          Both requests are open. Withdraw one above if you no longer need it.
        </p>
      )}

      {caseId && (
        <p className="rcs-helper">Need to stop right now? Use SOS on the review screen instead.</p>
      )}

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
