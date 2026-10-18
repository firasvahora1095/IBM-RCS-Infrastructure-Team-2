import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Button,
  Layer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { GenerateReportDialog } from "../../components/manager/GenerateReportDialog";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusTag } from "../../components/ui/StatusTag";
import { EmptyState } from "../../components/ui/Blocks";
import { listReports } from "../../services";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { inScope, useClients } from "../../hooks/useClientScope";
import { formatPeriod, formatShortDateTime } from "../../utils/formatPeriod";

/**
 * Client reports (B2B spec S9a). Reports are generated on demand for a
 * customer and period, from the same completed case records the Manager
 * sees elsewhere, then reviewed and released. Report cadence is on demand
 * by design (Sprint 3 extras §16.10).
 */
export function ManagerReportsPage() {
  const navigate = useNavigate();
  const { data: allReports, error } = useStaffQuery(listReports);
  const { scope, selected } = useClients();
  const [open, setOpen] = useState(false);
  const data = allReports ? allReports.filter((r) => inScope(scope, r)) : allReports;

  return (
    <ManagerLayout clientScope>
      <PageHeader
        title="Client reports"
        subtitle={`Aggregate service reports${selected ? ` for ${selected.name}` : " for each Client"}. You review and release each one; individual case decisions are never re-approved here.`}
        actions={
          <>
            <Button kind="tertiary" onClick={() => navigate("/manager/customers/communityhub")}>
              Client connection
            </Button>
            <Button onClick={() => setOpen(true)}>
              Generate report
            </Button>
          </>
        }
      />
      <LoadState error={error} loading={!data && !error} what="reports" />
      {data && data.length === 0 && (
        <EmptyState
          title="No reports yet"
          body="Generate a draft for a period. You'll review it before the Client can see it."
          action={<Button onClick={() => setOpen(true)}>Generate report</Button>}
        />
      )}
      {data && data.length > 0 && (
        <Layer>
          <TableContainer>
            <Table aria-label="Client service reports">
              <TableHead>
                <TableRow>
                  <TableHeader>Period</TableHeader>
                  {!selected && <TableHeader>Client</TableHeader>}
                  <TableHeader>Report</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Cases completed</TableHeader>
                  <TableHeader>Generated</TableHeader>
                  <TableHeader>Released</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((r) => (
                  <TableRow
                    key={r.report_id}
                    onClick={() => navigate(`/manager/reports/${encodeURIComponent(r.report_id)}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <RouterLink
                        className="cds--link"
                        to={`/manager/reports/${encodeURIComponent(r.report_id)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatPeriod(r.period_start, r.period_end)}
                      </RouterLink>
                    </TableCell>
                    {!selected && <TableCell>{r.organisation_name}</TableCell>}
                    <TableCell className="rcs-mono">
                      {r.report_id} · v{r.version}
                    </TableCell>
                    <TableCell>
                      <StatusTag kind="report" value={r.status} />
                    </TableCell>
                    <TableCell className="rcs-mono">{r.metrics.cases_completed}</TableCell>
                    <TableCell>{formatShortDateTime(r.generated_at)}</TableCell>
                    <TableCell>
                      {r.released_at ? `${formatShortDateTime(r.released_at)} · ${r.released_by}` : "Not released"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Layer>
      )}

      <GenerateReportDialog open={open} onClose={() => setOpen(false)} />
    </ManagerLayout>
  );
}
