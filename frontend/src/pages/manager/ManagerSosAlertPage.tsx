import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Accordion, AccordionItem, Button, InlineNotification } from "@carbon/react";
import { PageHeader } from "../../components/ui/PageHeader";
import { RawContentAccess } from "../../components/manager/RawContentAccess";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { Figure, LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { acknowledgeSosAlert, getSosAlert } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { Section } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { SOS_TONE } from "../../design-tokens/statusTones";
import { SOS_STATUS_LABEL, SOS_TRIGGER_LABEL } from "../../design-tokens/managerLabels";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";
import { notifySosChanged } from "../../hooks/useSosSummary";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

function nextStepText(status: string, name: string): string {
  if (status === "UNACKNOWLEDGED") return `Acknowledge this alert to show that you are following up, then speak with ${name}.`;
  if (status === "IN_PROGRESS") return `After speaking with ${name}, log what you did and how they are. That resolves the alert.`;
  return "This alert is resolved.";
}

/**
 * SOS alert Detail (Manager Figma 103:197): the affected Auditor's exposure
 * and the triggering case's AI context, as text only — no footage, no
 * thumbnail (MR-SOS-05). Acknowledging records that follow-up has begun
 * (MR-SOS-04). Raw content stays behind a separate, deliberate,
 * low-prominence path (MR-CR-08).
 */
export function ManagerSosAlertPage() {
  const { alertId = "" } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data, error } = useStaffQuery((t) => getSosAlert(alertId, t), alertId);
  const { handleSessionError, sessionModal } = useInPlaceSessionExpiry("You'll be returned to this SOS alert.");
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  async function acknowledge() {
    if (!token) return;
    setIsAcknowledging(true);
    setActionError(null);
    try {
      await acknowledgeSosAlert(alertId, token);
      notifySosChanged();
      navigate(`/manager/sos/${encodeURIComponent(alertId)}/follow-up`);
    } catch (err) {
      if (!handleSessionError(err)) setActionError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setIsAcknowledging(false);
    }
  }

  const followUpUrl = `/manager/sos/${encodeURIComponent(alertId)}/follow-up`;

  return (
    <ManagerLayout showNav={false} showSosBanner={false}>
      {sessionModal}
      <ManagerBreadcrumb
        trail={[{ label: "Overview", to: "/manager" }, { label: "SOS inbox", to: "/manager/sos" }, { label: data?.auditor_name ?? "SOS alert" }]}
      />
      <LoadState error={error} loading={!data && !error} what="this SOS alert" />
      {data && (
        <>
          {/* Who, when and where it stands, before anything else. */}
          <PageHeader
            title={data.auditor_name}
            subtitle={`SOS raised ${formatRelativeTime(data.triggered_at, now)}`}
            meta={<StatusTag tone={SOS_TONE[data.status]}>{SOS_STATUS_LABEL[data.status] ?? "Open"}</StatusTag>}
          />

          {actionError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title="Error:"
              subtitle={actionError}
              style={{ maxWidth: "100%" }}
            />
          )}

          {/* The one next step, with its one button. */}
          <Section id="next-step" title="Next step" description={nextStepText(data.status, data.auditor_name)}>
            {/* The step and the way to more context side by side: the dark button acts, the outlined one only looks. */}
            <div className="flex flex-wrap items-center gap-3">
              {data.status === "UNACKNOWLEDGED" && (
                <Button disabled={isAcknowledging} onClick={acknowledge}>
                  {isAcknowledging ? "Acknowledging…" : "Acknowledge"}
                </Button>
              )}
              {data.status === "IN_PROGRESS" && <Button onClick={() => navigate(followUpUrl)}>Log follow-up</Button>}
              <Button kind="tertiary" onClick={() => navigate(`/manager/auditors/${encodeURIComponent(data.auditor_id)}`)}>
                Auditor record
              </Button>
            </div>
            {data.status === "RESOLVED" && data.follow_up_notes && (
              <p className="rcs-body">
                <strong>Follow-up logged:</strong> {data.follow_up_notes}
              </p>
            )}
            {data.status !== "RESOLVED" &&
              (data.severity_tier === "S4" ||
                data.severity_tier === "S3" ||
                data.exposure_minutes_today >= 0.8 * data.exposure_limit_minutes) && (
                <InlineNotification
                  kind="warning"
                  lowContrast
                  hideCloseButton
                  title={data.severity_tier === "S4" ? "Critical case." : "Higher risk."}
                  subtitle={`${data.severity_tier === "S4" ? "A check-in is mandatory. " : ""}Consider whether ${data.auditor_name} should stop their shift or have their remaining cases moved.`}
                  style={{ maxWidth: "100%" }}
                />
              )}
          </Section>

          <Section id="at-a-glance" title="At a glance">
            <dl className="rcs-glance">
              <Figure
                label="Today's exposure"
                value={`${Math.round(data.exposure_minutes_today)} / ${data.exposure_limit_minutes} min`}
              />
              <Figure label="Triggering case" value={data.case_id} />
              <Figure label="Raised by" value={SOS_TRIGGER_LABEL[data.trigger]} />
              <Figure
                label="AI severity"
                value={
                  data.severity_tier ? (
                    <span className="rcs-align-row">
                      <SeverityTag tier={data.severity_tier} size="sm" />
                      <span className="rcs-helper" title="CVI: the AI's severity score, from 0 to 100.">
                        CVI {data.effective_severity_score}
                      </span>
                    </span>
                  ) : (
                    "Unknown"
                  )
                }
              />
            </dl>
          </Section>

          {/* Closed until asked for: the text can describe distressing content, so it is not put in front of anyone by default. */}
          <Accordion>
            <AccordionItem title="Summary of the case (text only, no footage)">
              <p className="rcs-readable">{data.narrative_summary ?? "No summary is available for this case."}</p>
            </AccordionItem>
          </Accordion>

          <RawContentAccess caseId={data.case_id} returnTo={`/manager/sos/${alertId}`} />
        </>
      )}
    </ManagerLayout>
  );
}
