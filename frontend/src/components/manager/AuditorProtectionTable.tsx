import { Link as RouterLink, useNavigate } from "react-router-dom";
import { DataTable, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { ChevronRight } from "@carbon/icons-react";
import type { AuditorOverviewRow } from "../../services/types";
import { ExposureBar } from "../exposure/ExposureBar";
import { ExposureStateTag } from "./ManagerBits";
import { StatusTag } from "../ui/StatusTag";
import { cooldownSummary } from "../../design-tokens/managerLabels";
import {
  AVAILABILITY_LABEL,
  AVAILABILITY_TONE,
  availabilityOf,
  protectionNeed,
  type Availability,
} from "../../design-tokens/intelligenceLabels";

const STATE_RANK = { UNDER: 0, APPROACHING: 1, AT_LIMIT: 2 } as const;
const AVAILABILITY_RANK: Record<Availability, number> = {
  AVAILABLE: 0,
  COOLDOWN: 1,
  NO_NEW_CASES: 2,
  SOS_PROTECTION: 3,
};

const HEADERS = [
  { key: "auditor", header: "Auditor", sortable: true },
  { key: "exposure", header: "Exposure today", sortable: true },
  { key: "state", header: "State", sortable: true },
  { key: "cooldown", header: "Cooldown", sortable: false },
  { key: "active", header: "Active cases", sortable: true },
  { key: "availability", header: "Availability", sortable: true },
  { key: "open", header: "Open", sortable: false },
] as const;

/**
 * Auditor protection & availability (Sprint 3 extras §1.2 widget 3). Ordered
 * by protection need (an open SOS, then exposure against each Auditor's own
 * limit), never by productivity. MR-SOS-07: no check-in counts, support
 * tallies, cooldown frequency or rankings. Break requests and check-ins stay
 * in the Auditor's own record; Needs Attention counts the breaks waiting.
 */
export function AuditorProtectionTable({ rows, now }: { rows: AuditorOverviewRow[]; now: number }) {
  const navigate = useNavigate();
  const ordered = [...rows].sort((a, b) => protectionNeed(b) - protectionNeed(a));
  const byId = new Map(ordered.map((row) => [row.auditor_id, row]));
  // Cell values are what Carbon sorts by; each cell renders from the original row.
  const tableRows = ordered.map((row) => {
    const availability = availabilityOf(row, now);
    return {
      id: row.auditor_id,
      auditor: row.display_name,
      exposure: row.exposure_limit_minutes ? row.exposure_minutes_today / row.exposure_limit_minutes : 0,
      state: STATE_RANK[row.exposure_state],
      cooldown: "",
      active: row.active_case_count,
      availability: AVAILABILITY_RANK[availability],
      open: "",
    };
  });

  return (
    <DataTable rows={tableRows} headers={HEADERS.map(({ key, header }) => ({ key, header }))} isSortable>
      {({ rows: sorted, headers, getHeaderProps, getRowProps, getTableProps }) => (
        <Layer>
          <Table {...getTableProps()} aria-label="Auditor protection and availability">
            <TableHead>
              <TableRow>
                {headers.map((header) => {
                  const spec = HEADERS.find((h) => h.key === header.key);
                  const { key, ...props } = getHeaderProps({ header, isSortable: spec?.sortable ?? false });
                  return (
                    <TableHeader key={key} {...props}>
                      {header.key === "open" ? <span className="cds--visually-hidden">Open</span> : header.header}
                    </TableHeader>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((tableRow) => {
                const row = byId.get(tableRow.id)!;
                const availability = availabilityOf(row, now);
                const url = `/manager/auditors/${encodeURIComponent(row.auditor_id)}`;
                const { key, ...rowProps } = getRowProps({ row: tableRow });
                return (
                  <TableRow
                    key={key}
                    {...rowProps}
                    // The whole row opens the Auditor for mouse users; the name is
                    // the real link for keyboard and screen-reader users.
                    onClick={() => navigate(url)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <RouterLink to={url} className="cds--link" onClick={(e) => e.stopPropagation()}>
                        {row.display_name}
                      </RouterLink>
                    </TableCell>
                    <TableCell>
                      <ExposureBar
                        surface="light"
                        width={160}
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
                    <TableCell className="rcs-mono">{row.active_case_count}</TableCell>
                    <TableCell>
                      <StatusTag tone={AVAILABILITY_TONE[availability]} size="sm">
                        {AVAILABILITY_LABEL[availability]}
                      </StatusTag>
                    </TableCell>
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
    </DataTable>
  );
}
