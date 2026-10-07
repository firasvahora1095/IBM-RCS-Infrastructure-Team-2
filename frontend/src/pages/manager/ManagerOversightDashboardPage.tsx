import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Button,
  Column,
  Grid,
  Layer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { ExposureBar } from "../../components/exposure/ExposureBar";
import { ExposureStateTag, LoadState } from "../../components/manager/ManagerBits";
import { pageTitle } from "../../components/manager/managerStyles";
import { getAuditorOverview, listDeclinedCases, listDeliveries } from "../../services";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useSosSummary } from "../../hooks/useSosSummary";
import { StatTile } from "../../components/ui/StatTile";
import { StatusTag } from "../../components/ui/StatusTag";
import type { AuditorOverviewRow } from "../../services/types";
import { Section } from "../../components/ui/Blocks";
import { cooldownSummary } from "../../design-tokens/managerLabels";
import { ChevronRight } from "@carbon/icons-react";

/**
 * Oversight Dashboard (Manager Figma 78:69): every Auditor under this
 * Manager's oversight with exposure against their limit, the Under /
 * Approaching / At limit state, cooldown time left, and cases today
 * (MR-OV-01–05). Rows are ordered by how close each Auditor is to their limit,
 * so the people who most need attention come first.
 *
 * B2B flow (spec S7): an at-a-glance strip above the table answers "what needs
 * me right now?" — open SOS, cases waiting for a reassignment decision,
 * CommunityHub handoffs that failed after automatic retries, and Auditors at
 * their daily limit. Each count links to where the Manager acts on it. This
 * is the baseline only; trends and evidence drill-down are a later feature.
 */
