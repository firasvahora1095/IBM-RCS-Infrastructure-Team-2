import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, InlineNotification } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { mono, pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { ContentWarningModal } from "../../components/review/ContentWarningModal";
import { ReviewWorkspace } from "../../components/review/ReviewWorkspace";
import { PROTECTED_VIEWER_SETTINGS, type ViewerSettings } from "../../components/review/viewerSettings";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { IncidentTimeline } from "../../components/severity/IncidentTimeline";
import { FlaggedEntities, TranscriptAndAudio } from "../../components/review/AiEvidencePanels";
import { getCaseForExceptionalAccess, recordExceptionalAccess } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";

type Step = "gate" | "summary" | "workspace";

/** Only return to Manager pages, never an arbitrary URL from the query string. */
function safeReturnPath(from: string | null, caseId: string): string {
  return from && from.startsWith("/manager/") ? from : `/manager/cases/${encodeURIComponent(caseId)}/reassign`;
}

/**
 * Exceptional Raw-Content Access (Manager Figma 5.4a/b/c: 1:454, 1:512,
 * 1:612), MR-CR-08: the same content-warning gate, AI summary and protected
 * workspace an Auditor gets, adapted for a Manager's rare, deliberate viewing.
 *
 * - Every access is logged for the audit trail when the Manager proceeds.
 * - No SOS, wellbeing check-in or exposure counter: none apply to a Manager's
 *   exceptional viewing session (Manager handoff, screen 14).
 * - Declining or leaving returns to wherever it was opened from (reassignment
 *   decision or SOS alert), which the static prototype couldn't do (Round 4).
 */
export function ManagerExceptionalAccessPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const returnTo = safeReturnPath(searchParams.get("from"), caseId);
  const returnLabel = returnTo.startsWith("/manager/sos/") ? "Return to SOS alert" : "Return to reassignment decision";

  const { data, error } = useStaffQuery((t) => getCaseForExceptionalAccess(caseId, t), caseId);
  const { sessionExpired, handleSessionError, sessionModal } = useInPlaceSessionExpiry(
    "Your blur, grayscale, and mute settings will be exactly as you left them.",
  );
  const [step, setStep] = useState<Step>("gate");
  const [viewer, setViewer] = useState<ViewerSettings>(PROTECTED_VIEWER_SETTINGS);
  const [isProceeding, setIsProceeding] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  async function proceed() {
    if (!token || !data) return;
    setIsProceeding(true);
    setGateError(null);
    try {
      await recordExceptionalAccess(caseId, token);
      setStep(data.ai_failure ? "workspace" : "summary");
    } catch (err) {
      if (!handleSessionError(err)) setGateError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setIsProceeding(false);
    }
  }

  const trail = [
    { label: returnLabel.replace("Return to ", "").replace(/^./, (c) => c.toUpperCase()), to: returnTo },
    { label: `Case ${caseId} (exceptional access)` },
  ];

  return (
    <ManagerLayout showNav={false} showSosBanner={false}>
      {sessionModal}
      <ManagerBreadcrumb trail={trail} />
      <LoadState error={error} loading={!data && !error} what="this case" />

      {data && step === "gate" && (
        <>
          <p style={secondaryText}>Nothing from this case is shown until you choose to proceed.</p>
          {gateError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title="This case can't be opened right now."
              subtitle={gateError}
              style={{ maxWidth: "100%" }}
            />
          )}
          <ContentWarningModal
            open={!sessionExpired && !gateError}
            caseDetail={data}
            isProceeding={isProceeding}
            onProceed={proceed}
            onDecline={() => navigate(returnTo)}
            onClose={() => navigate(returnTo)}
            closeLabel={returnLabel}
            footnote={`This exceptional access is for the genuinely ambiguous case where structured signals aren't enough to decide — logged for the audit trail. Declining returns you to the ${returnLabel.replace("Return to ", "")} without viewing raw content.`}
          />
        </>
      )}

      {data && step === "summary" && (
        <>
          <h1 style={pageTitle}>AI Analysis Summary</h1>
          <div className="flex flex-wrap items-center gap-3">
            {data.severity_tier && <SeverityTag tier={data.severity_tier} />}
            {data.effective_severity_score !== null && (
              <span style={{ ...mono, fontSize: 14 }}>CVI {data.effective_severity_score} / 100</span>
            )}
          </div>
          <section
            aria-labelledby="narrative-title"
            className="flex flex-col gap-2 px-5 py-4"
            style={{ backgroundColor: "var(--cds-layer-01)" }}
          >
            <h2 id="narrative-title" style={{ fontSize: 14, fontWeight: 600 }}>
              Narrative summary
            </h2>
            <p style={secondaryText}>{data.narrative_summary ?? "No narrative summary was returned for this case."}</p>
          </section>
          {data.incident_timeline && data.incident_timeline.length > 0 && (
            <section aria-labelledby="timeline-title" className="flex flex-col gap-2">
              <h2 id="timeline-title" style={{ fontSize: 14, fontWeight: 600 }}>
                Incident timeline
              </h2>
              <IncidentTimeline entries={data.incident_timeline} durationSeconds={data.video_duration_seconds} />
            </section>
          )}
          <FlaggedEntities entities={data.flagged_entities ?? []} />
          <TranscriptAndAudio
            transcript={data.transcript}
            audioIntensity={data.audio_intensity}
            durationSeconds={data.video_duration_seconds}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setStep("workspace")}>Continue to review</Button>
            <Button kind="tertiary" onClick={() => navigate(returnTo)}>
              {returnLabel}
            </Button>
          </div>
        </>
      )}

      {data && step === "workspace" && (
        <>
          <h1 className="cds--visually-hidden">Review Workspace (exceptional access)</h1>
          <ReviewWorkspace
            caseDetail={data}
            settings={viewer}
            onSettingsChange={setViewer}
            pausedReason={sessionExpired ? "session" : null}
            onContinue={() => navigate(returnTo)}
            continueLabel={returnLabel}
            onBack={data.ai_failure ? undefined : () => setStep("summary")}
          />
        </>
      )}
    </ManagerLayout>
  );
}
