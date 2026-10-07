import { useState } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Column, Dropdown, Grid, InlineNotification, InlineLoading, SkeletonText, Tag } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { Figure, LoadState } from "../../components/manager/ManagerBits";
import { AttentionList } from "../../components/manager/AttentionList";
import { AuditorProtectionTable } from "../../components/manager/AuditorProtectionTable";
import { pageTitle } from "../../components/manager/managerStyles";
import { Section } from "../../components/ui/Blocks";
import { BarList, SegmentedBar } from "../../components/ui/Charts";
import { EvidenceDialog } from "../../components/ui/EvidenceDialog";
import { StatTile } from "../../components/ui/StatTile";
import { TransitionMatrix } from "../../components/ui/TransitionMatrix";
import { generateReport, getAuditorOverview, getManagerIntelligence, isMockData } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { AttentionKind, EvidenceKey, ManagerIntelligence, PeriodKey, SeverityTier } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { getSeverityInfo } from "../../design-tokens/severity";
import {
  ATTENTION_ORDER,
  caseOversightLink,
  COMPARISON_NOTE,
  OPEN_BUCKET_COLOR,
  OPEN_BUCKET_LABEL,
  OPEN_BUCKET_ORDER,
  PROVENANCE_BADGE,
  PROVENANCE_BADGE_TITLE,
} from "../../design-tokens/intelligenceLabels";
import { DEFAULT_PERIOD, isPeriodKey, PERIOD_OPTIONS, periodFor } from "../../utils/periods";
import { formatAge, formatMinutes, formatPeriod, formatShortDateTime } from "../../utils/formatPeriod";
import { formatClockTime } from "../../utils/formatRelativeTime";

/** The one customer in this prototype (D5: the organisation filter exists, with one option). */
const ORGANISATION_ID = "COMMUNITYHUB";
/** New SOS, cooldowns and failed handoffs appear without a reload (QA 7.1–7.3). */
const REFRESH_MS = 30_000;
const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

/**
 * Manager Intelligence Dashboard, the Sprint 3 HD feature (Sprint 3 extras
 * §1; docs/ux/manager-intelligence-dashboard-plan.md). It grows the Oversight
 * Dashboard (Figma 78:69, MR-OV-01–05) instead of replacing it, and reads top
 * to bottom as the Manager's questions: how are operations going, what needs
 * me, where is work building up, who is protected, where do AI and humans
 * differ, what are we producing for the customer, and is it reaching them.
 *
 * Every figure has "View evidence" (§1.4). Seeded figures carry the
 * DEMO / PLACEHOLDER DATA badge (MR-OV-08). The most urgent item is the one
 * primary action; with nothing urgent, generating the client report is (D4).
 */
