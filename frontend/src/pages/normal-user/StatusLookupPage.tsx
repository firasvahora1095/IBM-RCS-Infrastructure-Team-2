import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { TextInput, Button, InlineNotification, ProgressIndicator, ProgressStep, Tag } from "@carbon/react";
import { CheckmarkFilled, RadioButtonChecked, RadioButton as RadioButtonIcon } from "@carbon/icons-react";
import { PublicPage } from "../../components/layout/PublicPage";
import { getStatus } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { PublicStatusResponse, PublicCaseStatus } from "../../services/types";
import { mapStatusToPublicLabel } from "../../design-tokens/statusLabels";
import { mapOutcomeToDisplay } from "../../design-tokens/outcomeLabels";
import { loadCaseId } from "../../hooks/useCaseIdStorage";
import { AddCaseInformationModal } from "../../components/forms/AddCaseInformationModal";
import { formatDateTime, formatDuration } from "../../utils/formatRelativeTime";

const STEPS: readonly PublicCaseStatus[] = ["Received", "Being Reviewed", "Complete"];

const NOT_FOUND_FIELD_MESSAGE = "We couldn't find a case with that ID.";
const NOT_FOUND_BANNER_MESSAGE = "We couldn't find a case with that ID. Check the ID and try again.";

type LookupError = { kind: "not-found" } | { kind: "locked-out"; message: string } | { kind: "other"; message: string };

const mono = { fontFamily: "'IBM Plex Mono', monospace" } as const;

/**
 * Screen 3 — Status/Notification (Normal User Figma nodes 7:2 lookup,
 * 7:15 found, 7:41 not found). One route, with the three states driven by
 * the lookup result rather than three separate pages.
 *
 * "Case details" rows beyond the Case ID (submitted/updated time, content
 * type, duration, file name) appear only when the data source returns them,
 * so a backend without those fields never shows placeholder values.
 */
