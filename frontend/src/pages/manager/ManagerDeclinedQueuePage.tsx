import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { mono, secondaryText } from "../../components/manager/managerStyles";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { listDeclinedCases } from "../../services";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { declineReasonLabel } from "../../design-tokens/declineReasons";
import { formatDayTime } from "../../utils/formatRelativeTime";

/**
 * Declined / Reassignment queue (Manager Figma 119:289): declined cases
 * awaiting a Manager decision, with the structured decline reason (MR-CR-02,
 * MR-CR-04). There is deliberately no per-Auditor decline-count column:
 * declining is a supported wellbeing action, not something to scrutinise
 * (AR-DF-03 / MR-CR-04 no-scrutiny principle).
 */
export function ManagerDeclinedQueuePage() {
  const navigate = useNavigate();
  const { data, error } = useStaffQuery(listDeclinedCases);

  return (
    <ManagerLayout>
      <ManagerBreadcrumb trail={[{ label: "Overview", to: "/manager" }, { label: "Reassignment queue" }]} />
      <PageHeader title="Reassignment queue" subtitle="Cases an Auditor declined, most severe first. Pick who takes each one." />
      <LoadState error={error} loading={!data && !error} what="cases awaiting reassignment" />
      {data && data.length === 0 && <p style={secondaryText}>No cases are waiting for a reassignment decision.</p>}
      {data && data.length > 0 && (
        <Layer>
          <Table aria-label="Declined cases awaiting a decision">
            <TableHead>
              <TableRow>
                <TableHeader>Case ID</TableHeader>
                <TableHeader>Auditor</TableHeader>
                <TableHeader>Severity</TableHeader>
                <TableHeader>Decline reason</TableHeader>
                <TableHeader>Time declined</TableHeader>
                <TableHeader>
                  <span className="cds--visually-hidden">Action</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Most severe first, then oldest: the order to decide in. */}
              {[...data]
                .sort(
                  (a, b) =>
                    (b.severity_tier ?? "").localeCompare(a.severity_tier ?? "") ||
                    Date.parse(a.declined_at) - Date.parse(b.declined_at),
                )
                .map((row) => (
                <TableRow
                  key={row.case_id}
                  onClick={() => navigate(`/manager/cases/${encodeURIComponent(row.case_id)}/review`)}
                  style={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <RouterLink
                      to={`/manager/cases/${encodeURIComponent(row.case_id)}/review`}
                      className="cds--link"
                      onClick={(e) => e.stopPropagation()}
                      style={{ ...mono, fontSize: 12 }}
                    >
                      {row.case_id}
                    </RouterLink>
                  </TableCell>
                  <TableCell>{row.auditor_name}</TableCell>
                  <TableCell>{row.severity_tier ? <SeverityTag tier={row.severity_tier} size="sm" /> : "—"}</TableCell>
                  <TableCell>{declineReasonLabel(row.reason)}</TableCell>
                  <TableCell style={{ color: "var(--cds-text-secondary)" }}>{formatDayTime(row.declined_at)}</TableCell>
                  <TableCell>
                    <Button
                      kind="tertiary"
                      size="sm"
                      aria-label={`Reassign case ${row.case_id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/manager/cases/${encodeURIComponent(row.case_id)}/review`);
                      }}
                    >
                      Reassign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Layer>
      )}
    </ManagerLayout>
  );
}
