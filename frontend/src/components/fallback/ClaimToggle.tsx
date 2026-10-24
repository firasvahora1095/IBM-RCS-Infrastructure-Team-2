import { useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { Toggle } from "@carbon/react";
import { makeCaseAvailable, withdrawCaseRelease } from "../../services";
import { SeverityTag } from "../severity/SeverityTag";
import { CaseConfirmDialog } from "./CaseConfirmDialog";

interface ClaimToggleProps {
  caseId: string;
  /** Shown in the confirmation, so the person sees which case they are opening up. */
  severity: ComponentProps<typeof SeverityTag>["tier"] | null;
  /** True once Auditors can claim the case. */
  allowed: boolean;
  token: string;
  /** Called after the change, with a sentence for the page to show. */
  onDone: (message: string) => void;
  /** Called with whatever failed, so the page can use its own error wording and session handling. */
  onError: (err: unknown) => void;
  disabled?: boolean;
}

/**
 * "Auditors can claim", No or Yes, for a case nobody owns. No is the default: the system assigns the case the moment an
 * Auditor is free. On lets any eligible Auditor claim it themselves instead. A Manager or the Super Auditor decides.
 *
 * Switching to Yes is confirmed first, because it stops the system assigning the case: it then waits for a claim, and
 * nothing else will move it. Switching back to No needs no confirmation, since that is the safe direction: the case goes back
 * to the system, and is assigned straight away if an Auditor is free.
 */
export function ClaimToggle({ caseId, severity, allowed, token, onDone, onError, disabled }: ClaimToggleProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function turnOn() {
    setBusy(true);
    try {
      await makeCaseAvailable(caseId, token);
      setConfirming(false);
      onDone(`${caseId}: Auditors can now claim it. The system won't assign it while this is Yes.`);
    } catch (err) {
      setConfirming(false);
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      await withdrawCaseRelease(caseId, token);
      onDone(`${caseId} is back with the system. It is assigned as soon as an Auditor is free.`);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Carbon prints a hidden label's text beside the switch, so the name lives in its own hidden span instead and the
          switch shows just No or Yes. */}
      <span id={`claim-${caseId}-name`} className="cds--visually-hidden">
        Auditors can claim {caseId}
      </span>
      <Toggle
        id={`claim-${caseId}`}
        size="sm"
        aria-labelledby={`claim-${caseId}-name`}
        labelA="No"
        labelB="Yes"
        toggled={allowed}
        disabled={disabled || busy}
        onToggle={(checked: boolean) => (checked ? setConfirming(true) : void turnOff())}
      />
      {/* Rendered at the page level, not inside the table cell: the tables keep their text on one line (so a case ID never
          breaks), and a dialog inside a cell inherits that and runs off its own edge. */}
      {confirming &&
        createPortal(
          <CaseConfirmDialog
            open
            label="Auditors can claim"
            title={`Let Auditors claim ${caseId}?`}
            severity={severity}
            facts={[{ term: "Right now", value: "The system assigns it to the next free Auditor" }]}
            question="Let any Auditor pick this case up instead?"
            points={[
              "Any Auditor with time left today can claim it.",
              "They see its severity and how long it has waited, never the footage.",
              "The system stops assigning it until you set this back to No.",
            ]}
            note="Whoever claims it still gets the content warning and can decline."
            confirmLabel={busy ? "Saving…" : "Allow claiming"}
            busy={busy}
            onConfirm={() => void turnOn()}
            onClose={() => setConfirming(false)}
          />,
          document.body,
        )}
    </>
  );
}