export function ManagerOversightDashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const rawPeriod = params.get("period");
  const periodKey: PeriodKey = isPeriodKey(rawPeriod) ? rawPeriod : DEFAULT_PERIOD;
  // Read the date once per visit, so the period doesn't shift while the page is open.
  const [openedAt] = useState(() => new Date());
  const { start, end } = periodFor(periodKey, openedAt);
  const periodLabel = formatPeriod(start, end);

  const intel = useStaffQuery(
    (t) => getManagerIntelligence(t, { organisationId: ORGANISATION_ID, periodStart: start, periodEnd: end }),
    `${start}:${end}`,
    { refreshMs: REFRESH_MS },
  );
  const overview = useStaffQuery(getAuditorOverview, "", { refreshMs: REFRESH_MS });
  const data = intel.data;
  // Cooldowns are judged against the server's calculation time, which advances with every refresh.
  const now = data ? Date.parse(data.calculated_at) : openedAt.getTime();

  const [evidenceKey, setEvidenceKey] = useState<EvidenceKey | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const firstWithBreak = overview.data?.find((row) => (row.open_requests?.break_requests ?? 0) > 0);
  const attentionTargets: Partial<Record<AttentionKind, string>> = firstWithBreak
    ? { BREAK_REQUEST: `/manager/auditors/${encodeURIComponent(firstWithBreak.auditor_id)}` }
    : {};

  const urgent = data
    ? ATTENTION_ORDER.map((kind) => ({ kind, count: data.attention.find((a) => a.kind === kind)?.count ?? 0 })).find(
        (item) => item.count > 0,
      )
    : undefined;
  const urgentAction = urgent ? nextAction(urgent.kind, urgent.count, attentionTargets) : null;

  async function handleGenerate() {
    if (!token) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const report = await generateReport(token, ORGANISATION_ID, start, end);
      navigate(`/manager/reports/${encodeURIComponent(report.report_id)}`);
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      setGenerating(false);
    }
  }

  const showDemoBadge = isMockData || data?.provenance === "DEMO";
  const evidenceProps = (key: EvidenceKey) => ({
    kind: "ghost" as const,
    size: "sm" as const,
    className: "rcs-evidence-button",
    onClick: () => setEvidenceKey(key),
  });

  return (
    <ManagerLayout>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 style={pageTitle}>Manager Intelligence Dashboard</h1>
            {showDemoBadge && (
              <Tag type="purple" size="md" title={PROVENANCE_BADGE_TITLE} style={{ margin: 0 }}>
                {PROVENANCE_BADGE}
              </Tag>
            )}
          </div>
          <p className="rcs-page-subtitle">
            Operations, Auditor protection and CommunityHub delivery at a glance. Every figure links to the records
            behind it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button kind="ghost" onClick={() => navigate("/manager/audit-logs")}>
            View audit history
          </Button>
          {urgentAction && <Button onClick={() => navigate(urgentAction.to)}>{urgentAction.label}</Button>}
        </div>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="rcs-controls">
          <Dropdown
            id="dashboard-organisation"
            titleText="Organisation"
            label="Organisation"
            items={[data?.organisation_name ?? "CommunityHub"]}
            selectedItem={data?.organisation_name ?? "CommunityHub"}
            readOnly
            helperText="RCS has one customer in this prototype"
          />
          <Dropdown
            id="dashboard-period"
            titleText="Period"
            label="Period"
            items={PERIOD_OPTIONS.map((option) => option.key)}
            itemToString={(key) => PERIOD_OPTIONS.find((option) => option.key === key)?.label ?? ""}
            selectedItem={periodKey}
            onChange={({ selectedItem }) => {
              if (selectedItem) setParams({ period: selectedItem }, { replace: true });
            }}
            helperText={periodLabel}
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          {generating ? (
            <InlineLoading description="Generating the report…" />
          ) : (
            <Button kind={urgentAction ? "tertiary" : "primary"} onClick={handleGenerate} disabled={!data}>
              Generate Client Service Report
            </Button>
          )}
          <p className="rcs-helper" aria-live="polite">
            {data ? `Calculated ${formatClockTime(data.calculated_at)} · refreshes every 30 seconds` : "Calculating…"}
          </p>
        </div>
      </div>
      {generateError && (
        <InlineNotification
          kind="error"
          lowContrast
          role="alert"
          title="Couldn't generate the report."
          subtitle={generateError}
          onClose={() => setGenerateError(null)}
          style={{ maxWidth: "100%" }}
        />
      )}
      <LoadState error={intel.error} loading={false} what="the dashboard figures" />

      <section aria-label="Operations at a glance">
        <Grid className="rcs-grid" condensed>
          <Column sm={2} md={4} lg={4}>
            <StatTile
              label="Total cases"
              value={data ? data.kpis.total_cases : "–"}
              helper={<KpiHelper text="Received in the period" evidence={evidenceProps("total_cases")} />}
            />
          </Column>
          <Column sm={2} md={4} lg={4}>
            <StatTile
              label="Completed"
              value={data ? data.kpis.completed : "–"}
              helper={<KpiHelper text="Completed in the period" evidence={evidenceProps("completed")} />}
            />
          </Column>
          <Column sm={2} md={4} lg={4}>
            <StatTile
              label="Open cases"
              value={data ? data.kpis.open_cases : "–"}
              helper={<KpiHelper text="Current backlog" jumpTo={{ href: "#case-flow", label: "See where it sits" }} />}
            />
          </Column>
          <Column sm={2} md={4} lg={4}>
            <StatTile
              label="Needs manager action"
              value={data ? data.kpis.needs_manager_action : "–"}
              tone={data && data.kpis.needs_manager_action > 0 ? "error" : "neutral"}
              helper={
                <KpiHelper
                  text="Current exceptions"
                  jumpTo={{ href: "#needs-attention", label: "See what needs you" }}
                />
              }
            />
          </Column>
        </Grid>
      </section>

      <Grid className="rcs-grid rcs-widget-grid">
        <Column sm={4} md={8} lg={8}>
          <Section
            id="needs-attention"
            title="Needs attention"
            description="Only items that need your decision. Routine wellbeing check-ins stay in each Auditor's record."
            actions={<Button {...evidenceProps("needs_manager_action")}>View evidence</Button>}
          >
            {data ? (
              <AttentionList items={data.attention} targets={attentionTargets} />
            ) : (
              <WidgetLoading error={intel.error} />
            )}
          </Section>
        </Column>
        <Column sm={4} md={8} lg={8}>
          <Section
            id="case-flow"
            title="Case flow and timing"
            description="Where open work sits now. Select a stage to see those cases in Case Oversight."
            actions={<Button {...evidenceProps("case_flow")}>View evidence</Button>}
          >
            {data ? <CaseFlow data={data} /> : <WidgetLoading error={intel.error} />}
          </Section>
        </Column>
        <Column sm={4} md={8} lg={16}>
          <Section
            id="protection"
            title="Auditor protection & availability"
            description="Ordered by protection need, never by productivity. Select an Auditor to see their day, approve a break or adjust their exposure limit."
            actions={<Button {...evidenceProps("protection")}>View evidence</Button>}
          >
            <LoadState error={overview.error} loading={!overview.data && !overview.error} what="the Auditors" />
            {overview.data && <AuditorProtectionTable rows={overview.data} now={now} />}
            <p className="rcs-helper">
              Daily exposure totals reset at 9:00 AM and aren&apos;t reset by cooldowns (Sprint 3 prototype rule).
            </p>
          </Section>
        </Column>
        <Column sm={4} md={8} lg={8}>
          <Section
            id="comparison"
            title="AI–Auditor decision comparison"
            description={
              <>
                {COMPARISON_NOTE} Model accuracy is on{" "}
                <RouterLink className="cds--link" to="/manager/validation">
                  Validation
                </RouterLink>
                .
              </>
            }
            actions={<Button {...evidenceProps("override_rate")}>View evidence</Button>}
          >
            {data ? <Comparison data={data} /> : <WidgetLoading error={intel.error} />}
          </Section>
        </Column>
        <Column sm={4} md={8} lg={8}>
          <Section
            id="outcomes"
            title={`Client outcome summary — ${data?.organisation_name ?? "CommunityHub"}`}
            description="RCS moderation outcomes for cases decided in the period. CommunityHub decides any enforcement on its platform."
            actions={<Button {...evidenceProps("outcomes")}>View evidence</Button>}
          >
            {data ? <Outcomes data={data} /> : <WidgetLoading error={intel.error} />}
          </Section>
        </Column>
        <Column sm={4} md={8} lg={16}>
          <Section
            id="delivery"
            title="CommunityHub delivery health"
            description="Results for cases completed in the period. Delivery is separate from moderation: a failed delivery never reopens a case."
            actions={<Button {...evidenceProps("delivery_success_rate")}>View evidence</Button>}
          >
            {data ? <DeliveryHealthWidget data={data} /> : <WidgetLoading error={intel.error} />}
          </Section>
        </Column>
      </Grid>

      {data && evidenceKey && (
        <EvidenceDialog
          open
          onClose={() => setEvidenceKey(null)}
          evidence={data.evidence[evidenceKey]}
          value={evidenceValue(data, evidenceKey)}
          organisation={data.organisation_name}
          period={periodLabel}
        />
      )}
    </ManagerLayout>
  );
}

