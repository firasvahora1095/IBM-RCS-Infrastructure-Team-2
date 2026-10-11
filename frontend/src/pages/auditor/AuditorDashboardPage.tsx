import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Button,
  Modal,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  InlineNotification,
  ActionableNotification,
  Column,
  DataTableSkeleton,
  Grid,
  Layer,
} from "@carbon/react";
import { StaffHeader } from "../../components/shell/StaffHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { getAuditorCases, releaseAllCasesAtLimit } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AuditorCaseListItem, InternalCaseStatus } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useMyWellbeing } from "../../hooks/useMyWellbeing";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import { StatTile } from "../../components/ui/StatTile";
import { StatusTag } from "../../components/ui/StatusTag";
import { WellbeingCheckIn } from "../../components/wellbeing/WellbeingCheckIn";

/**
 * Status copy exactly as the Figma queue writes it ("Ready for review", "AI
 * analysis in progress"). Deliberately not RT-02's generic staff labels:
 * this screen's approved wording is more specific than "AI Processing".
 */
const QUEUE_STATUS_LABEL: Record<InternalCaseStatus, string> = {
  SUBMITTED: "Submitted",
  AI_PROCESSING: "AI analysis in progress",
  READY_FOR_REVIEW: "Ready for review",
  AUDITOR_REVIEW: "In review",
  COMPLETE: "Complete",
};

/** My queue groups, in the order an Auditor works through them. */
const QUEUE_GROUPS: readonly { id: string; title: string; statuses: InternalCaseStatus[] }[] = [
  { id: "in-review", title: "In review", statuses: ["AUDITOR_REVIEW"] },
  { id: "ready", title: "Ready for review", statuses: ["READY_FOR_REVIEW"] },
  { id: "processing", title: "Processing", statuses: ["SUBMITTED", "AI_PROCESSING"] },
];

/** Only cases the AI has finished analysing can be opened for review (AR-AS-04). */
function isReviewable(status: InternalCaseStatus): boolean {
  return status === "READY_FOR_REVIEW" || status === "AUDITOR_REVIEW";
}

/** Secondary text colour. Figma uses Gray 50 (3.3:1 on white, fails WCAG AA); Carbon text-helper is 5.0:1. */
const SECONDARY_TEXT = "var(--cds-text-helper)";

/**
 * Auditor Dashboard / Case Queue — Default (Figma 10:6), Empty (36:146),
 * Cooldown-active (36:189), and the Exposure Limit Reached banner (34:121).
 *
 * Opening a ready case goes to its content-warning gate first
 * (/auditor/cases/:caseId), never straight to raw content (AR-PV-01).
 */
