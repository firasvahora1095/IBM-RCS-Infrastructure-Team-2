import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { listSosAlerts } from "../../services";
import type { SosAlert } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { SOS_STATUS_LABEL } from "../../design-tokens/managerLabels";
import { SOS_TONE } from "../../design-tokens/statusTones";
import { formatDayTime } from "../../utils/formatRelativeTime";

/**
 * SOS inbox (Manager Figma 103:151, MR-SOS-01): the alerts in three groups, in the order to work in. Unacknowledged
 * first, with the red edge, then the ones in progress, then the resolved record (paged). Every row opens the alert's
 * context before anything is recorded; acknowledging is a step on that page, so nothing here is a destructive or
 * one-click action.
 */
export function ManagerSosInboxPage() {
  const navigate = useNavigate();
  const { data, error } = useStaffQuery(listSosAlerts);
  const [now] = useState(() => Date.now());

  const newest = (a: SosAlert, b: SosAlert) => Date.parse(b.triggered_at) - Date.parse(a.triggered_at);
  const unacknowledged = (data ?? []).filter((a) => a.status === "UNACKNOWLEDGED").sort(newest);
  const inProgress = (data ?? []).filter((a) => a.status === "IN_PROGRESS").sort(newest);
  const resolved = (data ?? []).filter((a) => a.status === "RESOLVED").sort(newest);
  const pagedResolved = usePagination(resolved, String(resolved.length));

  const table = (label: string, rows: SosAlert[], withAction: boolean) => (
    <Layer>
      <Table aria-label={label}>
        <TableHead>
          <TableRow>
            <TableHeader>Auditor</TableHeader>
            <TableHeader>Raised</TableHeader>
            <TableHeader>Case</TableHeader>
                        <TableHeader>Status</TableHeader>
            {withAction && (
              <TableHeader>
                <span className="cds--visually-hidden">Action</span>
              </TableHeader>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((alert) => {
            const url = `/manager/sos/${encodeURIComponent(alert.id)}`;
            const urgent = alert.status === "UNACKNOWLEDGED";
            return (
              <TableRow key={alert.id} onClick={() => navigate(url)} style={{ cursor: "pointer" }}>
                <TableCell
                  style={{
                    fontWeight: urgent ? 600 : 400,
                    boxShadow: urgent ? "inset 3px 0 0 var(--cds-support-error)" : undefined,
                  }}
                >
                  {alert.auditor_name}
                </TableCell>
                <TableCell>{formatDayTime(alert.triggered_at, now, { withAgo: true })}</TableCell>
                <TableCell className="rcs-mono">{alert.case_id}</TableCell>
                <TableCell>
                  <StatusTag tone={SOS_TONE[alert.status]} size="sm">
                    {SOS_STATUS_LABEL[alert.status] ?? "Open"}
                  </StatusTag>
                </TableCell>
                {withAction && (
                  <TableCell style={{ textAlign: "end" }}>
                    <Button
                      kind="tertiary"
                      size="sm"
                      aria-label={`View alert from ${alert.auditor_name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(url);
                      }}
                    >
                      View alert
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Layer>
  );

  return (
    <ManagerLayout>
      <ManagerBreadcrumb trail={[{ label: "Overview", to: "/manager" }, { label: "SOS inbox" }]} />
      <PageHeader
        title="SOS inbox"
        subtitle="Open an alert to read the context, then acknowledge it and log your follow-up."
      />
      <LoadState error={error} loading={!data && !error} what="SOS alerts" />
      {data && data.length === 0 && (
        <Section title="No SOS alerts" description="Alerts an Auditor raises appear here.">
          <span />
        </Section>
      )}
      {unacknowledged.length > 0 && (
        <Section id="sos-unacknowledged" title={`Unacknowledged · ${unacknowledged.length}`} description="Newest first.">
          {table("Unacknowledged SOS alerts", unacknowledged, true)}
        </Section>
      )}
      {inProgress.length > 0 && (
        <Section id="sos-in-progress" title={`In Progress · ${inProgress.length}`} description="Acknowledged, follow-up not yet logged.">
          {table("SOS alerts in progress", inProgress, true)}
        </Section>
      )}
      {resolved.length > 0 && (
        <Section id="sos-resolved" title={`Resolved · ${resolved.length}`}>
          {table("Resolved SOS alerts", pagedResolved.rows, false)}
          <TablePagination paged={pagedResolved} />
        </Section>
      )}
    </ManagerLayout>
  );
}
