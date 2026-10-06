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
import { Section } from "../../components/ui/Blocks";
import { cooldownSummary } from "../../design-tokens/managerLabels";

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
  const atLimit = data?.filter((row) => row.exposure_state === "AT_LIMIT").length ?? 0;
  const delivered = deliveries.data?.filter((d) => d.delivery_status === "SUCCESS").length ?? 0;
  const inFlight =
    deliveries.data?.filter((d) => d.delivery_status === "PENDING" || d.delivery_status === "RETRYING").length ?? 0;

  return (
    <ManagerLayout>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 style={pageTitle}>Oversight Dashboard</h1>
        <Button kind="tertiary" onClick={() => navigate("/manager/audit-logs")}>
          View audit history
        </Button>
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
              label="At daily exposure limit"
              value={data ? atLimit : "–"}
              helper={atLimit ? "No new cases for them today" : "All below their limit"}
            />
          </Column>
        </Grid>
      </section>
      <LoadState error={error} loading={!data && !error} what="the dashboard" />
      {data && (
        <Layer>
          <Table aria-label="Auditors under your oversight">
            <TableHead>
              <TableRow>
                <TableHeader>Auditor</TableHeader>
                <TableHeader>Exposure</TableHeader>
                <TableHeader>State</TableHeader>
                <TableHeader>Cooldown</TableHeader>
                <TableHeader>Cases today</TableHeader>
                <TableHeader>
                  <span className="cds--visually-hidden">Actions</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => {
                const detailUrl = `/manager/auditors/${encodeURIComponent(row.auditor_id)}`;
                return (
                  <TableRow key={row.auditor_id}>
                    <TableCell>
                      <RouterLink to={detailUrl} className="cds--link">
                        {row.display_name}
                      </RouterLink>
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
                    <TableCell>
                      <Button
                        kind="tertiary"
                        size="sm"
                        onClick={() => navigate(`${detailUrl}?mode=exposure`)}
                      >
                        Adjust exposure limit
                      </Button>
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