export function AuditorDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { wellbeing } = useMyWellbeing();
  const handleSessionExpiry = useSessionExpiryHandler();
  const [cases, setCases] = useState<AuditorCaseListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Read the clock once per visit rather than on every render, so the
  // cooldown check is stable; the wellbeing data refreshes on its own.
  const [pageOpenedAt] = useState(() => Date.now());

  useEffect(() => {
    if (!token) return;
    // Ignore the response if the page unmounts first (e.g. quick sign-out).
    let cancelled = false;
    getAuditorCases(token)
      .then((result) => {
        if (!cancelled) setCases(result);
      })
      .catch((err: unknown) => {
        if (cancelled || handleSessionExpiry(err)) return;
        setLoadError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [token, handleSessionExpiry]);

  const cooldown = wellbeing?.cooldown ?? null;
  // A cooldown lasts until its end time and, for S4/SOS, until the Manager check-in is recorded.
  const inCooldown =
    cooldown !== null &&
    (Date.parse(cooldown.ends_at) > pageOpenedAt || (cooldown.requires_check_in && !cooldown.check_in_completed_at));
  const atExposureLimit = wellbeing != null && wellbeing.exposure_minutes_today >= wellbeing.exposure_limit_minutes;

  useEffect(() => {
    if (!atExposureLimit || !token) return;
    releaseAllCasesAtLimit(token)
      .then(() => getAuditorCases(token))
      .then((result) => setCases(result))
      .catch(() => {});
  }, [atExposureLimit, token]);

  const showAssignedColumn = cases?.some((c) => c.assigned_at) ?? false;
  const reviewableCount = cases?.filter((c) => isReviewable(c.status)).length ?? 0;
  const [supportOpen, setSupportOpen] = useState(false);

  // Newest first; completed cases move to their own list below.
  const newestFirst = (a: AuditorCaseListItem, b: AuditorCaseListItem) =>
    Date.parse(b.assigned_at ?? "") - Date.parse(a.assigned_at ?? "");
  const openCases = (cases ?? []).filter((c) => c.status !== "COMPLETE").sort(newestFirst);
  const completedCases = (cases ?? []).filter((c) => c.status === "COMPLETE").sort(newestFirst);
  const nextCase = inCooldown ? undefined : openCases.find((c) => isReviewable(c.status));

  const minutesLeft = wellbeing
    ? Math.max(0, Math.round(wellbeing.exposure_limit_minutes - wellbeing.exposure_minutes_today))
    : null;
  // A live countdown while a cooldown runs; the clock only ticks when it's needed.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (!inCooldown) return;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [inCooldown]);
  const secondsLeft =
    inCooldown && cooldown ? Math.max(0, Math.ceil((Date.parse(cooldown.ends_at) - clock) / 1000)) : 0;
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const cooldownCause =
    cooldown?.trigger === "SOS" ? "Started after your SOS" : `Triggered by ${cooldown?.trigger ?? ""} exposure`;
  const waitingForCheckIn = Boolean(cooldown?.requires_check_in && !cooldown.check_in_completed_at);
  // Ready to review means AI analysis is finished and the Auditor hasn't started yet (§1.5).
  const readyCount = openCases.filter((c) => c.status === "READY_FOR_REVIEW").length;

  const renderRow = (c: AuditorCaseListItem) => {
    const lockedByCooldown = inCooldown && c.status !== "AI_PROCESSING" && c.status !== "COMPLETE";
    const lockedByCap = atExposureLimit && c.status !== "AI_PROCESSING" && c.status !== "COMPLETE";
    const openable = isReviewable(c.status) && !lockedByCooldown && !lockedByCap;
    const caseUrl = `/auditor/cases/${encodeURIComponent(c.case_id)}`;
    const statusLabel = lockedByCooldown
      ? "Locked during cooldown"
      : lockedByCap
        ? "Locked — daily limit reached"
        : QUEUE_STATUS_LABEL[c.status];
    // "Every Processing row is disabled" (AR-AS-04): Gray 10 cells.
    // Set per cell, because Carbon paints each cell's background
    // over the row's. Figma also dims disabled rows to 60–70%
    // opacity, which fails text contrast, so muted text is used instead.
    const cellStyle = openable
      ? undefined
      : {
          backgroundColor: c.status === "AI_PROCESSING" ? "var(--cds-layer-01)" : undefined,
          color: "var(--cds-text-secondary)",
        };
    return (
      <TableRow
        key={c.case_id}
        // Mouse users can click anywhere on a ready row; keyboard
        // and screen-reader users get the real link in the
        // Status cell, so the row itself isn't a fake button.
        onClick={openable ? () => navigate(caseUrl) : undefined}
        style={{ cursor: openable ? "pointer" : "default" }}
      >
        <TableCell style={{ ...cellStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
          {c.case_id}
        </TableCell>
        <TableCell style={cellStyle}>
          {c.severity_tier ? (
            <SeverityTag tier={c.severity_tier} />
          ) : c.status === "SUBMITTED" || c.status === "AI_PROCESSING" ? (
            <span className="cds--visually-hidden">No severity yet</span>
          ) : (
            // AI analysis finished without a severity: it failed (AR-AI-10). Say so
            // instead of leaving a blank that reads as "still loading".
            <span style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>Unknown</span>
          )}
        </TableCell>
        <TableCell style={cellStyle}>
          {openable ? (
            <RouterLink
              to={caseUrl}
              className="cds--link"
              style={{ fontWeight: 600 }}
              onClick={(e) => e.stopPropagation()}
            >
              {statusLabel}
            </RouterLink>
          ) : (
            <span
              style={{ color: lockedByCooldown ? SECONDARY_TEXT : "var(--cds-text-secondary)" }}
              aria-disabled="true"
            >
              {statusLabel}
            </span>
          )}
        </TableCell>
        {showAssignedColumn && (
          <TableCell style={{ ...cellStyle, fontSize: 12, color: SECONDARY_TEXT, textAlign: "right" }}>
            {c.assigned_at ? formatRelativeTime(c.assigned_at) : "—"}
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <>
      <StaffHeader role="auditor" />
      <StaffPage>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 style={{ fontSize: 32, lineHeight: "40px", fontWeight: 600 }}>Case queue</h1>
            <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
              Your work and protection today. Each case opens on its content warning; there are no thumbnails.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* The single way into the check-in (separate from SOS), always one click away. */}
            <Button kind="tertiary" onClick={() => setSupportOpen(true)}>
              Wellbeing check-in
            </Button>
            {/* The one primary action: the next case that is ready to review. */}
            {nextCase && (
              <Button onClick={() => navigate(`/auditor/cases/${encodeURIComponent(nextCase.case_id)}`)}>
                Open next case
              </Button>
            )}
          </div>
        </div>

        {/*
          My work & protection (Sprint 3 extras §1.5): a personal snapshot, never a
          performance measure. No quota, target or comparison with other Auditors.
          The header already shows minutes watched against the limit, so this strip
          shows what's left; the last tile adapts to the protection state (AR-WB-02, 12).
        */}
        <section aria-label="My work and protection">
          <Grid className="rcs-grid" condensed>
            <Column sm={2} md={2} lg={3}>
              <StatTile label="My open cases" value={cases ? openCases.length : "–"} helper="Assigned to you" />
            </Column>
            <Column sm={2} md={2} lg={3}>
              <StatTile label="Ready to review" value={cases ? readyCount : "–"} helper="AI analysis finished" />
            </Column>
            <Column sm={2} md={2} lg={3}>
              <StatTile
                label="Completed today"
                value={cases ? completedCases.length : "–"}
                helper="For your own record"
              />
            </Column>
            <Column sm={2} md={2} lg={3}>
              <StatTile
                label="Exposure left today"
                value={minutesLeft === null ? "–" : `${minutesLeft} min`}
                helper="Counts only while source video plays"
              />
            </Column>
            <Column sm={4} md={8} lg={4}>
              {inCooldown ? (
                <section className="rcs-day-alert" aria-labelledby="status-title" aria-live="polite">
                  <p id="status-title" className="rcs-stat-label">
                    Status
                  </p>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <StatusTag tone="info" size="sm">
                      Cooldown
                    </StatusTag>
                    <span className="rcs-day-alert-figure">
                      {countdown}
                      <span className="cds--visually-hidden"> remaining</span>
                    </span>
                  </div>
                  <p className="rcs-helper">
                    {cooldownCause}
                    {waitingForCheckIn
                      ? ". Your manager will check in before new cases resume."
                      : ". No new harmful-content case is assigned until it ends."}
                  </p>
                  <div>
                    <Button kind="tertiary" size="sm" onClick={() => navigate("/auditor/cooldown#take-a-moment")}>
                      Play block puzzle
                    </Button>
                  </div>
                </section>
              ) : atExposureLimit && wellbeing ? (
                <section className="rcs-day-alert" aria-labelledby="status-title">
                  <p id="status-title" className="rcs-stat-label">
                    Status
                  </p>
                  <StatusTag tone="warning" size="sm">
                    Daily limit reached
                  </StatusTag>
                  <p className="rcs-helper">No new harmful-content cases will be assigned today.</p>
                </section>
              ) : (
                <div className="rcs-stat-tile" aria-labelledby="status-title" role="group">
                  <span id="status-title" className="rcs-stat-label">
                    Status
                  </span>
                  <span className="rcs-stat-value" style={{ fontFamily: "inherit" }}>
                    <StatusTag tone="success">Available</StatusTag>
                  </span>
                  <span className="rcs-stat-helper">Cooldown starts after S3 and S4 cases, or an SOS.</span>
                </div>
              )}
            </Column>
          </Grid>
        </section>

        <Modal
          open={supportOpen}
          passiveModal
          modalHeading="Wellbeing check-in"
          onRequestClose={() => setSupportOpen(false)}
        >
          {supportOpen && <WellbeingCheckIn onSessionExpired={handleSessionExpiry} />}
        </Modal>

        {/* AR-WB-12: new assignments pause and earlier footage stays locked (Figma 36:189). */}
        {inCooldown && (
          <ActionableNotification
            inline
            kind="info"
            lowContrast
            hideCloseButton
            actionButtonLabel="View cooldown"
            onActionButtonClick={() => navigate("/auditor/cooldown")}
            title="Cooldown in progress — new assignments paused."
            subtitle="You can still see your Dashboard and past case metadata. Raw footage from earlier cases can't be reopened until the cooldown ends."
            style={{ maxWidth: "100%" }}
          />
        )}

        {/* AR-WB-03: non-punitive framing at the daily limit (Figma 34:121). */}
        {atExposureLimit && !inCooldown && (
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="You've reached today's exposure limit."
            subtitle="No new cases will be assigned. Thank you for the work you did today."
            style={{ maxWidth: "100%" }}
          />
        )}

        {loadError && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Couldn't load your case queue."
            subtitle={loadError}
            style={{ maxWidth: "100%" }}
          />
        )}

        {!cases && !loadError && (
          <DataTableSkeleton columnCount={4} rowCount={3} showHeader={false} showToolbar={false} />
        )}

        {cases && (
          <>
            {/*
              My queue, grouped by what the Auditor can do next (Sprint 3 extras §1.5):
              finish what's in review, then what's ready, then what's still in AI analysis.
              Counts live in the strip above, so the headings don't repeat them.
            */}
            {QUEUE_GROUPS.map((group) => {
              const rows = openCases.filter((c) => group.statuses.includes(c.status));
              if (rows.length === 0) return null;
              return (
                <section key={group.id} aria-labelledby={`queue-${group.id}`} className="flex flex-col gap-2">
                  <h2 id={`queue-${group.id}`} style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
                    {group.title}
                  </h2>
                  {/* Layer raises the table one Carbon layer, so rows render white
                      (as in Figma) instead of the default Gray 10 row fill. */}
                  <Layer>
                    <Table aria-label={group.title}>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Case ID</TableHeader>
                          <TableHeader>Severity</TableHeader>
                          <TableHeader>Status</TableHeader>
                          {/* Right-aligned like its values (Figma 10:6). Carbon's label div sets its own
                              text-align, and outranks Tailwind's layered utilities, so align inline. */}
                          {showAssignedColumn && (
                            <TableHeader>
                              <span style={{ display: "block", textAlign: "right" }}>Assigned</span>
                            </TableHeader>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>{rows.map(renderRow)}</TableBody>
                    </Table>
                  </Layer>
                </section>
              );
            })}

            {/* Empty-state panels (Figma 36:146, 36:189, 34:121). */}
            {openCases.length === 0 ? (
              <EmptyPanel>
                No cases assigned right now — new cases are assigned automatically as they come in.
              </EmptyPanel>
            ) : inCooldown ? (
              <EmptyPanel>No new Ready cases during cooldown.</EmptyPanel>
            ) : atExposureLimit && reviewableCount === 0 ? (
              <EmptyPanel>No available cases right now</EmptyPanel>
            ) : (
              <p style={{ fontSize: 12, lineHeight: "16px", color: SECONDARY_TEXT }}>
                Cases still in AI analysis can&apos;t be opened yet. You&apos;re only assigned cases that fit inside
                your remaining exposure for today.
              </p>
            )}

            {completedCases.length > 0 && (
              <section aria-labelledby="completed-title" className="flex flex-col gap-3">
                <h2 id="completed-title" style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
                  Completed today
                </h2>
                <Layer>
                  <Table aria-label="Completed today" size="sm">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Case ID</TableHeader>
                        <TableHeader>Severity</TableHeader>
                        <TableHeader>Status</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {completedCases.map((c) => (
                        <TableRow key={c.case_id}>
                          <TableCell style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                            {c.case_id}
                          </TableCell>
                          <TableCell>{c.severity_tier ? <SeverityTag tier={c.severity_tier} /> : "Unknown"}</TableCell>
                          <TableCell style={{ color: "var(--cds-text-secondary)" }}>Complete</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Layer>
              </section>
            )}
          </>
        )}
      </StaffPage>
    </>
  );
}

function EmptyPanel({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-8" style={{ backgroundColor: "var(--cds-layer-01)" }}>
      <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)", textAlign: "center" }}>
        {children}
      </p>
    </div>
  );
}
