import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  DismissibleTag,
  Dropdown,
  Layer,
  Search,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Blocks";
import { LoadState } from "../../components/manager/ManagerBits";
import { mono, secondaryText } from "../../components/manager/managerStyles";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { getCaseOversight } from "../../services";
import type { ManagerCaseRow } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { inScope, useClients } from "../../hooks/useClientScope";
import { managerStatusLabel } from "../../design-tokens/managerLabels";
import { caseStatusTone } from "../../design-tokens/statusTones";
import { StatusTag } from "../../components/ui/StatusTag";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { isOpenBucket, OPEN_BUCKET_LABEL, openBucketOf } from "../../design-tokens/intelligenceLabels";

const ALL_STATUSES = "All statuses";

type SortKey = "severity" | "status" | "auditor" | "case";
/** The order a case moves through, so a status sort reads as a pipeline rather than alphabetically. */
const STATUS_ORDER = ["Processing", "Ready for review", "In review", "Complete"];

/** What a case needs from the Manager, in the order to work through them. `null` means nothing. */
type Attention = { kind: "blocked" | "reassign"; label: string; action: string } | null;

function attentionOf(row: ManagerCaseRow): Attention {
  if (row.status === "COMPLETE") return null;
  if (row.manager_flag === "SOS") return { kind: "blocked", label: "Blocked", action: "Review alert" };
  if (row.manager_flag) return { kind: "reassign", label: "Needs reassignment", action: "Review" };
  // A case with no Auditor yet is never the Manager's to push along: it is released to Auditors automatically
  // (the Super Auditor's queue, then weighted placement), so it is listed as a status, not as a task.
  return null;
}
const ATTENTION_RANK = { blocked: 0, reassign: 1 } as const;
const SEVERITY_RANK: Record<string, number> = { S4: 0, S3: 1, S2: 2, S1: 3 };
const tierOf = (row: ManagerCaseRow) => row.final_severity_tier ?? row.severity_tier;

/** The page a case's attention opens: the alert, or the reassignment decision. */
function detailHref(row: ManagerCaseRow): string {
  return row.manager_flag === "SOS" && row.sos_alert_id
    ? `/manager/sos/${encodeURIComponent(row.sos_alert_id)}`
    : `/manager/cases/${encodeURIComponent(row.case_id)}/${row.manager_flag ? "reassign" : "review"}`;
}

/**
 * Cases (Manager Figma 86:198): every case across all Auditors, searchable and filterable (MR-OV-06).
 *
 * What needs the Manager is the first thing on the page, in its own table: Blocked cases (an open SOS), cases that
 * Need Reassignment, and any case Held Back from Auditors, most severe first, each with the one action that deals
 * with it. Everything else follows in "All cases", where a tag appears only for the states that matter. Nobody
 * should have to scroll a long list looking for a coloured edge. Standard cases progress to Complete without
 * Manager approval (MR-CR-06), so they are not links.
 */
