import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Layer,
  OverflowMenu,
  OverflowMenuItem,
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
import { getAuditorOverview } from "../../services";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { cooldownSummary } from "../../design-tokens/managerLabels";

/**
 * Oversight Dashboard (Manager Figma 78:69): every Auditor under this
 * Manager's oversight with exposure against their limit, the Under /
 * Approaching / At limit state, cooldown time left, and cases today
 * (MR-OV-01–05). Rows are ordered by how close each Auditor is to their limit,
 * so the people who most need attention come first.
 */
export function ManagerOversightDashboardPage() {
  const navigate = useNavigate();
  const { data, error } = useStaffQuery(getAuditorOverview);
  const [now] = useState(() => Date.now());

  return (
    <ManagerLayout>
      <h1 style={pageTitle}>Oversight Dashboard</h1>
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
                      <OverflowMenu
                        flipped
                        size="md"
                        iconDescription={`Actions for ${row.display_name}`}
                        aria-label={`Actions for ${row.display_name}`}
                      >
                        <OverflowMenuItem itemText="View details" onClick={() => navigate(detailUrl)} />
                        <OverflowMenuItem
                          itemText="Adjust exposure limit"
                          onClick={() => navigate(`${detailUrl}#exposure-limit`)}
                        />
                      </OverflowMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Layer>
      )}
    </ManagerLayout>
  );
}
