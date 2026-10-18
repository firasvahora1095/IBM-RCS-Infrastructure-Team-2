import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, InlineNotification, RadioButton, RadioButtonGroup, TextArea } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadState, ManagerBreadcrumb, Panel } from "../../components/manager/ManagerBits";
import { getSosAlert, logSosFollowUp } from "../../services";
import { ApiError, type SosFollowUpOutcome } from "../../services/types";
import { SOS_FOLLOW_UP_OPTIONS } from "../../design-tokens/managerLabels";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";
import { notifySosChanged } from "../../hooks/useSosSummary";

/**
 * SOS Acknowledge & Follow-up (Manager Figma 103:228): follow-up notes and a
 * structured outcome, logged against the alert (MR-SOS-04, MR-SOS-06).
 * Logging it also records the check-in an SOS cooldown requires (AR-WB-12).
 *
 * A session time-out re-authenticates in place, keeping the notes and the
 * selected outcome (Manager Figma 1:1231).
 */
export function ManagerSosFollowUpPage() {
  const { alertId = "" } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data, error } = useStaffQuery((t) => getSosAlert(alertId, t), alertId);
  const { handleSessionError, sessionModal } = useInPlaceSessionExpiry(
    "Your follow-up notes and outcome selection will be exactly as you left them.",
  );
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState<SosFollowUpOutcome | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  const canLog = notes.trim() !== "" && outcome !== null && !isLogging;

  async function log() {
    if (!token || !outcome || !canLog) return;
    setIsLogging(true);
    setSubmitError(null);
    try {
      await logSosFollowUp(alertId, token, notes, outcome);
      notifySosChanged();
      setLogged(true);
    } catch (err) {
      if (handleSessionError(err)) return;
      setSubmitError(
        err instanceof ApiError ? err.message : "Couldn't log the outcome — check your connection and try again.",
      );
    } finally {
      setIsLogging(false);
    }
  }

  const name = data?.auditor_name ?? "Auditor";

  return (
    <ManagerLayout showNav={false} showSosBanner={false}>
      {sessionModal}
      <ManagerBreadcrumb
        trail={[
          { label: "Overview", to: "/manager" },
          { label: "SOS inbox", to: "/manager/sos" },
          { label: name, to: `/manager/sos/${encodeURIComponent(alertId)}` },
          { label: "Follow-up" },
        ]}
      />
      <PageHeader title={`Log follow-up — ${name}`} />
      <LoadState error={error} loading={!data && !error} what="this SOS alert" />
      {data && logged && (
        <Panel maxWidth={560}>
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title="Outcome logged:"
            subtitle={`${SOS_FOLLOW_UP_OPTIONS.find((o) => o.value === outcome)?.label}. This SOS alert is now resolved.`}
            style={{ maxWidth: "100%" }}
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/manager/sos")}>Return to SOS inbox</Button>
            {data.auditor_id && (
              <Button kind="tertiary" onClick={() => navigate(`/manager/auditors/${encodeURIComponent(data.auditor_id)}`)}>
                View {name}&apos;s record
              </Button>
            )}
          </div>
        </Panel>
      )}
      {data && !logged && (
        <Panel maxWidth={560}>
          {(data.severity_tier === "S4" || data.trigger !== "AUDITOR_SOS") && (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title={data.severity_tier === "S4" ? "Critical case: this is the mandatory check-in." : "This is the check-in."}
              subtitle="Say how they are and what support you offered, not only that you spoke."
              style={{ maxWidth: "100%" }}
            />
          )}
          <TextArea
            id="follow-up-notes"
            labelText="Follow-up notes"
            placeholder="What did you do, and how is the Auditor?"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <RadioButtonGroup
            name="follow-up-outcome"
            legendText="Outcome"
            orientation="vertical"
            valueSelected={outcome ?? undefined}
            onChange={(value) => setOutcome(value as SosFollowUpOutcome)}
          >
            {SOS_FOLLOW_UP_OPTIONS.map((option) => (
              <RadioButton
                key={option.value}
                id={`follow-up-${option.value}`}
                labelText={option.label}
                value={option.value}
              />
            ))}
          </RadioButtonGroup>
          <p className="rcs-helper" aria-live="polite">
            {outcome === "NO_FURTHER_ACTION" &&
              "You spoke with the Auditor and they are well enough to keep working. This resolves the alert."}
            {outcome === "REASSIGNED_REMAINING_CASES" &&
              "The Auditor keeps working, but you are handing their remaining cases to other Auditors. Choose who takes them in the Reassignment queue."}
            {outcome === "AUDITOR_STOPPED_SHIFT" &&
              "The Auditor has stopped for the day. Their open cases will need new Auditors."}
            {!outcome && "Choose what happened after you spoke with the Auditor. Your notes and this choice are kept in the audit trail."}
          </p>
          {submitError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title="Error:"
              subtitle={submitError}
              style={{ maxWidth: "100%" }}
            />
          )}
          <div className="flex flex-col items-start gap-3">
            <Button disabled={!canLog} onClick={log}>
              {isLogging ? "Logging…" : "Log outcome"}
            </Button>
            {!canLog && !isLogging && (
              <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                Add follow-up notes and choose an outcome to log it.
              </p>
            )}
            <Button kind="tertiary" onClick={() => navigate(`/manager/sos/${encodeURIComponent(alertId)}`)}>
              ← Back to SOS alert detail
            </Button>
          </div>
        </Panel>
      )}
    </ManagerLayout>
  );
}