/** The single primary action: the most urgent kind of item, in Needs Attention order. */
function nextAction(
  kind: AttentionKind,
  count: number,
  targets: Partial<Record<AttentionKind, string>>,
): { label: string; to: string } {
  switch (kind) {
    case "SOS":
      return { label: `Follow up ${plural(count, "SOS alert", "SOS alerts")}`, to: "/manager/sos" };
    case "BREAK_REQUEST":
      return {
        label: `Approve ${plural(count, "break request", "break requests")}`,
        to: targets.BREAK_REQUEST ?? "/manager",
      };
    case "REASSIGNMENT":
      return { label: `Decide ${plural(count, "declined case", "declined cases")}`, to: "/manager/reassignment" };
    case "CAP_INTERRUPTED":
      return { label: `Decide ${plural(count, "interrupted case", "interrupted cases")}`, to: "/manager/reassignment" };
    case "FAILED_HANDOFF":
      return {
        label: `Fix ${plural(count, "failed delivery", "failed deliveries")}`,
        to: "/manager/deliveries?status=needs-attention",
      };
  }
}

function evidenceValue(data: ManagerIntelligence, key: EvidenceKey): string {
  switch (key) {
    case "total_cases":
      return String(data.kpis.total_cases);
    case "completed":
      return String(data.kpis.completed);
    case "open_cases":
    case "case_flow":
      return String(data.kpis.open_cases);
    case "needs_manager_action":
      return String(data.kpis.needs_manager_action);
    case "outcomes":
      return String(data.outcomes.violation + data.outcomes.no_violation);
    case "severity":
      return String(TIERS.reduce((sum, t) => sum + data.outcomes.severity[t], 0));
    case "override_rate":
      return data.comparison.eligible ? percent(data.comparison.override_rate) : "Not enough cases";
    case "delivery_success_rate":
      return data.delivery.success_rate === null ? "No finished deliveries" : percent(data.delivery.success_rate);
    case "protection":
      return `${data.evidence.protection.records_included} Auditors`;
  }
}

