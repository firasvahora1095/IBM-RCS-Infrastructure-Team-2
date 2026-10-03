import { useEffect, useState } from "react";
import { Button, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TextInput } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { mono, pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { useAuth } from "../../hooks/useAuth";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { getAuditHistory } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AuditLogHistory, AuditLogQuery } from "../../services/types";

export function ManagerAuditHistoryPage() {
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const [caseId, setCaseId] = useState("");
  const [action, setAction] = useState("");
  const [query, setQuery] = useState<AuditLogQuery>({ limit: 25 });
  const [history, setHistory] = useState<AuditLogHistory | null>(null);
  const [loading, setLoading] = useState(true);
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
    <ManagerLayout showNav={false}>
      <ManagerBreadcrumb trail={[{ label: "Dashboard", to: "/manager" }, { label: "Audit history" }]} />
      <h1 style={pageTitle}>Audit history</h1>
      <p style={secondaryText}>Browse saved audit events. Expand an entry to see the values recorded.</p>
      <form
        className="flex flex-wrap items-end gap-4"
        style={{ marginTop: 24, marginBottom: 24 }}
        onSubmit={(event) => {
          event.preventDefault();
          loadHistory({
            case_id: caseId.trim() || undefined,
            action: action.trim() || undefined,
            limit: 25,
          });
        }}
      >
        <div style={{ flex: "1 1 220px", maxWidth: 320 }}>
          <TextInput
            id="audit-case-id"
            labelText="Case ID (optional)"
            placeholder="All cases"
            maxLength={20}
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 260px", maxWidth: 360 }}>
          <TextInput
            id="audit-action"
            labelText="Action (optional)"
            placeholder="e.g. AI_ANALYSIS_COMPLETED"
            maxLength={50}
            value={action}
            onChange={(event) => setAction(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          Query audit logs
        </Button>
      </form>
      {loading && (
        <p role="status" style={secondaryText}>
          Loading audit history…
        </p>
      )}
      <LoadState error={error} loading={loading} what="audit history" />
      {history && (
        <>
          <p role="status" style={{ ...secondaryText, marginBottom: 16 }}>
            {history.entries.length === 0
              ? "No audit records match these filters."
              : `Showing ${history.entries.length} stored audit entries, most recent first.`}
          </p>
          {history.entries.length > 0 && (
            <Layer>
              <div style={{ overflowX: "auto" }}>
                <Table aria-label="Stored audit history">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Entry ID</TableHeader>
                      <TableHeader>Case ID</TableHeader>
                      <TableHeader>Action</TableHeader>
                      <TableHeader>Actor</TableHeader>
                      <TableHeader>Recorded</TableHeader>
                      <TableHeader>Stored values</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.entries.map((entry) => (
                      <TableRow key={entry.audit_log_id}>
                        <TableCell style={mono}>{entry.audit_log_id}</TableCell>
                        <TableCell style={mono}>{entry.case_id}</TableCell>
                        <TableCell style={{ ...mono, overflowWrap: "anywhere" }}>{entry.action}</TableCell>
                        <TableCell>{entry.actor}</TableCell>
                        <TableCell>
                          <time dateTime={entry.created_at} title={entry.created_at}>
                            {new Date(entry.created_at).toLocaleString(undefined, { timeZoneName: "short" })}
                          </time>
                        </TableCell>
                        <TableCell>
                          <details>
                            <summary className="cds--link">View stored values</summary>
                            <dl style={{ marginTop: 12 }}>
                              <dt>Before</dt>
                              <dd>
                                <StoredValue value={entry.before_value} />
                              </dd>
                              <dt>After</dt>
                              <dd>
                                <StoredValue value={entry.after_value} />
                              </dd>
                            </dl>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Layer>
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

function StoredValue({ value }: { value: unknown }) {
  return (
    <pre
      style={{
        ...mono,
        fontSize: 12,
        maxWidth: "36rem",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        marginBottom: 12,
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
