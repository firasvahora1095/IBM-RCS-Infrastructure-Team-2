import { useEffect, useState } from "react";
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
import { getAuditorCaseDetail, resolveCase } from "../../api/client";
import { ApiError } from "../../api/types";
import type { AuditorCaseDetail, FinalOutcome, ResolveCaseResponse } from "../../api/types";
import { getSeverityInfo, scoreToTier } from "../../design-tokens/severity";
import { OUTCOME_OPTIONS, mapOutcomeToDisplay } from "../../design-tokens/outcomeLabels";
import { useAuth } from "../../hooks/useAuth";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";

export type Step = "summary" | "severity" | "confirmation";

const mono = { fontFamily: "'IBM Plex Mono', monospace" } as const;
const pageTitle = { fontSize: 32, lineHeight: "40px", fontWeight: 600 } as const;
const secondaryText = { fontSize: 13, lineHeight: "18px", color: "#525252" } as const;

/** "S3 · High" — how the design writes a tier in running text. */
function tierText(score: number): string {
  const tier = scoreToTier(score);
  return `${tier} · ${getSeverityInfo(tier).label}`;
}

/**
 * Auditor case detail: one route, three sequential steps, matching how the
 * Figma frames chain together — AI Analysis Summary (18:26) → Severity &
 * comment (25:53) → Submission Confirmation (25:280).
 *
 * Sprint 2 scope (docs/ux/sprint2-build-scope-handoff.md): AI output only.
 * The Figma summary's "Flagged entities" and "Transcript & audio intensity"
 * sections are omitted — they're Sprint 3, and GET /api/auditor/cases/{id}
 * returns neither.
 */
