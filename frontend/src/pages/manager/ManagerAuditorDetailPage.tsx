import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { ActionableNotification, Button, InlineNotification, NumberInput } from "@carbon/react";
import { Cafe, UserSpeaker } from "@carbon/icons-react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { ExposureStateTag, Figure, LoadState, ManagerBreadcrumb, Panel } from "../../components/manager/ManagerBits";
import { formatClockTime, mono, secondaryText } from "../../components/manager/managerStyles";
import { CheckInModal } from "../../components/manager/CheckInModal";
import { ExposureBar } from "../../components/exposure/ExposureBar";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { StatusTag } from "../../components/ui/StatusTag";
import { approveBreakRequest, getAuditorDetail, markWellbeingFollowedUp, setExposureLimit } from "../../services";
import { ApiError, type SeverityTier, type WellbeingRequestRecord } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";
import { cooldownSummary, SOS_STATUS_LABEL } from "../../design-tokens/managerLabels";
import { WELLBEING_TONE, SOS_TONE } from "../../design-tokens/statusTones";
import { getSeverityInfo } from "../../design-tokens/severity";
import { mapOutcomeToDisplay } from "../../design-tokens/outcomeLabels";

const DEFAULT_LIMIT_MINUTES = 120;
const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];

/** The Manager's wording for a request's status (the Auditor sees "Waiting for your manager"). */
const REQUEST_STATUS_LABEL: Record<WellbeingRequestRecord["status"], string> = {
  OPEN: "Waiting for you",
  APPROVED: "Break approved",
  FOLLOWED_UP: "Followed up",
  WITHDRAWN: "Withdrawn by the Auditor",
};

/**
 * Auditor Detail (Manager Figma 86:94), with Exposure limit saved (356:364),
 * Break request approved (357:314) and Save fails (197:309).
 *
 * One page answers what a Manager needs to know about one Auditor today:
 * how much they've seen, what they reviewed, whether they're in a cooldown,
 * whether they've asked for support or raised an SOS, and their limit.
 * "Cases completed today" and the case list come from the same records.
 * `?mode=exposure` (older links) scrolls to the limit and focuses it.
 */
