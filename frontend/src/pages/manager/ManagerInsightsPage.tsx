import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Column, Dropdown, Grid } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { evidenceValue } from "../../components/manager/evidenceValue";
import {
  CaseFlow,
  Comparison,
  DeliveryHealthWidget,
  Outcomes,
  WidgetLoading,
} from "../../components/manager/IntelligenceWidgets";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Blocks";
import { EvidenceDialog } from "../../components/ui/EvidenceDialog";
import { StatTile } from "../../components/ui/StatTile";
import type { EvidenceKey } from "../../services/types";
import { useManagerIntelligence } from "../../hooks/useManagerIntelligence";
import { COMPARISON_NOTE } from "../../design-tokens/intelligenceLabels";
import { PERIOD_OPTIONS } from "../../utils/periods";

/**
 * Insights: the analytics that used to crowd the Overview. How work flows, where
 * the AI and Auditors differ, what is produced for the customer, and whether it
 * arrives. Nothing here needs an immediate decision, so it is a place to look,
 * not a queue. Every figure still has its evidence (Sprint 3 extras §1.4).
 */
export function ManagerInsightsPage() {
  const navigate = useNavigate();
  const { intel, data, periodKey, setPeriod, periodLabel } = useManagerIntelligence();
  const [evidenceKey, setEvidenceKey] = useState<EvidenceKey | null>(null);

  const evidenceButton = (key: EvidenceKey) => (
    <Button kind="ghost" size="sm" className="rcs-evidence-button" onClick={() => setEvidenceKey(key)}>
      Evidence
    </Button>
  );

  return (
    <ManagerLayout>
      <PageHeader
        title="Insights"
        subtitle={
          data
            ? `${data.organisation_name} · ${periodLabel}`
            : "How work flows, where the AI and Auditors differ, and what reaches CommunityHub."
        }
        actions={
          <>
            <Dropdown
              id="insights-period"
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
            <Button kind="tertiary" onClick={() => navigate("/manager/validation")}>
              Validation &amp; Audit
            </Button>
          </>
        }
      />
      <LoadState error={intel.error} loading={false} what="the figures" />

      <section aria-label="Figures for the period">
        <Grid className="rcs-grid" condensed>
          <Column sm={4} md={4} lg={5}>
            <StatTile
              label="Total cases"
              value={data ? data.kpis.total_cases : "–"}
              helper="Received in the period"
              corner={evidenceButton("total_cases")}
            />
          </Column>
          <Column sm={4} md={4} lg={5}>
            <StatTile
              label="Completed"
              value={data ? data.kpis.completed : "–"}
              helper="Completed in the period"
              corner={evidenceButton("completed")}
            />
          </Column>
        </Grid>
      </section>

      <Grid className="rcs-grid rcs-widget-grid">
        <Column sm={4} md={8} lg={8}>
          <Section
            id="case-flow"
            title="Case flow"
            description="Where open work sits now. Select a stage to see those cases."
            actions={evidenceButton("case_flow")}
          >
            {data ? <CaseFlow data={data} /> : <WidgetLoading error={intel.error} />}
          </Section>
        </Column>
        <Column sm={4} md={8} lg={8}>
          <Section
            id="outcomes"
            title="Client outcomes"
            description="RCS moderation outcomes for cases decided in the period. CommunityHub decides any enforcement on its platform."
            actions={evidenceButton("outcomes")}
          >
            {data ? <Outcomes data={data} /> : <WidgetLoading error={intel.error} />}
          </Section>
        </Column>
        <Column sm={4} md={8} lg={16}>
          <Section
            id="comparison"
            title="AI and Auditor decisions"
            description={
              <>
                {COMPARISON_NOTE} Model accuracy is on{" "}
                <RouterLink className="cds--link" to="/manager/validation">
                  Validation
                </RouterLink>
                .
              </>
            }
            actions={evidenceButton("override_rate")}
          >
            {data ? <Comparison data={data} /> : <WidgetLoading error={intel.error} />}
          </Section>
        </Column>
        <Column sm={4} md={8} lg={16}>
          <Section
            id="delivery"
            title="Delivery Health"
            description="Results for cases completed in the period. Delivery is separate from moderation: a failed delivery never reopens a case."
            actions={evidenceButton("delivery_success_rate")}
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
