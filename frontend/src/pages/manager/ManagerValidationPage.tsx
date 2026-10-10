import { useState } from "react";
import {
  Button,
  Column,
  Grid,
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
import { AiAuditorComparison } from "../../components/manager/AiAuditorComparison";
import { Figure, LoadState } from "../../components/manager/ManagerBits";
import { mono, pageTitle } from "../../components/manager/managerStyles";
import { Section } from "../../components/ui/Blocks";
import { StatTile } from "../../components/ui/StatTile";
import { StatusTag } from "../../components/ui/StatusTag";
import { getGovernanceSummary, getValidationSummary } from "../../services";
import type { GovernanceSummary, ValidationSummary } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { formatShortDateTime } from "../../utils/formatPeriod";

const AI_COLOUR = "var(--cds-support-info)";
const TRUTH_COLOUR = "var(--cds-support-success)";

/**
 * Validation & Audit (Manager Figma 136:257, MR-OV-08 / CV-10; BA screen
 * "Validation & Audit", docs/ba/validation-audit-governance-fields.md): one
 * screen with three views that are never mixed.
 *
 * 1. AI vs ground truth: the AI's severity against manually labelled footage.
 * 2. AI vs Auditor: live completed cases where the final severity differs.
 *    Operational disagreement, not model accuracy, and no one is named.
 * 3. Audit log: every watsonx.ai call with the three client-required fields
 *    (prompt leakage, source attribution, accumulated score).
 *
 * They sit on one page, in sections, rather than behind tabs, so a Manager can
 * read the comparison and the audit log together. Placeholder data is flagged
 * on every figure (Task 96). Nothing here relies on colour alone: every state
 * is written out, and the chart shows its values.
 */
export function ManagerValidationPage() {
  const { data, error } = useStaffQuery(getValidationSummary);
  const governance = useStaffQuery(getGovernanceSummary);

  return (
    <ManagerLayout>
      <div className="flex flex-col gap-2">
        <h1 style={pageTitle}>Validation &amp; Audit</h1>
        <p className="rcs-page-subtitle">
          Is the AI trustworthy, and can every result be traced? Three separate views on one screen: they are never
          mixed.
        </p>
        <nav aria-label="On this page" className="flex flex-wrap gap-x-6 gap-y-1">
          <a className="cds--link" href="#validation">
            AI vs ground truth
          </a>
          <a className="cds--link" href="#ai-vs-auditor">
            AI vs Auditor
          </a>
          <a className="cds--link" href="#audit-log">
            Audit log
          </a>
        </nav>
      </div>

      {data?.is_placeholder && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Placeholder / mock data — not real validation results."
          subtitle="This screen shows illustrative sample values until Dev's pipeline produces real results."
          style={{ maxWidth: "100%" }}
        />
      )}

      <Section
        id="validation"
        title="AI vs ground truth"
        description="The AI's severity checked against manually labelled footage from the validation set. This isn't about live cases."
      >
        <LoadState error={error} loading={!data && !error} what="validation results" />
        {data && <GroundTruth data={data} />}
      </Section>

      <Section
        id="ai-vs-auditor"
        title="AI vs Auditor"
        description="Live completed cases. A difference isn't a verdict on the AI or the Auditor; it points to cases worth a closer look. It isn't model accuracy."
      >
        <LoadState error={governance.error} loading={!governance.data && !governance.error} what="the comparison" />
        {governance.data && <AiAuditorComparison data={governance.data} />}
      </Section>

      <Section
        id="audit-log"
        title="Audit log"
        description="Every watsonx.ai call, with the three governance scores. Entries are written once and can't be edited or deleted."
      >
        <LoadState error={governance.error} loading={!governance.data && !governance.error} what="the audit log" />
        {governance.data && <AuditLog data={governance.data} />}
      </Section>
    </ManagerLayout>
  );
}

/** Section 1. The chart's values are written beside each bar; the numbers also have a text equivalent for screen readers. */
function GroundTruth({ data }: { data: ValidationSummary }) {
  return (
    <>
      <DistributionChart data={data} />
      <dl className="rcs-figure-row">
        <Figure
          label={data.is_placeholder ? "Match rate (illustrative)" : "Match rate"}
          value={`${data.match_rate_pct}%`}
        />
        <Figure label="Validation set size" value={`${data.validation_set_size} clips`} />
      </dl>
      <p className="cds--visually-hidden">
        {data.tiers
          .map((t) => `${t.tier}: AI predicted ${t.ai_predicted_pct}%, ground truth ${t.ground_truth_pct}%.`)
          .join(" ")}
        {data.is_placeholder ? " All values illustrative placeholder data." : ""}
      </p>
      <p className="rcs-helper" style={{ maxInlineSize: "72ch" }}>
        Compared with a manually labelled set of the project&apos;s synthetic or staged footage (about 10–20 clips,
        prototype scale). The pass or fail threshold is still open, so none is shown as if it were adopted.
      </p>
    </>
  );
}

/**
 * Paired horizontal bars per tier. The visual is aria-hidden because the
 * "Text equivalent" panel carries the same numbers for assistive technology.
 */
