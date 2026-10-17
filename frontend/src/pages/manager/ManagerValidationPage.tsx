import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, InlineNotification, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Accordion, AccordionItem, Tab, TabList, TabPanel, TabPanels, Tabs, Select, SelectItem, TextInput, Modal, TableExpandHeader, TableExpandRow, TableExpandedRow } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { AiAuditorComparison } from "../../components/manager/AiAuditorComparison";
import { Figure, LoadState } from "../../components/manager/ManagerBits";
import { mono } from "../../components/manager/managerStyles";
import { KeyValueList, Section } from "../../components/ui/Blocks";
import { auditActionLabel } from "../../design-tokens/auditActions";
import { StatusTag } from "../../components/ui/StatusTag";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { getGovernanceSummary, getValidationSummary, getGovernanceCase, getAuditHistory } from "../../services";
import type { GovernanceSummary, GovernanceQuery, GovernanceLogRow, ValidationSummary } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { formatShortDateTime } from "../../utils/formatPeriod";

/** The three views, in the order shown. Auditor overrides is the landing view: it changes with every completed case and is the one a Manager returns to. The accuracy test runs on a fixed reference set, so it is checked far less often. */
const VIEWS = [
  { key: "ai-vs-auditor", label: "Auditor overrides" },
  { key: "ai-vs-ground-truth", label: "AI accuracy test" },
  { key: "audit-log", label: "AI call log" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

/** What each view is for, in words a first-time reader can act on. Shown at the top of its tab. */
const PURPOSE: Record<ViewKey, { shows: string; use: string }> = {
  "ai-vs-auditor": {
    shows: "Completed cases in which an Auditor's final severity differs from the AI's initial rating.",
    use: "Use this view to identify where reviewers and the AI disagree. A difference does not indicate an error by either, and it is not a measure of the AI's accuracy.",
  },
  "ai-vs-ground-truth": {
    shows: "How closely the AI's severity ratings match a reference set of footage that reviewers labelled in advance.",
    use: "Use this view to assess whether the AI's ratings can be relied upon. It does not include live cases.",
  },
  "audit-log": {
    shows: "Each request RCS sent to the AI model, the checks applied to its response, and the sources it drew on.",
    use: "Use this view to trace how a result was produced or to investigate a failed request.",
  },
};

function Purpose({ view }: { view: ViewKey }) {
  return (
    <span className="rcs-purpose">
      <span>
        <strong>Scope.</strong> {PURPOSE[view].shows}
      </span>
      <span>
        <strong>Purpose.</strong> {PURPOSE[view].use}
      </span>
    </span>
  );
}

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
  const [query, setQuery] = useState<GovernanceQuery>({ limit: 25 });
  const [selectedCase, setSelectedCase] = useState("");
  const [action, setAction] = useState("");
  const governance = useStaffQuery((token) => getGovernanceSummary(token, query), JSON.stringify(query));

  const [params, setParams] = useSearchParams();
  const view = VIEWS.find((v) => v.key === params.get("view")) ?? VIEWS[0];

  const filters = (
    // Progressive disclosure: the filters apply to the comparison and the audit log, so they sit inside those views.
    <Accordion>
      <AccordionItem title="Filters">
        <GovernanceFilters
          view={view.key}
          onApply={(next, auditAction) => {
            setQuery({ ...next, limit: 25 });
            setAction(auditAction);
          }}
        />
      </AccordionItem>
    </Accordion>
  );

  return (
    <ManagerLayout>
      <PageHeader
        title="Validation & Audit"
        subtitle="Assess the reliability of the AI and trace how each result was produced. Select a view."
      />

      {data?.is_placeholder && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Placeholder / mock data — not real validation results."
          subtitle="The ground-truth validation section contains illustrative values. Live governance and Auditor comparisons are separate."
          style={{ maxWidth: "100%" }}
        />
      )}

      <Tabs
        selectedIndex={VIEWS.indexOf(view)}
        onChange={({ selectedIndex }) => setParams({ view: VIEWS[selectedIndex].key }, { replace: true })}
      >
        <TabList aria-label="Validation and audit views" contained>
          {VIEWS.map((v) => (
            <Tab key={v.key}>{v.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          <TabPanel>
            <Section id="ai-vs-auditor" description={<Purpose view="ai-vs-auditor" />}>
              {filters}
              <LoadState error={governance.error} loading={!governance.data && !governance.error} what="the comparison" />
              {governance.data && <AiAuditorComparison data={governance.data} />}
              {governance.data?.next_comparison_offset != null && (
                <Button
                  kind="ghost"
                  onClick={() => setQuery({ ...query, comparison_offset: governance.data?.next_comparison_offset ?? undefined })}
                >
                  Older comparisons
                </Button>
              )}
              {query.comparison_offset && (
                <Button kind="ghost" onClick={() => setQuery({ ...query, comparison_offset: undefined })}>
                  Newest comparisons
                </Button>
              )}
            </Section>
          </TabPanel>
          <TabPanel>
            <Section id="validation" description={<Purpose view="ai-vs-ground-truth" />}>
              <LoadState error={error} loading={!data && !error} what="validation results" />
              {data && <GroundTruth data={data} />}
            </Section>
          </TabPanel>
          <TabPanel>
            <Section id="audit-log" description={<Purpose view="audit-log" />}>
              {filters}
              <LoadState error={governance.error} loading={!governance.data && !governance.error} what="the audit log" />
              {governance.data && <AuditLog data={governance.data} onSelectCase={setSelectedCase} />}
              {governance.data?.next_before && (
                <Button kind="ghost" onClick={() => setQuery({ ...query, before: governance.data?.next_before ?? undefined })}>
                  Older calls
                </Button>
              )}
              {query.before && (
                <Button kind="ghost" onClick={() => setQuery({ ...query, before: undefined })}>
                  Newest calls
                </Button>
              )}
              <CaseGovernance caseId={selectedCase} query={query} action={action} onClose={() => setSelectedCase("")} />
            </Section>
          </TabPanel>
        </TabPanels>
      </Tabs>
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

/**
 * Filters for the two views that use them, grouped so the page does not open on a wall of fields: when and which
 * data first (every view), then, for the audit log only, what to look for. Every field is the same height and sits on
 * the same grid; Apply and Clear are together underneath.
 */
function GovernanceFilters({
  view,
  onApply,
}: {
  view: ViewKey;
  onApply: (query: GovernanceQuery, action: string) => void;
}) {
  const isLog = view === "audit-log";
  return (
    <form
      className="rcs-filters"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const value = (key: string) => String(values.get(key) ?? "").trim() || undefined;
        const date = (key: string) => (value(key) ? new Date(value(key)!).toISOString() : undefined);
        onApply(
          {
            case_id: value("case"),
            from_at: date("from"),
            to_at: date("to"),
            context: (value("context") ?? "live") as GovernanceQuery["context"],
            leakage: value("leakage"),
          },
          value("action") ?? "",
        );
      }}
    >
      <fieldset className="rcs-filter-group">
        <legend>When and which data</legend>
        <div className="rcs-filter-row">
          <TextInput id={`${view}-from`} name="from" type="datetime-local" labelText="From" size="md" />
          <TextInput id={`${view}-to`} name="to" type="datetime-local" labelText="To" size="md" />
          <Select id={`${view}-context`} name="context" labelText="Data" size="md" defaultValue="live">
            <SelectItem value="live" text="Live calls" />
            <SelectItem value="test" text="Test calls" />
            <SelectItem value="demo" text="Legacy demo" />
          </Select>
        </div>
      </fieldset>
      {isLog && (
        <fieldset className="rcs-filter-group">
          <legend>What to look for</legend>
          <div className="rcs-filter-row">
            <TextInput id="log-case" name="case" labelText="Case ID" size="md" maxLength={20} placeholder="e.g. AR-2026-00340" />
            <Select id="log-leakage" name="leakage" labelText="Prompt leakage check" size="md" defaultValue="">
              <SelectItem value="" text="All" />
              {["NOT_CHECKED", "NOT_DETECTED", "DETECTED"].map((v) => (
                <SelectItem key={v} value={v} text={v.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())} />
              ))}
            </Select>
            <Select id="log-action" name="action" labelText="Timeline action" size="md" defaultValue="">
              <SelectItem value="" text="All events" />
              {["CASE_CREATED", "CASE_ASSIGNED", "AI_ANALYSIS_STARTED", "AI_ANALYSIS_COMPLETED", "AI_ANALYSIS_FAILED", "CASE_RESOLVED"].map((v) => (
                <SelectItem key={v} value={v} text={v.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())} />
              ))}
            </Select>
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" kind="tertiary" size="md">
          Apply filters
        </Button>
        <Button type="reset" kind="ghost" size="md" onClick={() => onApply({ limit: 25 }, "")}>
          Clear
        </Button>
      </div>
    </form>
  );
}

function AuditLog({ data, onSelectCase }: { data: GovernanceSummary; onSelectCase: (id: string) => void }) {
  const paged = usePagination(data.rows, String(data.rows.length));
  const rows = paged.rows;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  return (
    <>
      {data.is_placeholder && (
        <p role="note" className="rcs-helper">
          Placeholder / mock data — these legacy metrics are not real governance results.
        </p>
      )}
      <p className="rcs-body" role="status">
        {data.failed_calls > 0
          ? `${data.failed_calls} failed ${data.failed_calls === 1 ? "request" : "requests"}. Failed rows are marked.`
          : "No failed requests in this view."}
      </p>
      <dl className="rcs-figure-row">
        <Figure label="Requests" value={data.total_calls} />
        <Figure label="Failed requests" value={data.failed_calls} />
        <Figure label="Pending or unknown" value={data.unknown_calls ?? 0} />
      </dl>
      <p className="rcs-helper">
        Accumulated score is the case's highest effective severity, from 0 to 100. The prompt leakage check applies a
        local rule and is not a guarantee. Source attribution links to the stored evidence.
      </p>
      <Layer>
        <Table aria-label="watsonx.ai call log">
          <TableHead>
            <TableRow>
              <TableExpandHeader aria-label="Expand to see details" />
              {["Time", "Case", "Model", "Outcome", "Output check"].map((h) => (
                <TableHeader key={h}>{h}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.flatMap((row) => {
              const open = expanded.has(row.entry_id);
              const failed = row.outcome && row.outcome !== "RECEIVED";
              return [
                <TableExpandRow
                  key={row.entry_id}
                  isExpanded={open}
                  aria-label={`Show details for the call at ${formatShortDateTime(row.at)}`}
                  onExpand={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(row.entry_id)) next.delete(row.entry_id);
                      else next.add(row.entry_id);
                      return next;
                    })
                  }
                  // A call that did not come back clean carries the same red edge as other rows that need a look.
                  style={failed ? { boxShadow: "inset 3px 0 0 var(--cds-support-error)" } : undefined}
                >
                  <TableCell>{formatShortDateTime(row.at)}</TableCell>
                  <TableCell style={mono}>{row.case_id || "Test call"}</TableCell>
                  <TableCell>
                    {row.model_id}
                    <span className="rcs-helper" style={{ display: "block" }}>
                      {row.prompt_version}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusTag tone={row.outcome === "RECEIVED" ? "success" : row.outcome ? "error" : "neutral"} size="sm">
                      {row.outcome === "RECEIVED" ? "Received" : row.outcome ? "Failed" : "Legacy demo"}
                    </StatusTag>
                  </TableCell>
                  <TableCell>{row.validation_status ?? "Not recorded"}</TableCell>
                </TableExpandRow>,
                open && (
                  <TableExpandedRow key={`${row.entry_id}-details`} colSpan={6}>
                    <CallDetails row={row} onSelectCase={onSelectCase} />
                  </TableExpandedRow>
                ),
              ];
            })}
          </TableBody>
        </Table>
      </Layer>
      {!rows.length && <p>No invocations match these filters.</p>}
      <TablePagination paged={paged} />
    </>
  );
}

const LEAKAGE_LABEL: Record<string, string> = {
  NOT_CHECKED: "Not checked",
  NOT_DETECTED: "Nothing detected",
  DETECTED: "Detected",
};
const NOT_RECORDED = "Not recorded";

/** What one AI call recorded, grouped so a Manager can read it: the checks, then the request itself. */
function CallDetails({ row, onSelectCase }: { row: GovernanceLogRow; onSelectCase: (id: string) => void }) {
  const sources = Array.isArray(row.source_attribution) ? row.source_attribution : null;
  return (
    <div className="rcs-call-details">
      <section aria-label="Checks on the response">
        <h4 className="rcs-subheading">Checks on the response</h4>
        <KeyValueList
          items={[
            { label: "Prompt leakage check", value: LEAKAGE_LABEL[row.prompt_leakage_status ?? "NOT_CHECKED"] ?? row.prompt_leakage_status },
            { label: "Source attribution", value: sources ? `${sources.length} ${sources.length === 1 ? "reference" : "references"}` : NOT_RECORDED },
            {
              label: "Accumulated score",
              value: row.schema_version === 2 && row.accumulated_score !== null ? `${row.accumulated_score} / 100` : NOT_RECORDED,
            },
            { label: "Checked at", value: row.checked_at ? formatShortDateTime(row.checked_at) : "Not checked" },
            ...(row.error_type ? [{ label: "Issue", value: row.error_type }] : []),
          ]}
        />
      </section>
      <section aria-label="The request">
        <h4 className="rcs-subheading">The request</h4>
        <KeyValueList
          mono={["Run"]}
          items={[
            { label: "Model version", value: row.model_version ?? NOT_RECORDED },
            { label: "Run", value: row.run_id ?? NOT_RECORDED },
            { label: "Response received", value: row.received_at ? formatShortDateTime(row.received_at) : NOT_RECORDED },
            { label: "Tokens in / out", value: `${row.tokens_in ?? NOT_RECORDED} / ${row.tokens_out ?? NOT_RECORDED}` },
          ]}
        />
      </section>
      {sources && sources.length > 0 && (
        <section aria-label="Sources" className="rcs-call-details-wide">
          <h4 className="rcs-subheading">Sources</h4>
          <ul className="flex flex-col gap-1">
            {sources.map((source, i) => (
              <li key={i} className="rcs-helper">
                {source.source_type} {source.frame_num ?? ""} at {source.start_timestamp ?? NOT_RECORDED} seconds ·{" "}
                <code>{source.analysis_output_reference ?? "no reference"}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
      {row.case_id && (
        <div className="rcs-call-details-wide">
          <Button kind="tertiary" size="sm" onClick={() => onSelectCase(row.case_id)}>
            Open case history
          </Button>
        </div>
      )}
    </div>
  );
}

/** The saved AI runs and the timeline of one case, in a panel over the log so the Manager keeps their place in it. */
function CaseGovernance({ caseId, query, action, onClose }: { caseId: string; query: GovernanceQuery; action: string; onClose: () => void }) {
  const info = useStaffQuery((token) => (caseId ? getGovernanceCase(caseId, token) : Promise.resolve(null)), caseId);
  const [before, setBefore] = useState<number | undefined>();
  const timeline = useStaffQuery(
    (token) =>
      caseId
        ? getAuditHistory(token, {
            case_id: caseId,
            governance_only: true,
            action: action || undefined,
            from_at: query.from_at,
            to_at: query.to_at,
            limit: 25,
            before_id: before,
          })
        : Promise.resolve(null),
    JSON.stringify([caseId, query.from_at, query.to_at, action, before]),
  );
  return (
    <Modal
      passiveModal
      open={Boolean(caseId)}
      modalHeading={`Case history · ${caseId}`}
      modalLabel="Validation and audit"
      onRequestClose={onClose}
      size="md"
    >
      <div className="flex flex-col gap-6">
        <section aria-label="Saved AI runs" className="flex flex-col gap-2">
          <h3 className="rcs-section-title">AI runs</h3>
          <LoadState loading={!info.data && !info.error} error={info.error} what="the AI runs" />
          {info.data && info.data.runs.length === 0 && <p className="rcs-helper">No AI runs are saved for this case.</p>}
          {info.data?.runs.map((run) => (
            <KeyValueList
              key={run.run_id}
              mono={["Run"]}
              items={[
                { label: "Run", value: run.run_id },
                { label: "Status", value: run.status },
                { label: "Accumulated score", value: run.accumulated_score ?? NOT_RECORDED },
                { label: "Severity", value: run.severity_tier ?? NOT_RECORDED },
              ]}
            />
          ))}
        </section>
        <section aria-label="Timeline" className="flex flex-col gap-2">
          <h3 className="rcs-section-title">Timeline</h3>
          <p className="rcs-helper">Recorded events for this case, newest first. Source footage needs protected case access.</p>
          <LoadState loading={!timeline.data && !timeline.error} error={timeline.error} what="the timeline" />
          {timeline.data && timeline.data.entries.length === 0 && <p className="rcs-helper">No events recorded.</p>}
          <ul className="flex flex-col">
            {timeline.data?.entries.map((entry) => (
              <li key={entry.audit_log_id} className="rcs-timeline-event">
                <span className="rcs-helper">{formatShortDateTime(entry.created_at)}</span>
                <span>{auditActionLabel(entry.action)}</span>
                <span className="rcs-helper">{entry.actor}</span>
              </li>
            ))}
          </ul>
          {timeline.data?.next_before_id && (
            <div>
              <Button kind="tertiary" size="sm" onClick={() => setBefore(timeline.data?.next_before_id ?? undefined)}>
                Show older events
              </Button>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
