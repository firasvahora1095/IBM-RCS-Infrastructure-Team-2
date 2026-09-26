import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Button,
  Slider,
  TextArea,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
  Breadcrumb,
  BreadcrumbItem,
  SkeletonText,
} from "@carbon/react";
import { StaffHeader } from "../../components/shell/StaffHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { IncidentTimeline } from "../../components/severity/IncidentTimeline";
import { FlaggedEntities, TranscriptAndAudio } from "../../components/review/AiEvidencePanels";
import { ContentWarningModal } from "../../components/review/ContentWarningModal";
import { DeclineReasonModal } from "../../components/review/DeclineReasonModal";
import { ReviewWorkspace } from "../../components/review/ReviewWorkspace";
import { PROTECTED_VIEWER_SETTINGS, type ViewerSettings } from "../../components/review/viewerSettings";
import { SessionExpiredModal } from "../../components/auth/SessionExpiredModal";
import { WellbeingCheckIn } from "../../components/wellbeing/WellbeingCheckIn";
import {
  acknowledgeContentWarning,
  declineCase,
  getAuditorCaseDetail,
  getMyWellbeing,
  recordExposure,
  reportUnexpectedExposure,
  resolveCase,
  triggerSos,
} from "../../services";
import { getCaseVideoStreamUrl } from "../../services/api/httpClient";
import { DEMO_AI_FAILURE_EVENT, DEMO_SCENARIO_EVENT } from "../../services/mock/demo";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type {
  AuditorCaseDetail,
  DeclineReason,
  ExposureSample,
  FinalOutcome,
  ResolveCaseResponse,
} from "../../services/types";
import { getSeverityInfo, scoreToTier } from "../../design-tokens/severity";
import { OUTCOME_OPTIONS, mapOutcomeToDisplay } from "../../design-tokens/outcomeLabels";
import { useAuth } from "../../hooks/useAuth";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { notifyWellbeingChanged } from "../../hooks/useMyWellbeing";
import {
  loadDraftResolution,
  saveDraftResolution,
  clearDraftResolution,
  type DraftStep,
} from "../../hooks/useDraftResolution";

type Step = "gate" | DraftStep | "check-in" | "confirmation" | "declined" | "sos";

/** What paused the case: the Auditor's SOS, or AI/STT failing after review began (AR-AI-11). */
type PauseCause = "sos" | "ai-failure";

/** Steps where raw content or AI output is on screen, so review "has begun" (AR-AI-11). */
const REVIEW_STEPS: readonly Step[] = ["summary", "workspace", "check-in", "severity"];

