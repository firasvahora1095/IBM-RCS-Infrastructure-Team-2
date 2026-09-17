import { useState } from "react";
import type { FormEvent } from "react";
import {
  TextInput,
  Button,
  InlineNotification,
  ProgressIndicator,
  ProgressStep,
  Tag,
} from "@carbon/react";
import { RadioButtonChecked, RadioButton as RadioButtonIcon } from "@carbon/icons-react";
import { PublicPage } from "../../components/layout/PublicPage";
import { getStatus } from "../../api/client";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../api/types";
import type { PublicStatusResponse, PublicCaseStatus } from "../../api/types";
import { mapStatusToPublicLabel } from "../../design-tokens/statusLabels";
import { mapOutcomeToDisplay } from "../../design-tokens/outcomeLabels";
import { loadCaseId } from "../../hooks/useCaseIdStorage";

const STEPS: readonly PublicCaseStatus[] = ["Received", "Being Reviewed", "Complete"];

const NOT_FOUND_FIELD_MESSAGE = "We couldn't find a case with that ID.";
const NOT_FOUND_BANNER_MESSAGE = "We couldn't find a case with that ID. Check the ID and try again.";

type LookupError =
  | { kind: "not-found" }
  | { kind: "locked-out"; message: string }
  | { kind: "other"; message: string };

const mono = { fontFamily: "'IBM Plex Mono', monospace" } as const;

/**
 * Screen 3 — Status/Notification (Normal User Figma nodes 7:2 lookup,
 * 7:15 found, 7:41 not found). One route, with the three states driven by
 * the lookup result rather than three separate pages.
 *
 * Only fields the real API returns are shown. The Figma "Case details" block
 * also lists Submitted on / Last updated / Content type / Duration / File
 * name, but GET /api/status/{id} returns only case_id, status and
 * final_outcome — those rows are omitted rather than faked (backend gap).
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
        <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>
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

        <Button type="submit" disabled={isLoading || isLockedOut || !caseIdInput.trim()} style={{ maxWidth: "100%" }} className="w-full">
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

  return (
    <PublicPage cardWidth={640}>
      <h1 style={{ ...mono, fontSize: 16, lineHeight: "22px", fontWeight: 400, color: "#525252" }}>
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

      {publicStatus === "Being Reviewed" && (
        <>
          <section
            aria-labelledby="current-stage-title"
            className="flex flex-col gap-4 p-4"
            style={{ borderLeft: "4px solid #0f62fe", borderRadius: 8, boxShadow: "inset 0 0 0 1px #f4f4f4" }}
          >
            <div className="flex gap-4">
              <RadioButtonChecked size={24} style={{ fill: "#0f62fe", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <h2 id="current-stage-title" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
                  Being Reviewed
                </h2>
                <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>
                  A reviewer is currently assessing your report against our content policy.
                </p>
              </div>
            </div>
            <hr style={{ border: 0, borderTop: "1px solid #e0e0e0", margin: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 500, color: "#6f6f6f" }}>Coming up</p>
            <div className="flex gap-3">
              <RadioButtonIcon size={16} style={{ fill: "#8d8d8d", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#161616" }}>Complete</p>
                <p style={{ fontSize: 12, color: "#525252" }}>
                  You&apos;ll see the outcome here, and it&apos;ll be saved to this case.
                </p>
              </div>
            </div>
          </section>

          <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>
            Estimated review time: 3–5 business days (indicative).
          </p>
          <p style={{ fontSize: 12, lineHeight: "16px", color: "#525252" }}>
            We don&apos;t share who is reviewing your case or how it&apos;s being handled internally — only the stage
            shown above.
          </p>

          <div className="flex flex-col gap-2">
            {/* UR-NTH-05 (Nice-to-Have). The follow-up evidence flow isn't
                part of Sprint 2 P0 and has no API yet, so the approved
                button is shown disabled rather than as a dead end. */}
            <div>
              <Button kind="tertiary" disabled>
                Add more information to this case
              </Button>
            </div>
            <p style={{ fontSize: 11, lineHeight: "15px", color: "#525252" }}>
              Use your case ID to attach follow-up evidence or details after submitting.
            </p>
          </div>
        </>
      )}

      <section aria-labelledby="case-details-title" className="flex flex-col gap-3.5 p-5" style={{ border: "1px solid #e0e0e0" }}>
        <h2 id="case-details-title" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
          Case details
        </h2>
        <hr style={{ border: 0, borderTop: "1px solid #e0e0e0", margin: 0 }} />
        <dl className="flex gap-4">
          <dt style={{ width: 140, fontSize: 12, lineHeight: "16px", color: "#525252" }}>Case ID</dt>
          <dd style={{ ...mono, fontSize: 14, lineHeight: "20px" }}>{result.case_id}</dd>
        </dl>
      </section>

      {publicStatus === "Being Reviewed" && (
        <section
          aria-label="Outcome preview"
          className="flex flex-col gap-2.5 p-5"
          style={{ border: "1px dashed #e0e0e0", borderRadius: 8 }}
        >
          <div>
            <Tag type="gray" size="sm">
              PREVIEW
            </Tag>
          </div>
          <p style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600 }}>
            Outcome (shown once your case reaches Complete)
          </p>
          <p style={{ fontSize: 12, lineHeight: "16px", color: "#525252" }}>
            You&apos;ll see a plain-language result here — for example, whether the content was actioned — without
            any internal review details.
          </p>
        </section>
      )}

      {outcome && (
        <section aria-labelledby="outcome-title" className="flex flex-col gap-2 p-5" style={{ border: "1px solid #e0e0e0" }}>
          <h2 id="outcome-title" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
            {outcome.title}
          </h2>
          <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>{outcome.body}</p>
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
