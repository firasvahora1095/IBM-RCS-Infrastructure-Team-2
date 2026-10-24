import { Link as RouterLink, useNavigate } from "react-router-dom";
import { ActionableNotification, Button, Layer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { Section } from "../../components/ui/Blocks";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { listClientMessages } from "../../services";
import type { ClientMessage } from "../../services/types";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { ALL_CLIENTS, inScope, useClientScope, useClients } from "../../hooks/useClientScope";
import { MESSAGE_TOPIC_LABEL } from "../../design-tokens/messageLabels";
import { formatDayTime } from "../../utils/formatRelativeTime";

/**
 * Client messages (Manager): what CommunityHub users have asked RCS. Messages waiting for a reply are their own
 * table at the top, oldest first, each with its own Reply button; answered ones follow, paged. Opening a message
 * tells the Client it has been seen; replying answers it.
 */
export function ManagerClientMessagesPage() {
  const navigate = useNavigate();
  const { data: allMessages, error } = useStaffQuery(listClientMessages);
  const { scope, selected } = useClients();
  const { setClientId } = useClientScope();
  const data = allMessages ? allMessages.filter((m) => inScope(scope, m)) : allMessages;
  const waiting = (data ?? [])
    .filter((m) => m.status !== "ANSWERED")
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const answered = (data ?? [])
    .filter((m) => m.status === "ANSWERED")
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const pagedAnswered = usePagination(answered, String(answered.length));
  // The work-queue badge counts every Client's waiting messages; when one Client is selected, say where the rest are.
  const waitingElsewhere = selected
    ? (allMessages ?? []).filter((m) => m.status !== "ANSWERED" && !inScope(scope, m)).length
    : 0;

  return (
    <ManagerLayout clientScope>
      <ManagerBreadcrumb trail={[{ label: "Overview", to: "/manager" }, { label: "Client messages" }]} />
      <PageHeader
        title="Client messages"
        subtitle={
          data
            ? waiting.length === 0
              ? "Everything has been answered."
              : `${waiting.length} waiting for a reply. Clients are told RCS replies within one working day.`
            : "Questions from your Clients' users."
        }
      />
      <LoadState error={error} loading={!data && !error} what="Client messages" />
      {waitingElsewhere > 0 && (
        <ActionableNotification
          kind="info"
          lowContrast
          inline
          hideCloseButton
          title={`${waitingElsewhere} more ${waitingElsewhere === 1 ? "message is" : "messages are"} waiting from other Clients.`}
          subtitle={`You're viewing ${selected?.name}. The count on Client messages includes every Client.`}
          actionButtonLabel="Show all Clients"
          onActionButtonClick={() => setClientId(ALL_CLIENTS)}
          style={{ maxWidth: "100%" }}
        />
      )}
      {data && waiting.length > 0 && (
        <Section id="waiting" title={`Waiting for a reply · ${waiting.length}`} description="Oldest first.">
          <MessageTable
            label="Client messages waiting for a reply"
            rows={waiting}
            navigate={navigate}
            withReply
            showClient={!selected}
          />
        </Section>
      )}
      {data && answered.length > 0 && (
        <Section id="answered" title={`Answered · ${answered.length}`}>
          <MessageTable
            label="Answered Client messages"
            rows={pagedAnswered.rows}
            navigate={navigate}
            showClient={!selected}
          />
          <TablePagination paged={pagedAnswered} />
        </Section>
      )}
      {data && data.length === 0 && (
        <Section title="No messages yet" description="When a Client's user writes to RCS, their message appears here.">
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
  showClient = false,
}: {
  label: string;
  rows: ClientMessage[];
  navigate: (to: string) => void;
  withReply?: boolean;
  /** "All clients" is selected, so each message says whose it is. */
  showClient?: boolean;
}) {
  return (
    <Layer>
      <Table aria-label={label}>
        <TableHead>
          <TableRow>
            <TableHeader className={withReply ? "rcs-msg-subject" : undefined}>Subject</TableHeader>
            <TableHeader>From</TableHeader>
            <TableHeader>Received</TableHeader>
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
                {/* Unread, as in any inbox: a blue dot and a bold subject. Each list is already grouped by state, so a
                    status tag on every row would say nothing the heading doesn't (docs/ux/tag-colour-system.md, rule 4). */}
                <TableCell
                  className={
                    [withReply && "rcs-msg-subject", m.status === "SENT" && "rcs-msg-unread"]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
                  {m.status === "SENT" && <span className="rcs-unread-dot" aria-hidden="true" />}
                  <RouterLink className="cds--link" to={url} onClick={(e) => e.stopPropagation()}>
                    {m.status === "SENT" && <span className="cds--visually-hidden">Unread: </span>}
                    {m.subject}
                  </RouterLink>
                  <span className="rcs-helper" style={{ display: "block" }}>
                    {MESSAGE_TOPIC_LABEL[m.topic]}
                  </span>
                </TableCell>
                <TableCell>
                  {m.display_name}
                  {showClient && (
                    <span className="rcs-helper" style={{ display: "block" }}>
                      {m.organisation_name}
                    </span>
                  )}
                </TableCell>
                <TableCell style={{ color: "var(--cds-text-secondary)" }}>{formatDayTime(m.created_at)}</TableCell>
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
