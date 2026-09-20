import { InlineNotification } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { Figure, LoadState, Panel } from "../../components/manager/ManagerBits";
import { pageTitle } from "../../components/manager/managerStyles";
import { getValidationSummary } from "../../services";
import type { ValidationSummary } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";

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
 */
export function ManagerValidationPage() {
  const { data, error } = useStaffQuery(getValidationSummary);

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

          <Panel title="AI-predicted vs. ground-truth severity distribution" maxWidth={560}>
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

          <Panel title="Methodology">
            <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--cds-text-secondary)" }}>
              The AI severity output is compared against a manually labelled ground-truth set using the project&apos;s
              synthetic/staged validation footage (~10–20 clips, MVP/demo scale). The pass/fail threshold itself remains
              open — it now requires continuous testing infrastructure, so setting it is retargeted to Sprint 3 and is
              no longer a Sprint 2 blocker; this view does not display a specific pass/fail number as if it were
              adopted, since none is in the finalised baseline.
            </p>
          </Panel>
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
