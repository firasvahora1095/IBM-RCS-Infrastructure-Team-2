import { useRef, useState } from "react";
import { Button, InlineNotification, Modal, TextArea } from "@carbon/react";
import { useFocusOnOpen } from "../../hooks/useFocusOnOpen";
import { addCaseInformation } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, NotImplementedError } from "../../services/types";

interface AddCaseInformationModalProps {
  caseId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * "Add more information to this case" (Normal User Figma 80:31, UR-NTH-05).
 * Lets a reporter add context, and optionally a file, to a case they already
 * submitted. It can only add — never delete or withdraw — as the modal's own
 * copy explains.
 */
export function AddCaseInformationModal({ caseId, open, onClose, onAdded }: AddCaseInformationModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const [details, setDetails] = useState("");
  // The status page mounts this modal already open, so Carbon never moves focus into it.
  useFocusOnOpen(open, detailsRef);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = (details.trim() !== "" || attachment !== null) && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addCaseInformation(caseId, details, attachment ?? undefined);
      setDetails("");
      setAttachment(null);
      onAdded();
    } catch (err) {
      setError(
        err instanceof NotImplementedError
          ? "Adding information to a case isn't available yet."
          : err instanceof ApiError
            ? err.message
            : NETWORK_ERROR_MESSAGE,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      modalHeading="Add more information to this case"
      modalLabel={`Case ${caseId}`}
      primaryButtonText={isSubmitting ? "Submitting…" : "Submit update"}
      primaryButtonDisabled={!canSubmit}
      secondaryButtonText="Cancel"
      onRequestSubmit={handleSubmit}
      onRequestClose={onClose}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <TextArea
          ref={detailsRef}
          id="add-case-information"
          labelText="Additional context or details"
          placeholder="Add anything that helps the reviewer understand your case..."
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />

        <div
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
          style={{ border: "1px dashed var(--cds-border-subtle-00)" }}
        >
          <Button kind="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            + Attach a file (optional)
          </Button>
          {attachment && (
            <span style={{ fontSize: 12, color: "var(--cds-text-primary)" }}>
              {attachment.name}{" "}
              <button
                type="button"
                className="cds--link"
                style={{ background: "none", border: "none", padding: 0, fontSize: 12, cursor: "pointer" }}
                onClick={() => setAttachment(null)}
              >
                Remove
              </button>
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Attach a file"
            style={{ display: "none" }}
            onChange={(e) => {
              setAttachment(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>

        <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
          This only adds to your case — it can&apos;t be used to delete or withdraw content you already submitted
          (that&apos;s out of scope for this flow; case records are handled under the data-retention policy, not
          user-side edits).
        </p>

        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Your update wasn't added."
            subtitle={error}
            style={{ maxWidth: "100%" }}
          />
        )}
      </div>
    </Modal>
  );
}
