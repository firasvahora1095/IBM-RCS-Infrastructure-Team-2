import { useRef, useState } from "react";
import { Add, Close, Document } from "@carbon/icons-react";
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

/** "PDF file", "PNG file", "MP4 file": the file's own ending, so the tile says what it is. */
function fileKind(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 && dot < file.name.length - 1 ? `${file.name.slice(dot + 1).toUpperCase()} file` : "File";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = (details.trim() !== "" || attachments.length > 0) && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addCaseInformation(caseId, details, attachments.length > 0 ? attachments : undefined);
      setDetails("");
      setAttachments([]);
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
          placeholder="Add anything that helps the Auditor understand your case..."
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />

        {attachments.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Attached files">
            {attachments.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 px-4 py-3"
                style={{ backgroundColor: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)" }}
              >
                <Document size={24} style={{ fill: "var(--cds-icon-secondary)", flexShrink: 0 }} aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    title={file.name}
                    style={{
                      fontSize: 14,
                      lineHeight: "20px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
                    {fileKind(file)} · {formatFileSize(file.size)}
                  </span>
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  hasIconOnly
                  renderIcon={Close}
                  iconDescription={`Remove ${file.name}`}
                  tooltipPosition="left"
                  onClick={() => setAttachments((cur) => cur.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>
        )}
        {/* Secondary, never primary: Submit update is the dialog's one primary action. */}
        <div>
          <Button kind="tertiary" size="md" renderIcon={Add} onClick={() => fileInputRef.current?.click()}>
            {attachments.length > 0 ? "Attach another file" : "Attach files (optional)"}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Attach files"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            if (picked.length > 0) setAttachments((cur) => [...cur, ...picked]);
            e.target.value = "";
          }}
        />

        <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
          Information added here is attached to your case. Once submitted, it can&apos;t be edited or removed.
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
