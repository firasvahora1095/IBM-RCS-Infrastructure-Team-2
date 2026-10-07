import {
  Column,
  Grid,
  InlineNotification,
  Layer,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { Figure, LoadState, Panel } from "../../components/manager/ManagerBits";
import { mono, pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { StatTile } from "../../components/ui/StatTile";
import { SeverityTag } from "../../components/severity/SeverityTag";
import { getGovernanceSummary, getValidationSummary } from "../../services";
import type { GovernanceSummary, ValidationSummary } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { formatShortDateTime } from "../../utils/formatPeriod";

const AI_COLOUR = "var(--cds-support-info)";
const TRUTH_COLOUR = "var(--cds-support-success)";

/**
 * Validation View (Manager Figma 136:257, MR-OV-08 / CV-10): AI-predicted vs
 * manually labelled ground-truth severity distribution, kept separate from
 * live oversight.
 *
 * Task 96: the placeholder banner is mandatory and always shown while the data
 * is a placeholder, and the "illustrative" wording stays on every figure, so
 * nothing here can be read as real model-performance evidence. The chart has
 * a full text equivalent, and each series is told apart by a legend with
 * position and pattern, not colour alone.
 *
 * Sprint 3 (B2B spec S10): one combined screen with two tabs. The first adds
 * where Auditors changed the AI's severity (aggregate only); the second is the
 * simplified governance audit log — prompt leakage, source attribution and an
 * accumulated score per watsonx.ai call, the lightweight alternative to
 * watsonx.governance agreed with Naresh.
 */
export function ManagerValidationPage() {
  const { data, error } = useStaffQuery(getValidationSummary);
  const governance = useStaffQuery(getGovernanceSummary);

  return (
    <ManagerLayout>
      <h1 style={pageTitle}>Validation View</h1>
      <LoadState error={error} loading={!data && !error} what="validation results" />
      {data && (
        <>
          {data.is_placeholder && (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="Placeholder / mock data — not real validation results."
              subtitle="This screen shows illustrative sample values until Dev's pipeline produces real results."
              style={{ maxWidth: "100%" }}
            />
          )}

          <Tabs>
            <TabList aria-label="Validation views" contained={false}>
              <Tab>AI accuracy and human review</Tab>
              <Tab>Audit log</Tab>
            </TabList>
            <TabPanels>
              <TabPanel style={{ paddingInline: 0 }}>
                <div className="flex flex-col gap-6">
                  <Panel title="AI-predicted vs. ground-truth severity distribution" maxWidth={720}>
                    <DistributionChart data={data} />
                    <dl className="flex flex-wrap gap-12">
                      <Figure
                        label={data.is_placeholder ? "Match rate (illustrative)" : "Match rate"}
                        value={`${data.match_rate_pct}%`}
                      />
                      <Figure label="Validation set size" value={`${data.validation_set_size} clips`} />
                    </dl>
                  </Panel>

                  <Panel title="Text equivalent (for screen readers)">
                    <p style={{ fontSize: 14, lineHeight: "20px" }}>
                      {data.tiers
                        .map((t) => `${t.tier}: AI predicted ${t.ai_predicted_pct}%, ground truth ${t.ground_truth_pct}%.`)
                        .join(" ")}
                      {data.is_placeholder ? " All values illustrative placeholder data." : ""}
                    </p>
                  </Panel>

                  {governance.data && <OverridePatterns data={governance.data} />}

                  <Panel title="Methodology">
                    <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
                      The AI severity output is compared against a manually labelled ground-truth set using the
                      project&apos;s synthetic/staged validation footage (~10–20 clips, MVP/demo scale). The pass/fail
                      threshold itself remains open — it now requires continuous testing infrastructure, so setting it
                      is retargeted to Sprint 3 and is no longer a Sprint 2 blocker; this view does not display a
                      specific pass/fail number as if it were adopted, since none is in the finalised baseline.
                    </p>
                  </Panel>
                </div>
              </TabPanel>
              <TabPanel style={{ paddingInline: 0 }}>
                <div className="flex flex-col gap-6">
                  <LoadState
                    error={governance.error}
                    loading={!governance.data && !governance.error}
                    what="the audit log"
                  />
                  {governance.data && <AuditLog data={governance.data} />}
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </>
      )}
    </ManagerLayout>
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
            <div style={{ height: 8, width: `${t.ai_predicted_pct}%`, backgroundColor: AI_COLOUR }} />
            <div
              style={{
                height: 8,
                width: `${t.ground_truth_pct}%`,
                backgroundColor: TRUTH_COLOUR,
                backgroundImage: "repeating-linear-gradient(135deg, transparent 0 3px, var(--cds-background) 3px 4px)",
              }}
            />
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

/**
 * Where the Auditor's final severity differed from the AI's. Aggregate only,
 * never broken down by Auditor: disagreement isn't a verdict on anyone
 * (Sprint 3 extras §1.1).
 */
function OverridePatterns({ data }: { data: GovernanceSummary }) {
  const total = data.override_patterns.reduce((sum, p) => sum + p.count, 0);
  const share = Math.round((total / Math.max(1, data.compared_cases)) * 100);
  return (
    <Panel title="Where Auditors changed the AI severity">
      <p style={secondaryText}>
        {total} of {data.compared_cases} completed cases ({share}%) ended with a different severity after human review.
        Disagreement isn&apos;t a verdict on either side; it points to cases worth a closer look.
      </p>
      {data.override_patterns.length === 0 ? (
        <p style={secondaryText}>No severity changes yet.</p>
      ) : (
        <Layer>
          <Table aria-label="Severity changes after human review">
            <TableHead>
              <TableRow>
                <TableHeader>AI severity</TableHeader>
                <TableHeader>Final severity</TableHeader>
                <TableHeader>Cases</TableHeader>
                <TableHeader>Share of changes</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.override_patterns.map((p) => (
                <TableRow key={`${p.from}-${p.to}`}>
                  <TableCell>
                    <SeverityTag tier={p.from} size="sm" />
                  </TableCell>
                  <TableCell>
                    <SeverityTag tier={p.to} size="sm" />
                  </TableCell>
                  <TableCell style={mono}>{p.count}</TableCell>
                  <TableCell style={mono}>{Math.round((p.count / total) * 100)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Layer>
      )}
    </Panel>
  );
}

const score = (n: number) => n.toFixed(2);

/**
 * Simplified governance log: every watsonx.ai call with model, prompt version
 * and evaluation scores. Append-only, and labelled illustrative until
 * evaluation runs on the deployed pipeline.
 */
function AuditLog({ data }: { data: GovernanceSummary }) {
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
            {data.rows.map((row) => (
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
                <TableCell>{row.success ? "Succeeded" : "Failed"}</TableCell>
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
      <p style={{ fontSize: 12, lineHeight: "16px", color: "var(--cds-text-secondary)" }}>
        Entries are written once per model call and can&apos;t be edited or deleted. Scores are illustrative
        placeholders until evaluation runs on the deployed pipeline.
      </p>
    </>
  );
}
