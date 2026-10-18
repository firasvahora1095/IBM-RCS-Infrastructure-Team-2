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
  Toggletip,
  ToggletipButton,
  ToggletipContent,
} from "@carbon/react";
import { Information } from "@carbon/icons-react";
import type { AuditorCaseDetail } from "../../services/types";
import { SeverityTag } from "../severity/SeverityTag";
import { useMyWellbeing } from "../../hooks/useMyWellbeing";

interface ContentWarningModalProps {
  open: boolean;
  caseDetail: AuditorCaseDetail;
  onProceed: () => void;
  onDecline: () => void;
  /** Closing without choosing leaves without declining; nothing is revealed and the case is unchanged. */
  onClose: () => void;
  isProceeding?: boolean;
  /** Replaces the default note under the buttons, e.g. for the Manager's exceptional access (Figma 1:454). */
  footnote?: string;
  /** Accessible name of the close button, which leaves without revealing anything. */
  closeLabel?: string;
  /** What the decline button says, so the outcome is clear. Defaults to the Auditor wording. */
  declineLabel?: string;
}

/** The CVI bands from the severity scale, for the tooltip. */
const CVI_BANDS = "S1 is 0 to 39, S2 is 40 to 64, S3 is 65 to 84 and S4 is 85 to 100.";

function formatLength(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const mono = { fontFamily: "'IBM Plex Mono', monospace" } as const;
const helperText = { fontSize: 14, lineHeight: "20px", color: "var(--cds-text-primary)" } as const;

/**
 * The content-warning gate shown before any source content (AR-PV-01, 02, 08),
 * in its default form (Figma 16:19) and its AI/STT failure form (25:212,
 * AR-AI-10).
 *
 * - The flag reason comes before the question (Marielle Lee Q2), and the
 *   severity tag and visual tags are classification metadata only.
 * - Proceed is the one primary button and stays disabled until the box is ticked
 *   (never pre-ticked). Decline is a clear secondary that says where the case goes.
 * - The close X is not a decision: it leaves without declining or revealing anything.
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
  closeLabel = "Back to dashboard",
  declineLabel = "Decline",
}: ContentWarningModalProps) {
  const [consented, setConsented] = useState(false);
  const { wellbeing } = useMyWellbeing();
  const aiFailed = Boolean(caseDetail.ai_failure);
  const tags = [...new Set((caseDetail.incident_timeline ?? []).map((e) => e.tag).filter((t): t is string => !!t))];

  const length = caseDetail.video_duration_seconds;
  const limit = wellbeing?.exposure_limit_minutes;
  const exposureLine =
    length && length > 0
      ? `${formatLength(length)} long. Uses up to ${Math.max(1, Math.ceil(length / 60))}${
          limit ? ` of your ${limit}` : ""
        } min of exposure today.`
      : null;

  return (
    <ComposedModal
      open={open}
      onClose={onClose}
      preventCloseOnClickOutside
      size="sm"
      aria-label="Content warning"
      // Start on the consent checkbox. Carbon's default focus lands on the
      // close button, whose tooltip then covers the flag reason the Auditor
      // needs to read first.
      selectorPrimaryFocus={`#content-consent-${caseDetail.case_id}`}
    >
      <ModalHeader
        title={
          aiFailed ? (
            "AI analysis unavailable"
          ) : (
            <>
              <span style={{ fontWeight: 600 }}>This case was flagged for:</span> {caseDetail.flag_reason ?? "Review"}
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
                kind="warning"
                lowContrast
                hideCloseButton
                title="Severity unknown."
                subtitle="No score or timeline for this case. Review with extra caution."
                style={{ maxWidth: "100%" }}
              />
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {caseDetail.severity_tier && <SeverityTag tier={caseDetail.severity_tier} size="sm" />}
              {caseDetail.effective_severity_score !== null && (
                <span style={{ ...mono, fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  CVI score ({caseDetail.effective_severity_score} of 100)
                </span>
              )}
              {caseDetail.effective_severity_score !== null && (
                <Toggletip align="bottom-start">
                  <ToggletipButton label="What is the CVI score?">
                    <Information size={16} aria-hidden="true" />
                  </ToggletipButton>
                  <ToggletipContent>
                    <p>The AI&apos;s severity score, from 0 to 100. {CVI_BANDS}</p>
                  </ToggletipContent>
                </Toggletip>
              )}
              {tags.map((tag) => (
                <Tag key={tag} type="gray" size="sm" style={mono}>
                  {tag}
                </Tag>
              ))}
            </div>
          )}

          <h3 style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>Would you like to proceed?</h3>

          {exposureLine && <p style={{ fontSize: 14, lineHeight: "20px" }}>{exposureLine}</p>}

          <Checkbox
            id={`content-consent-${caseDetail.case_id}`}
            labelText="I understand this content may be disturbing. I am trained to review this material and I consent to proceed."
            checked={consented}
            onChange={(_, { checked }) => setConsented(checked)}
          />

          <p style={helperText}>
            {footnote ??
              (aiFailed
                ? "The content opens with maximum blur applied because severity is unassessed."
                : "Declining sends the case to the Manager to decide. It isn't reassigned automatically.")}
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onDecline}>
          {declineLabel}
        </Button>
        <Button kind="primary" disabled={!consented || isProceeding} onClick={onProceed}>
          {isProceeding ? "Opening…" : "Proceed"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
