import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  InlineNotification,
  ActionableNotification,
  DataTableSkeleton,
  Layer,
} from "@carbon/react";
import { StaffHeader } from "../../components/shell/StaffHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { getAuditorCases } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AuditorCaseListItem, InternalCaseStatus } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useMyWellbeing } from "../../hooks/useMyWellbeing";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

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
  const showAssignedColumn = cases?.some((c) => c.assigned_at) ?? false;
  const reviewableCount = cases?.filter((c) => isReviewable(c.status)).length ?? 0;

  return (
    <>
      <StaffHeader role="auditor" />
      <StaffPage>
        <div className="flex flex-col gap-5">
          <h1 style={{ fontSize: 32, lineHeight: "40px", fontWeight: 600 }}>Case queue</h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
            Cases assigned to you, in the order the system assigned them. Thumbnails are suppressed — open a case to see
            its content-warning gate.
          </p>
        </div>

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
            {/* Layer raises the table one Carbon layer, so rows render white
                (as in Figma) instead of the default Gray 10 row fill. */}
            <Layer>
              <Table aria-label="Cases assigned to you">
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
                <TableBody>
                  {cases.map((c) => {
                    const lockedByCooldown = inCooldown && c.status !== "AI_PROCESSING" && c.status !== "COMPLETE";
                    const openable = isReviewable(c.status) && !lockedByCooldown;
                    const caseUrl = `/auditor/cases/${encodeURIComponent(c.case_id)}`;
                    const statusLabel = lockedByCooldown ? "Locked during cooldown" : QUEUE_STATUS_LABEL[c.status];
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
                          ) : (
                            <span className="cds--visually-hidden">No severity yet</span>
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
                  })}
                </TableBody>
              </Table>
            </Layer>

            {/* Empty-state panels (Figma 36:146, 36:189, 34:121). */}
            {cases.length === 0 ? (
              <EmptyPanel>
                No cases assigned right now — new cases are assigned automatically as they come in.
              </EmptyPanel>
            ) : inCooldown ? (
              <EmptyPanel>No new Ready cases during cooldown.</EmptyPanel>
            ) : atExposureLimit && reviewableCount === 0 ? (
              <EmptyPanel>No available cases right now</EmptyPanel>
            ) : (
              <p style={{ fontSize: 12, lineHeight: "16px", color: SECONDARY_TEXT }}>
                Every &quot;Processing&quot; row is disabled — not just discouraged. A case only enters this queue if
                the Look-Ahead Assignment Check confirmed your remaining exposure budget covers its full video duration.
              </p>
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
