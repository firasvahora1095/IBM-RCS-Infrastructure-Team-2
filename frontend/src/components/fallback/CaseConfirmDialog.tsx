import type { ComponentProps } from "react";
import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from "@carbon/react";
import { SeverityTag } from "../severity/SeverityTag";

interface CaseConfirmDialogProps {
  open: boolean;
  /** The small line above the title, as on the content warning ("Fallback queue"). */
  label: string;
  /** Also the dialog's accessible name. */
  title: string;
  severity: ComponentProps<typeof SeverityTag>["tier"] | null;
  facts: { term: string; value: string }[];
  question: string;
  /** What happens if they confirm, one short sentence each. */
  points: string[];
  note: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * A yes-or-no about a case nobody owns ("Take case", "Let Auditors claim"). Built from the content warning's parts and
 * styles (label over title, severity, a fact strip, then the question under a rule, a quiet note, Cancel then the action)
 * so every popup about a case looks and reads the same.
 */
export function CaseConfirmDialog({
  open,
  label,
  title,
  severity,
  facts,
  question,
  points,
  note,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: CaseConfirmDialogProps) {
  return (
    <ComposedModal
      open={open}
      onClose={onClose}
      size="sm"
      aria-label={title}
      // Start on Cancel, the safe choice. Carbon's default lands on the close button, whose tooltip covers the title.
      selectorPrimaryFocus=".cds--modal-footer .cds--btn--secondary"
    >
      <ModalHeader label={label} title={title} closeModal={onClose} iconDescription="Cancel" />
      <ModalBody>
        <div className="rcs-cw">
          <div className="rcs-cw-what">
            <div className="rcs-cw-severity">
              {severity ? (
                <SeverityTag tier={severity} size="sm" />
              ) : (
                <span className="rcs-cw-cvi">Severity not yet assessed</span>
              )}
            </div>
          </div>
          {facts.length > 0 && (
            <dl className="rcs-cw-facts">
              {facts.map((fact) => (
                <div key={fact.term}>
                  <dt>{fact.term}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="rcs-cw-decide">
            <h3 className="rcs-cw-question">{question}</h3>
            <ul className="rcs-cw-points">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="rcs-cw-note">{note}</p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
