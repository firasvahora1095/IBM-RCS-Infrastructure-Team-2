import type { ReactNode } from "react";
import { Button } from "@carbon/react";
import type { ReportEvidenceKey, ServiceReport, SeverityTier } from "../../services/types";
import { BarList, SegmentedBar } from "../ui/Charts";
import { getSeverityInfo } from "../../design-tokens/severity";
import { METRIC_DEFINITIONS, NO_SLA_NOTE, OVERRIDE_AGGREGATE_NOTE } from "../../design-tokens/reportLabels";
import {
  formatMinutes,
  formatPeriod,
  formatShortDate,
  formatShortDateTime,
  wholeMonthName,
} from "../../utils/formatPeriod";

const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];

function SheetSection({
  title,
  definition,
  defId,
  children,
  evidence,
}: {
  title: string;
  definition: string;
  defId: string;
  children: ReactNode;
  /** Manager preview only: opens the frozen evidence behind this section. */
  evidence?: () => void;
}) {
  return (
    <section className="rcs-sheet-section" aria-labelledby={`${defId}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 id={`${defId}-title`} className="rcs-section-title">
            {title}
          </h3>
          <p className="rcs-helper">{definition}</p>
        </div>
        {evidence && (
          <Button
            kind="ghost"
            size="sm"
            className="rcs-no-print rcs-evidence-button"
            onClick={evidence}
            aria-label={`View evidence: ${title}`}
          >
            View evidence
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function BigFigure({ label, value, helper }: { label: string; value: ReactNode; helper?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="rcs-stat-label">{label}</span>
      <span className="rcs-stat-value" style={{ marginBlockStart: 0 }}>
        {value}
      </span>
      {helper && <span className="rcs-helper">{helper}</span>}
    </div>
  );
}

/**
 * The client-facing service report document (B2B spec S9b / S12b). The same
 * sheet renders in the Manager's preview and in the CommunityHub portal, so
 * the Manager approves exactly what the client will see. It only ever shows
 * aggregate, client-safe figures.
 *
 * In the Manager preview, `onEvidence` adds "View evidence" to each section:
 * the frozen definition, source fields and contributing cases (Sprint 3 extras
 * §6.5). The buttons never print and the client sheet never has them.
 */
export function ReportSheet({
  report,
  onEvidence,
}: {
  report: ServiceReport;
  onEvidence?: (key: ReportEvidenceKey) => void;
}) {
  const m = report.metrics;
  const evidence = (key: ReportEvidenceKey) => (onEvidence && m.evidence?.[key] ? () => onEvidence(key) : undefined);
  const calculatedAt = m.evidence?.cases_completed.calculated_at ?? report.generated_at;
  const decided = m.violation_count + m.no_violation_count;
  const violationRate = decided ? Math.round((m.violation_count / decided) * 100) : 0;
  const month = wholeMonthName(report.period_start, report.period_end);

  return (
    <article className="rcs-sheet" aria-label="Service report">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="rcs-eyebrow">RCS service report · {report.organisation_name}</span>
          <span className="rcs-helper rcs-mono">
            {report.report_id} · v{report.version}
          </span>
        </div>
        <h2 className="rcs-page-title">{month ?? formatPeriod(report.period_start, report.period_end)}</h2>
        <p className="rcs-body" style={{ color: "var(--cds-text-secondary)" }}>
          Reporting period {formatPeriod(report.period_start, report.period_end)}
          {report.released_at ? ` · Released ${formatShortDate(report.released_at)}` : " · Draft, not released"}
        </p>
      </header>

      <SheetSection
        title="Cases"
        definition={METRIC_DEFINITIONS.cases}
        defId="def-cases"
        evidence={evidence("cases_completed")}
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <BigFigure label="Reports received" value={m.cases_received} />
          <BigFigure label="Cases completed" value={m.cases_completed} />
          <BigFigure label="Open at end of period" value={m.open_at_end} />
        </div>
      </SheetSection>

      <SheetSection
        title="Moderation outcomes"
        definition={METRIC_DEFINITIONS.outcomes}
        defId="def-outcomes"
        evidence={evidence("outcomes")}
      >
        <SegmentedBar
          label="Moderation outcomes"
          height={16}
          segments={[
            { key: "v", label: "Policy violation found", value: m.violation_count, color: "var(--cds-support-error)" },
            {
              key: "nv",
              label: "No violation found",
              value: m.no_violation_count,
              color: "var(--cds-support-success)",
            },
          ]}
        />
        <p className="rcs-helper">
          {decided
            ? `${violationRate}% of decided cases were found to violate policy.`
            : "No cases were decided in this period."}
        </p>
      </SheetSection>

      <SheetSection
        title="Final severity"
        definition={METRIC_DEFINITIONS.severity}
        defId="def-severity"
        evidence={evidence("severity")}
      >
        <BarList
          label="Cases by final severity"
          max={Math.max(...TIERS.map((t) => m.severity_breakdown[t]))}
          rows={TIERS.map((t) => {
            const info = getSeverityInfo(t);
            return {
              key: t,
              label: `${t} · ${info.label}`,
              value: m.severity_breakdown[t],
              // S1's tag fill is too light to read as a bar on the track.
              color: t === "S1" ? "var(--cds-icon-secondary)" : info.background,
            };
          })}
        />
      </SheetSection>

      <div className="grid gap-8 md:grid-cols-2">
        <SheetSection title="Timeliness" definition={METRIC_DEFINITIONS.timeliness} defId="def-time">
          {m.median_report_to_decision_minutes === null ? (
            <p className="rcs-body">Not enough reliable timestamps in this period to state a median.</p>
          ) : (
            <BigFigure
              label="Median time from report to decision"
              value={formatMinutes(m.median_report_to_decision_minutes)}
            />
          )}
          <p className="rcs-helper">{NO_SLA_NOTE}</p>
        </SheetSection>

        <SheetSection
          title="AI and human review"
          definition={METRIC_DEFINITIONS.overrides}
          defId="def-override"
          evidence={evidence("overrides")}
        >
          <BigFigure
            label="Severity changed after human review"
            value={`${Math.round(m.override_rate * 100)}%`}
            helper={`${m.override_count} of ${decided} decided cases`}
          />
          <p className="rcs-helper">{OVERRIDE_AGGREGATE_NOTE}</p>
        </SheetSection>

        <SheetSection
          title="Workflow"
          definition={METRIC_DEFINITIONS.workflow}
          defId="def-workflow"
          evidence={evidence("workflow")}
        >
          <BigFigure
            label="Declined and reassigned"
            value={m.declined_reassigned}
            helper="Decided by a second reviewer"
          />
        </SheetSection>

        <SheetSection
          title="Delivery to CommunityHub"
          definition={METRIC_DEFINITIONS.delivery}
          defId="def-delivery"
          evidence={evidence("delivery")}
        >
          <SegmentedBar
            label="Delivery health"
            segments={[
              { key: "ok", label: "Successful", value: m.delivery.success, color: "var(--cds-support-success)" },
              {
                key: "retry",
                label: "Pending or retrying",
                value: m.delivery.pending + m.delivery.retrying,
                color: "var(--cds-support-info)",
              },
              {
                key: "na",
                label: "Needs attention",
                value: m.delivery.needs_attention,
                color: "var(--cds-support-error)",
              },
            ]}
          />
        </SheetSection>
      </div>

      {report.manager_note && (
        <section className="rcs-sheet-section" aria-labelledby="note-title">
          <h3 id="note-title" className="rcs-section-title">
            Service notes
          </h3>
          <p className="rcs-body" style={{ whiteSpace: "pre-line" }}>
            {report.manager_note}
          </p>
        </section>
      )}

      <footer className="rcs-sheet-section">
        <p className="rcs-helper">
          Prepared by RCS from completed case records. Final outcomes and severities are decided by trained human
          reviewers; AI analysis assists them and never makes the final decision. This report contains aggregate figures
          only. Figures were calculated on {formatShortDateTime(calculatedAt)} and are fixed for version{" "}
          {report.version}: a released version never changes.
        </p>
      </footer>
    </article>
  );
}
