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
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";

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

/** Only cases the AI has finished analysing can be opened for review. */
function isOpenable(status: InternalCaseStatus): boolean {
  return status === "READY_FOR_REVIEW" || status === "AUDITOR_REVIEW";
}

/**
 * Auditor Dashboard / Case Queue (Auditor Figma node 10:6).
 *
 * Differences from the Figma frame, all deliberate:
 * - No "Assigned … ago" column: GET /api/auditor/cases returns no
 *   assignment timestamp (backend gap), and a made-up time would mislead.
 * - The subtitle stops after its first sentence. The second ("open a case to
 *   see its content-warning gate") describes the Sprint 3 Content Warning
 *   Modal; in Sprint 2 the Auditor goes straight to the AI summary.
 * - The footnote keeps the "Processing rows are disabled" rule but drops the
 *   exposure-budget sentence, since exposure tracking is Sprint 3.
 */
export function AuditorDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const [cases, setCases] = useState<AuditorCaseListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  return (
    <>
      <StaffHeader role="auditor" />
      <StaffPage>
        <div className="flex flex-col gap-5">
          <h1 style={{ fontSize: 32, lineHeight: "40px", fontWeight: 600 }}>Case queue</h1>
          <p style={{ fontSize: 14, lineHeight: "20px", color: "#525252" }}>
            Cases assigned to you, in the order the system assigned them.
          </p>
        </div>

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
          <DataTableSkeleton columnCount={3} rowCount={3} showHeader={false} showToolbar={false} />
        )}

        {cases && cases.length === 0 && (
          <p style={{ fontSize: 14, color: "#525252" }}>You have no cases assigned right now.</p>
        )}

        {cases && cases.length > 0 && (
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cases.map((c) => {
                    const openable = isOpenable(c.status);
                    const caseUrl = `/auditor/cases/${encodeURIComponent(c.case_id)}`;
                    // "Every Processing row is disabled" (AR-AS-04, Figma annotation):
                    // Gray 10 cells with Gray 70 text, set per cell because Carbon
                    // paints each cell's own background over the row's. Figma dims
                    // the row to 70% opacity instead, but that drops the case ID to
                    // 3.4:1 contrast (WCAG AA needs 4.5:1); Gray 70 on Gray 10 is 7:1.
                    const cellStyle = openable ? undefined : { backgroundColor: "#f4f4f4", color: "#525252" };
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
                              {QUEUE_STATUS_LABEL[c.status]}
                            </RouterLink>
                          ) : (
                            <span style={{ color: "#525252" }} aria-disabled="true">
                              {QUEUE_STATUS_LABEL[c.status]}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Layer>
            <p style={{ fontSize: 12, lineHeight: "16px", color: "#6f6f6f" }}>
              Every &quot;Processing&quot; row is disabled — not just discouraged (AR-AS-04).
            </p>
          </>
        )}
      </StaffPage>
    </>
  );
}
