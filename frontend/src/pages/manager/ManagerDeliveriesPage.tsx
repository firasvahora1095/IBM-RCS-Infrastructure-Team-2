import { useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Button,
  Grid,
  Column,
  Layer,
  ContentSwitcher,
  Pagination,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatTile } from "../../components/ui/StatTile";
import { StatusTag } from "../../components/ui/StatusTag";
import { EmptyState } from "../../components/ui/Blocks";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { listDeliveries } from "../../services";
import type { Delivery } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { PAYLOAD_OUTCOME_LABEL } from "../../design-tokens/deliveryLabels";
import { formatDayTime } from "../../utils/formatRelativeTime";

const HEADERS = [
  { key: "case", header: "Case" },
  { key: "outcome", header: "Outcome" },
  { key: "severity", header: "Final severity" },
  { key: "moderation", header: "Moderation status" },
  { key: "delivery", header: "Delivery status" },
  { key: "attempts", header: "Attempts" },
  { key: "last", header: "Last attempt" },
];

/**
 * Deliveries (B2B spec S8a): the Manager's exception queue for automatic
 * case result handoff to CommunityHub. Moderation status and delivery status
 * are separate columns, because a failed delivery never reopens a case.
 * Opens on "Needs attention" when anything does, since normal deliveries
 * need no Manager action at all.
 */
export function ManagerDeliveriesPage() {
  const { data, error } = useStaffQuery(listDeliveries);
  const [params, setParams] = useSearchParams();
  const [now] = useState(() => Date.now());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const needsAttention = useMemo(() => (data ?? []).filter((d) => d.delivery_status === "NEEDS_ATTENTION"), [data]);
  const wantsAttention = params.get("status") === "needs-attention";
  const tabIndex = wantsAttention || (params.get("status") === null && needsAttention.length > 0) ? 0 : 1;
  const rows: Delivery[] = tabIndex === 0 ? needsAttention : (data ?? []);

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      success: list.filter((d) => d.delivery_status === "SUCCESS").length,
      pending: list.filter((d) => d.delivery_status === "PENDING").length,
      retrying: list.filter((d) => d.delivery_status === "RETRYING").length,
      attention: needsAttention.length,
    };
  }, [data, needsAttention]);

  const [query, setQuery] = useState("");
  const needle = query.trim().toUpperCase();
  const filtered = needle
    ? rows.filter((d) => d.case_id.toUpperCase().includes(needle) || d.delivery_id.toUpperCase().includes(needle))
    : rows;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <ManagerLayout>
      <PageHeader
        title="Deliveries"
        subtitle="Completed case results are sent to CommunityHub automatically. You only need to act when a delivery keeps failing."
        actions={
          <Button kind="tertiary" size="md" as={RouterLink} to="/manager/customers/communityhub">
            CommunityHub connection
          </Button>
        }
      />
      <LoadState error={error} loading={!data && !error} what="deliveries" />
      {data && (
        <>
          <Grid className="rcs-grid" condensed>
            <Column sm={2} md={2} lg={4}>
              <StatTile
                label="Needs attention"
                value={counts.attention}
                tone={counts.attention ? "error" : "neutral"}
                helper={counts.attention ? "Failed after automatic retries" : "All clear"}
              />
            </Column>
            <Column sm={2} md={2} lg={4}>
              <StatTile
                label="Retrying"
                value={counts.retrying}
                helper="Automatic retry scheduled"
              />
            </Column>
            <Column sm={2} md={2} lg={4}>
              <StatTile label="Pending" value={counts.pending} helper="First attempt in progress" />
            </Column>
            <Column sm={2} md={2} lg={4}>
              <StatTile
                label="Successful"
                value={counts.success}
                helper="Received by CommunityHub"
              />
            </Column>
          </Grid>

          {/* A view filter over one table, so a ContentSwitcher (as on the
              upload page), not Tabs, which would need a panel per tab. */}
          <div style={{ maxInlineSize: 480 }}>
            <ContentSwitcher
              selectedIndex={tabIndex}
              size="md"
              aria-label="Delivery views"
              onChange={({ index }) => {
                setPage(1);
                setParams(index === 0 ? { status: "needs-attention" } : { status: "all" }, { replace: true });
              }}
            >
              <Switch name="needs-attention" text={`Needs attention (${counts.attention})`} />
              <Switch name="all" text={`All deliveries (${data.length})`} />
            </ContentSwitcher>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title={tabIndex === 0 ? "Nothing needs attention" : "No deliveries yet"}
              body={
                tabIndex === 0
                  ? "Every completed case result has been delivered or is still being retried automatically."
                  : "When an Auditor completes a case, its result is delivered to CommunityHub and appears here."
              }
            />
          ) : (
            <Layer>
              <TableContainer>
                <TableToolbar aria-label="Delivery table toolbar">
                  <TableToolbarContent>
                    <TableToolbarSearch
                      persistent
                      labelText="Search deliveries"
                      placeholder="Search by case or delivery ID"
                      onChange={(e) => {
                        setPage(1);
                        setQuery(typeof e === "string" ? e : (e?.target as HTMLInputElement | undefined)?.value ?? "");
                      }}
                    />
                  </TableToolbarContent>
                </TableToolbar>
                <Table aria-label="Case result deliveries to CommunityHub">
                  <TableHead>
                    <TableRow>
                      {HEADERS.map((h) => (
                        <TableHeader key={h.key}>{h.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pageRows.map((d) => {
                      const last = d.attempts.at(-1);
                      const attention = d.delivery_status === "NEEDS_ATTENTION";
                      return (
                        <TableRow
                          key={d.delivery_id}
                          style={attention ? { boxShadow: "inset 3px 0 0 var(--cds-support-error)" } : undefined}
                        >
                          <TableCell>
                            <RouterLink
                              className="cds--link rcs-mono"
                              to={`/manager/deliveries/${encodeURIComponent(d.delivery_id)}`}
                              aria-label={`Delivery for case ${d.case_id}`}
                            >
                              {d.case_id}
                            </RouterLink>
                          </TableCell>
                          <TableCell>{PAYLOAD_OUTCOME_LABEL[d.outcome]}</TableCell>
                          <TableCell>
                            <SeverityTag tier={d.final_severity} size="sm" />
                          </TableCell>
                          <TableCell>
                            <StatusTag kind="moderation" value="COMPLETE" />
                          </TableCell>
                          <TableCell>
                            <StatusTag kind="delivery" value={d.delivery_status} />
                          </TableCell>
                          <TableCell className="rcs-mono">{d.attempts.length === 0 ? "—" : d.attempts.length}</TableCell>
                          <TableCell>{last ? formatDayTime(last.at, now) : "Scheduled"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filtered.length === 0 && (
                  <p className="rcs-helper" style={{ padding: "1rem" }}>
                    No deliveries match your search.
                  </p>
                )}
                {filtered.length > 10 && (
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    pageSizes={[10, 25, 50]}
                    totalItems={filtered.length}
                    onChange={({ page: p, pageSize: size }) => {
                      setPage(p);
                      setPageSize(size);
                    }}
                  />
                )}
              </TableContainer>
            </Layer>
          )}
        </>
      )}
    </ManagerLayout>
  );
}
