import { useState } from "react";
import { InlineNotification, Modal, TextArea } from "@carbon/react";
import { useAuth } from "../../hooks/useAuth";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { logCheckIn } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";

interface CheckInModalProps {
  /** The Reviewer being checked in on. Mount the dialog only while it is open, so a closed one leaves nothing in the page. */
  reviewer: { id: string; name: string };
  onClose: () => void;
  /** Called once the check-in is saved, so the page can refresh and say it is done. */
  onLogged: (reviewer: { id: string; name: string }) => void;
}

/**
 * The Manager's check-in after a Reviewer finishes a critical (S4) case (AR-WB-12). The Reviewer can't take new
 * cases until it is logged, so this is the one thing the "Needs you" row asks for: speak to them, then say how they
 * are. A note is required so the record shows the check-in happened and what support was offered. An SOS is checked
 * in through its follow-up page instead.
 */
export function CheckInModal({ reviewer, onClose, onLogged }: CheckInModalProps) {
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!token || saving) return;
    if (!notes.trim()) {
      setFieldError("Add a short note about how they are and what support you offered.");
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      await logCheckIn(reviewer.id, token, notes.trim());
      onLogged(reviewer);
      onClose();
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setSubmitError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      size="sm"
      modalLabel="Check-in"
      modalHeading={`Check in with ${reviewer.name}`}
      primaryButtonText={saving ? "Saving…" : "Log check-in"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={saving}
      onRequestClose={onClose}
      onRequestSubmit={submit}
      selectorPrimaryFocus="#check-in-notes"
    >
      <div className="flex flex-col gap-4">
        <p className="rcs-body">
          {reviewer.name} finished a critical case. They can&apos;t take new cases until you&apos;ve checked in. Speak
          with them first, then record how they are.
        </p>
        <TextArea
          id="check-in-notes"
          labelText="How are they?"
          helperText="What you talked about and any support you offered."
          rows={4}
          maxCount={600}
          enableCounter
          value={notes}
          invalid={Boolean(fieldError)}
          invalidText={fieldError ?? undefined}
          onChange={(e) => {
            setNotes(e.target.value);
            setFieldError(null);
          }}
        />
        {submitError && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Couldn't log the check-in."
            subtitle={submitError}
            style={{ maxWidth: "100%" }}
          />
        )}
      </div>
    </Modal>
  );
}
