import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, InlineNotification } from "@carbon/react";
import { PageHeader } from "../../components/ui/PageHeader";
import { RawContentAccess } from "../../components/manager/RawContentAccess";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { Figure, LoadState, ManagerBreadcrumb, Panel } from "../../components/manager/ManagerBits";
import { acknowledgeSosAlert, getSosAlert } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { getSeverityInfo } from "../../design-tokens/severity";
import { SOS_STATUS_LABEL, SOS_TRIGGER_LABEL } from "../../design-tokens/managerLabels";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";
import { notifySosChanged } from "../../hooks/useSosSummary";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

/**
 * SOS Alert Detail (Manager Figma 103:197): the affected Auditor's exposure
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
        trail={[{ label: "Overview", to: "/manager" }, { label: "SOS Inbox", to: "/manager/sos" }, { label: data?.auditor_name ?? "SOS alert" }]}
      />
      <LoadState error={error} loading={!data && !error} what="this SOS alert" />
      {data && (
        <>
          <PageHeader
            title={data.auditor_name}
            subtitle="Take a moment first. The summary below is text only, and no footage is shown."
          />
          <InlineNotification
            kind={data.status === "RESOLVED" ? "info" : "error"}
            lowContrast={data.status !== "UNACKNOWLEDGED"}
            hideCloseButton
            title={`SOS alert — ${data.auditor_name} — ${formatRelativeTime(data.triggered_at, now)}`}
            subtitle={(SOS_STATUS_LABEL[data.status] ?? "Open").toLowerCase()}
            style={{ maxWidth: "100%" }}
          />

          {/* The order to work in, so the Manager is guided rather than shown one button. */}
          <Panel title="What to do">
            <ol className="flex flex-col gap-2" style={{ paddingInlineStart: "1.25rem", listStyle: "decimal", fontSize: 14 }}>
              <li>Read the summary below. No footage is shown.</li>
              <li>Acknowledge the alert, then speak with {data.auditor_name}.</li>
              <li>Log what you did and how they are. That resolves the alert.</li>
            </ol>
            {(data.severity_tier === "S4" ||
              data.severity_tier === "S3" ||
              data.exposure_minutes_today >= 0.8 * data.exposure_limit_minutes) && (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title={data.severity_tier === "S4" ? "Critical case." : "Higher risk."}
                subtitle={`${data.severity_tier === "S4" ? "A check-in is mandatory. " : ""}Consider whether ${data.auditor_name} should stop their shift or have their remaining cases moved. Check for support requests on their record.`}
                style={{ maxWidth: "100%" }}
              />
            )}
            <div>
              <Button kind="tertiary" size="sm" onClick={() => navigate(`/manager/auditors/${encodeURIComponent(data.auditor_id)}`)}>
                View {data.auditor_name}&apos;s record and support requests
              </Button>
            </div>
          </Panel>

          <Panel>
            <dl className="flex flex-wrap gap-12">
              <Figure
                label="Today's exposure"
                value={`${Math.round(data.exposure_minutes_today)} / ${data.exposure_limit_minutes} min`}
              />
              <Figure label="Triggering case" value={data.case_id} />
              <Figure label="Raised by" value={SOS_TRIGGER_LABEL[data.trigger]} />
              <Figure
                label="AI severity"
                value={
                  data.severity_tier
                    ? `${data.severity_tier} · ${getSeverityInfo(data.severity_tier).label} — CVI ${data.effective_severity_score}`
                    : "Unknown"
                }
              />
            </dl>
            <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle-01)", margin: 0 }} />
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>AI narrative summary (text only — no raw footage shown)</h2>
            <p style={{ fontSize: 14, lineHeight: "20px", whiteSpace: "pre-line" }}>
              {data.narrative_summary ?? "No narrative summary is available for this case."}
            </p>
            {data.follow_up_notes && (
              <>
                <h2 style={{ fontSize: 14, fontWeight: 600 }}>Follow-up logged</h2>
                <p style={{ fontSize: 14, lineHeight: "20px" }}>{data.follow_up_notes}</p>
              </>
            )}
            <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
              This screen never auto-plays or thumbnails the triggering case&apos;s video, consistent with responding to
              the SOS without requiring raw source-video viewing by default. If genuinely needed, raw-content access is
              a separate, deliberate path.
            </p>
          </Panel>

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

          <div>
            {data.status === "UNACKNOWLEDGED" && (
              <Button disabled={isAcknowledging} onClick={acknowledge}>
                {isAcknowledging ? "Acknowledging…" : "Acknowledge"}
              </Button>
            )}
            {data.status === "IN_PROGRESS" && <Button onClick={() => navigate(followUpUrl)}>Log follow-up</Button>}
          </div>

          <RawContentAccess caseId={data.case_id} returnTo={`/manager/sos/${alertId}`} />
        </>
      )}
    </ManagerLayout>
  );
}
