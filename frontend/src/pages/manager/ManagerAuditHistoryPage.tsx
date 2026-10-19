import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  ComboBox,
  DismissibleTag,
  Layer,
  Table,
  TableBody,
  TableCell,
  TableExpandHeader,
  TableExpandRow,
  TableExpandedRow,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { KeyValueList } from "../../components/ui/Blocks";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { formatShortDateTime } from "../../utils/formatPeriod";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { mono, secondaryText } from "../../components/manager/managerStyles";
import { useAuth } from "../../hooks/useAuth";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { getAuditHistory } from "../../services";
import { AUDIT_ACTIONS, auditActionLabel } from "../../design-tokens/auditActions";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AuditLogHistory, AuditLogQuery } from "../../services/types";

export function ManagerAuditHistoryPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  // "Audit trail" links elsewhere (e.g. Validation & Audit) open this already filtered to one case.
  const [params] = useSearchParams();
  const linkedCase = params.get("case")?.trim() ?? "";
  const [caseId, setCaseId] = useState(linkedCase);
  const [action, setAction] = useState("");
  const [query, setQuery] = useState<AuditLogQuery>({ limit: 100, case_id: linkedCase || undefined });
  const [history, setHistory] = useState<AuditLogHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const paged = usePagination(history?.entries ?? [], `${query.case_id}|${query.action}|${query.before_id}|${history?.entries.length}`);
  const [error, setError] = useState<string | null>(null);

  function loadHistory(nextQuery: AuditLogQuery) {
    setLoading(true);
    setHistory(null);
    setError(null);
    setQuery(nextQuery);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getAuditHistory(token, query)
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((err: unknown) => {
        if (cancelled || handleSessionExpiry(err)) return;
        setError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, query, handleSessionExpiry]);

  return (
    <ManagerLayout>
      <ManagerBreadcrumb
        trail={[
          { label: "Validation", to: "/manager/validation" },
          { label: "Audit history", to: query.case_id ? "/manager/audit-logs" : undefined },
          ...(query.case_id ? [{ label: query.case_id }] : []),
        ]}
      />
      <PageHeader
        title={query.case_id ? `Audit trail for ${query.case_id}` : "Audit history"}
        subtitle={
          query.case_id
            ? "Every change recorded for this case: who did what, and when."
            : "Every change recorded across all cases: who did what, and when. Newest first."
        }
      />
      <form
        className="flex flex-wrap items-end gap-4"
        style={{ marginTop: 8 }}
        onSubmit={(event) => {
          event.preventDefault();
          loadHistory({
            case_id: caseId.trim() || undefined,
            action: action.trim() || undefined,
            limit: 100,
          });
        }}
      >
        <div style={{ flex: "1 1 220px", maxWidth: 320 }}>
          <TextInput
            id="audit-case-id"
            labelText="Case ID"
            size="lg"
            placeholder="All cases, or e.g. AR-2026-00340"
            maxLength={20}
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 260px", maxWidth: 360 }}>
          {/* A list, so the Manager can see every recorded action instead of guessing a code. */}
          <ComboBox
            id="audit-action"
            titleText="Action"
            size="lg"
            placeholder="All actions"
            items={[...AUDIT_ACTIONS]}
            itemToString={(item) => (item ? item.label : "")}
            selectedItem={AUDIT_ACTIONS.find((a) => a.code === action) ?? null}
            onChange={({ selectedItem }) => setAction(selectedItem?.code ?? "")}
          />
        </div>
        <Button type="submit" size="lg" disabled={loading}>
          Show audit history
        </Button>
      </form>
      <p className="rcs-helper">Action examples: created, reassigned, closed. Type in the Action box to filter.</p>
      {loading && (
        <p role="status" style={secondaryText}>
          Loading audit history…
        </p>
      )}
      <LoadState error={error} loading={loading} what="audit history" />
      {history && (
        <>
          {/* What is being shown, and how to widen it: the filters are repeated as chips with one way to clear them. */}
          <div className="flex flex-wrap items-center gap-2">
            <span role="status" style={secondaryText}>
              {history.entries.length === 0
                ? "No audit records found."
                : `${history.entries.length} ${history.entries.length === 1 ? "record" : "records"}, newest first.`}
            </span>
            {query.case_id && (
              <DismissibleTag
                type="gray"
                text={`Case: ${query.case_id}`}
                dismissTooltipLabel="Show all cases"
                onClose={() => {
                  setCaseId("");
                  loadHistory({ ...query, case_id: undefined, before_id: undefined });
                }}
              />
            )}
            {query.action && (
              <DismissibleTag
                type="gray"
                text={`Action: ${auditActionLabel(query.action)}`}
                dismissTooltipLabel="Show all actions"
                onClose={() => {
                  setAction("");
                  loadHistory({ ...query, action: undefined, before_id: undefined });
                }}
              />
            )}
          </div>
          {history.entries.length === 0 && (
            <p style={secondaryText}>
              {query.case_id || query.action
                ? "No records match these filters. Check the Case ID or remove a filter."
                : "No records have been saved yet."}
            </p>
          )}
          {history.entries.length > 0 && (
            <>
              <Layer>
                <Table aria-label="Audit history">
                  <TableHead>
                    <TableRow>
                      <TableExpandHeader aria-label="Expand to see what changed" />
                      <TableHeader>Time</TableHeader>
                      <TableHeader>Event</TableHeader>
                      <TableHeader>Case</TableHeader>
                      <TableHeader>By</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paged.rows.flatMap((entry) => {
                      const open = expanded.has(entry.audit_log_id);
                      const toggle = () =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(entry.audit_log_id)) next.delete(entry.audit_log_id);
                          else next.add(entry.audit_log_id);
                          return next;
                        });
                      return [
                        <TableExpandRow
                          key={entry.audit_log_id}
                          isExpanded={open}
                          aria-label={`Show what changed: ${auditActionLabel(entry.action)}`}
                          onExpand={toggle}
                          style={{ cursor: "pointer" }}
                        >
                          {/* Every cell opens what changed, so the whole row works, not only the chevron. */}
                          <TableCell onClick={toggle}>{formatShortDateTime(entry.created_at)}</TableCell>
                          <TableCell onClick={toggle}>{auditActionLabel(entry.action)}</TableCell>
                          <TableCell style={mono} onClick={toggle}>
                            {entry.case_id || "—"}
                          </TableCell>
                          <TableCell onClick={toggle}>{auditActorLabel(entry.actor)}</TableCell>
                        </TableExpandRow>,
                        open && (
                          <TableExpandedRow key={`${entry.audit_log_id}-details`} colSpan={5}>
                            <WhatChanged before={entry.before_value} after={entry.after_value} />
                          </TableExpandedRow>
                        ),
                      ];
                    })}
                  </TableBody>
                </Table>
              </Layer>
              <TablePagination paged={paged} />
            </>
          )}
          <div className="flex flex-wrap gap-4" style={{ marginTop: 16 }}>
            {query.before_id !== undefined && (
              <Button
                kind="tertiary"
                disabled={loading}
                onClick={() => loadHistory({ ...query, before_id: undefined })}
              >
                Show latest entries
              </Button>
            )}
            {history.next_before_id !== null && (
              <Button
                kind="tertiary"
                disabled={loading}
                onClick={() => loadHistory({ ...query, before_id: history.next_before_id! })}
              >
                Load older entries
              </Button>
            )}
          </div>
        </>
      )}
    </ManagerLayout>
  );
}

