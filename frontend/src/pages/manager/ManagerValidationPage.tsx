import { useState } from "react";
import {
  Button,
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
import { PageHeader } from "../../components/ui/PageHeader";
import { AiAuditorComparison } from "../../components/manager/AiAuditorComparison";
import { Figure, LoadState } from "../../components/manager/ManagerBits";
import { mono } from "../../components/manager/managerStyles";
import { Section } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { getGovernanceSummary, getValidationSummary, getGovernanceCase, getAuditHistory } from "../../services";
import type { GovernanceSummary, GovernanceQuery, GovernanceLogRow, ValidationSummary } from "../../services/types";
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
  const [query, setQuery] = useState<GovernanceQuery>({ limit: 25 });
  const [selectedCase, setSelectedCase] = useState("");
  const [action, setAction] = useState("");
  const governance = useStaffQuery((token) => getGovernanceSummary(token, query), JSON.stringify(query));

  return (
    <ManagerLayout>
      <div className="flex flex-col gap-2">
        <PageHeader
          title="Validation & Audit"
          subtitle="Is the AI trustworthy, and can every result be traced? Three separate views on one screen: they are never mixed."
        />
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
          subtitle="The ground-truth validation section contains illustrative values. Live governance and Auditor comparisons are separate."
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

      <GovernanceFilters
        onApply={(next, auditAction) => {
          setQuery({ ...next, limit: 25 });
          setAction(auditAction);
        }}
      />

      <Section
        id="ai-vs-auditor"
        title="AI vs Auditor"
        description="Completed cases; legacy or demo provenance is labelled per row. A difference isn't a verdict on the AI or the Auditor; it points to cases worth a closer look. It isn't model accuracy."
      >
        <LoadState error={governance.error} loading={!governance.data && !governance.error} what="the comparison" />
        {governance.data && <AiAuditorComparison data={governance.data} />}
        {governance.data?.next_comparison_offset != null && (
          <Button
            kind="ghost"
            onClick={() =>
              setQuery({ ...query, comparison_offset: governance.data?.next_comparison_offset ?? undefined })
            }
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

      <Section
        id="audit-log"
        title="Audit log"
        description="Recorded application model invocations, their response checks and source references. A received response may still fail validation or storage."
      >
        <LoadState error={governance.error} loading={!governance.data && !governance.error} what="the audit log" />
        {governance.data && <AuditLog data={governance.data} onSelectCase={setSelectedCase} />}
        {governance.data?.next_before && (
          <Button
            kind="ghost"
            onClick={() => setQuery({ ...query, before: governance.data?.next_before ?? undefined })}
          >
            Older calls
          </Button>
        )}
        {query.before && (
          <Button kind="ghost" onClick={() => setQuery({ ...query, before: undefined })}>
            Newest calls
          </Button>
        )}
      </Section>
      <CaseGovernance caseId={selectedCase} query={query} action={action} />
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

function GovernanceFilters({ onApply }: { onApply: (query: GovernanceQuery, action: string) => void }) {
  return (
    <form
      className="flex flex-wrap items-end gap-4"
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
            ai_tier: value("ai"),
            auditor_tier: value("auditor"),
            override: value("override") === undefined ? undefined : value("override") === "true",
          },
          value("action") ?? "",
        );
      }}
    >
      <label>
        Case ID
        <input className="cds--text-input" name="case" maxLength={20} />
      </label>
      <label>
        From
        <input className="cds--text-input" name="from" type="datetime-local" />
      </label>
      <label>
        To
        <input className="cds--text-input" name="to" type="datetime-local" />
      </label>
      <label>
        Context
        <select className="cds--select-input" name="context">
          <option value="live">Live calls</option>
          <option value="test">Test calls</option>
          <option value="demo">Legacy demo</option>
        </select>
      </label>
      <label>
        Prompt leakage
        <select className="cds--select-input" name="leakage">
          <option value="">All</option>
          {["NOT_CHECKED", "NOT_DETECTED", "DETECTED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {[
        ["ai", "AI tier"],
        ["auditor", "Auditor tier"],
      ].map(([name, label]) => (
        <label key={name}>
          {label}
          <select className="cds--select-input" name={name}>
            <option value="">All</option>
            {["S1", "S2", "S3", "S4"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      ))}
      <label>
        Override
        <select className="cds--select-input" name="override">
          <option value="">All</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
      <label>
        Timeline action
        <select className="cds--select-input" name="action">
          <option value="">All governance events</option>
          {[
            "CASE_CREATED",
            "CASE_ASSIGNED",
            "AI_ANALYSIS_STARTED",
            "AI_ANALYSIS_COMPLETED",
            "AI_ANALYSIS_FAILED",
            "CASE_RESOLVED",
          ].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm">
        Apply filters
      </Button>
    </form>
  );
}

function AuditLog({ data, onSelectCase }: { data: GovernanceSummary; onSelectCase: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? data.rows : data.rows.slice(0, 8);
  return (
    <>
      {data.is_placeholder && (
        <p role="note">Placeholder / mock data — these legacy metrics are not real governance results.</p>
      )}
      <dl className="rcs-figure-row">
        <Figure label="Model calls" value={data.total_calls} />
        <Figure label="Failed calls" value={data.failed_calls} />
        <Figure label="Pending / unknown" value={data.unknown_calls ?? 0} />
      </dl>
      <p className="rcs-helper">
        Accumulated score is the case's highest effective severity, 0–100. Prompt leakage is a local rule check, not a
        guarantee. Source attribution links stored evidence.
      </p>
      <Layer>
        <Table aria-label="watsonx.ai call log">
          <TableHead>
            <TableRow>
              {[
                "Time",
                "Case",
                "Model / prompt",
                "Provider outcome",
                "Output check",
                "Prompt leakage",
                "Source attribution",
                "Accumulated score",
                "Details",
              ].map((h) => (
                <TableHeader key={h}>{h}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.entry_id}>
                <TableCell>{formatShortDateTime(row.at)}</TableCell>
                <TableCell style={mono}>{row.case_id || "Test invocation"}</TableCell>
                <TableCell>
                  {row.model_id}
                  <br />
                  {row.prompt_version}
                </TableCell>
                <TableCell>
                  <StatusTag tone={row.outcome === "RECEIVED" ? "success" : "neutral"} size="sm">
                    {row.outcome ?? "Legacy demo"}
                  </StatusTag>
                </TableCell>
                <TableCell>{row.validation_status ?? "Unavailable"}</TableCell>
                <TableCell>{row.prompt_leakage_status ?? "NOT_CHECKED"}</TableCell>
                <TableCell>
                  {Array.isArray(row.source_attribution)
                    ? `${row.source_attribution.length} references`
                    : "Unavailable"}
                </TableCell>
                <TableCell>
                  {row.schema_version === 2 && row.accumulated_score !== null
                    ? `${row.accumulated_score} / 100`
                    : "Unavailable"}
                </TableCell>
                <TableCell>
                  <CallDetails row={row} onSelectCase={onSelectCase} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Layer>
      {!rows.length && <p>No invocations match these filters.</p>}
      {data.rows.length > 8 && (
        <Button kind="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${data.rows.length} calls`}
        </Button>
      )}
    </>
  );
}

function CallDetails({ row, onSelectCase }: { row: GovernanceLogRow; onSelectCase: (id: string) => void }) {
  return (
    <details>
      <summary>View references</summary>
      <dl>
        <dt>Model version</dt>
        <dd>{row.model_version ?? "Unavailable"}</dd>
        <dt>Run</dt>
        <dd>{row.run_id ?? "Unavailable"}</dd>
        <dt>AI response received</dt>
        <dd>{row.received_at ? formatShortDateTime(row.received_at) : "Unavailable"}</dd>
        <dt>Leakage checked</dt>
        <dd>{row.checked_at ? formatShortDateTime(row.checked_at) : "Not checked"}</dd>
        <dt>Check rule</dt>
        <dd>{row.leakage_rule_version ?? "Unavailable"}</dd>
        <dt>Tokens in / out</dt>
        <dd>
          {row.tokens_in ?? "Unavailable"} / {row.tokens_out ?? "Unavailable"}
        </dd>
        {row.error_type && (
          <>
            <dt>Processing issue</dt>
            <dd>{row.error_type}</dd>
          </>
        )}
      </dl>
      {row.prompt_leakage_evidence && (
        <p>
          Rule: {row.prompt_leakage_evidence.rule}. Evidence hash: {row.prompt_leakage_evidence.matched_text_hash}
        </p>
      )}
      {Array.isArray(row.source_attribution) && (
        <ul>
          {row.source_attribution.map((source, i) => (
            <li key={i}>
              {source.source_type} {source.frame_num ?? ""} at {source.start_timestamp ?? "Unavailable"} seconds
              <br />
              <code>{source.analysis_output_reference ?? "Reference unavailable"}</code>
            </li>
          ))}
        </ul>
      )}
      {row.case_id && (
        <Button kind="ghost" size="sm" onClick={() => onSelectCase(row.case_id)}>
          View case governance and timeline
        </Button>
      )}
    </details>
  );
}

function CaseGovernance({ caseId, query, action }: { caseId: string; query: GovernanceQuery; action: string }) {
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
  if (!caseId)
    return <p className="rcs-helper">Select a call's case to inspect saved runs and the governance timeline.</p>;
  return (
    <Section
      title={`Case governance — ${caseId}`}
      description="Saved assessments and case events. Evidence references open as metadata; source footage requires protected case access."
    >
      <LoadState loading={!info.data && !info.error} error={info.error} what="case governance" />
      {info.data?.runs.map((run) => (
        <p key={run.run_id}>
          <code>{run.run_id}</code> — {run.status}; accumulated score: {run.accumulated_score ?? "Unavailable"}; tier:{" "}
          {run.severity_tier ?? "Unavailable"}; highest evidence: {run.highest_frame ?? "Unavailable"}
        </p>
      ))}
      <LoadState loading={!timeline.data && !timeline.error} error={timeline.error} what="audit timeline" />
      {timeline.data?.entries.map((entry) => (
        <details key={entry.audit_log_id}>
          <summary>
            {formatShortDateTime(entry.created_at)} — {entry.action} — {entry.actor}
          </summary>
          <p>Before</p>
          <pre>{JSON.stringify(entry.before_value, null, 2)}</pre>
          <p>After</p>
          <pre>{JSON.stringify(entry.after_value, null, 2)}</pre>
        </details>
      ))}
      {timeline.data?.next_before_id && (
        <Button kind="ghost" size="sm" onClick={() => setBefore(timeline.data?.next_before_id ?? undefined)}>
          Older events
        </Button>
      )}
    </Section>
  );
}
