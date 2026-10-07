import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Button,
  InlineNotification,
  Layer,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { ClientHeader } from "../../components/shell/ClientHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { clientListMessages } from "../../services";
import { useClientQuery } from "../../hooks/useClientQuery";
import {
  MESSAGE_RESPONSE_PROMISE,
  MESSAGE_STATUS_LABEL,
  MESSAGE_TONE,
  MESSAGE_TOPIC_LABEL,
} from "../../design-tokens/messageLabels";
import { formatShortDate } from "../../utils/formatPeriod";

/**
 * Messages (client): everything the organisation has asked RCS, newest
 * first, with where each one is (Sent, Seen by RCS, Answered).
 */
export function ClientMessagesPage() {
  const navigate = useNavigate();
  const { data, error } = useClientQuery(clientListMessages);

  return (
    <>
      <ClientHeader />
      <StaffPage maxWidth={1056}>
        <PageHeader
          title="Messages"
          subtitle={MESSAGE_RESPONSE_PROMISE}
          actions={<Button onClick={() => navigate("/client/messages/new")}>New message</Button>}
        />
        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            role="alert"
            title="Couldn't load your messages."
            subtitle={error.message}
            style={{ maxWidth: "100%" }}
          />
        )}
        {!data && !error && <SkeletonText paragraph lineCount={4} />}
        {data && data.length === 0 && (
          <EmptyState
            title="No messages yet"
            body="Questions about a report, a missing result or your account: send them to RCS here."
          />
        )}
        {data && data.length > 0 && (
          <Layer>
            <Table aria-label="Your messages">
              <TableHead>
                <TableRow>
                  <TableHeader>Subject</TableHeader>
                  <TableHeader>About</TableHeader>
                  <TableHeader>Sent</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.message_id}>
                    <TableCell>
                      <RouterLink className="cds--link" to={`/client/messages/${encodeURIComponent(m.message_id)}`}>
                        {m.subject}
                      </RouterLink>
                    </TableCell>
                    <TableCell>{MESSAGE_TOPIC_LABEL[m.topic]}</TableCell>
                    <TableCell>{formatShortDate(m.created_at)}</TableCell>
                    <TableCell>
                      <StatusTag tone={MESSAGE_TONE[m.status]}>{MESSAGE_STATUS_LABEL[m.status]}</StatusTag>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Layer>
        )}
      </StaffPage>
    </>
  );
}
