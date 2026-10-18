import { useCallback, useEffect, useState, type ReactNode } from "react";
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
  DataTableSkeleton,
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
import { AvailableCasesSection, FallbackQueueSection } from "../../components/fallback/FallbackQueue";

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

/** The order an Auditor works through their cases: finish what's in review, then what's ready, then what's processing. */
const WORK_ORDER: Record<InternalCaseStatus, number> = {
  AUDITOR_REVIEW: 0,
  READY_FOR_REVIEW: 1,
  SUBMITTED: 2,
  AI_PROCESSING: 2,
  COMPLETE: 3,
};

/** Only cases the AI has finished analysing can be opened for review (AR-AS-04). */
function isReviewable(status: InternalCaseStatus): boolean {
  return status === "READY_FOR_REVIEW" || status === "AUDITOR_REVIEW";
}

/**
 * Auditor Dashboard / Case Queue — Default (Figma 10:6), Empty (36:146),
 * Cooldown-active (36:189), and the Exposure Limit Reached banner (34:121).
 *
 * Opening a ready case goes to its content-warning gate first
 * (/auditor/cases/:caseId), never straight to raw content (AR-PV-01).
 */
export function AuditorDashboardPage() {
  const navigate = useNavigate();
  const { token, isSuperAdmin } = useAuth();
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

  // The fallback and "available to claim" lists reload after a case changes hands, and
  // "My queue" reloads with them. The wellbeing blocks mirror what the server enforces.
  const [fallbackRefresh, setFallbackRefresh] = useState(0);
  const reloadAfterCaseChange = useCallback(() => {
    if (token) {
      getAuditorCases(token)
        .then((result) => setCases(result))
        .catch(() => {});
    }
    setFallbackRefresh((n) => n + 1);
  }, [token]);
  const takeBlockReason = inCooldown
    ? "You are in a mandatory cooldown."
    : atExposureLimit
      ? "You have reached your daily exposure limit."
      : null;

  useEffect(() => {
    if (!atExposureLimit || !token) return;
    releaseAllCasesAtLimit(token)
      .then(() => getAuditorCases(token))
      .then((result) => setCases(result))
      .catch(() => {});
  }, [atExposureLimit, token]);

  const showAssignedColumn = cases?.some((c) => c.assigned_at) ?? false;
  const [supportOpen, setSupportOpen] = useState(false);
  const [needsReviewerCount, setNeedsReviewerCount] = useState<number | null>(null);

  // Newest first; completed cases move to their own list below.
  const newestFirst = (a: AuditorCaseListItem, b: AuditorCaseListItem) =>
    Date.parse(b.assigned_at ?? "") - Date.parse(a.assigned_at ?? "");
  const openCases = (cases ?? [])
    .filter((c) => c.status !== "COMPLETE")
    .sort((a, b) => WORK_ORDER[a.status] - WORK_ORDER[b.status] || newestFirst(a, b));
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
  // A break the Auditor has asked for, or the Manager has approved, changes what Status says.
  const breakRequested = (wellbeing?.requests ?? []).some((r) => r.kind === "BREAK_REQUEST" && r.status === "OPEN");
  const onBreak = (wellbeing?.requests ?? []).some((r) => r.kind === "BREAK_REQUEST" && r.status === "APPROVED");
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
        // and screen-reader users get the real link on the Case ID
        // and the Open case button, so the row itself isn't a fake button.
        onClick={openable ? () => navigate(caseUrl) : undefined}
        style={{ cursor: openable ? "pointer" : "default" }}
      >
        <TableCell style={{ ...cellStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
          {openable ? (
            <RouterLink to={caseUrl} className="cds--link" onClick={(e) => e.stopPropagation()}>
              {c.case_id}
            </RouterLink>
          ) : (
            c.case_id
          )}
        </TableCell>
        <TableCell style={cellStyle}>
          {(c.final_severity_tier ?? c.severity_tier) ? (
            <SeverityTag tier={(c.final_severity_tier ?? c.severity_tier)!} />
          ) : c.status === "SUBMITTED" || c.status === "AI_PROCESSING" ? (
            <span className="cds--visually-hidden">No severity yet</span>
          ) : (
            // AI analysis finished without a severity: it failed (AR-AI-10). Say so
            // instead of leaving a blank that reads as "still loading".
            <span style={{ fontSize: 14, color: "var(--cds-text-secondary)" }}>Unknown</span>
          )}
        </TableCell>
        <TableCell style={cellStyle}>
          <span aria-disabled={openable ? undefined : "true"}>{statusLabel}</span>
        </TableCell>
        {showAssignedColumn && (
          <TableCell style={{ ...cellStyle, fontSize: 14, color: "var(--cds-text-secondary)" }}>
            {c.assigned_at ? formatRelativeTime(c.assigned_at) : "—"}
          </TableCell>
        )}
        <TableCell style={cellStyle}>
          {openable && (
            <Button
              kind="tertiary"
              size="sm"
              aria-label={`Open case ${c.case_id}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(caseUrl);
              }}
            >
              Open case
            </Button>
          )}
        </TableCell>
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
            {inCooldown ? (
              // In a cooldown the only thing to do is the cooldown: the support options, the timer and the puzzle.
              <Button onClick={() => navigate("/auditor/cooldown")}>View cooldown</Button>
            ) : isSuperAdmin ? (
              // A Super Auditor manages the flow rather than working every case: the one primary action is the queue.
              <Button href="#fallback-queue">Manage queue</Button>
            ) : (
              nextCase && (
                <Button onClick={() => navigate(`/auditor/cases/${encodeURIComponent(nextCase.case_id)}`)}>
                  Open next case
                </Button>
              )
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
          <div className="rcs-stat-strip">
            {isSuperAdmin && (
              <StatTile
                compact
                label="Needs a reviewer"
                value={needsReviewerCount === null ? "–" : needsReviewerCount}
                helper={needsReviewerCount ? "In the fallback queue" : "Nothing waiting"}
              />
            )}
            <StatTile compact label="My open cases" value={cases ? openCases.length : "–"} helper="Assigned to you" />
            <StatTile compact label="Ready to review" value={cases ? readyCount : "–"} helper="Yours, AI finished" />
            <StatTile
              compact
              label="Completed today"
              value={cases ? completedCases.length : "–"}
              helper="For your own record"
            />
            <StatTile
              compact
              label="Exposure left"
              value={
                minutesLeft === null ? (
                  "–"
                ) : (
                  <>
                    {minutesLeft}
                    <span style={{ fontSize: 14, marginInlineStart: 4 }}>min</span>
                  </>
                )
              }
              helper={wellbeing ? `of ${wellbeing.exposure_limit_minutes} min today` : undefined}
            />
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
              <div className="rcs-stat-tile rcs-stat-tile--compact" aria-labelledby="status-title" role="group">
                <span id="status-title" className="rcs-stat-label">
                  Status
                </span>
                <span className="rcs-stat-value" style={{ fontFamily: "inherit" }}>
                  {onBreak ? (
                    <StatusTag tone="info">On break</StatusTag>
                  ) : breakRequested ? (
                    <StatusTag tone="neutral">Break requested</StatusTag>
                  ) : (
                    <StatusTag tone="success">Available</StatusTag>
                  )}
                </span>
                {(onBreak || breakRequested) && (
                  <span className="rcs-stat-helper">
                    {onBreak ? "Approved by your manager. No new cases until you're back." : "Waiting for your manager."}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <Modal
          open={supportOpen}
          passiveModal
          className="rcs-checkin-modal"
          modalHeading="Wellbeing check-in"
          onRequestClose={() => setSupportOpen(false)}
        >
          {supportOpen && <WellbeingCheckIn bare onSessionExpired={handleSessionExpiry} />}
        </Modal>

        {/* AR-WB-12: new assignments pause and earlier footage stays locked (Figma 36:189). */}
        {inCooldown && (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Cooldown in progress."
            subtitle={`New assignments are paused${isSuperAdmin ? ", and you can't take a case" : ""}. Raw footage from earlier cases can't be reopened until the cooldown ends.`}
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
            {/* My cases: one table in working order, so a case is never listed twice. */}
            <section id="my-cases" aria-labelledby="my-cases-title" className="flex flex-col gap-2">
              <h2 id="my-cases-title" style={{ fontSize: 16, lineHeight: "22px", fontWeight: 600 }}>
                My cases
              </h2>
              <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
                You&apos;re only assigned cases that fit inside your remaining exposure for today. Cases still in AI
                analysis can&apos;t be opened yet.
              </p>
              {openCases.length > 0 ? (
                // Layer raises the table one Carbon layer, so rows render white
                // (as in Figma) instead of the default Gray 10 row fill.
                <Layer>
                  <Table aria-label="My cases" className="rcs-actions-end">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Case ID</TableHeader>
                        <TableHeader>Severity</TableHeader>
                        <TableHeader>Status</TableHeader>
                        {showAssignedColumn && <TableHeader>Assigned</TableHeader>}
                        <TableHeader>Actions</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>{openCases.map(renderRow)}</TableBody>
                  </Table>
                </Layer>
              ) : (
                <EmptyPanel>
                  {isSuperAdmin && needsReviewerCount ? (
                    <>
                      No cases assigned to you. {needsReviewerCount}{" "}
                      {needsReviewerCount === 1 ? "case needs" : "cases need"} a reviewer.{" "}
                      <a href="#fallback-queue">View queue</a>.
                    </>
                  ) : (
                    "No cases assigned to you right now. New cases are assigned automatically as they come in."
                  )}
                </EmptyPanel>
              )}
            </section>

            {isSuperAdmin && token && (
              <FallbackQueueSection
                token={token}
                refreshKey={fallbackRefresh}
                onChanged={reloadAfterCaseChange}
                onSessionExpired={handleSessionExpiry}
                canTake={takeBlockReason === null}
                blockReason={inCooldown ? null : takeBlockReason}
                onNeedsReviewerCount={setNeedsReviewerCount}
              />
            )}

            {/* Cases released because no one could take them. Shown to standard Auditors, only when there are some. */}
            {!isSuperAdmin && token && (
              <AvailableCasesSection
                token={token}
                refreshKey={fallbackRefresh}
                onChanged={reloadAfterCaseChange}
                onSessionExpired={handleSessionExpiry}
              />
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
                          <TableCell>
                            {(c.final_severity_tier ?? c.severity_tier) ? (
                              <SeverityTag tier={(c.final_severity_tier ?? c.severity_tier)!} />
                            ) : (
                              "Unknown"
                            )}
                          </TableCell>
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

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center px-4 py-8" style={{ backgroundColor: "var(--cds-layer-01)" }}>
      <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)", textAlign: "center" }}>
        {children}
      </p>
    </div>
  );
}
