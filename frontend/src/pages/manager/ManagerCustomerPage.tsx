import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionItem,
  ActionableNotification,
  Button,
  CodeSnippet,
  InlineLoading,
  InlineNotification,
  Layer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { PageHeader } from "../../components/ui/PageHeader";
import { KeyValueList, Section } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { getCustomerIntegration, listClientAccounts, listClientMessages, listReports, testIntegration } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, type IntegrationTestResult } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { ALL_CLIENTS, useClients, useClientScope } from "../../hooks/useClientScope";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { CLIENT_ROLE_LABEL, CLIENT_ROLE_SCOPE, responsibilityBoundary } from "../../design-tokens/deliveryLabels";
import { formatPeriod, formatShortDateTime } from "../../utils/formatPeriod";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

const SAMPLE_PAYLOAD = `{
  "delivery_id": "DEL-RCS-7Q3M-K91X",
  "case_id": "RCS-7Q3M-K91X",
  "outcome": "POLICY_VIOLATION_FOUND",
  "final_severity": "S3",
  "completed_at": "2026-10-05T14:22:00+11:00"
}`;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Customer & integration (B2B spec S1). With no Client selected it lists every connection; with one selected it is
 * that Client's page, in the order a Manager asks: does anything need me, how are results arriving, who is there,
 * and only then whether the connection itself works. The set-up detail sits in a closed accordion for the integration
 * owner. Kept light on purpose (B2B stays high level): no pricing, contracts or user management.
 */
