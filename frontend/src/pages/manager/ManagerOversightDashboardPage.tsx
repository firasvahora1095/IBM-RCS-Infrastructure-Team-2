import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Column, Dropdown, Grid, InlineLoading, InlineNotification } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { AuditorProtectionTable } from "../../components/manager/AuditorProtectionTable";
import { NeedsYouInbox } from "../../components/manager/NeedsYouInbox";
import { evidenceValue } from "../../components/manager/evidenceValue";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Blocks";
import { EvidenceDialog } from "../../components/ui/EvidenceDialog";
import { StatTile } from "../../components/ui/StatTile";
import { generateReport, getAuditorOverview } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import type { EvidenceKey } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { ORGANISATION_ID, REFRESH_MS, useManagerIntelligence } from "../../hooks/useManagerIntelligence";
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
 * Generate Report is the page's one primary button (D4); every action in the
 * inbox is secondary. The header's "Demo data" badge already labels seeded
 * figures on every screen (MR-OV-08), so the page does not repeat it.
 * See docs/ux/manager-ux-audit-and-redesign.md.
 */
export function ManagerOversightDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const { intel, data, periodKey, setPeriod, start, end, periodLabel, now } = useManagerIntelligence();
  const overview = useStaffQuery(getAuditorOverview, "", { refreshMs: REFRESH_MS });

  const [evidenceKey, setEvidenceKey] = useState<EvidenceKey | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { reload: reloadIntel } = intel;
  const { reload: reloadOverview } = overview;
  const refresh = useCallback(() => {
    reloadIntel();
    reloadOverview();
  }, [reloadIntel, reloadOverview]);

  const notice = noticeFrom(location.state);

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
            {generating ? (
              <InlineLoading description="Generating the report…" />
            ) : (
              <Button onClick={handleGenerate} disabled={!data}>
                Generate Report
              </Button>
            )}
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
              helper="Results delivered to CommunityHub"
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
        description="Act here. Open an item only when you want the detail."
        actions={evidenceButton("needs_manager_action")}
      >
        <NeedsYouInbox intelligence={data} overview={overview.data} onChanged={refresh} />
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
