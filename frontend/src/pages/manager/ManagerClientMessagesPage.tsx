import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { LoadState } from "../../components/manager/ManagerBits";
import { pageTitle, secondaryText } from "../../components/manager/managerStyles";
import { StatusTag } from "../../components/ui/StatusTag";
import { listClientMessages } from "../../services";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { MANAGER_MESSAGE_STATUS_LABEL, MESSAGE_TONE, MESSAGE_TOPIC_LABEL } from "../../design-tokens/messageLabels";
import { formatDayTime } from "../../utils/formatRelativeTime";

/**
 * Client messages (Manager): what CommunityHub users have asked RCS, with
 * the ones still waiting at the top. Opening a message tells the client it
 * has been seen; replying answers it.
 */
export function ManagerClientMessagesPage() {
  const navigate = useNavigate();
  const { data, error } = useStaffQuery(listClientMessages);
  const waiting = data?.filter((m) => m.status !== "ANSWERED").length ?? 0;
  // The one primary: answer whoever has waited longest.
  const oldestWaiting = data
    ?.filter((m) => m.status !== "ANSWERED")
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0];

  return (
    <ManagerLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 style={pageTitle}>Client messages</h1>
          <p style={secondaryText}>
            {data
              ? waiting === 0
                ? "Everything has been answered."
                : `${waiting} waiting for a reply. Clients are told RCS replies within one working day.`
              : "Questions from CommunityHub users."}
          </p>
        </div>
        {oldestWaiting && (
          <Button onClick={() => navigate(`/manager/messages/${encodeURIComponent(oldestWaiting.message_id)}`)}>
            Answer oldest waiting
          </Button>
        )}
      </div>
      <LoadState error={error} loading={!data && !error} what="client messages" />
      {data && data.length > 0 && (
        <Layer>
          <Table aria-label="Client messages">
            <TableHead>
              <TableRow>
                <TableHeader>Subject</TableHeader>
                <TableHeader>From</TableHeader>
                <TableHeader>Topic</TableHeader>
                <TableHeader>Received</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((m) => {
                const url = `/manager/messages/${encodeURIComponent(m.message_id)}`;
                return (
                  <TableRow key={m.message_id} onClick={() => navigate(url)} style={{ cursor: "pointer" }}>
                    <TableCell style={{ fontWeight: m.status === "SENT" ? 600 : 400 }}>
                      <RouterLink className="cds--link" to={url} onClick={(e) => e.stopPropagation()}>
                        {m.subject}
                      </RouterLink>
                    </TableCell>
                    <TableCell>
                      {m.display_name}
                      <span className="rcs-helper" style={{ display: "block" }}>
                        {m.organisation_name}
                      </span>
                    </TableCell>
                    <TableCell>{MESSAGE_TOPIC_LABEL[m.topic]}</TableCell>
                    <TableCell style={{ color: "var(--cds-text-secondary)" }}>{formatDayTime(m.created_at)}</TableCell>
                    <TableCell>
                      <StatusTag tone={MESSAGE_TONE[m.status]}>{MANAGER_MESSAGE_STATUS_LABEL[m.status]}</StatusTag>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Layer>
      )}
      {data && data.length === 0 && <p style={secondaryText}>No client messages yet.</p>}
    </ManagerLayout>
  );
}