export function ManagerOversightDashboardPage() {
  const navigate = useNavigate();
  const { data, error } = useStaffQuery(getAuditorOverview);
  const declined = useStaffQuery(listDeclinedCases);
  const deliveries = useStaffQuery(listDeliveries);
  const sos = useSosSummary();
  const [now] = useState(() => Date.now());

  const openSos = sos?.unresolved_count ?? 0;
  const awaiting = declined.data?.length ?? 0;
  const failed = deliveries.data?.filter((d) => d.delivery_status === "NEEDS_ATTENTION").length ?? 0;
  // Support requests are quiet by design for the Auditor, so they must be loud here.
  const requestsOf = (row: AuditorOverviewRow) =>
    (row.open_requests?.break_requests ?? 0) + (row.open_requests?.talk_requests ?? 0);
  const supportWaiting = data?.reduce((sum, row) => sum + requestsOf(row), 0) ?? 0;
  const firstWithRequest = data?.find((row) => requestsOf(row) > 0);
  // Auditors who need the Manager come first: SOS, then support requests, then everyone else.
  const rows = [...(data ?? [])].sort(
    (a, b) => Number(Boolean(b.open_sos)) - Number(Boolean(a.open_sos)) || requestsOf(b) - requestsOf(a),
  );
  const delivered = deliveries.data?.filter((d) => d.delivery_status === "SUCCESS").length ?? 0;
  const inFlight =
    deliveries.data?.filter((d) => d.delivery_status === "PENDING" || d.delivery_status === "RETRYING").length ?? 0;

  // The one primary action is always the most urgent open item, in this order.
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const nextAction =
    openSos > 0
      ? { label: `Follow up ${plural(openSos, "SOS alert", "SOS alerts")}`, to: "/manager/sos" }
      : supportWaiting > 0 && firstWithRequest
        ? {
            label: `Respond to ${plural(supportWaiting, "support request", "support requests")}`,
            to: `/manager/auditors/${encodeURIComponent(firstWithRequest.auditor_id)}`,
          }
        : awaiting > 0
        ? { label: `Decide ${plural(awaiting, "declined case", "declined cases")}`, to: "/manager/reassignment" }
        : failed > 0
          ? { label: `Fix ${plural(failed, "failed delivery", "failed deliveries")}`, to: "/manager/deliveries" }
          : null;

  return (
    <ManagerLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 style={pageTitle}>Oversight Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          {nextAction && (
            <Button kind="ghost" onClick={() => navigate("/manager/audit-logs")}>
              View audit history
            </Button>
          )}
          <Button onClick={() => navigate(nextAction?.to ?? "/manager/audit-logs")}>
            {nextAction?.label ?? "View audit history"}
          </Button>
        </div>
      </div>
      <section aria-label="Needs your attention">
        <Grid className="rcs-grid" condensed>
          <Column sm={2} md={2} lg={4}>
            <StatTile
              label="Open SOS"
              value={sos ? openSos : "–"}
              tone={openSos ? "error" : "neutral"}
              helper={openSos ? "Follow up now" : "All clear"}
              to="/manager/sos"
              linkLabel={`Open SOS: ${openSos}. Go to the SOS Inbox`}
            />
          </Column>
          <Column sm={2} md={2} lg={4}>
            <StatTile
              label="Awaiting reassignment"
              value={declined.data ? awaiting : "–"}
              helper={awaiting ? "Declined cases need a decision" : "All clear"}
              to="/manager/reassignment"
              linkLabel={`Awaiting reassignment: ${awaiting}. Go to the Reassignment Queue`}
            />
          </Column>
          <Column sm={2} md={2} lg={4}>
            <StatTile
              label="Failed CommunityHub handoffs"
              value={deliveries.data ? failed : "–"}
              tone={failed ? "error" : "neutral"}
              helper={failed ? "Failed after automatic retries" : "All clear"}
              to="/manager/deliveries?status=needs-attention"
              linkLabel={`Failed CommunityHub handoffs: ${failed}. Go to Deliveries`}
            />
          </Column>
          <Column sm={2} md={2} lg={4}>
            <StatTile
              label="Support requests waiting"
              value={data ? supportWaiting : "–"}
              tone={supportWaiting ? "error" : "neutral"}
              helper={supportWaiting ? "Breaks and talk requests to answer" : "All answered"}
              to={firstWithRequest ? `/manager/auditors/${encodeURIComponent(firstWithRequest.auditor_id)}` : undefined}
              linkLabel={`Support requests waiting: ${supportWaiting}. Open the first Auditor who asked`}
            />
          </Column>
        </Grid>
      </section>
      <LoadState error={error} loading={!data && !error} what="the dashboard" />
      {data && (
        <p className="rcs-helper" style={{ fontSize: 14 }}>
          Auditors who need you are listed first. Select an auditor to see their day, answer their requests and
          adjust their exposure limit.
        </p>
      )}
      {data && (
        <Layer>
          <Table aria-label="Auditors under your oversight">
            <TableHead>
              <TableRow>
                <TableHeader>Auditor</TableHeader>
                <TableHeader>Needs you</TableHeader>
                <TableHeader>Exposure</TableHeader>
                <TableHeader>State</TableHeader>
                <TableHeader>Cooldown</TableHeader>
                <TableHeader>Cases today</TableHeader>
                <TableHeader>
                  <span className="cds--visually-hidden">Open</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const detailUrl = `/manager/auditors/${encodeURIComponent(row.auditor_id)}`;
                return (
                  <TableRow
                    key={row.auditor_id}
                    // The whole row opens the Auditor for mouse users; the name is
                    // the real link for keyboard and screen-reader users.
                    onClick={() => navigate(detailUrl)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <RouterLink to={detailUrl} className="cds--link" onClick={(e) => e.stopPropagation()}>
                        {row.display_name}
                      </RouterLink>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {row.open_sos && (
                          <StatusTag tone="error" size="sm">
                            SOS
                          </StatusTag>
                        )}
                        {(row.open_requests?.break_requests ?? 0) > 0 && (
                          <StatusTag tone="warning" size="sm">
                            Break requested
                          </StatusTag>
                        )}
                        {(row.open_requests?.talk_requests ?? 0) > 0 && (
                          <StatusTag tone="info" size="sm">
                            Wants to talk
                          </StatusTag>
                        )}
                        {!row.open_sos && requestsOf(row) === 0 && (
                          <span style={{ color: "var(--cds-text-secondary)" }}>—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ExposureBar
                        surface="light"
                        width={180}
                        minutes={row.exposure_minutes_today}
                        limit={row.exposure_limit_minutes}
                        label={`${row.exposure_minutes_today} / ${row.exposure_limit_minutes} min`}
                        ariaLabel={`${row.display_name}'s exposure today`}
                      />
                    </TableCell>
                    <TableCell>
                      <ExposureStateTag state={row.exposure_state} />
                    </TableCell>
                    <TableCell style={{ color: "var(--cds-text-secondary)" }}>
                      {cooldownSummary(row.cooldown, now)}
                    </TableCell>
                    <TableCell>{row.cases_today}</TableCell>
                    <TableCell style={{ textAlign: "right", color: "var(--cds-icon-secondary)" }}>
                      <ChevronRight aria-hidden="true" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Layer>
      )}
      {data && (
        <p className="rcs-helper">
          Daily exposure totals reset at 9:00 AM and aren&apos;t reset by cooldowns (Sprint 3 prototype rule).
        </p>
      )}
      <Section
        title="CommunityHub"
        actions={
          <RouterLink className="cds--link" to="/manager/customers/communityhub">
            View customer
          </RouterLink>
        }
      >
        <p className="rcs-body">
          {deliveries.data
            ? `${delivered} results delivered · ${inFlight} in progress · ${failed} need attention. Results go to CommunityHub automatically when an Auditor completes a case.`
            : "Loading delivery status…"}
        </p>
      </Section>
    </ManagerLayout>
  );
}
