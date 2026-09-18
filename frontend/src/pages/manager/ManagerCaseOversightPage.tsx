import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Dropdown,
  Layer,
  Search,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { mono, pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { getCaseOversight } from "../../services";
import type { ManagerCaseRow } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { managerStatusLabel } from "../../design-tokens/managerLabels";

const ALL_STATUSES = "All statuses";

/**
 * Consolidated Case Oversight (Manager Figma 86:198): every case across all
 * Auditors, searchable and filterable (MR-OV-06). SOS and Declined rows are
 * distinguished by a flag tag and a left accent bar, not colour alone, and
 * link to the SOS alert or the case review. Standard rows aren't links:
 * they progress to Complete without Manager approval (MR-CR-06).
 */
export function ManagerCaseOversightPage() {
  const { data, error } = useStaffQuery(getCaseOversight);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const statuses = useMemo(
    () => [ALL_STATUSES, ...new Set((data ?? []).map((c) => managerStatusLabel(c.status, c.manager_flag)))],
    [data],
  );

  const rows = (data ?? []).filter((c) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || c.case_id.toLowerCase().includes(q) || (c.auditor_name ?? "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === ALL_STATUSES || managerStatusLabel(c.status, c.manager_flag) === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <ManagerLayout>
      <h1 style={pageTitle}>Consolidated Case Oversight</h1>
      <div className="flex flex-wrap items-end gap-4">
        <div style={{ width: "100%", maxWidth: 320 }}>
          <Search
            id="case-search"
            labelText="Search cases or Auditors"
            placeholder="Search cases or Auditors..."
            size="lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div style={{ width: "100%", maxWidth: 240 }}>
          <Dropdown
            id="status-filter"
            titleText="Filter by status"
            hideLabel
            label="Filter by status"
            items={statuses}
            selectedItem={statusFilter}
            itemToString={(item) => (item === ALL_STATUSES ? "Filter: All statuses" : `Filter: ${item ?? ""}`)}
            onChange={({ selectedItem }) => setStatusFilter(selectedItem ?? ALL_STATUSES)}
          />
        </div>
      </div>
      <LoadState error={error} loading={!data && !error} what="cases" />
      {data && (
        <Layer>
          <Table aria-label="All cases">
            <TableHead>
              <TableRow>
                <TableHeader>Case ID</TableHeader>
                <TableHeader>Auditor</TableHeader>
                <TableHeader>S-tier</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Flag</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((c) => (
                <CaseRow key={c.case_id} row={c} />
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && <p style={{ ...secondaryText, padding: 16 }}>No cases match your search.</p>}
        </Layer>
      )}
    </ManagerLayout>
  );
}

function CaseRow({ row }: { row: ManagerCaseRow }) {
  const flagged = row.manager_flag !== null;
  const href =
    row.manager_flag === "SOS" && row.sos_alert_id
      ? `/manager/sos/${encodeURIComponent(row.sos_alert_id)}`
      : row.manager_flag === "DECLINED"
        ? `/manager/cases/${encodeURIComponent(row.case_id)}/review`
        : null;
  const accent = flagged
    ? {
        boxShadow: `inset 3px 0 0 ${row.manager_flag === "SOS" ? "var(--cds-support-error)" : "var(--cds-border-inverse)"}`,
      }
    : undefined;

  return (
    <TableRow>
      <TableCell style={{ ...mono, fontSize: 12, ...accent }}>
        {href ? (
          <RouterLink to={href} className="cds--link" style={mono}>
            {row.case_id}
          </RouterLink>
        ) : (
          row.case_id
        )}
      </TableCell>
      <TableCell>{row.auditor_name ?? "Unassigned"}</TableCell>
      <TableCell>{row.severity_tier ? <SeverityTag tier={row.severity_tier} size="sm" /> : "—"}</TableCell>
      <TableCell style={{ color: "var(--cds-text-secondary)" }}>
        {managerStatusLabel(row.status, row.manager_flag)}
      </TableCell>
      <TableCell>
        {row.manager_flag === "SOS" && (
          <Tag type="red" size="sm" style={{ margin: 0 }}>
            SOS
          </Tag>
        )}
        {row.manager_flag === "DECLINED" && (
          <Tag type="high-contrast" size="sm" style={{ margin: 0 }}>
            Declined
          </Tag>
        )}
      </TableCell>
    </TableRow>
  );
}
