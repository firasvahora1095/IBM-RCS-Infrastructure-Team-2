import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  InlineNotification,
  Layer,
  Search,
  Select,
  SelectItem,
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
import type { ServiceReport as ClientReport } from "../../services/types";
import { useClientQuery } from "../../hooks/useClientQuery";
import { useClientAuth } from "../../hooks/useClientAuth";
import { ACCESS_DISCLOSURE, CLIENT_EMPTY } from "../../design-tokens/reportLabels";
import { formatPeriod, formatShortDate, wholeMonthName } from "../../utils/formatPeriod";

type SortKey = "period" | "cases" | "violations" | "released";

/**
 * CommunityHub reports (B2B spec S12a): the reports RCS has released to the
 * signed-in user's organisation, newest first. Nothing else from RCS is
 * reachable from here.
 */
export function ClientReportsPage() {
  const navigate = useNavigate();
  const { session } = useClientAuth();
  const { data, error } = useClientQuery(clientListReports);
  const [year, setYear] = useState("ALL");
  const [query, setQuery] = useState("");
  // Newest first by default, the order a reader wants; any column can be sorted.
  const [sort, setSort] = useState<{ key: SortKey; dir: "ASC" | "DESC" }>({ key: "period", dir: "DESC" });

  const years = useMemo(
    () => [...new Set((data ?? []).map((r) => r.period_start.slice(0, 4)))].sort().reverse(),
    [data],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const value = (r: ClientReport): number | string => {
      switch (sort.key) {
        case "period":
          return r.period_start;
        case "cases":
          return r.metrics.cases_completed;
        case "violations":
          return r.metrics.violation_count;
        case "released":
          return r.released_at ?? "";
      }
    };
    return (data ?? [])
      .filter((r) => year === "ALL" || r.period_start.startsWith(year))
      .filter(
        (r) =>
          !q ||
          r.report_id.toLowerCase().includes(q) ||
          (wholeMonthName(r.period_start, r.period_end) ?? formatPeriod(r.period_start, r.period_end))
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => {
        const x = value(a);
        const y = value(b);
        const diff = x < y ? -1 : x > y ? 1 : 0;
        return sort.dir === "ASC" ? diff : -diff;
      });
  }, [data, year, query, sort]);
  const paged = usePagination(rows, `${year}|${query}|${sort.key}|${sort.dir}`);
  const sortProps = (key: SortKey) => ({
    isSortable: true,
    isSortHeader: sort.key === key,
    sortDirection: sort.key === key ? sort.dir : ("NONE" as const),
    onClick: () => setSort((cur) => ({ key, dir: cur.key === key && cur.dir === "DESC" ? "ASC" : "DESC" })),
  });

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
          <div className="flex flex-wrap items-end gap-4">
            <div style={{ minWidth: 180 }}>
              <Select
                id="report-year"
                size="md"
                labelText="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <SelectItem value="ALL" text="All years" />
                {years.map((y) => (
                  <SelectItem key={y} value={y} text={y} />
                ))}
              </Select>
            </div>
            <div style={{ flex: "1 1 260px", maxWidth: 420 }}>
              <Search
                size="md"
                labelText="Search by month or report ID"
                placeholder="Search by month or report ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <Layer>
            <Table aria-label="Released reports">
              <TableHead>
                <TableRow>
                  <TableHeader {...sortProps("period")}>Period</TableHeader>
                  <TableHeader>Report</TableHeader>
                  <TableHeader {...sortProps("cases")}>Cases completed</TableHeader>
                  <TableHeader {...sortProps("violations")}>Policy violations</TableHeader>
                  <TableHeader {...sortProps("released")}>Released</TableHeader>
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
          {rows.length === 0 && <p className="rcs-helper">No reports match these filters.</p>}
        </>
      )}
      <p className="rcs-helper">{ACCESS_DISCLOSURE}</p>
    </ClientLayout>
  );
}
