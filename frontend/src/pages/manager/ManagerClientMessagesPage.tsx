import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Blocks";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { StatusTag } from "../../components/ui/StatusTag";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { listClientMessages } from "../../services";
import type { ClientMessage } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { MANAGER_MESSAGE_STATUS_LABEL, MESSAGE_TONE, MESSAGE_TOPIC_LABEL } from "../../design-tokens/messageLabels";
import { formatDayTime } from "../../utils/formatRelativeTime";

/**
 * Client messages (Manager): what CommunityHub users have asked RCS. Messages waiting for a reply are their own
 * table at the top, oldest first, each with its own Reply button; answered ones follow, paged. Opening a message
 * tells the Client it has been seen; replying answers it.
 */
export function ManagerClientMessagesPage() {
  const navigate = useNavigate();
  const { data, error } = useStaffQuery(listClientMessages);
  const waiting = (data ?? [])
    .filter((m) => m.status !== "ANSWERED")
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const answered = (data ?? [])
    .filter((m) => m.status === "ANSWERED")
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const pagedAnswered = usePagination(answered, String(answered.length));

  return (
    <ManagerLayout>
      <ManagerBreadcrumb trail={[{ label: "Overview", to: "/manager" }, { label: "Client messages" }]} />
      <PageHeader
        title="Client messages"
        subtitle={
          data
            ? waiting.length === 0
              ? "Everything has been answered."
              : `${waiting.length} waiting for a reply. Clients are told RCS replies within one working day.`
            : "Questions from CommunityHub users."
        }
      />
      <LoadState error={error} loading={!data && !error} what="Client messages" />
      {data && waiting.length > 0 && (
        <Section id="waiting" title={`Waiting for a reply · ${waiting.length}`} description="Oldest first.">
          <MessageTable label="Client messages waiting for a reply" rows={waiting} navigate={navigate} withReply />
        </Section>
      )}
      {data && answered.length > 0 && (
        <Section id="answered" title={`Answered · ${answered.length}`}>
          <MessageTable label="Answered Client messages" rows={pagedAnswered.rows} navigate={navigate} />
          <TablePagination paged={pagedAnswered} />
        </Section>
      )}
      {data && data.length === 0 && (
        <Section title="No messages yet" description="When a CommunityHub user writes to RCS, their message appears here.">
          <span />
        </Section>
      )}
    </ManagerLayout>
  );
}

function MessageTable({
  label,
  rows,
  navigate,
  withReply = false,
}: {
  label: string;
  rows: ClientMessage[];
  navigate: (to: string) => void;
  withReply?: boolean;
}) {
  return (
    <Layer>
      <Table aria-label={label}>
        <TableHead>
          <TableRow>
            <TableHeader>Subject</TableHeader>
            <TableHeader>From</TableHeader>
            <TableHeader>Received</TableHeader>
            <TableHeader>Status</TableHeader>
            {withReply && (
              <TableHeader>
                <span className="cds--visually-hidden">Reply</span>
              </TableHeader>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((m) => {
            const url = `/manager/messages/${encodeURIComponent(m.message_id)}`;
            return (
              <TableRow key={m.message_id} onClick={() => navigate(url)} style={{ cursor: "pointer" }}>
                <TableCell style={{ fontWeight: m.status === "SENT" ? 600 : 400 }}>
                  <RouterLink className="cds--link" to={url} onClick={(e) => e.stopPropagation()}>
                    {m.subject}
                  </RouterLink>
                  <span className="rcs-helper" style={{ display: "block" }}>
                    {MESSAGE_TOPIC_LABEL[m.topic]}
                  </span>
                </TableCell>
                <TableCell>
                  {m.display_name}
                  <span className="rcs-helper" style={{ display: "block" }}>
                    {m.organisation_name}
                  </span>
                </TableCell>
                <TableCell style={{ color: "var(--cds-text-secondary)" }}>{formatDayTime(m.created_at)}</TableCell>
                <TableCell>
                  <StatusTag tone={MESSAGE_TONE[m.status]} size="sm">
                    {MANAGER_MESSAGE_STATUS_LABEL[m.status]}
                  </StatusTag>
                </TableCell>
                {withReply && (
                  <TableCell style={{ textAlign: "end" }}>
                    <Button
                      kind="tertiary"
                      size="sm"
                      aria-label={`Reply to ${m.display_name}: ${m.subject}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(url);
                      }}
                    >
                      Reply
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
}
