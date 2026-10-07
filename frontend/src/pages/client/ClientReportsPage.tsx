import { Link as RouterLink } from "react-router-dom";
import { Layer, SkeletonText, InlineNotification } from "@carbon/react";
import { ClientHeader } from "../../components/shell/ClientHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/Blocks";
import { clientListReports } from "../../services";
import { useClientQuery } from "../../hooks/useClientQuery";
import { useClientAuth } from "../../hooks/useClientAuth";
import { ACCESS_DISCLOSURE, CLIENT_EMPTY } from "../../design-tokens/reportLabels";
import { formatPeriod, formatShortDate, wholeMonthName } from "../../utils/formatPeriod";

/**
 * CommunityHub reports (B2B spec S12a): the reports RCS has released to the
 * signed-in user's organisation, newest first. Nothing else from RCS is
 * reachable from here.
 */
export function ClientReportsPage() {
  const { session } = useClientAuth();
  const { data, error } = useClientQuery(clientListReports);

  return (
    <>
      <ClientHeader />
      <StaffPage maxWidth={1056}>
        <PageHeader
          title="Service reports"
          subtitle={`Reports released to ${session?.organisationName ?? "your organisation"} by RCS. Each covers the cases reviewed in its period.`}
        />
        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Couldn't load your reports."
            subtitle={error.message}
            style={{ maxWidth: "100%" }}
          />
        )}
        {!data && !error && <SkeletonText paragraph lineCount={4} />}
        {data && data.length === 0 && <EmptyState title="No reports yet" body={CLIENT_EMPTY} />}
        {data && data.length > 0 && (
          <Layer>
            <ul className="flex flex-col gap-4" aria-label="Released reports">
              {data.map((r) => {
                const decided = r.metrics.violation_count + r.metrics.no_violation_count;
                return (
                  <li key={r.report_id}>
                    <RouterLink
                      to={`/client/reports/${encodeURIComponent(r.report_id)}`}
                      className="rcs-stat-tile"
                      aria-label={`${formatPeriod(r.period_start, r.period_end)} report, released ${formatShortDate(r.released_at!)}`}
                    >
                      <span className="rcs-stat-label">
                        Released {formatShortDate(r.released_at!)} · Version {r.version}
                      </span>
                      <span className="rcs-section-title" style={{ fontSize: 20, lineHeight: "28px" }}>
                        {wholeMonthName(r.period_start, r.period_end) ?? formatPeriod(r.period_start, r.period_end)}
                      </span>
                      <span className="rcs-stat-helper" style={{ color: "var(--cds-text-secondary)" }}>
                        {r.metrics.cases_completed} cases completed · {r.metrics.violation_count} of {decided} found to
                        violate policy
                      </span>
                      <span className="rcs-stat-helper">View report</span>
                    </RouterLink>
                  </li>
                );
              })}
            </ul>
          </Layer>
        )}
        <p className="rcs-helper">{ACCESS_DISCLOSURE}</p>
      </StaffPage>
    </>
  );
}