export function ManagerAuditorDetailPage() {
  const { auditorId = "" } = useParams<{ auditorId: string }>();
  const [searchParams] = useSearchParams();
  const focusLimit = searchParams.get("mode") === "exposure";
  const { token } = useAuth();
  const { data, error, reload } = useStaffQuery((t) => getAuditorDetail(auditorId, t), auditorId);
  const { handleSessionError, sessionModal } = useInPlaceSessionExpiry(
    "Your entered exposure limit will be exactly as you left it.",
  );

  const [limitDraft, setLimitDraft] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const limitRef = useRef<HTMLDivElement>(null);

  const limit = limitDraft ?? data?.exposure_limit_minutes ?? DEFAULT_LIMIT_MINUTES;
  const loaded = Boolean(data);

  useEffect(() => {
    if (!focusLimit || !loaded) return;
    limitRef.current?.scrollIntoView?.({ block: "center" });
    limitRef.current?.querySelector("input")?.focus();
  }, [focusLimit, loaded]);

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

  async function act(request: WellbeingRequestRecord) {
    if (!token) return;
    setActingId(request.id);
    setActionError(null);
    try {
      if (request.kind === "BREAK_REQUEST") await approveBreakRequest(request.id, token);
      else await markWellbeingFollowedUp(request.id, token);
      reload();
    } catch (err) {
      if (handleSessionError(err)) return;
      setActionError(err instanceof ApiError ? err.message : "That didn't save. Try again.");
    } finally {
      setActingId(null);
    }
  }

  const severityMix = TIERS.map((tier) => ({
    tier,
    count: data?.recent_cases.filter((c) => c.severity_tier === tier).length ?? 0,
  })).filter((t) => t.count > 0);
  const openRequests = data?.wellbeing_requests.filter((r) => r.status === "OPEN").length ?? 0;
  // An S4 cooldown holds the Reviewer until the Manager checks in; an SOS is checked in through its follow-up.
  const checkInOwed = Boolean(
    data?.cooldown?.trigger === "S4" && data.cooldown.requires_check_in && !data.cooldown.check_in_completed_at,
  );

  return (
    <ManagerLayout>
      {sessionModal}
      <ManagerBreadcrumb trail={[{ label: "Overview", to: "/manager" }, { label: data?.display_name ?? auditorId }]} />
      <LoadState error={error} loading={!data && !error} what="this Auditor" />
      {data && (
        <>
          {checkInOwed && (
            <ActionableNotification
              kind="warning"
              lowContrast
              inline
              hideCloseButton
              title={`Check in with ${data.display_name}.`}
              subtitle="They finished a critical case and can't take new cases until you have."
              actionButtonLabel="Log check-in"
              onActionButtonClick={() => setCheckingIn(true)}
              style={{ maxWidth: "100%" }}
            />
          )}
          {checkedIn && (
            <InlineNotification
              kind="success"
              lowContrast
              role="status"
              title="Check-in logged."
              subtitle={`${data.display_name} can take new cases again.`}
              onCloseButtonClick={() => setCheckedIn(false)}
              style={{ maxWidth: "100%" }}
            />
          )}
          {checkingIn && (
            <CheckInModal
              reviewer={{ id: data.auditor_id, name: data.display_name }}
              onClose={() => setCheckingIn(false)}
              onLogged={() => {
                setCheckedIn(true);
                reload();
              }}
            />
          )}
          <PageHeader
            title={data.display_name}
            meta={
              <>
                <ExposureStateTag state={data.exposure_state} />
                {data.pattern_flagged && (
                  <span title="A private marker that this Auditor's recent exposure is worth a check-in. Only the Manager sees it.">
                    <StatusTag tone="neutral">Pattern flagged</StatusTag>
                  </span>
                )}
              </>
            }
          />

          {/* Actions first: what this person asked of you, then the figures. */}
          <Panel title={openRequests > 0 ? `Support requests · ${openRequests} waiting` : "Support requests"}>
            <p style={secondaryText}>Private requests from the Auditor, separate from SOS.</p>
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
            {data.wellbeing_requests.length === 0 ? (
              <p style={secondaryText}>No support requests.</p>
            ) : (
              // One row per request: what they asked and when, their words, and the one action on the right.
              <ul className="rcs-req-list" aria-live="polite">
                {data.wellbeing_requests.map((r) => {
                  const KindIcon = r.kind === "TALK_TO_MANAGER" ? UserSpeaker : Cafe;
                  return (
                    <li key={r.id} className="rcs-req">
                      <KindIcon size={20} className="rcs-req-icon" aria-hidden="true" />
                      <div className="rcs-req-body">
                        <p className="rcs-req-title">
                          {r.kind === "TALK_TO_MANAGER" ? "Wants to talk to you" : "Asked for a break"}
                          <span className="rcs-req-meta">
                            {formatClockTime(r.created_at)}
                            {r.case_id && ` · case ${r.case_id}`}
                          </span>
                        </p>
                        {r.reason && <p className="rcs-req-quote">&ldquo;{r.reason}&rdquo;</p>}
                      </div>
                      <div className="rcs-req-action">
                        {r.status === "OPEN" ? (
                          <Button kind="tertiary" size="sm" disabled={actingId === r.id} onClick={() => void act(r)}>
                            {actingId === r.id
                              ? "Saving…"
                              : r.kind === "BREAK_REQUEST"
                                ? "Approve break"
                                : "Mark as followed up"}
                          </Button>
                        ) : (
                          <StatusTag tone={WELLBEING_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</StatusTag>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Today at a glance */}
          <Panel title="Today">
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Figure
                label="Exposure today"
                value={`${Math.round(data.exposure_minutes_today)} / ${data.exposure_limit_minutes} min`}
              />
              <Figure label="Cases completed today" value={data.cases_today} />
              <Figure label="Cooldown" value={data.cooldown ? cooldownSummary(data.cooldown) : "None active"} />
              <Figure
                label="Last active"
                value={data.last_active_at ? formatClockTime(data.last_active_at) : "Not yet today"}
              />
            </dl>
            <ExposureBar
              surface="light"
              width={240}
              minutes={data.exposure_minutes_today}
              limit={data.exposure_limit_minutes}
              thresholds
              label={`${Math.round((data.exposure_minutes_today / Math.max(1, data.exposure_limit_minutes)) * 100)}% of today's ${data.exposure_limit_minutes} min limit`}
              ariaLabel={`${data.display_name}'s exposure today`}
            />
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Cases completed today">
              {data.recent_cases.length === 0 ? (
                <p style={secondaryText}>No cases completed today.</p>
              ) : (
                <>
                  <p style={secondaryText}>
                    {`${data.recent_cases.length} ${data.recent_cases.length === 1 ? "case" : "cases"}: ${severityMix
                      .map((t) => `${t.count} ${getSeverityInfo(t.tier).label}`)
                      .join(", ")}`}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {data.recent_cases.map((c) => (
                      <li key={c.case_id} className="rcs-align-row" style={{ columnGap: "1rem" }}>
                        <span style={{ ...mono, fontSize: 12, width: 120 }}>{c.case_id}</span>
                        {c.severity_tier ? <SeverityTag tier={c.severity_tier} size="sm" /> : <span>—</span>}
                        {c.final_outcome && (
                          <span style={{ fontSize: 12 }}>
                            {mapOutcomeToDisplay(c.final_outcome)?.title ?? c.final_outcome}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "var(--cds-text-secondary)", marginInlineStart: "auto" }}>
                          {formatClockTime(c.completed_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>

            <Panel title="SOS in the last 7 days">
              {(data.sos_history ?? []).length === 0 ? (
                <p style={secondaryText}>None.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {data.sos_history!.map((e) => (
                    <li key={e.id} className="rcs-align-row" style={{ columnGap: "1rem" }}>
                      <RouterLink className="cds--link" to={`/manager/sos/${encodeURIComponent(e.id)}`}>
                        {new Date(e.triggered_at).toLocaleString([], {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </RouterLink>
                      <StatusTag tone={SOS_TONE[e.status]}>{SOS_STATUS_LABEL[e.status]}</StatusTag>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <div id="exposure-limit" ref={limitRef}>
              <Panel title="Exposure limit">
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
                      size="lg"
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
                  <Button kind="tertiary" disabled={saveState === "saving"} onClick={saveLimit}>
                    {saveState === "saving" ? "Saving…" : saveState === "failed" ? "Save limit (retry)" : "Save limit"}
                  </Button>
                </div>
                <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>
                  The current limit is {data.exposure_limit_minutes} minutes. A lower limit takes effect for the next
                  assignment.
                </p>
              </Panel>
            </div>
          </div>
        </>
      )}
    </ManagerLayout>
  );
}
