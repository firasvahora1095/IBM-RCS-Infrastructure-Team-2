import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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
} from "@carbon/react";
import type { ComparisonRow, GovernanceSummary, SeverityTier } from "../../services/types";
import { SeverityTag } from "../severity/SeverityTag";
import { StatusTag } from "../ui/StatusTag";
import { TablePagination, usePagination } from "../ui/TablePagination";
import { Figure } from "./ManagerBits";
import { mono, secondaryText } from "./managerStyles";
import { formatShortDateTime } from "../../utils/formatPeriod";

const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];
const ALL = "All";
const RESULT_FILTERS = [ALL, "AI Override", "AI Match"] as const;

/** The labels the BA standard uses (extra-features §11.1). "AI wrong" and "Auditor wrong" are never used. */
const RESULT_LABEL = { override: "AI Override", match: "AI Match" } as const;

const delta = (n: number | null) => (n === null ? "—" : n > 0 ? `+${n}` : String(n));

/**
 * Validation & Audit, section B: where the AI's first severity and the
 * Auditor's final severity differ, case by case. Aggregate figures first, then
 * a filterable table. A difference is evidence to look at, not a verdict on
 * either side, and no Auditor is named (Sprint 3 extras §1.2 widget 4).
 */
export function AiAuditorComparison({ data }: { data: GovernanceSummary }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<(typeof RESULT_FILTERS)[number]>(ALL);
  const [aiTier, setAiTier] = useState<string>(ALL);
  const [finalTier, setFinalTier] = useState<string>(ALL);

  const overrides = data.override_patterns.reduce((sum, p) => sum + p.count, 0);
  const rate = data.compared_cases ? Math.round((overrides / data.compared_cases) * 1000) / 10 : 0;
  const top = data.override_patterns[0];

  const rows = useMemo(
    () =>
      data.comparisons.filter((r) => {
        const q = query.trim().toLowerCase();
        if (q && !r.case_id.toLowerCase().includes(q)) return false;
        if (result === "AI Override" && !r.override) return false;
        if (result === "AI Match" && r.override) return false;
        if (aiTier !== ALL && r.ai_tier !== aiTier) return false;
        if (finalTier !== ALL && r.final_tier !== finalTier) return false;
        return true;
      }),
    [data.comparisons, query, result, aiTier, finalTier],
  );
  const paged = usePagination(rows, `${query}|${result}|${aiTier}|${finalTier}`);

  return (
    <>
      <p className="rcs-helper">
        A score change within the same tier also counts as an override. Unavailable legacy values stay blank; accepting
        an AI score is not an independent human measurement.
      </p>
      <dl className="rcs-figure-row">
        <Figure label="Cases compared" value={data.compared_cases} />
        <Figure label="Overridden by an Auditor" value={overrides} />
        <Figure label="Override rate" value={`${rate}%`} />
        <Figure label="Most common change" value={top ? `${top.from} → ${top.to}` : "None yet"} />
      </dl>

      <div className="flex flex-wrap items-end gap-4">
        <div style={{ inlineSize: "100%", maxInlineSize: 240 }}>
          <Search
            id="comparison-search"
            labelText="Search by case ID"
            placeholder="Search by case ID"
            size="md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <FilterDropdown
          id="comparison-result"
          label="Result"
          items={[...RESULT_FILTERS]}
          value={result}
          onChange={(v) => setResult(v as typeof result)}
        />
        <FilterDropdown
          id="comparison-ai"
          label="AI severity"
          items={[ALL, ...TIERS]}
          value={aiTier}
          onChange={setAiTier}
        />
        <FilterDropdown
          id="comparison-final"
          label="Final severity"
          items={[ALL, ...TIERS]}
          value={finalTier}
          onChange={setFinalTier}
        />
      </div>

      {rows.length === 0 ? (
        <p style={secondaryText}>
          {data.comparisons.length === 0 ? "No completed cases to compare yet." : "No cases match these filters."}
        </p>
      ) : (
        <Layer>
          <Table aria-label="AI severity against final Auditor severity, by case">
            <TableHead>
              <TableRow>
                <TableHeader>Case ID</TableHeader>
                <TableHeader>AI</TableHeader>
                <TableHeader>Final</TableHeader>
                <TableHeader>Result</TableHeader>
                <TableHeader>Score change</TableHeader>
                <TableHeader>Reason</TableHeader>
                <TableHeader>Decided</TableHeader>
                <TableHeader>Provenance</TableHeader>
                <TableHeader>
                  <span className="cds--visually-hidden">Audit trail</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.rows.map((r) => (
                <ComparisonTableRow key={r.case_id} row={r} />
              ))}
            </TableBody>
          </Table>
        </Layer>
      )}

      <TablePagination paged={paged} />
      {data.compared_cases > data.comparisons.length && (
        <p className="rcs-helper">
          Showing the {data.comparisons.length} most recent of {data.compared_cases} compared cases.
        </p>
      )}
    </>
  );
}

function FilterDropdown({
  id,
  label,
  items,
  value,
  onChange,
}: {
  id: string;
  label: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ inlineSize: "100%", maxInlineSize: 180 }}>
      <Dropdown
        id={id}
        titleText={label}
        label={label}
        items={items}
        selectedItem={value}
        itemToString={(item) => item ?? ""}
        onChange={({ selectedItem }) => onChange(selectedItem ?? ALL)}
        size="md"
      />
    </div>
  );
}

function ComparisonTableRow({ row }: { row: ComparisonRow }) {
  const navigate = useNavigate();
  return (
    <TableRow
      onClick={() => navigate(`/manager/audit-logs?case=${encodeURIComponent(row.case_id)}`)}
      style={{ cursor: "pointer" }}
    >
      <TableCell style={{ ...mono, fontSize: 12 }}>{row.case_id}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityTag tier={row.ai_tier} size="sm" />
          {row.ai_score !== null && <span className="rcs-helper rcs-mono">{row.ai_score}</span>}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityTag tier={row.final_tier} size="sm" />
          {row.auditor_score !== null && <span className="rcs-helper rcs-mono">{row.auditor_score}</span>}
        </div>
      </TableCell>
      <TableCell>
        {/* Text in both states, so the result never rests on colour. A difference is worth a look but isn't an error, so it is yellow, not red. */}
        <StatusTag tone={row.override ? "warning" : "neutral"} size="sm">
          {row.override ? RESULT_LABEL.override : RESULT_LABEL.match}
        </StatusTag>
      </TableCell>
      <TableCell style={mono}>{delta(row.score_delta)}</TableCell>
      <TableCell>
        {row.override_reason ? (
          <div style={{ width: 200, overflowX: "auto", fontSize: 14, lineHeight: "20px", whiteSpace: "nowrap" }}>
            {row.override_reason}
          </div>
        ) : (
          <span style={{ color: "var(--cds-text-secondary)" }}>—</span>
        )}
      </TableCell>
      <TableCell style={{ whiteSpace: "nowrap", fontSize: 14 }}>{formatShortDateTime(row.decided_at)}</TableCell>
      <TableCell>{row.provenance === "live" ? "Recorded live run" : "Legacy / demo — unverified"}</TableCell>
      <TableCell>
        <RouterLink
          className="cds--link"
          to={`/manager/audit-logs?case=${encodeURIComponent(row.case_id)}`}
          aria-label={`View audit trail for ${row.case_id}`}
          onClick={(e) => e.stopPropagation()}
        >
          Audit trail
        </RouterLink>
      </TableCell>
    </TableRow>
  );
}
