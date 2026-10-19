import { useState } from "react";
import {
  Button,
  Checkbox,
  Tag,
  ComposedModal,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
} from "@carbon/react";
import { Information } from "@carbon/icons-react";
import type { AuditorCaseDetail } from "../../services/types";
import { SeverityTag } from "../severity/SeverityTag";

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
  const aiFailed = Boolean(caseDetail.ai_failure);
  const tags = [...new Set((caseDetail.incident_timeline ?? []).map((e) => e.tag).filter((t): t is string => !!t))];

  // Facts about this case only: how long the video is, and how many flagged moments it has and when the first starts.
  // Viewing time today is already in the header, so it isn't repeated here in a second form.
  const length = caseDetail.video_duration_seconds;
  const moments = caseDetail.incident_timeline ?? [];
  const firstAt = moments.length ? Math.min(...moments.map((m) => m.start)) : null;

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
        label={aiFailed ? undefined : "Content warning"}
        title={aiFailed ? "AI analysis unavailable" : (caseDetail.flag_reason ?? "Review")}
        closeModal={onClose}
        iconDescription={closeLabel}
      />
      <ModalBody>
        {/* Three calm blocks, read top to bottom: what was flagged, the facts, then the decision. */}
        <div className="rcs-cw">
          {aiFailed ? (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="Severity unknown."
              subtitle="No score or timeline for this case. Review with extra caution."
              style={{ maxWidth: "100%" }}
            />
          ) : (
            <div className="rcs-cw-what">
              <div className="rcs-cw-severity">
                {caseDetail.severity_tier && <SeverityTag tier={caseDetail.severity_tier} size="sm" />}
                {caseDetail.effective_severity_score !== null && (
                  <>
                    <span className="rcs-cw-cvi">CVI score ({caseDetail.effective_severity_score} of 100)</span>
                    <Toggletip align="bottom-start">
                      <ToggletipButton label="What is the CVI score?">
                        <Information size={16} aria-hidden="true" />
                      </ToggletipButton>
                      <ToggletipContent>
                        <p>The AI&apos;s severity score, from 0 to 100. {CVI_BANDS}</p>
                      </ToggletipContent>
                    </Toggletip>
                  </>
                )}
              </div>
              {tags.length > 0 && (
                <div className="rcs-cw-flags">
                  <span className="rcs-cw-flags-label">Flagged</span>
                  {tags.map((tag) => (
                    <Tag key={tag} type="gray" size="sm">
                      {tag.replace(/_/g, " ")}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          )}

          {(length || moments.length > 0) && (
            <dl className="rcs-cw-facts">
              {length ? (
                <div>
                  <dt>Video length</dt>
                  <dd>{formatLength(length)}</dd>
                </div>
              ) : null}
              {moments.length > 0 && firstAt !== null && (
                <div>
                  <dt>Flagged moments</dt>
                  <dd>
                    {moments.length}, from {formatLength(firstAt)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          <div className="rcs-cw-decide">
            <h3 className="rcs-cw-question">Would you like to proceed?</h3>
            <Checkbox
              id={`content-consent-${caseDetail.case_id}`}
              labelText="I understand this content may be disturbing. I am trained to review this material and I consent to proceed."
              checked={consented}
              onChange={(_, { checked }) => setConsented(checked)}
            />
            <p className="rcs-cw-note">
              {footnote ??
                (aiFailed
                  ? "The content opens with maximum blur applied because severity is unassessed."
                  : "Declining is a normal part of the job. Your Manager decides what happens next.")}
            </p>
          </div>
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