const mono = { fontFamily: "'IBM Plex Mono', monospace" } as const;
const pageTitle = { fontSize: 32, lineHeight: "40px", fontWeight: 600 } as const;
const secondaryText = { fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" } as const;

/** Where the AI-failure slider starts. It isn't a suggestion: the Auditor must set a rating themselves. */
const UNRATED_START = 50;

const COOLDOWN_WORDS: Record<string, string> = { S2: "5-minute", S3: "15-minute", S4: "30-minute" };

/** "S3 · High" — how the design writes a tier in running text. */
function tierText(score: number): string {
  const tier = scoreToTier(score);
  return `${tier} · ${getSeverityInfo(tier).label}`;
}

function isNetworkFailure(err: unknown): boolean {
  return !(err instanceof ApiError);
}

/**
 * Auditor case review: one route, stepping through the Figma click-through.
 *
 *   Content warning (16:19, or 25:212 when AI failed)
 *     → AI Analysis Summary (18:26; skipped when AI failed)
 *     → Review Workspace (20:35) ⇄ Wellbeing check-in (31:188)
 *     → Severity & comment (25:53; 42:405 when sending fails)
 *     → Submission Confirmation (25:280) → Cooldown (31:99) when earned
 *   Decline (25:137 → 25:353) and SOS (31:257 → Cooldown) branch off.
 *   AI/STT failing after review began (AR-AI-11) has no frame of its own: the
 *   25:212 annotation says it is treated identically to SOS, so it takes the
 *   SOS path with one line saying why the case paused.
 *
 * Every visit starts at the content warning, including when a saved draft
 * resumes later steps (AR-PV-08). A session time-out is handled in place with
 * a re-auth dialog (36:235), so nothing on screen is lost.
 */
export function AuditorCaseDetailPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const handleInitialSessionExpiry = useSessionExpiryHandler();

  const [step, setStep] = useState<Step>("gate");
  const [caseDetail, setCaseDetail] = useState<AuditorCaseDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [gateError, setGateError] = useState<string | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [isDeclining, setIsDeclining] = useState(false);

  const [viewer, setViewer] = useState<ViewerSettings>(PROTECTED_VIEWER_SETTINGS);
  const [resumeStep, setResumeStep] = useState<DraftStep | null>(null);

  const [auditorScore, setAuditorScore] = useState(0);
  const [ratingTouched, setRatingTouched] = useState(false);
  const [comment, setComment] = useState("");
  const [outcome, setOutcome] = useState<FinalOutcome | null>(null);
  const [submitError, setSubmitError] = useState<{ network: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<ResolveCaseResponse | null>(null);

  const [sosState, setSosState] = useState<"sending" | "sent" | "failed">("sending");
  const [pauseCause, setPauseCause] = useState<PauseCause>("sos");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);

  const tokenRef = useRef(token);
  const unsentExposureRef = useRef<ExposureSample>({ active_seconds: 0, replay_seconds: 0 });
  const retryAfterReauthRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  /** A 401 during a review opens the re-auth dialog instead of leaving the page. Returns true when handled. */
  const handleSessionError = useCallback((err: unknown): boolean => {
    if (err instanceof ApiError && err.status === 401) {
      setSessionExpired(true);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!caseId || !tokenRef.current) return;
    let cancelled = false;
    getAuditorCaseDetail(caseId, tokenRef.current)
      .then((detail) => {
        if (cancelled) return;
        setCaseDetail(detail);
        if (tokenRef.current) {
          // Pass token as query param so <video src> can stream without needing
          // an Authorization header (browsers don't send custom headers for video).
          const streamUrl = `${getCaseVideoStreamUrl(caseId)}?token=${encodeURIComponent(tokenRef.current)}`;
          if (!cancelled) setSignedVideoUrl(streamUrl);
        }
        // Task 102: an in-progress review resumes where it left off — but only
        // after the content warning again. Otherwise the rating starts at the
        // AI's effective score, since the Auditor adjusts FROM that suggestion.
        const draft = detail.status === "COMPLETE" ? null : loadDraftResolution(caseId);
        if (draft) {
          setAuditorScore(draft.auditorScore);
          setComment(draft.comment);
          setOutcome(draft.outcome);
          setRatingTouched(draft.ratingTouched ?? false);
          setResumeStep(draft.step);
        } else {
          setAuditorScore(detail.effective_severity_score ?? UNRATED_START);
        }
      })
      .catch((err: unknown) => {
        if (cancelled || handleInitialSessionExpiry(err)) return;
        setLoadError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, handleInitialSessionExpiry]);

  // Persist the in-progress review (Task 102). Only real review steps are saved.
  useEffect(() => {
    if (!caseDetail || caseDetail.status === "COMPLETE") return;
    if (step !== "summary" && step !== "workspace" && step !== "severity") return;
    saveDraftResolution(caseId, { auditorScore, comment, outcome, step, ratingTouched });
  }, [caseId, caseDetail, auditorScore, comment, outcome, step, ratingTouched]);

  // Demo scenario "expire my session": check the session straight away, so
  // the re-auth dialog appears without waiting for the next request.
  useEffect(() => {
    const probe = () => {
      if (!tokenRef.current) return;
      getMyWellbeing(tokenRef.current).catch(handleSessionError);
    };
    window.addEventListener(DEMO_SCENARIO_EVENT, probe);
    return () => window.removeEventListener(DEMO_SCENARIO_EVENT, probe);
  }, [handleSessionError]);

  const sendExposure = useCallback(
    (sample: ExposureSample) => {
      const pending = {
        active_seconds: unsentExposureRef.current.active_seconds + sample.active_seconds,
        replay_seconds: unsentExposureRef.current.replay_seconds + sample.replay_seconds,
      };
      unsentExposureRef.current = { active_seconds: 0, replay_seconds: 0 };
      if (!tokenRef.current) return;
      recordExposure(caseId, tokenRef.current, pending)
        .then(notifyWellbeingChanged)
        .catch((err: unknown) => {
          // Never drop measured exposure: keep it and send it with the next report.
          unsentExposureRef.current = {
            active_seconds: unsentExposureRef.current.active_seconds + pending.active_seconds,
            replay_seconds: unsentExposureRef.current.replay_seconds + pending.replay_seconds,
          };
          handleSessionError(err);
        });
    },
    [caseId, handleSessionError],
  );

  /** Notifies the Manager that the case is paused. Both causes follow the S4 protocol (AR-WB-12). */
  const sendSos = useCallback(
    function send(cause: PauseCause) {
      if (!tokenRef.current) {
        setSosState("failed");
        return;
      }
      setSosState("sending");
      const request =
        cause === "ai-failure"
          ? reportUnexpectedExposure(caseId, tokenRef.current, "AI_FAILURE_MID_REVIEW")
          : triggerSos(caseId, tokenRef.current);
      request
        .then(() => {
          clearDraftResolution(caseId);
          setSosState("sent");
          notifyWellbeingChanged();
        })
        .catch((err: unknown) => {
          if (handleSessionError(err)) {
            retryAfterReauthRef.current = () => send(cause);
            return;
          }
          setSosState("failed");
        });
    },
    [caseId, handleSessionError],
  );

  // AR-AI-11: AI/STT processing failing once review has begun is unexpected
  // exposure. The content is hidden at once and the SOS path takes over. In
  // mock mode the failure comes from the Demo scenarios menu; the api data
  // source raises it once the pipeline can report a mid-review failure.
  useEffect(() => {
    if (!REVIEW_STEPS.includes(step)) return;
    const onAnalysisFailed = () => {
      setPauseCause("ai-failure");
      setStep("sos");
      sendSos("ai-failure");
    };
    window.addEventListener(DEMO_AI_FAILURE_EVENT, onAnalysisFailed);
    return () => window.removeEventListener(DEMO_AI_FAILURE_EVENT, onAnalysisFailed);
  }, [step, sendSos]);

  const header = <StaffHeader role="auditor" />;
  const sessionModal = (
    <SessionExpiredModal
      open={sessionExpired}
      preservedWorkMessage="Your review — blur level, grayscale, and mute settings — will be exactly as you left it."
      onReauthenticated={() => {
        setSessionExpired(false);
        const unsent = unsentExposureRef.current;
        if (unsent.active_seconds + unsent.replay_seconds > 0) sendExposure({ active_seconds: 0, replay_seconds: 0 });
        const retry = retryAfterReauthRef.current;
        retryAfterReauthRef.current = null;
        retry?.();
      }}
    />
  );

  if (loadError || !caseDetail) {
    return (
      <>
        {header}
        <StaffPage>
          <CaseBreadcrumb caseId={caseId} />
          {loadError ? (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title="Couldn't load this case."
              subtitle={loadError}
              style={{ maxWidth: "100%" }}
            />
          ) : (
            <SkeletonText paragraph lineCount={6} />
          )}
        </StaffPage>
      </>
    );
  }

  const aiScore = caseDetail.effective_severity_score;
  const aiFailed = caseDetail.ai_failure === "vision";
  const aiAnalysisReady = aiFailed || (aiScore !== null && caseDetail.severity_tier !== null);
  const isAlreadyResolved = caseDetail.status === "COMPLETE" && step !== "confirmation";

  if (!aiAnalysisReady || isAlreadyResolved) {
    return (
      <>
        {header}
        <StaffPage>
          <CaseBreadcrumb caseId={caseDetail.case_id} />
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={isAlreadyResolved ? "This case has already been resolved." : "AI analysis is still in progress."}
            subtitle={
              isAlreadyResolved
                ? "There's nothing left to review here."
                : "This case can be reviewed once its severity, summary and timeline are ready."
            }
            style={{ maxWidth: "100%" }}
          />
          <div>
            <Button kind="tertiary" onClick={() => navigate("/auditor")}>
              Back to case queue
            </Button>
          </div>
        </StaffPage>
      </>
    );
  }

  const scoreWasChanged = aiScore !== null && auditorScore !== aiScore;
  const commentMissing = scoreWasChanged && comment.trim() === "";
  const ratingMissing = aiScore === null && !ratingTouched;
  const canSubmit = !commentMissing && !ratingMissing && outcome !== null;

  async function handleProceed() {
    if (!tokenRef.current) return;
    setIsProceeding(true);
    setGateError(null);
    try {
      await acknowledgeContentWarning(caseId, tokenRef.current);
      const firstStep: DraftStep = aiFailed ? "workspace" : "summary";
      setViewer(PROTECTED_VIEWER_SETTINGS);
      setStep(resumeStep && !(aiFailed && resumeStep === "summary") ? resumeStep : firstStep);
    } catch (err) {
      if (handleSessionError(err)) return;
      setGateError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setIsProceeding(false);
    }
  }

  async function handleDecline(reason: DeclineReason, otherText: string) {
    if (!tokenRef.current) return;
    setIsDeclining(true);
    setDeclineError(null);
    try {
      await declineCase(caseId, tokenRef.current, reason, otherText);
      clearDraftResolution(caseId);
      setDeclineOpen(false);
      setStep("declined");
    } catch (err) {
      if (handleSessionError(err)) return;
      setDeclineError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setIsDeclining(false);
    }
  }

  function handleSos() {
    // AR-WB-09: hide the content first, before waiting on the network.
    setPauseCause("sos");
    setStep("sos");
    sendSos("sos");
  }

  async function handleResolve() {
    if (!tokenRef.current || !outcome || !canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await resolveCase(
        caseId,
        tokenRef.current,
        outcome,
        // Only an actual override (or a rating the AI couldn't give) is sent as
        // the Auditor's score; confirming the AI's rating leaves it empty.
        scoreWasChanged || aiScore === null ? auditorScore : undefined,
        comment.trim() !== "" ? comment.trim() : undefined,
      );
      clearDraftResolution(caseId);
      setConfirmation(result);
      setStep("confirmation");
      notifyWellbeingChanged();
    } catch (err) {
      if (handleSessionError(err)) return;
      setSubmitError({
        network: isNetworkFailure(err),
        message: err instanceof ApiError ? err.message : "Couldn't submit — check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {header}
      {/* A named region, because this page renders a different <main> per
          step: Carbon's modal focus sentinels otherwise sit outside every
          landmark (axe "region", found in the Task 99 sweep). */}
      <section aria-label="Session">{sessionModal}</section>

      {step === "gate" && (
        <StaffPage>
          <CaseBreadcrumb caseId={caseDetail.case_id} />
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
          {gateError && (
            <div>
              <Button kind="tertiary" onClick={() => navigate("/auditor")}>
                Back to case queue
              </Button>
            </div>
          )}
          <ContentWarningModal
            open={!declineOpen && !gateError && !sessionExpired}
            caseDetail={caseDetail}
            isProceeding={isProceeding}
            onProceed={handleProceed}
            onDecline={() => {
              setDeclineError(null);
              setDeclineOpen(true);
            }}
            onClose={() => navigate("/auditor")}
          />
          <DeclineReasonModal
            open={declineOpen && !sessionExpired}
            isSubmitting={isDeclining}
            error={declineError}
            onSubmit={handleDecline}
            onCancel={() => setDeclineOpen(false)}
          />
        </StaffPage>
      )}

      {step === "summary" && (
        <StaffPage>
          <CaseBreadcrumb caseId={caseDetail.case_id} />
          <h1 style={pageTitle}>AI Analysis Summary</h1>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SeverityTag tier={caseDetail.severity_tier!} />
              <span style={{ ...mono, fontSize: 14, lineHeight: "20px" }}>CVI {aiScore} / 100</span>
              <span style={secondaryText}>AI&apos;s own pre-screen figure — may be adjusted after your review</span>
            </div>
            <p style={secondaryText}>
              This is the effective score — reflects the weapon-detection floor rule where it applies. The model&apos;s
              original, pre-floor score is preserved separately in the case&apos;s audit log, never overwritten.
            </p>
          </div>

          <section
            aria-labelledby="narrative-title"
            className="flex flex-col gap-2 px-5 py-4"
            style={{ backgroundColor: "var(--cds-layer-01)" }}
          >
            <h2 id="narrative-title" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600 }}>
              Narrative summary
            </h2>
            <p style={secondaryText}>
              {caseDetail.narrative_summary ?? "No narrative summary was returned for this case."}
            </p>
          </section>

          <section aria-labelledby="timeline-title" className="flex flex-col gap-2">
            <h2 id="timeline-title" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600 }}>
              Incident timeline
            </h2>
            {caseDetail.incident_timeline && caseDetail.incident_timeline.length > 0 ? (
              <IncidentTimeline
                entries={caseDetail.incident_timeline}
                durationSeconds={caseDetail.video_duration_seconds}
              />
            ) : (
              <p style={secondaryText}>No incidents were flagged on the timeline.</p>
            )}
          </section>

          <FlaggedEntities entities={caseDetail.flagged_entities ?? []} />
          <TranscriptAndAudio
            transcript={caseDetail.transcript}
            audioIntensity={caseDetail.audio_intensity}
            durationSeconds={caseDetail.video_duration_seconds}
          />

          <div>
            <Button onClick={() => setStep("workspace")}>Continue to review</Button>
          </div>
        </StaffPage>
      )}

      {step === "workspace" && (
        <StaffPage>
          <CaseBreadcrumb caseId={caseDetail.case_id} />
          <h1 className="cds--visually-hidden">Review Workspace</h1>
          <ReviewWorkspace
            caseDetail={caseDetail}
            settings={viewer}
            onSettingsChange={setViewer}
            pausedReason={sessionExpired ? "session" : null}
            onExposure={sendExposure}
            onContinue={() => setStep("severity")}
            onBack={aiFailed ? undefined : () => setStep("summary")}
            onTalkToManager={() => setStep("check-in")}
            onSos={handleSos}
            videoUrl={signedVideoUrl}
          />
        </StaffPage>
      )}

      {step === "check-in" && (
        <StaffPage>
          <CaseBreadcrumb caseId={caseDetail.case_id} />
          <h1 style={{ fontSize: 28, lineHeight: "36px", fontWeight: 600 }}>Wellbeing check-in</h1>
          <p style={secondaryText}>
            Optional and private to you and your manager. This isn&apos;t an SOS and doesn&apos;t pause your case.
          </p>
          <WellbeingCheckIn caseId={caseDetail.case_id} onSessionExpired={handleSessionError} />
          <div>
            <Button kind="tertiary" onClick={() => setStep("workspace")}>
              ← Return to Review Workspace
            </Button>
          </div>
        </StaffPage>
      )}

      {step === "severity" && (
        <StaffPage>
          <CaseBreadcrumb caseId={caseDetail.case_id} />
          <h1 style={pageTitle}>Severity &amp; comment</h1>

          {submitError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title={submitError.network ? "Error:" : "This case wasn't submitted."}
              subtitle={submitError.message}
              style={{ maxWidth: "100%" }}
            />
          )}

          <section
            aria-labelledby="cvi-rating-title"
            className="flex flex-col gap-3 p-5"
            style={{ backgroundColor: "var(--cds-layer-01)", maxWidth: 600 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="cvi-rating-title" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600 }}>
                CVI rating
              </h2>
              <span style={{ ...mono, fontSize: 12, color: "var(--cds-text-secondary)" }}>
                {aiScore === null ? "No AI suggestion" : `AI-suggested: ${aiScore}`}
              </span>
            </div>
            <p style={secondaryText}>
              {aiScore === null
                ? "AI analysis failed for this case, so there is no suggested score. Set the rating from your own review."
                : "AI-suggested value is the effective score (floor-adjusted if a detected weapon applied) — see AI Analysis Summary for the model's original pre-floor score."}
            </p>
            <CviRatingSlider
              initialValue={auditorScore}
              onChange={(score) => {
                setAuditorScore(score);
                setRatingTouched(true);
              }}
            />
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              {ratingMissing ? (
                <span style={secondaryText}>Your rating: not set yet</span>
              ) : (
                <>
                  <span style={{ ...mono, fontSize: 14, lineHeight: "20px" }}>Your rating: {auditorScore} / 100</span>
                  <SeverityTag tier={scoreToTier(auditorScore)} />
                  {scoreWasChanged && <span style={secondaryText}>(AI originally scored {tierText(aiScore)})</span>}
                </>
              )}
            </div>
          </section>

          <div style={{ maxWidth: 600 }}>
            <TextArea
              id="auditor-comment"
              labelText={
                scoreWasChanged ? (
                  <>
                    Comment <span style={{ color: "var(--cds-text-error)", fontWeight: 600 }}>*</span> required — you
                    changed the AI&apos;s rating
                  </>
                ) : (
                  "Comment (optional)"
                )
              }
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <section
            aria-labelledby="outcome-title"
            className="flex flex-col gap-2.5 px-5 py-4"
            style={{ backgroundColor: "var(--cds-layer-01)", maxWidth: 600 }}
          >
            <p className="flex items-center gap-1.5">
              <span id="outcome-title" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600 }}>
                Final case outcome
              </span>
              <span style={{ fontSize: 12, color: "var(--cds-text-helper)" }}>required for standard cases</span>
            </p>
            <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
              This determines what the reporting user sees when their case reaches Complete. Only applies if this case
              has no SOS or Decline flag — otherwise your manager decides the outcome.
            </p>
            {/* No option is pre-selected: a default would nudge the Auditor
                towards one outcome, so the decision has to be explicit. */}
            <RadioButtonGroup
              name="final-outcome"
              legendText={<span className="cds--visually-hidden">Final case outcome</span>}
              orientation="vertical"
              valueSelected={outcome ?? undefined}
              onChange={(value) => setOutcome(value as FinalOutcome)}
            >
              {OUTCOME_OPTIONS.map((option) => (
                <RadioButton
                  key={option.value}
                  id={`outcome-${option.value}`}
                  labelText={option.label}
                  value={option.value}
                />
              ))}
            </RadioButtonGroup>
          </section>

          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <div>
                <Button disabled={!canSubmit || isSubmitting} onClick={handleResolve}>
                  {isSubmitting ? "Submitting…" : submitError?.network ? "Retry submit" : "Continue to submit"}
                </Button>
              </div>
              {/* A disabled button can't explain itself, so say what's missing. */}
              {!canSubmit && (
                <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  {ratingMissing
                    ? "Set your CVI rating to continue."
                    : commentMissing
                      ? "Add a comment explaining why you changed the AI's rating to continue."
                      : "Choose a final case outcome to continue."}
                </p>
              )}
            </div>
            <Button kind="tertiary" onClick={() => setStep("workspace")}>
              ← Back to Review Workspace
            </Button>
          </div>
        </StaffPage>
      )}

      {step === "confirmation" && confirmation && (
        <StaffPage maxWidth={560}>
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title="Submitted:"
            subtitle="This case has been marked Complete."
            style={{ maxWidth: "100%" }}
          />
          <h1 style={{ ...mono, fontSize: 16, lineHeight: "22px", fontWeight: 400 }}>Case {confirmation.case_id}</h1>

          <section
            aria-labelledby="recorded-title"
            className="flex flex-col gap-2 px-5 py-4"
            style={{ backgroundColor: "var(--cds-layer-01)", fontSize: 14, color: "var(--cds-text-secondary)" }}
          >
            <h2 id="recorded-title" style={{ fontSize: 14, fontWeight: 600, color: "var(--cds-text-primary)" }}>
              What was recorded
            </h2>
            <p>
              {aiScore === null
                ? "AI's original rating: unavailable (AI analysis failed)"
                : `AI's original rating: ${tierText(aiScore)} (CVI ${aiScore}/100)`}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              Your final rating: {auditorScore} / 100 <SeverityTag tier={scoreToTier(auditorScore)} />
            </p>
            <p>Comment attached: {comment.trim() !== "" ? "yes" : "no"}</p>
            <p>Final case outcome selected: {mapOutcomeToDisplay(confirmation.final_outcome)?.title ?? "Recorded"}</p>
          </section>

          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-primary)" }}>
            Your selected outcome determines what the reporting user sees when this case reaches Complete — it
            progresses automatically, no further Manager approval needed for a standard case.
          </p>

          {confirmation.cooldown && (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              title="A cooldown starts now."
              subtitle={`Because of this case's severity, a ${COOLDOWN_WORDS[confirmation.cooldown.trigger] ?? "mandatory"} cooldown applies before your next case.`}
              style={{ maxWidth: "100%" }}
            />
          )}

          <Button
            onClick={() => navigate(confirmation.cooldown ? "/auditor/cooldown" : "/auditor")}
            className="w-full"
            style={{ maxWidth: "100%" }}
          >
            Continue
          </Button>
        </StaffPage>
      )}

      {step === "declined" && (
        <StaffPage maxWidth={560}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Case declined:"
            subtitle="Your manager will review it directly."
            style={{ maxWidth: "100%" }}
          />
          <h1 className="cds--visually-hidden">Case declined</h1>
          <p style={secondaryText}>
            No case content, thumbnail, or severity detail is shown here — declining is meant to reduce exposure, not
            extend it.
          </p>
          <Button onClick={() => navigate("/auditor")} className="w-full" style={{ maxWidth: "100%" }}>
            Return to dashboard
          </Button>
        </StaffPage>
      )}

      {step === "sos" && (
        <StaffPage>
          <CaseBreadcrumb caseId={caseDetail.case_id} />
          <div
            className="flex items-center justify-center"
            style={{ aspectRatio: "16 / 9", maxWidth: 760, backgroundColor: "var(--cds-layer-accent-01)" }}
          >
            <p style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600, color: "var(--cds-text-secondary)" }}>
              Case paused — content hidden
            </p>
          </div>
          <section
            aria-live="polite"
            className="flex flex-col gap-3 px-6 py-5"
            style={{ maxWidth: 760, backgroundColor: "var(--cds-layer-01)" }}
          >
            {pauseCause === "ai-failure" && (
              <p style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600 }}>
                AI analysis for this case failed during your review.
              </p>
            )}
            {sosState === "failed" ? (
              <>
                <h1 style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
                  This case is paused, but we couldn&apos;t notify your manager.
                </h1>
                <p style={secondaryText}>The content stays hidden. Try again, or contact your manager directly.</p>
                <div>
                  <Button kind="secondary" onClick={() => sendSos(pauseCause)}>
                    Try again
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
                  {sosState === "sending"
                    ? "Pausing this case and notifying your manager…"
                    : "We’ve paused this case and notified your manager."}
                </h1>
                <p style={secondaryText}>
                  They&apos;ll follow up with you directly. Resuming raw-content review — for this case or any other —
                  will require you to go through the content-warning gate again with a new, deliberate Proceed action.
                </p>
                <p style={secondaryText}>
                  Because this was unexpected exposure, a mandatory cooldown now applies before you can take on new
                  cases.
                </p>
                <div>
                  <Button kind="tertiary" disabled={sosState !== "sent"} onClick={() => navigate("/auditor/cooldown")}>
                    Continue
                  </Button>
                </div>
              </>
            )}
          </section>
        </StaffPage>
      )}
    </>
  );
}

