import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Column, Dropdown, Grid, InlineNotification } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { AuditorProtectionTable } from "../../components/manager/AuditorProtectionTable";
import { NeedsYouInbox } from "../../components/manager/NeedsYouInbox";
import { evidenceValue } from "../../components/manager/evidenceValue";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Blocks";
import { EvidenceDialog } from "../../components/ui/EvidenceDialog";
import { StatTile } from "../../components/ui/StatTile";
import { getAuditorOverview } from "../../services";
import type { EvidenceKey } from "../../services/types";
import { REFRESH_MS, useManagerIntelligence } from "../../hooks/useManagerIntelligence";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { noticeFrom } from "./managerNotice";
import { PERIOD_OPTIONS } from "../../utils/periods";
import { formatClockTime } from "../../utils/formatRelativeTime";

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

/**
 * Manager Overview: the Manager's inbox, not a wall of analytics. It answers
 * two questions: what needs me now (the "Needs you" inbox, each row with its
 * action in place) and who is protected (the Auditors table). Three quiet
 * figures sit above for context. Case flow, AI and Auditor decisions, Client
 * outcomes and Delivery Health moved to Insights.
 *
 * Overview has no primary button: every action in the inbox is a secondary one, and
 * Generate report lives on Insights and Reports. The header's "Demo data" badge already labels seeded
 * figures on every screen (MR-OV-08), so the page does not repeat it.
 * See docs/ux/manager-ux-audit-and-redesign.md.
 */
export function ManagerOversightDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { intel, data, periodKey, setPeriod, periodLabel, now } = useManagerIntelligence({ allClients: true });
  const overview = useStaffQuery(getAuditorOverview, "", { refreshMs: REFRESH_MS });

  const [evidenceKey, setEvidenceKey] = useState<EvidenceKey | null>(null);

  const notice = noticeFrom(location.state);

  const evidenceButton = (key: EvidenceKey) => (
    <Button kind="ghost" size="sm" className="rcs-evidence-button" onClick={() => setEvidenceKey(key)}>
      Evidence
    </Button>
  );

  return (
    <ManagerLayout>
      <PageHeader
        title="Overview"
        subtitle={data ? `${data.organisation_name} · ${periodLabel}` : "Loading…"}
        actions={
          <>
            <Dropdown
              id="dashboard-period"
              titleText="Period"
              label="Period"
              size="lg"
              items={PERIOD_OPTIONS.map((option) => option.key)}
              itemToString={(key) => PERIOD_OPTIONS.find((option) => option.key === key)?.label ?? ""}
              selectedItem={periodKey}
              onChange={({ selectedItem }) => {
                if (selectedItem) setPeriod(selectedItem);
              }}
            />
          </>
        }
      />
      {notice && (
        <InlineNotification
          kind="success"
          lowContrast
          title={notice.title}
          subtitle={notice.detail}
          onCloseButtonClick={() => navigate(location.pathname + location.search, { replace: true, state: null })}
          style={{ maxWidth: "100%" }}
        />
      )}
      <LoadState error={intel.error} loading={false} what="the dashboard figures" />

      <section aria-label="Figures for the period">
        <Grid className="rcs-grid" condensed>
          <Column sm={4} md={4} lg={5}>
            <StatTile label="Open cases" value={data ? data.kpis.open_cases : "–"} helper="Current backlog" />
          </Column>
          <Column sm={4} md={4} lg={5}>
            <StatTile label="Completed" value={data ? data.kpis.completed : "–"} helper="Completed in the period" />
          </Column>
          <Column sm={4} md={4} lg={6}>
            <StatTile
              label="Delivery success"
              value={
                data ? (data.delivery.success_rate === null ? "–" : percent(data.delivery.success_rate)) : "–"
              }
              helper="Results delivered to Clients"
            />
          </Column>
        </Grid>
        <p className="rcs-helper" aria-live="polite" style={{ marginTop: 8 }}>
          {data ? `Calculated ${formatClockTime(data.calculated_at)} · refreshes every 30 seconds` : "Calculating…"}
        </p>
      </section>

      <Section
        id="needs-attention"
        title="Needs you"
        description="Resolve items here, or open one for the full detail."
        actions={evidenceButton("needs_manager_action")}
      >
        <NeedsYouInbox intelligence={data} overview={overview.data} />
      </Section>

      <Section
        id="protection"
        title="Auditors"
        description="Ordered by protection need, never by productivity. Select an Auditor to see their day or adjust their exposure limit."
        actions={evidenceButton("protection")}
      >
        <LoadState error={overview.error} loading={!overview.data && !overview.error} what="the Auditors" />
        {overview.data && <AuditorProtectionTable rows={overview.data} now={now} />}
        <p className="rcs-helper">
          Daily exposure totals reset at 9:00 AM and aren&apos;t reset by cooldowns (Sprint 3 prototype rule).
        </p>
      </Section>

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
