import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { formatClockTime, pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { listSosAlerts } from "../../services";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { SOS_STATUS_LABEL } from "../../design-tokens/managerLabels";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

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
      <h1 style={pageTitle}>SOS Inbox</h1>
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
              {data.map((alert) => {
                const unacknowledged = alert.status === "UNACKNOWLEDGED";
                const detailUrl = `/manager/sos/${encodeURIComponent(alert.id)}`;
                return (
                  <TableRow key={alert.id}>
                    <TableCell
                      style={{
                        fontWeight: unacknowledged ? 600 : 400,
                        boxShadow: unacknowledged ? "inset 3px 0 0 var(--cds-support-error)" : undefined,
                      }}
                    >
                      {alert.auditor_name}
                    </TableCell>
                    <TableCell>
                      {formatClockTime(alert.triggered_at)} — {formatRelativeTime(alert.triggered_at, now)}
                    </TableCell>
                    <TableCell>
                      {unacknowledged ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(detailUrl)}
                          aria-label={`Acknowledge ${alert.auditor_name}'s SOS alert`}
                        >
                          Acknowledge
                        </Button>
                      ) : (
                        <RouterLink to={detailUrl} className="cds--link">
                          {SOS_STATUS_LABEL[alert.status]}
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