export function AuditorCaseDetailPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();

  const [step, setStep] = useState<Step>("summary");
  const [caseDetail, setCaseDetail] = useState<AuditorCaseDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [auditorScore, setAuditorScore] = useState(0);
  const [comment, setComment] = useState("");
  const [outcome, setOutcome] = useState<FinalOutcome | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<ResolveCaseResponse | null>(null);

  useEffect(() => {
    if (!caseId || !token) return;
    let cancelled = false;
    getAuditorCaseDetail(caseId, token)
      .then((detail) => {
        if (cancelled) return;
        setCaseDetail(detail);
        // The Auditor adjusts FROM the AI's suggestion, so the slider starts
        // at the effective score rather than at zero.
        if (detail.effective_severity_score !== null) {
          setAuditorScore(detail.effective_severity_score);
        }
      })
      .catch((err: unknown) => {
        if (cancelled || handleSessionExpiry(err)) return;
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load this case.");
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, token, handleSessionExpiry]);

  if (loadError || !caseDetail) {
    return (
      <>
        <StaffHeader role="auditor" />
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
  const aiAnalysisReady = aiScore !== null && caseDetail.severity_tier !== null;
  const isAlreadyResolved = caseDetail.status === "COMPLETE" && step !== "confirmation";

  if (!aiAnalysisReady || isAlreadyResolved) {
    return (
      <>
        <StaffHeader role="auditor" />
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

  const scoreWasChanged = auditorScore !== aiScore;
  const commentMissing = scoreWasChanged && comment.trim() === "";
  const canSubmit = !commentMissing && outcome !== null;

  async function handleResolve() {
    if (!token || !outcome || !canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await resolveCase(
        caseId,
        token,
        outcome,
        // Only an actual override is sent as the Auditor's score; confirming
        // the AI's rating leaves auditor_severity_score empty.
        scoreWasChanged ? auditorScore : undefined,
        comment.trim() !== "" ? comment.trim() : undefined
      );
      setConfirmation(result);
      setStep("confirmation");
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setSubmitError(err instanceof ApiError ? err.message : "Couldn't submit this case. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <StaffHeader role="auditor" />

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
              This is the effective score — reflects the weapon-detection floor rule (AR-WB-11) where it applies. The
              model&apos;s original, pre-floor score is preserved separately in the case&apos;s audit log, never
              overwritten.
            </p>
          </div>

          <section
            aria-labelledby="narrative-title"
            className="flex flex-col gap-2 px-5 py-4"
            style={{ backgroundColor: "#f4f4f4" }}
          >
            <h2 id="narrative-title" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600 }}>
              Narrative summary
            </h2>
            <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>
              {caseDetail.narrative_summary ?? "No narrative summary was returned for this case."}
            </p>
          </section>

          <section aria-labelledby="timeline-title" className="flex flex-col gap-2">
            <h2 id="timeline-title" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600 }}>
              Incident timeline
            </h2>
            {caseDetail.incident_timeline && caseDetail.incident_timeline.length > 0 ? (
              <IncidentTimeline entries={caseDetail.incident_timeline} />
            ) : (
              <p style={secondaryText}>No incidents were flagged on the timeline.</p>
            )}
          </section>

          <div>
            <Button onClick={() => setStep("severity")}>Continue to review</Button>
          </div>
        </StaffPage>
      )}

      {step === "severity" && (
        <StaffPage>
          <CaseBreadcrumb caseId={caseDetail.case_id} />
          <h1 style={pageTitle}>Severity &amp; comment</h1>

          <section
            aria-labelledby="cvi-rating-title"
            className="flex flex-col gap-3 p-5"
            style={{ backgroundColor: "#f4f4f4", maxWidth: 600 }}
          >
            <div className="flex items-center justify-between">
              <h2 id="cvi-rating-title" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600 }}>
                CVI rating
              </h2>
              <span style={{ ...mono, fontSize: 12, color: "#525252" }}>AI-suggested: {aiScore}</span>
            </div>
            <p style={secondaryText}>
              AI-suggested value is the effective score (floor-adjusted if a detected weapon applied) — see AI
              Analysis Summary for the model&apos;s original pre-floor score.
            </p>
            <Slider
              id="cvi-rating"
              labelText="Your CVI rating (0–100)"
              min={0}
              max={100}
              step={1}
              value={auditorScore}
              onChange={({ value }) => setAuditorScore(Math.round(value))}
            />
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              <span style={{ ...mono, fontSize: 14, lineHeight: "20px" }}>Your rating: {auditorScore} / 100</span>
              <SeverityTag tier={scoreToTier(auditorScore)} />
              {scoreWasChanged && <span style={secondaryText}>(AI originally scored {tierText(aiScore)})</span>}
            </div>
          </section>

          <div style={{ maxWidth: 600 }}>
            <TextArea
              id="auditor-comment"
              labelText={
                scoreWasChanged ? (
                  <>
                    Comment <span style={{ color: "#da1e28", fontWeight: 600 }}>*</span> required — you changed the
                    AI&apos;s rating
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
            style={{ backgroundColor: "#f4f4f4", maxWidth: 600 }}
          >
            <p className="flex items-center gap-1.5">
              <span id="outcome-title" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 600 }}>
                Final case outcome
              </span>
              <span style={{ fontSize: 12, color: "#6f6f6f" }}>required for standard cases</span>
            </p>
            <p style={{ fontSize: 12, lineHeight: "16px", color: "#525252" }}>
              This determines what the reporting user sees when their case reaches Complete. Only applies if this
              case has no SOS or Decline flag — otherwise your manager decides the outcome.
            </p>
            {/* No option is pre-selected: a default would nudge the Auditor
                towards one outcome, so the decision has to be explicit. */}
            <RadioButtonGroup
              name="final-outcome"
              // The visible heading above names this group; the legend repeats
              // it for screen readers without showing the label twice.
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

          {submitError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title="This case wasn't submitted."
              subtitle={submitError}
              style={{ maxWidth: 600 }}
            />
          )}

          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <div>
                <Button disabled={!canSubmit || isSubmitting} onClick={handleResolve}>
                  {isSubmitting ? "Submitting…" : "Continue to submit"}
                </Button>
              </div>
              {/* A disabled button can't explain itself, so say what's missing. */}
              {!canSubmit && (
                <p style={{ fontSize: 12, color: "#525252" }}>
                  {commentMissing
                    ? "Add a comment explaining why you changed the AI's rating to continue."
                    : "Choose a final case outcome to continue."}
                </p>
              )}
            </div>
            <Button kind="tertiary" onClick={() => setStep("summary")}>
              ← Back to AI Analysis Summary
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
            style={{ backgroundColor: "#f4f4f4", fontSize: 13, color: "#525252" }}
          >
            <h2 id="recorded-title" style={{ fontSize: 14, fontWeight: 600, color: "#161616" }}>
              What was recorded
            </h2>
            <p>
              AI&apos;s original rating: {tierText(aiScore)} (CVI {aiScore}/100)
            </p>
            <p className="flex flex-wrap items-center gap-2">
              Your final rating: {auditorScore} / 100 <SeverityTag tier={scoreToTier(auditorScore)} />
            </p>
            <p>Comment attached: {comment.trim() !== "" ? "yes" : "no"}</p>
            <p>
              Final case outcome selected:{" "}
              {mapOutcomeToDisplay(confirmation.final_outcome)?.title ?? "Recorded"}
            </p>
          </section>

          <p style={{ fontSize: 14, lineHeight: "20px", color: "#161616" }}>
            Your selected outcome determines what the reporting user sees when this case reaches Complete — it
            progresses automatically, no further Manager approval needed for a standard case. (Exposure-based
            cooldowns after a Critical rating ship in Sprint 3 — this build does not yet trigger one.)
          </p>

          <Button onClick={() => navigate("/auditor")} className="w-full" style={{ maxWidth: "100%" }}>
            Continue
          </Button>
        </StaffPage>
      )}
    </>
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
