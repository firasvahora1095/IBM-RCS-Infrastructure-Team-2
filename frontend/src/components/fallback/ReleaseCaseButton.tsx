import { useState } from "react";
import { Button, Modal } from "@carbon/react";
import { makeCaseAvailable, withdrawCaseRelease } from "../../services";

interface ReleaseCaseButtonProps {
  caseId: string;
  /** True once the case is open for Auditors to claim. */
  released: boolean;
  token: string;
  /** Called after the change, with a sentence for the page to show. */
  onDone: (message: string) => void;
  /** Called with whatever failed, so the page can use its own error wording and session handling. */
  onError: (err: unknown) => void;
  disabled?: boolean;
}

/**
 * The one decision a Manager or the Super Auditor can make about a case nobody owns: leave it to the system to place
 * (the default, automatic and fair), or let Auditors choose it themselves.
 *
 * Letting Auditors choose is confirmed first, because it takes the case out of automatic placement: it then waits for
 * a claim, and nothing else will move it. Taking it back is one click, since that is the safe direction and puts the
 * case back where it started.
 */
export function ReleaseCaseButton({ caseId, released, token, onDone, onError, disabled }: ReleaseCaseButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function release() {
    setBusy(true);
    try {
      await makeCaseAvailable(caseId, token);
      setConfirming(false);
      onDone(`${caseId} is open for Auditors to claim. It stays here until one does, or until you place it automatically.`);
    } catch (err) {
      setConfirming(false);
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function takeBack() {
    setBusy(true);
    try {
      await withdrawCaseRelease(caseId, token);
      onDone(`${caseId} is back with the system. It is placed as soon as an Auditor is free.`);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        kind={released ? "ghost" : "tertiary"}
        size="sm"
        disabled={disabled || busy}
        aria-label={released ? `Place case ${caseId} automatically` : `Let Auditors choose case ${caseId}`}
        onClick={() => (released ? void takeBack() : setConfirming(true))}
      >
        {released ? "Place automatically" : "Let Auditors choose"}
      </Button>
      {confirming && (
        <Modal
          open
          size="sm"
          modalHeading={`Let Auditors choose case ${caseId}?`}
          primaryButtonText={busy ? "Releasing…" : "Let Auditors choose"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={busy}
          onRequestClose={() => setConfirming(false)}
          onRequestSubmit={() => void release()}
        >
          <div className="flex flex-col gap-3" style={{ fontSize: 14, lineHeight: "20px" }}>
            <p>
              Every eligible Auditor will see this case&apos;s severity and how long it has waited, never the footage, and
              any of them can claim it. They still get the content warning and can decline.
            </p>
            <p>
              The system will stop placing it automatically, so it waits here until someone claims it. You can put it
              back with the system at any time.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
