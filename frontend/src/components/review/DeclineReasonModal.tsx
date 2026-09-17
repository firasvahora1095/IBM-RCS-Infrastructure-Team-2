import { useState } from "react";
import { InlineNotification, Modal, RadioButton, RadioButtonGroup, TextInput } from "@carbon/react";
import type { DeclineReason } from "../../services/types";
import { DECLINE_REASON_OPTIONS } from "../../design-tokens/declineReasons";

interface DeclineReasonModalProps {
  open: boolean;
  onSubmit: (reason: DeclineReason, otherText: string) => void;
  /** Returns to the content warning without declining. */
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Decline Reason Modal (Figma 25:137): one structured reason, in the adopted
 * order with nothing pre-selected, and an optional free-text field once
 * "Other" is chosen (AR-DF-03). The explanation that declining is supported
 * and goes straight to the Manager is AR-DF-04.
 */
export function DeclineReasonModal({ open, onSubmit, onCancel, isSubmitting, error }: DeclineReasonModalProps) {
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [otherText, setOtherText] = useState("");

  return (
    <Modal
      open={open}
      size="sm"
      modalHeading="Why are you declining this case?"
      primaryButtonText={isSubmitting ? "Submitting…" : "Submit decline"}
      primaryButtonDisabled={reason === null || isSubmitting}
      secondaryButtonText="Cancel"
      onRequestSubmit={() => reason && onSubmit(reason, otherText)}
      onRequestClose={onCancel}
      preventCloseOnClickOutside
    >
      <div className="flex flex-col gap-5">
        <RadioButtonGroup
          name="decline-reason"
          legendText={<span className="cds--visually-hidden">Decline reason</span>}
          orientation="vertical"
          valueSelected={reason ?? undefined}
          onChange={(value) => setReason(value as DeclineReason)}
        >
          {DECLINE_REASON_OPTIONS.map((option) => (
            <RadioButton
              key={option.value}
              id={`decline-${option.value}`}
              labelText={option.label}
              value={option.value}
            />
          ))}
        </RadioButtonGroup>

        {reason === "OTHER" && (
          <TextInput
            id="decline-other"
            labelText="Tell your manager more (optional)"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
        )}

        <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
          Declining is a supported action. This case will go directly to your manager for review — it won&apos;t be
          reassigned automatically.
        </p>

        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="This case wasn't declined."
            subtitle={error}
            style={{ maxWidth: "100%" }}
          />
        )}
      </div>
    </Modal>
  );
}