/** What an entry recorded, as plain facts: no JSON. A single detail is one line; several values are a list. */
function WhatChanged({ before, after }: { before: unknown; after: unknown }) {
  const beforeFacts = facts(before);
  const afterFacts = facts(after);
  if (beforeFacts.length === 0 && afterFacts.length === 0) {
    return <p className="rcs-helper">Nothing further was recorded for this event.</p>;
  }
  return (
    <div className="rcs-call-details">
      {beforeFacts.length > 0 && (
        <section aria-label="Before">
          <h4 className="rcs-subheading">Before</h4>
          <KeyValueList items={beforeFacts} />
        </section>
      )}
      {afterFacts.length > 0 && (
        <section aria-label={beforeFacts.length > 0 ? "After" : "Recorded"}>
          <h4 className="rcs-subheading">{beforeFacts.length > 0 ? "After" : "Recorded"}</h4>
          <KeyValueList items={afterFacts} />
        </section>
      )}
    </div>
  );
}

/** "detail" and other stored fields as label and value, with the field name made readable. */
function facts(value: unknown): { label: string; value: string }[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") return [{ label: "Detail", value: String(value) }];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([key, v]) => ({
      label: key === "detail" ? "Detail" : key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()),
      value: typeof v === "object" ? JSON.stringify(v) : String(v),
    }));
}

/** System actors read as words; staff IDs are shown as they are. */
function auditActorLabel(actor: string): string {
  return actor.toLowerCase() === "system" ? "System" : actor;
}
