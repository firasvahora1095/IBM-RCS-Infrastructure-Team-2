import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Accordion, AccordionItem, Button, CodeSnippet, InlineLoading, InlineNotification } from "@carbon/react";
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
        breadcrumb={<ManagerBreadcrumb trail={[{ label: "Deliveries", to: "/manager/deliveries" }, { label: "CommunityHub connection" }]} />}
        title="CommunityHub"
        subtitle={data?.description ?? "Social platform"}
      />
      <LoadState error={error} loading={!data && !error} what="this customer" />
      {data && (
        // One column, in the order a Manager asks the questions: is it connected, is it delivering, what was reported,
        // then how it works and who can see it.
        <div className="flex flex-col gap-6" style={{ maxWidth: 960 }}>
          <Section
            id="connection"
            title="Connection"
            description="Whether RCS can send completed results to CommunityHub."
            actions={<StatusTag tone={ready ? "success" : "error"}>{ready ? "Connected" : "Needs attention"}</StatusTag>}
          >
            <dl className="rcs-glance">
              <div className="flex flex-col gap-1">
                <dt className="rcs-stat-label">Last tested</dt>
                <dd>{data.last_tested_at ? formatShortDateTime(data.last_tested_at) : "Not tested yet"}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="rcs-stat-label">Last result delivered</dt>
                <dd>{data.last_delivery_at ? formatShortDateTime(data.last_delivery_at) : "None yet"}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-3">
              {testing ? (
                <InlineLoading description="Sending a test result…" status="active" />
              ) : (
                <Button kind={ready ? "tertiary" : "primary"} onClick={runTest}>
                  {ready ? "Test connection" : "Retest connection"}
                </Button>
              )}
              <span className="rcs-helper">Sends one test result to CommunityHub and reports whether it was accepted.</span>
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
            {!ready && <p className="rcs-body">Results keep retrying automatically until the connection is fixed.</p>}
          </Section>

          <Section
            id="delivery-health"
            title="Delivery health"
            description="What happened to the results sent to CommunityHub."
            actions={
              <Button kind="tertiary" size="sm" as={RouterLink} to="/manager/deliveries">
                View deliveries
              </Button>
            }
          >
            <SegmentedBar
              label="Delivery health"
              segments={[
                { key: "ok", label: "Delivered", value: data.health.success, color: "var(--cds-support-success)" },
                { key: "pending", label: "Pending", value: data.health.pending, color: "var(--cds-border-strong-01)" },
                { key: "retry", label: "Retrying", value: data.health.retrying, color: "var(--cds-support-info)" },
                { key: "attention", label: "Failed", value: data.health.needs_attention, color: "var(--cds-support-error)" },
              ]}
            />
          </Section>

          <Section
            id="service-reports"
            title="Service reports"
            description="The summary reports shared with CommunityHub."
            actions={
              <Button kind="tertiary" size="sm" as={RouterLink} to="/manager/reports">
                View reports
              </Button>
            }
          >
            {latestReleased ? (
              <div className="flex flex-col gap-2">
                <div className="rcs-align-row">
                  <RouterLink className="cds--link" to={`/manager/reports/${encodeURIComponent(latestReleased.report_id)}`}>
                    {formatPeriod(latestReleased.period_start, latestReleased.period_end)}
                  </RouterLink>
                  <StatusTag kind="report" value="RELEASED" size="sm" />
                </div>
                <p className="rcs-helper">
                  Latest released report · {latestReleased.metrics.cases_completed} cases completed
                </p>
              </div>
            ) : (
              <p className="rcs-helper">No report has been released yet.</p>
            )}
          </Section>

          <Section
            id="client-accounts"
            title="Client accounts"
            description="Who at CommunityHub can see what. Each account sees only what its role needs."
          >
            {accounts.data ? (
              <ul className="flex flex-col">
                {accounts.data.map((a) => (
                  <li key={a.user_id} className="rcs-account-row">
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{a.display_name}</span>
                    <StatusTag tone="neutral" size="sm">
                      {CLIENT_ROLE_LABEL[a.role]}
                    </StatusTag>
                    <span className="rcs-helper">{CLIENT_ROLE_SCOPE[a.role]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rcs-helper">{accounts.error ? "Couldn't load accounts." : "Loading…"}</p>
            )}
            <p className="rcs-helper">{RESPONSIBILITY_BOUNDARY}</p>
          </Section>

          {/* The set-up detail is for whoever maintains the connection, so it is one step away rather than on the page. */}
          <Accordion>
            <AccordionItem title="Technical details for the integration owner">
              <div className="flex flex-col gap-6">
                <p className="rcs-body">
                  Each completed result is sent automatically to CommunityHub. A failed send is retried, and every result
                  carries a unique ID, so CommunityHub never processes the same result twice.
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
                  <h3 className="rcs-subheading">Example of what CommunityHub receives</h3>
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