function DistributionChart({ data }: { data: ValidationSummary }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {data.tiers.map((t) => (
        <div key={t.tier} className="grid grid-cols-[28px_1fr] items-center gap-2">
          <span style={{ fontSize: 12 }}>{t.tier}</span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div style={{ height: 8, width: `${t.ai_predicted_pct}%`, backgroundColor: AI_COLOUR }} />
              <span className="rcs-mono" style={{ fontSize: 12 }}>
                {t.ai_predicted_pct}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                style={{
                  height: 8,
                  width: `${t.ground_truth_pct}%`,
                  backgroundColor: TRUTH_COLOUR,
                  backgroundImage:
                    "repeating-linear-gradient(135deg, transparent 0 3px, var(--cds-background) 3px 4px)",
                }}
              />
              <span className="rcs-mono" style={{ fontSize: 12 }}>
                {t.ground_truth_pct}%
              </span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-4" style={{ fontSize: 12 }}>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 12, height: 8, backgroundColor: AI_COLOUR, display: "inline-block" }} /> AI-predicted
          (top bar)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 12,
              height: 8,
              display: "inline-block",
              backgroundColor: TRUTH_COLOUR,
              backgroundImage: "repeating-linear-gradient(135deg, transparent 0 3px, var(--cds-background) 3px 4px)",
            }}
          />{" "}
          Ground truth (bottom bar, striped)
        </span>
      </div>
    </div>
  );
}

const score = (n: number) => n.toFixed(2);

/**
 * Simplified governance log: every watsonx.ai call with model, prompt version
 * and evaluation scores. Append-only, and labelled illustrative until
 * evaluation runs on the deployed pipeline.
 */
const LOG_SHOWN_AT_FIRST = 8;

/**
 * Section 3. The three client-required fields as averages, then every call.
 * Result is written as "Succeeded" or "Failed" with a tag and an error accent,
 * never colour alone.
 */
function AuditLog({ data }: { data: GovernanceSummary }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? data.rows : data.rows.slice(0, LOG_SHOWN_AT_FIRST);
  return (
    <>
      <Grid className="rcs-grid" condensed>
        <Column sm={2} md={2} lg={4}>
          <StatTile
            label="Accumulated score (illustrative)"
            value={score(data.averages.accumulated_score)}
            helper="Average over successful calls"
          />
        </Column>
        <Column sm={2} md={2} lg={4}>
          <StatTile
            label="Prompt leakage (illustrative)"
            value={score(data.averages.prompt_leakage)}
            helper="1.00 means no leakage"
          />
        </Column>
        <Column sm={2} md={2} lg={4}>
          <StatTile
            label="Source attribution (illustrative)"
            value={score(data.averages.source_attribution)}
            helper="1.00 means fully attributed"
          />
        </Column>
        <Column sm={2} md={2} lg={4}>
          <StatTile
            label="Model calls"
            value={data.total_calls}
            tone={data.failed_calls ? "error" : "neutral"}
            helper={`${data.failed_calls} failed`}
          />
        </Column>
      </Grid>
      <Layer>
        <Table aria-label="watsonx.ai call log">
          <TableHead>
            <TableRow>
              <TableHeader>Time</TableHeader>
              <TableHeader>Case</TableHeader>
              <TableHeader>Model</TableHeader>
              <TableHeader>Prompt</TableHeader>
              <TableHeader>Result</TableHeader>
              <TableHeader>Leakage</TableHeader>
              <TableHeader>Attribution</TableHeader>
              <TableHeader>Accumulated</TableHeader>
              <TableHeader>Tokens in / out</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.entry_id}
                style={row.success ? undefined : { boxShadow: "inset 3px 0 0 var(--cds-support-error)" }}
              >
                <TableCell>{formatShortDateTime(row.at)}</TableCell>
                <TableCell style={mono}>{row.case_id}</TableCell>
                <TableCell>
                  {row.model_id} <span style={{ color: "var(--cds-text-secondary)" }}>· {row.model_version}</span>
                </TableCell>
                <TableCell>{row.prompt_version}</TableCell>
                <TableCell>
                  <StatusTag tone={row.success ? "success" : "error"} size="sm">
                    {row.success ? "Succeeded" : "Failed"}
                  </StatusTag>
                </TableCell>
                <TableCell style={mono}>{row.success ? score(row.prompt_leakage) : "—"}</TableCell>
                <TableCell style={mono}>{row.success ? score(row.source_attribution) : "—"}</TableCell>
                <TableCell style={mono}>{row.success ? score(row.accumulated_score) : "—"}</TableCell>
                <TableCell style={mono}>
                  {row.tokens_in} / {row.tokens_out}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Layer>
      {data.rows.length > LOG_SHOWN_AT_FIRST && (
        <div>
          <Button kind="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show all ${data.rows.length} calls`}
          </Button>
        </div>
      )}
      <p className="rcs-helper">Scores are illustrative placeholders until evaluation runs on the deployed pipeline.</p>
    </>
  );
}
