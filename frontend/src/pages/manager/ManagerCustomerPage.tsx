import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, CodeSnippet, Column, Grid, InlineLoading, InlineNotification } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { PageHeader } from "../../components/ui/PageHeader";
import { KeyValueList, Section } from "../../components/ui/Blocks";
import { SegmentedBar } from "../../components/ui/Charts";
import { StatusTag } from "../../components/ui/StatusTag";
import { getCustomerIntegration, listClientAccounts, listReports, testIntegration } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, type IntegrationTestResult } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useSessionExpiryHandler } from "../../hooks/useSessionExpiryHandler";
import { CLIENT_ROLE_LABEL, CLIENT_ROLE_SCOPE, RESPONSIBILITY_BOUNDARY } from "../../design-tokens/deliveryLabels";
import { formatPeriod, formatShortDateTime } from "../../utils/formatPeriod";

const SAMPLE_PAYLOAD = `{
  "delivery_id": "DEL-RCS-7Q3M-K91X",
  "case_id": "RCS-7Q3M-K91X",
  "outcome": "POLICY_VIOLATION_FOUND",
  "final_severity": "S3",
  "completed_at": "2026-10-05T14:22:00+11:00"
}`;

/**
 * Customer & integration (B2B spec S1): CommunityHub is a customer, RCS knows
 * where to send each completed result, and the connection works. Kept light
 * on purpose (B2B stays high level): no pricing, contracts, user management
 * or organisation switcher.
 */
export function ManagerCustomerPage() {
  const { token } = useAuth();
  const handleSessionExpiry = useSessionExpiryHandler();
  const { data, error, reload } = useStaffQuery((t) => getCustomerIntegration("COMMUNITYHUB", t));
  const reports = useStaffQuery(listReports);
  const accounts = useStaffQuery((t) => listClientAccounts("COMMUNITYHUB", t));
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<IntegrationTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  async function runTest() {
    if (!token) return;
    setTesting(true);
    setResult(null);
    setTestError(null);
    try {
      setResult(await testIntegration("COMMUNITYHUB", token));
      reload();
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setTestError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setTesting(false);
    }
  }

  const latestReleased = reports.data?.find((r) => r.status === "RELEASED");
  const ready = data?.status === "READY";

  return (
    <ManagerLayout>
      <PageHeader
        breadcrumb={<ManagerBreadcrumb trail={[{ label: "Dashboard", to: "/manager" }, { label: "CommunityHub" }]} />}
        title="CommunityHub"
        subtitle={data?.description ?? "Social platform"}
      />
      <LoadState error={error} loading={!data && !error} what="this customer" />
      {data && (
        <Grid className="rcs-grid">
          <Column sm={4} md={8} lg={10} className="flex flex-col gap-6">
            <section className="rcs-section" aria-labelledby="connection-heading">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 id="connection-heading" className="rcs-section-title">
                      CommunityHub connection
                    </h2>
                    <StatusTag tone={ready ? "success" : "error"}>{ready ? "Connected" : "Needs attention"}</StatusTag>
                  </div>
                  <p className="rcs-helper">
                    {data.last_tested_at ? `Last tested ${formatShortDateTime(data.last_tested_at)}` : "Not tested yet"}
                    {data.last_delivery_at && ` · Last result delivered ${formatShortDateTime(data.last_delivery_at)}`}
                  </p>
                </div>
                {testing ? (
                  <InlineLoading description="Sending a test delivery…" status="active" />
                ) : (
                  <Button kind={ready ? "tertiary" : "primary"} onClick={runTest}>
                    {ready ? "Test connection" : "Retest connection"}
                  </Button>
                )}
              </div>
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
              {!ready && (
                <p className="rcs-body">Deliveries keep retrying automatically until the connection is fixed.</p>
              )}
            </section>

            <Section title="How results are delivered" description="Set up once with CommunityHub. A simulated destination in this prototype.">
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
            </Section>

            <Section
              title="What CommunityHub receives"
              description="Sent automatically when an Auditor completes a case. No Manager approval step."
            >
              <CodeSnippet type="multi" feedback="Copied" aria-label="Example result payload" wrapText>
                {SAMPLE_PAYLOAD}
              </CodeSnippet>
              <p className="rcs-helper">
                A source link is added only when the Reporter gave one. It's never required. Narrative summaries,
                footage, Auditor identity and wellbeing information are never sent.
              </p>
            </Section>
          </Column>

          <Column sm={4} md={8} lg={6} className="flex flex-col gap-6">
            <Section
              title="Client accounts"
              description="Who at CommunityHub can see what. Each account sees only what its role needs."
            >
              {accounts.data ? (
                <ul className="flex flex-col gap-3">
                  {accounts.data.map((a) => (
                    <li key={a.user_id} className="flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{a.display_name}</span>
                        <StatusTag tone="neutral" size="sm">
                          {CLIENT_ROLE_LABEL[a.role]}
                        </StatusTag>
                      </span>
                      <span className="rcs-helper">
                        <span className="rcs-mono">{a.user_id}</span> · {CLIENT_ROLE_SCOPE[a.role]}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rcs-helper">{accounts.error ? "Couldn't load accounts." : "Loading…"}</p>
              )}
            </Section>
            <Section title="Who decides what">
              <p className="rcs-body">{RESPONSIBILITY_BOUNDARY}</p>
            </Section>

            <Section
              title="Delivery health"
              actions={
                <RouterLink className="cds--link" to="/manager/deliveries">
                  View deliveries
                </RouterLink>
              }
            >
              <SegmentedBar
                label="Delivery health"
                segments={[
                  { key: "ok", label: "Successful", value: data.health.success, color: "var(--cds-support-success)" },
                  { key: "pending", label: "Pending", value: data.health.pending, color: "var(--cds-border-strong-01)" },
                  { key: "retry", label: "Retrying", value: data.health.retrying, color: "var(--cds-support-info)" },
                  { key: "attention", label: "Needs attention", value: data.health.needs_attention, color: "var(--cds-support-error)" },
                ]}
              />
            </Section>

            <Section
              title="Service reports"
              actions={
                <RouterLink className="cds--link" to="/manager/reports">
                  View reports
                </RouterLink>
              }
            >
              {latestReleased ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <RouterLink className="cds--link" to={`/manager/reports/${encodeURIComponent(latestReleased.report_id)}`}>
                      {formatPeriod(latestReleased.period_start, latestReleased.period_end)}
                    </RouterLink>
                    <StatusTag kind="report" value="RELEASED" />
                  </div>
                  <p className="rcs-helper">
                    Latest released report · {latestReleased.metrics.cases_completed} cases completed
                  </p>
                </div>
              ) : (
                <p className="rcs-helper">No report has been released yet.</p>
              )}
            </Section>
          </Column>
        </Grid>
      )}
    </ManagerLayout>
  );
}