export function StatusLookupPage() {
  // Convenience: pre-fill the case saved in this browser by the Upload flow.
  // Lazy initial state reads storage once, on first render only.
  const [caseIdInput, setCaseIdInput] = useState(() => loadCaseId()?.caseId ?? "");
  const [result, setResult] = useState<PublicStatusResponse | null>(null);
  const [lookupError, setLookupError] = useState<LookupError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isLockedOut = lookupError?.kind === "locked-out";

  async function handleCheckStatus(e: FormEvent) {
    e.preventDefault();
    const caseId = caseIdInput.trim();
    if (!caseId || isLockedOut) return;
    setIsLoading(true);
    setLookupError(null);
    try {
      setResult(await getStatus(caseId));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // UR-ST-08 — the backend already answers "not found" identically for
        // a wrong ID and a malformed one, so nothing here distinguishes them.
        setLookupError({ kind: "not-found" });
      } else if (err instanceof ApiError && err.status === 429) {
        // UR-ST-07 — after 5 invalid lookups in 10 minutes the backend locks
        // this IP out for 15 minutes. Per the Figma dev note on 7:41, the
        // button is disabled and the rate-limit notice is shown.
        setLookupError({ kind: "locked-out", message: err.message });
      } else {
        setLookupError({
          kind: "other",
          message: err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleCheckAnother() {
    setResult(null);
    setCaseIdInput("");
  }

  if (result) {
    return <StatusResult result={result} onCheckAnother={handleCheckAnother} />;
  }

  return (
    <PublicPage cardWidth={640}>
      <form onSubmit={handleCheckStatus} className="flex flex-col gap-5" noValidate>
        <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>Check your case status</h1>
        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          Enter the case ID you received when you submitted your report.
        </p>

        <TextInput
          id="case-id-lookup"
          labelText="Case ID"
          placeholder="e.g. RCS-7Q3M-K91X"
          autoComplete="off"
          spellCheck={false}
          value={caseIdInput}
          onChange={(e) => setCaseIdInput(e.target.value)}
          invalid={lookupError?.kind === "not-found"}
          invalidText={NOT_FOUND_FIELD_MESSAGE}
          // Carbon links the invalid message only through aria-errormessage,
          // which many screen readers don't announce (axe flags it). Also
          // referencing Carbon's message element (id "<input id>-error-msg")
          // via aria-describedby makes the error read out with the field.
          aria-describedby={lookupError?.kind === "not-found" ? "case-id-lookup-error-msg" : undefined}
          style={mono}
        />

        {/* The not-found state shows both the red field AND this banner,
            matching Figma 3c. */}
        {lookupError && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title={lookupError.kind === "not-found" ? NOT_FOUND_BANNER_MESSAGE : lookupError.message}
            style={{ maxWidth: "100%" }}
          />
        )}

        <Button
          type="submit"
          disabled={isLoading || isLockedOut || !caseIdInput.trim()}
          style={{ maxWidth: "100%" }}
          className="w-full"
        >
          {isLoading ? "Checking…" : "Check status"}
        </Button>
      </form>
    </PublicPage>
  );
}

interface StatusResultProps {
  result: PublicStatusResponse;
  onCheckAnother: () => void;
}

/** Screen 3b — the found case, showing only the three public stages (UR-ST-02). */
function StatusResult({ result, onCheckAnother }: StatusResultProps) {
  const publicStatus = mapStatusToPublicLabel(result.status);
  const isComplete = publicStatus === "Complete";
  // Carbon marks every step before currentIndex as complete. For a Complete
  // case, pointing one past the last step shows all three as done.
  const currentIndex = isComplete ? STEPS.length : STEPS.indexOf(publicStatus);
  const outcome = isComplete && result.final_outcome ? mapOutcomeToDisplay(result.final_outcome) : null;
  const [addInfoOpen, setAddInfoOpen] = useState(false);
  const [infoAdded, setInfoAdded] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The lookup form unmounts when the result appears, which dropped keyboard
  // focus to the page body (found in the Task 99 keyboard pass). Focus the
  // result heading instead, so the next Tab continues from here.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <PublicPage cardWidth={640}>
      <h1
        ref={headingRef}
        tabIndex={-1}
        style={{
          ...mono,
          fontSize: 16,
          lineHeight: "22px",
          fontWeight: 400,
          color: "var(--cds-text-secondary)",
          outline: "none",
        }}
      >
        Case {result.case_id}
      </h1>

      {/* Carbon's ProgressIndicator pairs a distinct icon shape with a text
          label for every step, so progress is never conveyed by colour
          alone (UR-NFR-01). */}
      <ProgressIndicator currentIndex={currentIndex} spaceEqually>
        {STEPS.map((step) => (
          <ProgressStep key={step} label={step} />
        ))}
      </ProgressIndicator>

      {/* Figma 145:75: a completed case leads with its status and outcome,
          ahead of the case details, since the outcome is what the reporter
          came back for. RT-01's heading and supporting message stay separate. */}
      {isComplete && (
        <section
          aria-labelledby="complete-stage-title"
          className="flex flex-col gap-4 p-4"
          style={{
            borderLeft: "4px solid var(--cds-support-success)",
            borderRadius: 8,
            boxShadow: "inset 0 0 0 1px var(--cds-layer-01)",
          }}
        >
          <div className="flex items-center gap-4">
            <CheckmarkFilled
              size={24}
              style={{ fill: "var(--cds-support-success)", flexShrink: 0 }}
              aria-hidden="true"
            />
            <h2 id="complete-stage-title" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
              Complete
            </h2>
          </div>
          {outcome && (
            <>
              <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle-00)", margin: 0 }} />
              <div className="flex flex-col gap-2">
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--cds-text-helper)" }}>Outcome</p>
                <h3 id="outcome-title" style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
                  {outcome.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>{outcome.body}</p>
              </div>
            </>
          )}
        </section>
      )}

      {publicStatus === "Being Reviewed" && (
        <>
          <section
            aria-labelledby="current-stage-title"
            className="flex flex-col gap-4 p-4"
            style={{
              borderLeft: "4px solid var(--cds-border-interactive)",
              borderRadius: 8,
              boxShadow: "inset 0 0 0 1px var(--cds-layer-01)",
            }}
          >
            <div className="flex gap-4">
              <RadioButtonChecked
                size={24}
                style={{ fill: "var(--cds-icon-interactive)", flexShrink: 0, marginTop: 2 }}
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1">
                <h2 id="current-stage-title" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
                  Being Reviewed
                </h2>
                <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
                  A reviewer is currently assessing your report against our content policy.
                </p>
              </div>
            </div>
            <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle-00)", margin: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--cds-text-helper)" }}>Coming up</p>
            <div className="flex gap-3">
              <RadioButtonIcon
                size={16}
                style={{ fill: "var(--cds-icon-secondary)", flexShrink: 0, marginTop: 2 }}
                aria-hidden="true"
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--cds-text-primary)" }}>Complete</p>
                <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  You&apos;ll see the outcome here, and it&apos;ll be saved to this case.
                </p>
              </div>
            </div>
          </section>

          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
            Estimated review time: 3–5 business days (indicative).
          </p>
          <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
            We don&apos;t share who is reviewing your case or how it&apos;s being handled internally — only the stage
            shown above.
          </p>

          <div className="flex flex-col gap-2">
            {/* UR-NTH-05: add follow-up context to this case (Figma 80:31). */}
            <div>
              <Button kind="tertiary" onClick={() => setAddInfoOpen(true)}>
                Add more information to this case
              </Button>
            </div>
            <p style={{ fontSize: 11, lineHeight: "15px", color: "var(--cds-text-secondary)" }}>
              Use your case ID to attach follow-up evidence or details after submitting.
            </p>
            <div aria-live="polite">
              {infoAdded && (
                <InlineNotification
                  kind="success"
                  lowContrast
                  hideCloseButton
                  title="Your update has been added to this case."
                  style={{ maxWidth: "100%" }}
                />
              )}
            </div>
          </div>
          {/* Mounted only while open: Carbon keeps a closed Modal in the DOM,
              which would duplicate the "Case {id}" text for assistive tech. */}
          {addInfoOpen && (
            <AddCaseInformationModal
              caseId={result.case_id}
              open
              onClose={() => setAddInfoOpen(false)}
              onAdded={() => {
                setAddInfoOpen(false);
                setInfoAdded(true);
              }}
            />
          )}
        </>
      )}

      <section
        aria-labelledby="case-details-title"
        className="flex flex-col gap-3.5 p-5"
        style={{ border: "1px solid var(--cds-border-subtle-00)" }}
      >
        <h2 id="case-details-title" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
          Case details
        </h2>
        <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle-00)", margin: 0 }} />
        <dl className="flex flex-col gap-3.5">
          <DetailRow label="Case ID" value={result.case_id} monospace />
          {result.submitted_at && <DetailRow label="Submitted on" value={formatDateTime(result.submitted_at)} />}
          {result.updated_at && <DetailRow label="Last updated" value={formatDateTime(result.updated_at)} />}
          {result.content_type && <DetailRow label="Content type" value={result.content_type} />}
          {result.duration_seconds != null && (
            <DetailRow label="Duration" value={formatDuration(result.duration_seconds)} />
          )}
          {result.file_name && <DetailRow label="File name" value={result.file_name} />}
        </dl>
      </section>

      {publicStatus === "Being Reviewed" && (
        <section
          aria-label="Outcome preview"
          className="flex flex-col gap-2.5 p-5"
          style={{ border: "1px dashed var(--cds-border-subtle-00)", borderRadius: 8 }}
        >
          <div>
            <Tag type="gray" size="sm">
              PREVIEW
            </Tag>
          </div>
          <p style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600 }}>
            Outcome (shown once your case reaches Complete)
          </p>
          <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
            You&apos;ll see a plain-language result here — for example, whether the content was actioned — without any
            internal review details.
          </p>
        </section>
      )}

      <div>
        <Button kind="ghost" onClick={onCheckAnother}>
          Check a different case
        </Button>
      </div>
    </PublicPage>
  );
}

/** One label/value row of the "Case details" block (Figma 86:46). */
function DetailRow({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="flex gap-4">
      <dt style={{ width: 140, flexShrink: 0, fontSize: 12, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
        {label}
      </dt>
      <dd style={{ ...(monospace ? mono : {}), fontSize: 14, lineHeight: "20px", color: "var(--cds-text-primary)" }}>
        {value}
      </dd>
    </div>
  );
}