export function ManagerCustomerPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const handleSessionExpiry = useSessionExpiryHandler();
  const { selected, clients } = useClients();
  const { setClientId } = useClientScope();
  const clientId = selected?.organisation_id ?? null;
  const { data, error, reload } = useStaffQuery(
    (t) => (clientId ? getCustomerIntegration(clientId, t) : Promise.resolve(null)),
    clientId ?? "none",
  );
  const reports = useStaffQuery(listReports);
  const accounts = useStaffQuery((t) => (clientId ? listClientAccounts(clientId, t) : Promise.resolve([])), clientId ?? "none");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<IntegrationTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  async function runTest() {
    if (!token) return;
    setTesting(true);
    setResult(null);
    setTestError(null);
    try {
      setResult(await testIntegration(clientId ?? "", token));
      reload();
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setTestError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setTesting(false);
    }
  }

  const messages = useStaffQuery(listClientMessages);
  const latestReleased = reports.data?.find((r) => r.status === "RELEASED" && r.organisation_id === clientId);
  const ready = data?.status === "READY";
  const inFlight = data ? data.health.pending + data.health.retrying : 0;
  const sent = data ? data.health.success + data.health.needs_attention + inFlight : 0;
  const waitingMessages = messages.data
    ? messages.data.filter((m) => m.organisation_id === clientId && m.status !== "ANSWERED").length
    : null;

  // With no Client selected, the page is the list of them: each Client's connection and delivery health on one line,
  // so the state of every connection can be read without opening any.
  const everyone = useStaffQuery(
    (t) => (clientId ? Promise.resolve([]) : Promise.all(clients.map((c) => getCustomerIntegration(c.organisation_id, t)))),
    `${clientId ?? "all"}:${clients.map((c) => c.organisation_id).join(",")}`,
  );

  return (
    <ManagerLayout clientScope>
      <PageHeader
        breadcrumb={
          <ManagerBreadcrumb
            trail={[
              { label: "Deliveries", to: "/manager/deliveries" },
              selected
                ? { label: "Client connections", to: "/manager/customers/communityhub", onClick: () => setClientId(ALL_CLIENTS) }
                : { label: "Client connections" },
              ...(selected ? [{ label: selected.name }] : []),
            ]}
          />
        }
        title={selected?.name ?? "Client connections"}
        subtitle={
          selected
            ? (data?.description.split(" · ")[0] ?? "Client")
            : "How RCS delivers results to each Client, and whether each connection is working."
        }
      />
      {!selected && everyone.data && (
        <Layer>
          <Table aria-label="Client connections">
            <TableHead>
              <TableRow>
                <TableHeader>Client</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Connection</TableHeader>
                <TableHeader>Delivered</TableHeader>
                <TableHeader>Failed</TableHeader>
                <TableHeader>Last tested</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {everyone.data.map((c) => (
                <TableRow
                  key={c.organisation_id}
                  onClick={() => setClientId(c.organisation_id)}
                  style={{ cursor: "pointer" }}
                >
                  <TableCell style={{ fontWeight: 600 }}>
                    <button
                      type="button"
                      className="cds--link rcs-link-button rcs-link-button--plain"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientId(c.organisation_id);
                      }}
                    >
                      {c.name}
                    </button>
                  </TableCell>
                  <TableCell>{c.description.split(" · ")[0]}</TableCell>
                  <TableCell>
                    <StatusTag tone={c.status === "READY" ? "success" : "error"} size="sm">
                      {c.status === "READY" ? "Connected" : "Needs attention"}
                    </StatusTag>
                  </TableCell>
                  <TableCell className="rcs-mono">{c.health.success}</TableCell>
                  <TableCell className="rcs-mono">{c.health.needs_attention}</TableCell>
                  <TableCell>{c.last_tested_at ? formatShortDateTime(c.last_tested_at) : "Not tested"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Layer>
      )}
      <LoadState error={error} loading={Boolean(selected) && !data && !error} what="this Client" />
      {data && selected && (
        <div className="rcs-client-page">
          {/* What needs the Manager comes first; when nothing does, the figures below say so on their own. */}
          {!ready ? (
            <ActionableNotification
              kind="error"
              lowContrast
              inline
              hideCloseButton
              title={`RCS can't reach ${selected.name} right now.`}
              subtitle="Results keep retrying automatically. Retest once their team says it's fixed."
              actionButtonLabel="Retest connection"
              onActionButtonClick={runTest}
              style={{ maxWidth: "100%" }}
            />
          ) : (
            data.health.needs_attention > 0 && (
              <ActionableNotification
                kind="warning"
                lowContrast
                inline
                hideCloseButton
                title={`${data.health.needs_attention} ${data.health.needs_attention === 1 ? "result" : "results"} didn't reach ${selected.name}.`}
                subtitle="RCS stopped retrying. Check what went wrong and resend."
                actionButtonLabel="Review"
                onActionButtonClick={() => navigate("/manager/deliveries?status=needs-attention")}
                style={{ maxWidth: "100%" }}
              />
            )
          )}

          <dl className="rcs-val-summary rcs-val-summary--four" aria-label={`${selected.name} at a glance`}>
            <div>
              <dt>Results delivered</dt>
              <dd>
                {data.health.success}
                <span className="rcs-val-of"> of {sent}</span>
              </dd>
              <dd className="rcs-val-note">
                {data.last_delivery_at ? `Last one ${formatRelativeTime(data.last_delivery_at)}.` : "None sent yet."}
                {inFlight > 0 ? ` ${inFlight} on the way.` : ""}
              </dd>
            </div>
            <div>
              <dt>Didn&apos;t arrive</dt>
              <dd>{data.health.needs_attention}</dd>
              <dd className="rcs-val-note">
                {data.health.needs_attention > 0 ? "Need checking and resending." : "Nothing to fix."}
              </dd>
            </div>
            <div>
              <dt>Messages waiting</dt>
              <dd>{waitingMessages ?? "—"}</dd>
              <dd className="rcs-val-note">
                {waitingMessages ? (
                  <RouterLink className="cds--link" to="/manager/messages">
                    Reply to {selected.name}
                  </RouterLink>
                ) : (
                  "All answered."
                )}
              </dd>
            </div>
            <div>
              <dt>Latest report</dt>
              <dd className="rcs-val-text">
                {latestReleased ? formatPeriod(latestReleased.period_start, latestReleased.period_end) : "—"}
              </dd>
              <dd className="rcs-val-note">
                {latestReleased ? (
                  <RouterLink className="cds--link" to={`/manager/reports/${encodeURIComponent(latestReleased.report_id)}`}>
                    Open report
                  </RouterLink>
                ) : (
                  "None released yet."
                )}
              </dd>
            </div>
          </dl>

          <div className="rcs-client-columns">
            <Section
              id="client-accounts"
              title={`People at ${selected.name}`}
              description="Who can sign in to the Client portal, and what each of them sees."
            >
              {accounts.data ? (
                <ul className="rcs-people">
                  {accounts.data.map((a) => (
                    <li key={a.user_id} className="rcs-person">
                      <span className="rcs-person-avatar" aria-hidden="true">
                        {initialsOf(a.display_name)}
                      </span>
                      <span className="rcs-person-text">
                        <span className="rcs-person-name">
                          {a.display_name}
                          <StatusTag tone="neutral" size="sm">
                            {CLIENT_ROLE_LABEL[a.role]}
                          </StatusTag>
                        </span>
                        <span className="rcs-helper">{CLIENT_ROLE_SCOPE[a.role]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rcs-helper">{accounts.error ? "Couldn't load accounts." : "Loading…"}</p>
              )}
              <p className="rcs-helper">{responsibilityBoundary(selected.name)}</p>
            </Section>

            <Section
              id="connection"
              title="Connection"
              description="Test it if results stop arriving."
              actions={
                <StatusTag tone={ready ? "success" : "error"} size="sm">
                  {ready ? "Connected" : "Needs attention"}
                </StatusTag>
              }
            >
              <p className="rcs-body">
                {data.last_tested_at ? (
                  <>
                    Last tested{" "}
                    <time dateTime={data.last_tested_at} title={formatShortDateTime(data.last_tested_at)}>
                      {formatRelativeTime(data.last_tested_at)}
                    </time>
                    .
                  </>
                ) : (
                  "Not tested yet."
                )}
              </p>
              <div>
                {testing ? (
                  <InlineLoading description="Sending a test result…" status="active" />
                ) : (
                  <Button kind="tertiary" size="md" onClick={runTest}>
                    Test connection
                  </Button>
                )}
              </div>
              {/* Where the outcome of the test appears. */}
              <div aria-live="polite">
                {result && (
                  <InlineNotification
                    kind={result.ok ? "success" : "error"}
                    lowContrast
                    title={result.ok ? `${result.message}.` : "Test failed."}
                    subtitle={result.ok ? `Responded in ${result.latency_ms} ms.` : result.message}
                    onClose={() => setResult(null)}
                  />
                )}
                {testError && (
                  <InlineNotification kind="error" lowContrast role="alert" title="Couldn't run the test." subtitle={testError} />
                )}
              </div>
            </Section>
          </div>

          {/* The set-up detail is for whoever maintains the connection, so it is one step away rather than on the page. */}
          <Accordion>
            <AccordionItem title="Technical details for the integration owner">
              <div className="flex flex-col gap-6">
                <p className="rcs-body">
                  Each completed result is sent automatically to {selected.name}. A failed send is retried, and every
                  result carries a unique ID, so it is never processed twice.
                </p>
                <KeyValueList
                  mono={["Destination"]}
                  items={[
                    { label: "Destination", value: data.destination_masked },
                    { label: "Method", value: data.method },
                    { label: "Authentication", value: data.auth_method },
                    { label: "Retry policy", value: data.retry_policy },
                    { label: "Duplicate protection", value: data.idempotency },
                  ]}
                />
                <div className="flex flex-col gap-2">
                  <h3 className="rcs-subheading">Example of what the Client receives</h3>
                  <CodeSnippet type="multi" feedback="Copied" aria-label="Example result payload" wrapText>
                    {SAMPLE_PAYLOAD}
                  </CodeSnippet>
                  <p className="rcs-helper">
                    A source link is added only when the Reporter gave one. Narrative summaries, footage, Auditor identity
                    and wellbeing information are never sent.
                  </p>
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </ManagerLayout>
  );
}