export function ManagerCaseOversightPage() {
  const navigate = useNavigate();
  const { data: allCases, error } = useStaffQuery(getCaseOversight);
  const { scope, selected } = useClients();
  const data = allCases ? allCases.filter((c) => inScope(scope, c)) : allCases;
  // The dashboard opens this list on a stage (?stage=) or a case (?search=).
  const [params, setParams] = useSearchParams();
  const rawStage = params.get("stage");
  const stage = isOpenBucket(rawStage) ? rawStage : null;
  const [query, setQuery] = useState(() => params.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const statuses = useMemo(
    () => [ALL_STATUSES, ...new Set((data ?? []).map((c) => managerStatusLabel(c.status, c.manager_flag)))],
    [data],
  );

  const matching = (data ?? []).filter((c) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || c.case_id.toLowerCase().includes(q) || (c.auditor_name ?? "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === ALL_STATUSES || managerStatusLabel(c.status, c.manager_flag) === statusFilter;
    const matchesStage = !stage || openBucketOf(c.status, c.manager_flag) === stage;
    return matchesQuery && matchesStatus && matchesStage;
  });
  const needing = matching
    .filter((c) => attentionOf(c) !== null)
    .sort(
      (a, b) =>
        ATTENTION_RANK[attentionOf(a)!.kind] - ATTENTION_RANK[attentionOf(b)!.kind] ||
        (SEVERITY_RANK[tierOf(a) ?? ""] ?? 9) - (SEVERITY_RANK[tierOf(b) ?? ""] ?? 9),
    );
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
  const others = matching
    .filter((c) => attentionOf(c) === null)
    .sort((a, b) => (sortDir === "ASC" ? 1 : -1) * compare(a, b));

  function compare(a: ManagerCaseRow, b: ManagerCaseRow): number {
      switch (sortKey) {
        case "status":
          return (
            STATUS_ORDER.indexOf(managerStatusLabel(a.status, a.manager_flag)) -
            STATUS_ORDER.indexOf(managerStatusLabel(b.status, b.manager_flag))
          );
        case "auditor":
          return (a.auditor_name ?? "~").localeCompare(b.auditor_name ?? "~");
        case "case":
          return b.case_id.localeCompare(a.case_id);
        default:
          return (SEVERITY_RANK[tierOf(a) ?? ""] ?? 9) - (SEVERITY_RANK[tierOf(b) ?? ""] ?? 9);
      }
  }

  const paged = usePagination(others, `${query}|${statusFilter}|${stage}|${sortKey}|${sortDir}`);

  return (
    <ManagerLayout clientScope>
      <PageHeader title="Cases" subtitle="Every case across all Auditors. What needs you comes first." />
      <div className="flex flex-wrap items-end gap-4">
        <div style={{ width: "100%", maxWidth: 320 }}>
          <Search
            id="case-search"
            labelText="Search by Case ID or Auditor name"
            placeholder="Search by Case ID or Auditor name"
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
      {stage && (
        <div>
          <DismissibleTag
            type="blue"
            text={`Stage: ${OPEN_BUCKET_LABEL[stage]}`}
            dismissTooltipLabel="Show all stages"
            onClose={() => {
              const next = new URLSearchParams(params);
              next.delete("stage");
              setParams(next, { replace: true });
            }}
          />
        </div>
      )}
      <LoadState error={error} loading={!data && !error} what="cases" />
      {data && needing.length > 0 && (
        <Section
          id="cases-need-you"
          title={`Needs you · ${needing.length}`}
          description="Most urgent first. Select a row, or use its button."
        >
          <Layer>
            <Table aria-label="Cases that need you">
              <TableHead>
                <TableRow>
                  <TableHeader>Case ID</TableHeader>
                  {!selected && <TableHeader>Client</TableHeader>}
                  <TableHeader>Severity</TableHeader>
                  <TableHeader>Auditor</TableHeader>
                  <TableHeader>Needs</TableHeader>
                  <TableHeader>
                    <span className="cds--visually-hidden">Action</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {needing.map((row) => {
                  const need = attentionOf(row)!;
                  const href = detailHref(row);
                  return (
                    <TableRow
                      key={row.case_id}
                      onClick={() => navigate(href)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell style={{ ...mono, fontSize: 12 }}>{row.case_id}</TableCell>
                      {!selected && <TableCell>{row.organisation_name ?? "—"}</TableCell>}
                      <TableCell>{tierOf(row) ? <SeverityTag tier={tierOf(row)!} size="sm" /> : "—"}</TableCell>
                      <TableCell>{row.auditor_name ?? "Unassigned"}</TableCell>
                      <TableCell>
                        <StatusTag tone={caseStatusTone(need.label)} size="sm">
                          {need.label}
                        </StatusTag>
                      </TableCell>
                      <TableCell style={{ textAlign: "end" }} onClick={(e) => e.stopPropagation()}>
                        <Button kind="tertiary" size="sm" onClick={() => navigate(href!)}>
                          {need.action}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Layer>
        </Section>
      )}
      {data && (
        <Section
          id="all-cases"
          title={needing.length > 0 ? `All other cases · ${others.length}` : `All cases · ${others.length}`}
        >
          <Layer>
            <Table aria-label="All cases">
              <TableHead>
                <TableRow>
                  {(
                    [
                      ["case", "Case ID"],
                      ...(!selected ? ([["client", "Client"]] as const) : []),
                      ["severity", "Severity"],
                      ["auditor", "Auditor"],
                      ["status", "Status"],
                    ] as const
                  ).map(([key, label]) =>
                    key === "client" ? (
                      <TableHeader key={key}>{label}</TableHeader>
                    ) : (
                      // Click a heading to sort by it; click again to reverse. Severity starts at the most severe.
                      <TableHeader
                        key={key}
                        isSortable
                        isSortHeader={sortKey === key}
                        sortDirection={sortKey === key ? sortDir : "NONE"}
                        onClick={() => {
                          if (sortKey === key) setSortDir(sortDir === "ASC" ? "DESC" : "ASC");
                          else {
                            setSortKey(key);
                            setSortDir("ASC");
                          }
                        }}
                      >
                        {label}
                      </TableHeader>
                    ),
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.rows.map((row) => {
                  const label = managerStatusLabel(row.status, row.manager_flag);
                  return (
                    <TableRow key={row.case_id}>
                      <TableCell style={{ ...mono, fontSize: 12 }}>{row.case_id}</TableCell>
                      {!selected && <TableCell>{row.organisation_name ?? "—"}</TableCell>}
                      <TableCell>{tierOf(row) ? <SeverityTag tier={tierOf(row)!} size="sm" /> : "—"}</TableCell>
                      <TableCell>{row.auditor_name ?? "Unassigned"}</TableCell>
                      <TableCell style={{ color: "var(--cds-text-secondary)" }}>
                        {label}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {others.length === 0 && <p style={{ ...secondaryText, padding: 16 }}>No other cases match your search.</p>}
            <TablePagination paged={paged} />
          </Layer>
        </Section>
      )}
    </ManagerLayout>
  );
}
