import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, SkeletonText } from "@carbon/react";
import { StatusTag } from "../ui/StatusTag";
import { deliveryFailureKind } from "../../design-tokens/deliveryLabels";
import { Figure } from "./ManagerBits";
import { BarList, SegmentedBar } from "../ui/Charts";
import { StatTile } from "../ui/StatTile";
import { TransitionMatrix } from "../ui/TransitionMatrix";
import type { ManagerIntelligence, SeverityTier } from "../../services/types";
import { getSeverityInfo } from "../../design-tokens/severity";
import {
  caseOversightLink,
  OPEN_BUCKET_COLOR,
  OPEN_BUCKET_LABEL,
  OPEN_BUCKET_ORDER,
} from "../../design-tokens/intelligenceLabels";
import { formatAge, formatMinutes, formatShortDateTime } from "../../utils/formatPeriod";

/** The Insights widgets (Sprint 3 extras §1.2), kept apart from the Overview's inbox. */
const TIERS: SeverityTier[] = ["S1", "S2", "S3", "S4"];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

export function WidgetLoading({ error }: { error: string | null }) {
  if (error) return <p className="rcs-helper">Not available until the dashboard figures load.</p>;
  return <SkeletonText paragraph lineCount={3} />;
}

export function CaseFlow({ data }: { data: ManagerIntelligence }) {
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

export function Outcomes({ data }: { data: ManagerIntelligence }) {
  const { outcomes } = data;
  const decided = outcomes.violation + outcomes.no_violation;
  return (
    <>
      <SegmentedBar
        label="Moderation outcomes"
        height={16}
        segments={[
          { key: "v", label: "Policy Violation Found", value: outcomes.violation, color: "var(--cds-support-error)" },
          // Only the finding that needs a look is coloured; "no violation" is the normal case, so it stays quiet.
          { key: "nv", label: "No Violation Found", value: outcomes.no_violation, color: "var(--cds-border-strong-01)" },
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
            color: info.bar,
          };
        })}
      />
    </>
  );
}

export function Comparison({ data }: { data: ManagerIntelligence }) {
  const { comparison } = data;
  if (comparison.eligible === 0) {
    return <p className="rcs-body">No decided cases with both an AI and a final severity in this period.</p>;
  }
  const top = comparison.top_transition;
  return (
    // Two even halves: the two headline figures as the same tiles used across the page, and the matrix
    // that explains them. Labels are sans, numbers are mono, as on every tile.
    <div className="rcs-comparison">
      <div className="flex flex-col gap-4">
        <StatTile
          label="AI Override"
          value={percent(comparison.override_rate)}
          helper={`The AI and the Auditor disagreed in ${comparison.overrides} of ${comparison.eligible} decided cases`}
        />
        <StatTile
          label="Most common change"
          value={top ? `${top.from} → ${top.to}` : "None"}
          helper={top ? plural(top.count, "case", "cases") : "No changes in the period"}
        />
      </div>
      <TransitionMatrix matrix={comparison.matrix} />
    </div>
  );
}

export function DeliveryHealthWidget({ data }: { data: ManagerIntelligence }) {
  const { delivery } = data;
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      {/* Counts read left to right in the order a result travels; the rate and last failure share the same columns. */}
      <dl className="rcs-delivery-figures">
        <Figure label="Delivered" value={delivery.health.success} />
        <Figure label="Pending" value={delivery.health.pending} />
        <Figure label="Retrying" value={delivery.health.retrying} />
        <Figure
          label="Failed"
          value={
            <span style={{ color: delivery.health.needs_attention > 0 ? "var(--cds-text-error)" : undefined, fontWeight: 600 }}>
              {delivery.health.needs_attention}
            </span>
          }
        />
        <Figure
          label="Success rate"
          value={delivery.success_rate === null ? "No finished deliveries" : percent(delivery.success_rate)}
        />
        {delivery.last_failed_at && <Figure label="Last failure" value={formatShortDateTime(delivery.last_failed_at)} />}
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="rcs-subheading">Waiting for you now</h3>
        {delivery.failed.length === 0 ? (
          <p className="rcs-helper">No failed handoffs. Results reach CommunityHub automatically.</p>
        ) : (
          <ul className="rcs-failed-list">
            {delivery.failed.map((row) => (
              <li key={row.delivery_id}>
                <span className="rcs-mono">{row.case_id}</span>
                <span className="rcs-helper">{plural(row.attempts, "attempt", "attempts")}</span>
                <StatusTag tone="error" size="sm">
                  {deliveryFailureKind(row.reason)}
                </StatusTag>
                <span className="rcs-helper">{row.reason ?? ""}</span>
                <Button
                  kind="ghost"
                  size="sm"
                  aria-label={`View delivery for ${row.case_id}`}
                  onClick={() => navigate(`/manager/deliveries/${encodeURIComponent(row.delivery_id)}`)}
                >
                  View
                </Button>
              </li>
            ))}
          </ul>
        )}
        <RouterLink className="cds--link" to="/manager/deliveries" style={{ alignSelf: "flex-start" }}>
          All deliveries
        </RouterLink>
      </div>
    </div>
  );
}