interface CviRatingSliderProps {
  /** The rating when the severity step opens (the AI's score, or a restored draft). */
  initialValue: number;
  onChange: (score: number) => void;
}

/**
 * Carbon's Slider (thumb + number input) for the Auditor's 0–100 rating.
 *
 * It's given its starting value once, not on every render. Carbon's Slider
 * keeps its own internal value and re-syncs to the `value` prop whenever
 * that prop changes. Feeding the parent's state back in on each change
 * created a feedback loop: typing "90" reported 9 then 90, and the late
 * prop update for 9 reset the slider, leaving the thumb at 9 while the page
 * said 90 (found in live UAT). Changes now flow one way, slider → page.
 */
function CviRatingSlider({ initialValue, onChange }: CviRatingSliderProps) {
  const [startValue] = useState(initialValue);
  return (
    <Slider
      id="cvi-rating"
      labelText="Your CVI rating (0–100)"
      min={0}
      max={100}
      step={1}
      value={startValue}
      onChange={({ value }) => {
        // While the number field is being edited Carbon can briefly report ""
        // (despite its `number` type) or an out-of-range number; only a
        // complete, valid rating updates the page.
        const raw: unknown = value;
        const score = typeof raw === "number" ? raw : Number.NaN;
        if (Number.isFinite(score) && score >= 0 && score <= 100) {
          onChange(Math.round(score));
        }
      }}
    />
  );
}

function CaseBreadcrumb({ caseId }: { caseId: string }) {
  return (
    <Breadcrumb noTrailingSlash>
      <BreadcrumbItem>
        <RouterLink to="/auditor">Dashboard</RouterLink>
      </BreadcrumbItem>
      <BreadcrumbItem isCurrentPage>Case {caseId}</BreadcrumbItem>
    </Breadcrumb>
  );
}