/**
 * One action per KPI tile, never a duplicate: Total and Completed open their
 * evidence; Open cases and Needs manager action jump to the widget below that
 * already breaks them down (and carries their evidence).
 */
function KpiHelper({
  text,
  evidence,
  jumpTo,
}: {
  text: string;
  evidence?: { onClick: () => void; kind: "ghost"; size: "sm"; className: string };
  jumpTo?: { href: string; label: string };
}) {
  return (
    <span className="flex flex-col items-start gap-1">
      <span>{text}</span>
      {evidence && <Button {...evidence}>View evidence</Button>}
      {jumpTo && (
        <a className="cds--link rcs-kpi-jump" href={jumpTo.href}>
          {jumpTo.label}
        </a>
      )}
    </span>
  );
}

function WidgetLoading({ error }: { error: string | null }) {
  if (error) return <p className="rcs-helper">Not available until the dashboard figures load.</p>;
  return <SkeletonText paragraph lineCount={3} />;
}

function CaseFlow({ data }: { data: ManagerIntelligence }) {
  const { flow } = data;
  return (
    <>
      <SegmentedBar
        label="Open cases by stage"
        height={16}
        segments={OPEN_BUCKET_ORDER.map((bucket) => ({
          key: bucket,
          label: OPEN_BUCKET_LABEL[bucket],
          value: data.open_breakdown[bucket],
          color: OPEN_BUCKET_COLOR[bucket],
          striped: bucket === "MANAGER_ACTION",
          to: caseOversightLink(bucket),
        }))}
      />
      <dl className="rcs-figure-row">
        <Figure
          label="Median decision time"
          value={
            flow.median_decision_minutes === null ? "Not enough cases" : formatMinutes(flow.median_decision_minutes)
          }
        />
        <Figure
          label="Oldest unresolved"
          value={
            flow.oldest_unresolved_minutes === null || !flow.oldest_unresolved_case_id ? (
              "None open"
            ) : (
              <span className="flex flex-wrap items-baseline gap-2">
                {formatAge(flow.oldest_unresolved_minutes)}
                <RouterLink
                  className="cds--link"
                  style={{ fontSize: 14 }}
                  to={`/manager/cases?search=${encodeURIComponent(flow.oldest_unresolved_case_id)}`}
                >
                  {flow.oldest_unresolved_case_id}
                </RouterLink>
              </span>
            )
          }
        />
      </dl>
    </>
  );
}

