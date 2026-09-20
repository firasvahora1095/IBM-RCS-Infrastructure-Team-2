import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, InlineNotification, NumberInput, Tag } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { Figure, LoadState, ManagerBreadcrumb, Panel } from "../../components/manager/ManagerBits";
import { formatClockTime, mono, pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { approveBreakRequest, getAuditorDetail, setExposureLimit } from "../../services";
import { ApiError } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";
import { cooldownSummary } from "../../design-tokens/managerLabels";

const DEFAULT_LIMIT_MINUTES = 120;

/**
 * Auditor Detail / Exposure Limit Adjustment (Manager Figma 86:94), with its
 * Exposure limit saved (356:364), Break request approved (357:314) and Save
 * fails (197:309) states.
 *
 * - The limit can be set per Auditor (MR-OV-04); a failed save keeps the
 *   entered value and offers a retry.
 * - Wellbeing check-ins and break requests appear here, on the Auditor's own
 *   record, distinct from the SOS surface (MR-SOS-07).
 * - "Pattern flagged — private" is visible to the Manager only.
 */
export function ManagerAuditorDetailPage() {
  const { auditorId = "" } = useParams<{ auditorId: string }>();
  const { token } = useAuth();
  const { data, error, reload } = useStaffQuery((t) => getAuditorDetail(auditorId, t), auditorId);
  const { handleSessionError, sessionModal } = useInPlaceSessionExpiry(
    "Your entered exposure limit will be exactly as you left it.",
  );

  const [limitDraft, setLimitDraft] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  const limit = limitDraft ?? data?.exposure_limit_minutes ?? DEFAULT_LIMIT_MINUTES;

  async function saveLimit() {
    if (!token) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      await setExposureLimit(auditorId, token, limit);
      setSaveState("saved");
      setLimitDraft(null);
      reload();
    } catch (err) {
      if (handleSessionError(err)) {
        setSaveState("idle");
        return;
      }
      setSaveState("failed");
      // A dropped request gets the Figma 197:309 wording; a rejected value gets the reason.
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "Couldn't save the new limit. Your entered value is unchanged — try again.",
      );
    }
  }

  async function approve(requestId: string) {
    if (!token) return;
    setApprovingId(requestId);
    setApproveError(null);
    try {
      await approveBreakRequest(requestId, token);
      reload();
    } catch (err) {
      if (handleSessionError(err)) return;
      setApproveError(err instanceof ApiError ? err.message : "Couldn't approve the break. Try again.");
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <ManagerLayout showNav={false}>
      {sessionModal}
      <ManagerBreadcrumb trail={[{ label: "Dashboard", to: "/manager" }, { label: data?.display_name ?? auditorId }]} />
      <LoadState error={error} loading={!data && !error} what="this Auditor" />
      {data && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 style={pageTitle}>{data.display_name}</h1>
            {data.pattern_flagged && (
              <Tag type="gray" size="md" style={{ margin: 0 }}>
                Pattern flagged — private
              </Tag>
            )}
          </div>

          <Panel maxWidth={640}>
            <dl className="flex flex-wrap gap-12">
              <Figure
                label="Today's exposure"
                value={`${data.exposure_minutes_today} / ${data.exposure_limit_minutes} min`}
              />
              <Figure label="Case count today" value={data.cases_today} />
              <Figure label="Cooldown status" value={data.cooldown ? cooldownSummary(data.cooldown) : "None active"} />
            </dl>
          </Panel>

          <div id="exposure-limit">
            <Panel title="Exposure limit" maxWidth={640}>
              {saveState === "saved" && (
                <InlineNotification
                  kind="success"
                  lowContrast
                  hideCloseButton
                  title="Success:"
                  subtitle={`Exposure limit updated to ${data.exposure_limit_minutes} min.`}
                  style={{ maxWidth: "100%" }}
                />
              )}
              {saveState === "failed" && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  hideCloseButton
                  role="alert"
                  title="Error:"
                  subtitle={saveError ?? "Couldn't save the new limit. Your entered value is unchanged — try again."}
                  style={{ maxWidth: "100%" }}
                />
              )}
              <div className="flex flex-wrap items-end gap-3">
                <div style={{ width: "100%", maxWidth: 200 }}>
                  <NumberInput
                    id="exposure-limit-input"
                    label="Daily limit (minutes)"
                    min={30}
                    max={480}
                    step={5}
                    value={limit}
                    onChange={(_, { value }) => {
                      const next = Number(value);
                      if (Number.isFinite(next)) {
                        setLimitDraft(next);
                        if (saveState === "saved") setSaveState("idle");
                      }
                    }}
                  />
                </div>
                <Button kind="secondary" disabled={saveState === "saving"} onClick={saveLimit}>
                  {saveState === "saving" ? "Saving…" : saveState === "failed" ? "Save limit (retry)" : "Save limit"}
                </Button>
              </div>
              <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                Defaults to the 120-minute testing cap unless already individually adjusted.
              </p>
            </Panel>
          </div>

          <Panel title="Recent case activity — today" maxWidth={640}>
            {data.recent_cases.length === 0 ? (
              <p style={secondaryText}>No completed cases in the last 24 hours.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.recent_cases.map((c) => (
                  <li key={c.case_id} className="flex flex-wrap items-center gap-6">
                    <span style={{ ...mono, fontSize: 12, width: 140 }}>{c.case_id}</span>
                    {c.severity_tier ? <SeverityTag tier={c.severity_tier} size="sm" /> : <span>—</span>}
                    <span style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                      {formatClockTime(c.completed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Wellbeing check-ins — today (distinct from SOS)" maxWidth={760}>
            {approveError && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                role="alert"
                title="Error:"
                subtitle={approveError}
                style={{ maxWidth: "100%" }}
              />
            )}
            {data.wellbeing_requests.length === 0 ? (
              <p style={secondaryText}>No check-ins raised today.</p>
            ) : (
              <ul className="flex flex-col gap-3" aria-live="polite">
                {data.wellbeing_requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3">
                    <span style={{ fontSize: 12, color: "var(--cds-text-secondary)", width: 80 }}>
                      {formatClockTime(r.created_at)}
                    </span>
                    {r.kind === "TALK_TO_MANAGER" ? (
                      <span style={{ fontSize: 14 }}>
                        Asked to talk to you{r.case_id ? ` about case ${r.case_id}` : ""} — reach out when you can.
                      </span>
                    ) : r.status === "APPROVED" ? (
                      <Tag type="gray" size="md" style={{ margin: 0 }}>
                        Break approved
                      </Tag>
                    ) : (
                      <>
                        <Tag type="gray" size="md" style={{ margin: 0 }}>
                          Break requested
                        </Tag>
                        <Button size="md" disabled={approvingId === r.id} onClick={() => approve(r.id)}>
                          {approvingId === r.id ? "Approving…" : "Approve"}
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </ManagerLayout>
  );
}
