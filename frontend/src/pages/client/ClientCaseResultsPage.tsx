import { useMemo, useState } from "react";
import {
  ContentSwitcher,
  InlineNotification,
  Layer,
  Search,
  SkeletonText,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ClientHeader } from "../../components/shell/ClientHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { clientListCaseResults } from "../../services";
import type { CaseResult, DeliveredOutcome } from "../../services/types";
import { useClientQuery } from "../../hooks/useClientQuery";
import { PAYLOAD_OUTCOME_LABEL, PLATFORM_ACTION_LABEL } from "../../design-tokens/deliveryLabels";
import { ACCESS_DISCLOSURE } from "../../design-tokens/reportLabels";
import { formatShortDateTime } from "../../utils/formatPeriod";

const FILTERS: { key: "ALL" | DeliveredOutcome; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "POLICY_VIOLATION_FOUND", label: "Violation" },
  { key: "NO_VIOLATION_FOUND", label: "No violation" },
  { key: "CLOSED_NO_REASSIGNMENT", label: "Closed" },
];

const OUTCOME_TONE = {
  POLICY_VIOLATION_FOUND: "error",
  NO_VIOLATION_FOUND: "neutral",
  CLOSED_NO_REASSIGNMENT: "warning",
} as const;

/** The post's own ID, readable in a table, from CommunityHub's post link. */
function postLabel(url: string | null): string {
  if (!url) return "Not attached";
  const match = url.match(/post\/([\w-]+)/);
  return match ? `Post ${match[1]}` : url;
}

/**
 * Case results (CommunityHub Trust & Safety and Admin): every result RCS has
 * sent, newest first, as a record CommunityHub can reconcile against its own
 * moderation queue. Agreed facts only: never a narrative, footage, transcript
 * or reviewer identity, and never RCS's delivery errors.
 */
export function ClientCaseResultsPage() {
  const { data, error } = useClientQuery(clientListCaseResults);
  const [filter, setFilter] = useState<"ALL" | DeliveredOutcome>("ALL");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((r) => filter === "ALL" || r.outcome === filter)
      .filter((r) => !q || r.case_id.toLowerCase().includes(q) || (r.post_url ?? "").toLowerCase().includes(q));
  }, [data, filter, query]);
  const waiting = (data ?? []).filter((r) => r.status === "DELIVERED" && !r.platform_action).length;

  return (
    <>
      <ClientHeader />
      <StaffPage maxWidth={1184}>
        <PageHeader
          title="Case results"
          subtitle={
            data
              ? `Every result RCS has sent to CommunityHub. ${waiting} delivered result${waiting === 1 ? "" : "s"} still waiting for an action in your moderation queue.`
              : "Every result RCS has sent to CommunityHub."
          }
        />
        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Couldn't load case results."
            subtitle={error.message}
            style={{ maxWidth: "100%" }}
          />
        )}
        {!data && !error && <SkeletonText paragraph lineCount={6} />}
        {data && data.length === 0 && <EmptyState title="No results yet" body="Results appear here as soon as RCS sends them." />}
        {data && data.length > 0 && (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div style={{ minWidth: 320 }}>
                <ContentSwitcher
                  size="md"
                  selectedIndex={FILTERS.findIndex((f) => f.key === filter)}
                  onChange={({ index }) => setFilter(FILTERS[index ?? 0].key)}
                >
                  {FILTERS.map((f) => (
                    <Switch key={f.key} name={f.key} text={f.label} />
                  ))}
                </ContentSwitcher>
              </div>
              <div style={{ flex: "1 1 240px", maxWidth: 360 }}>
                <Search
                  size="md"
                  labelText="Search by case ID or post link"
                  placeholder="Search by case ID or post link"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <Layer>
              <Table aria-label="Case results">
                <TableHead>
                  <TableRow>
                    <TableHeader>Case ID</TableHeader>
                    <TableHeader>Post</TableHeader>
                    <TableHeader>RCS result</TableHeader>
                    <TableHeader>Final severity</TableHeader>
                    <TableHeader>Completed</TableHeader>
                    <TableHeader>Received</TableHeader>
                    <TableHeader>Your team&apos;s action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r: CaseResult) => (
                    <TableRow key={r.delivery_id}>
                      <TableCell style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{r.case_id}</TableCell>
                      <TableCell>
                        {r.post_url ? (
                          <a className="cds--link" href={r.post_url} target="_blank" rel="noreferrer">
                            {postLabel(r.post_url)}
                          </a>
                        ) : (
                          <span className="rcs-helper">Not attached</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusTag tone={OUTCOME_TONE[r.outcome]}>{PAYLOAD_OUTCOME_LABEL[r.outcome]}</StatusTag>
                      </TableCell>
                      <TableCell>{r.final_severity ? <SeverityTag tier={r.final_severity} size="sm" /> : "—"}</TableCell>
                      <TableCell>{formatShortDateTime(r.completed_at)}</TableCell>
                      <TableCell>
                        {r.status === "DELIVERED" && r.delivered_at ? (
                          formatShortDateTime(r.delivered_at)
                        ) : (
                          <StatusTag tone="info">On its way</StatusTag>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.platform_action ? (
                          <StatusTag tone={r.platform_action.action === "REMOVED" ? "success" : "neutral"}>
                            {PLATFORM_ACTION_LABEL[r.platform_action.action]}
                          </StatusTag>
                        ) : r.status === "DELIVERED" ? (
                          <StatusTag tone="warning">Needs action</StatusTag>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Layer>
            {rows.length === 0 && <p className="rcs-helper">No results match these filters.</p>}
          </>
        )}
        <p className="rcs-helper">
          Results include only the case ID, the post link, the outcome, the final severity and when it was decided. RCS
          never shares footage, summaries or who reviewed a case. {ACCESS_DISCLOSURE}
        </p>
      </StaffPage>
    </>
  );
}
