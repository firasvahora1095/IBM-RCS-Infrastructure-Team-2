import { useState } from "react";
import {
  Button,
  Checkbox,
  ComposedModal,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tag,
} from "@carbon/react";
import { CircleFilled } from "@carbon/icons-react";
import type { AuditorCaseDetail } from "../../services/types";
import { SeverityTag } from "../severity/SeverityTag";

interface ContentWarningModalProps {
  open: boolean;
  caseDetail: AuditorCaseDetail;
  onProceed: () => void;
  onDecline: () => void;
  /** Closing without choosing returns to the queue; nothing is revealed. */
  onClose: () => void;
  isProceeding?: boolean;
  /** Replaces the default note under the buttons, e.g. for the Manager's exceptional access (Figma 1:454). */
  footnote?: string;
  /** Accessible name of the close button, which leaves without revealing anything. */
  closeLabel?: string;
}

const mono = { fontFamily: "'IBM Plex Mono', monospace" } as const;
const helperText = { fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" } as const;

/**
 * The content-warning gate shown before any source content (AR-PV-01, 02, 08),
 * in its default form (Figma 16:19) and its AI/STT failure form (25:212,
 * AR-AI-10).
 *
 * - The flag reason comes before the question (Marielle Lee Q2), and the
 *   severity tag and visual tags are classification metadata only.
 * - Proceed and Decline are equal-weight buttons, so neither is nudged
 *   ("genuine choices", AR-PV-02). Carbon's usual primary/secondary footer
 *   pairing would make Proceed dominant, so both use the same kind.
 * - The consent checkbox gates Proceed only; declining never needs consent.
 */
export function ContentWarningModal({
  open,
  caseDetail,
  onProceed,
  onDecline,
  onClose,
  isProceeding = false,
  footnote,
  closeLabel = "Back to case queue",
}: ContentWarningModalProps) {
  const [consented, setConsented] = useState(false);
  const aiFailed = Boolean(caseDetail.ai_failure);
  const tags = [...new Set((caseDetail.incident_timeline ?? []).map((e) => e.tag).filter((t): t is string => !!t))];

  return (
    <ComposedModal open={open} onClose={onClose} preventCloseOnClickOutside size="sm" aria-label="Content warning">
      <ModalHeader
        title={
          aiFailed ? (
            "AI analysis unavailable"
          ) : (
            <>
              This case was flagged for: <span style={{ fontWeight: 400 }}>{caseDetail.flag_reason ?? "Review"}</span>
            </>
          )
        }
        closeModal={onClose}
        iconDescription={closeLabel}
      />
      <ModalBody>
        <div className="flex flex-col gap-5">
          {aiFailed ? (
            <>
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="AI analysis unavailable:"
                subtitle="Severity score and incident timeline are unavailable for this case. Review with extra caution."
                style={{ maxWidth: "100%" }}
              />
              <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--cds-text-helper)" }}>
                <CircleFilled size={8} aria-hidden="true" style={{ fill: "var(--cds-icon-secondary)" }} />
                Severity unknown — AI analysis unavailable for this case
              </p>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {caseDetail.severity_tier && <SeverityTag tier={caseDetail.severity_tier} size="sm" />}
              {caseDetail.effective_severity_score !== null && (
                <span style={{ ...mono, fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  CVI {caseDetail.effective_severity_score}/100
                </span>
              )}
              {tags.map((tag) => (
                <Tag key={tag} type="gray" size="sm" style={mono}>
                  {tag}
                </Tag>
              ))}
            </div>
          )}

          <h3 style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>Would you like to proceed?</h3>

          <Checkbox
            id={`content-consent-${caseDetail.case_id}`}
            labelText="I understand this content may be disturbing. I am trained to review this material and I consent to proceed."
            checked={consented}
            onChange={(_, { checked }) => setConsented(checked)}
          />

          <p style={helperText}>
            {footnote ??
              (aiFailed
                ? "Proceeding opens the Review Workspace directly at maximum blur, since severity is unknown here, not neutral. There is no AI Analysis Summary for this case."
                : "Your manager will review this case using the AI summary and your notes — not your decision to decline.")}
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" disabled={!consented || isProceeding} onClick={onProceed}>
          {isProceeding ? "Opening…" : "Proceed"}
        </Button>
        <Button kind="secondary" onClick={onDecline}>
          Decline
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
