import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { secondaryText } from "../../components/manager/managerStyles";
import { listSosAlerts } from "../../services";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { SOS_STATUS_LABEL } from "../../design-tokens/managerLabels";
import { formatDayTime } from "../../utils/formatRelativeTime";

/**
 * SOS Inbox (Manager Figma 103:151): unacknowledged, in-progress and
 * resolved SOS events in one queue (MR-SOS-01). Unacknowledged alerts come
 * first, in bold, with a left accent bar and an Acknowledge action that opens
 * the alert's context before anything is recorded.
 */
export function ManagerSosInboxPage() {
  const navigate = useNavigate();
  const { data, error } = useStaffQuery(listSosAlerts);
  const [now] = useState(() => Date.now());

  return (
    <ManagerLayout>
      <ManagerBreadcrumb trail={[{ label: "Overview", to: "/manager" }, { label: "SOS Inbox" }]} />
      <PageHeader title="SOS Inbox" subtitle="Most urgent first. Review an alert to see the context; you acknowledge it from there, then log your follow-up." />
      <LoadState error={error} loading={!data && !error} what="SOS alerts" />
      {data && data.length === 0 && <p style={secondaryText}>No SOS alerts have been raised.</p>}
      {data && data.length > 0 && (
        <Layer>
          <Table aria-label="SOS alerts">
            <TableHead>
              <TableRow>
                <TableHeader>Auditor</TableHeader>
                <TableHeader>Time triggered</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Unacknowledged first, then newest: the order to work in. */}
              {[...data]
                .sort(
                  (a, b) =>
                    Number(b.status === "UNACKNOWLEDGED") - Number(a.status === "UNACKNOWLEDGED") ||
                    Date.parse(b.triggered_at) - Date.parse(a.triggered_at),
                )
                .map((alert) => {
                const unacknowledged = alert.status === "UNACKNOWLEDGED";
                const detailUrl = `/manager/sos/${encodeURIComponent(alert.id)}`;
                return (
                  <TableRow key={alert.id} onClick={() => navigate(detailUrl)} style={{ cursor: "pointer" }}>
                    <TableCell
                      style={{
                        fontWeight: unacknowledged ? 600 : 400,
                        boxShadow: unacknowledged ? "inset 3px 0 0 var(--cds-support-error)" : undefined,
                      }}
                    >
                      {alert.auditor_name}
                    </TableCell>
                    <TableCell>{formatDayTime(alert.triggered_at, now, { withAgo: true })}</TableCell>
                    <TableCell>
                      {unacknowledged ? (
                        // Opens the context first. Acknowledging is a step on the next page, so this is not red:
                        // it is not a destructive action, and nothing is recorded by clicking it.
                        <Button
                          kind="tertiary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(detailUrl);
                          }}
                          aria-label={`Review ${alert.auditor_name}'s SOS alert`}
                        >
                          Review alert
                        </Button>
                      ) : (
                        <RouterLink to={detailUrl} className="cds--link" onClick={(e) => e.stopPropagation()}>
                          {SOS_STATUS_LABEL[alert.status] ?? "Open alert"}
                        </RouterLink>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Layer>
      )}
    </ManagerLayout>
  );
}