function Outcomes({ data }: { data: ManagerIntelligence }) {
  const { outcomes } = data;
  const decided = outcomes.violation + outcomes.no_violation;
  return (
    <>
      <SegmentedBar
        label="Moderation outcomes"
        height={16}
        segments={[
          { key: "v", label: "Policy Violation Found", value: outcomes.violation, color: "var(--cds-support-error)" },
          { key: "nv", label: "No Violation Found", value: outcomes.no_violation, color: "var(--cds-support-success)" },
        ]}
      />
      <p className="rcs-helper">
        {decided
          ? `${Math.round((outcomes.violation / decided) * 100)}% of ${decided} decided cases were found to violate policy.`
          : "No cases were decided in this period."}
      </p>
      <h3 className="rcs-subheading">Final severity</h3>
      <BarList
        label="Decided cases by final severity"
        rows={TIERS.map((tier) => {
          const info = getSeverityInfo(tier);
          return {
            key: tier,
            label: `${tier} · ${info.label}`,
            value: outcomes.severity[tier],
            // S1's tag fill is too light to read as a bar on the track.
            color: tier === "S1" ? "var(--cds-icon-secondary)" : info.background,
          };
        })}
      />
    </>
  );
}

function Comparison({ data }: { data: ManagerIntelligence }) {
  const { comparison } = data;
  if (comparison.eligible === 0) {
    return <p className="rcs-body">No decided cases with both an AI and a final severity in this period.</p>;
  }
  const top = comparison.top_transition;
  return (
    <div className="flex flex-wrap items-start gap-8">
      <dl className="flex flex-col gap-4" style={{ margin: 0 }}>
        <Figure
          label="Override rate"
          value={
            <span className="flex flex-col">
              {percent(comparison.override_rate)}
              <span className="rcs-helper" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {comparison.overrides} of {comparison.eligible} decided cases
              </span>
            </span>
          }
        />
        <Figure label="Most common change" value={top ? `${top.from} → ${top.to} (${top.count})` : "None"} />
      </dl>
      <TransitionMatrix matrix={comparison.matrix} />
    </div>
  );
}

function DeliveryHealthWidget({ data }: { data: ManagerIntelligence }) {
  const { delivery } = data;
  return (
    <div className="rcs-delivery-layout">
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4" style={{ margin: 0 }}>
          <Figure label="Delivered" value={delivery.health.success} />
          <Figure label="Pending" value={delivery.health.pending} />
          <Figure label="Retrying" value={delivery.health.retrying} />
          <Figure label="Needs attention" value={delivery.health.needs_attention} />
        </dl>
        <dl className="rcs-figure-row">
          <Figure
            label="Success rate"
            value={delivery.success_rate === null ? "No finished deliveries" : percent(delivery.success_rate)}
          />
          {delivery.last_failed_at && (
            <Figure label="Last failure" value={formatShortDateTime(delivery.last_failed_at)} />
          )}
        </dl>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="rcs-subheading">Waiting for you now</h3>
        {delivery.failed.length === 0 ? (
          <p className="rcs-helper">No failed handoffs. Results reach CommunityHub automatically.</p>
        ) : (
          <ul className="rcs-failed-list">
            {delivery.failed.map((row) => (
              <li key={row.delivery_id}>
                <span className="rcs-mono">{row.case_id}</span>
                <span className="rcs-helper">
                  {plural(row.attempts, "attempt", "attempts")}
                  {row.reason ? ` · ${row.reason}` : ""}
                </span>
                <RouterLink
                  className="cds--link"
                  to={`/manager/deliveries/${encodeURIComponent(row.delivery_id)}`}
                  aria-label={`View delivery for ${row.case_id}`}
                >
                  View
                </RouterLink>
              </li>
            ))}
          </ul>
        )}
        <RouterLink className="cds--link" to="/manager/deliveries">
          All deliveries
        </RouterLink>
      </div>
    </div>
  );
}
