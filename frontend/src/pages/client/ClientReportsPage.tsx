import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  InlineNotification,
  Layer,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ClientLayout } from "../../components/layout/ClientLayout";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/Blocks";
import { clientListReports } from "../../services";
import { useClientQuery } from "../../hooks/useClientQuery";
import { useClientAuth } from "../../hooks/useClientAuth";
import { ACCESS_DISCLOSURE, CLIENT_EMPTY } from "../../design-tokens/reportLabels";
import { formatPeriod, formatShortDate, wholeMonthName } from "../../utils/formatPeriod";

/**
 * CommunityHub reports (B2B spec S12a): the reports RCS has released to the
 * signed-in user's organisation, newest first. Nothing else from RCS is
 * reachable from here.
 */
export function ClientReportsPage() {
  const navigate = useNavigate();
  const { session } = useClientAuth();
  const { data, error } = useClientQuery(clientListReports);
  const paged = usePagination(data ?? []);

  return (
    <ClientLayout maxWidth={1056}>
      <PageHeader
        title="Service reports"
        subtitle={`Reports released to ${session?.organisationName ?? "your organisation"} by RCS. Each covers the cases reviewed in its period.`}
      />
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title="Couldn't load your reports."
          subtitle={error.message}
          style={{ maxWidth: "100%" }}
        />
      )}
      {!data && !error && <SkeletonText paragraph lineCount={4} />}
      {data && data.length === 0 && <EmptyState title="No reports yet" body={CLIENT_EMPTY} />}
      {data && data.length > 0 && (
        <>
          <Layer>
            <Table aria-label="Released reports">
              <TableHead>
                <TableRow>
                  <TableHeader>Period</TableHeader>
                  <TableHeader>Report</TableHeader>
                  <TableHeader>Cases completed</TableHeader>
                  <TableHeader>Policy violations</TableHeader>
                  <TableHeader>Released</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.rows.map((r) => {
                  const decided = r.metrics.violation_count + r.metrics.no_violation_count;
                  const to = `/client/reports/${encodeURIComponent(r.report_id)}`;
                  return (
                    <TableRow key={r.report_id} onClick={() => navigate(to)} style={{ cursor: "pointer" }}>
                      <TableCell>
                        <RouterLink
                          className="cds--link"
                          to={to}
                          aria-label={`${formatPeriod(r.period_start, r.period_end)} report, released ${formatShortDate(r.released_at!)}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {wholeMonthName(r.period_start, r.period_end) ?? formatPeriod(r.period_start, r.period_end)}
                        </RouterLink>
                      </TableCell>
                      <TableCell className="rcs-mono">
                        {r.report_id} · v{r.version}
                      </TableCell>
                      <TableCell className="rcs-mono">{r.metrics.cases_completed}</TableCell>
                      <TableCell className="rcs-mono">
                        {r.metrics.violation_count} of {decided}
                      </TableCell>
                      <TableCell>{formatShortDate(r.released_at!)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Layer>
          <TablePagination paged={paged} />
        </>
      )}
      <p className="rcs-helper">{ACCESS_DISCLOSURE}</p>
    </ClientLayout>
  );
}
