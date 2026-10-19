import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Button,
  InlineNotification,
  Layer,
  Search,
  Select,
  SelectItem,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
} from "@carbon/react";
import { ClientLayout } from "../../components/layout/ClientLayout";
import { TablePagination, usePagination } from "../../components/ui/TablePagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { EmptyState } from "../../components/ui/Blocks";
import { StatusTag } from "../../components/ui/StatusTag";
import { clientListMessages } from "../../services";
import type { ClientMessage, ClientMessageTopic } from "../../services/types";
import { useClientQuery } from "../../hooks/useClientQuery";
import {
  MESSAGE_RESPONSE_PROMISE,
  MESSAGE_STATUS_LABEL,
  CLIENT_VIEW_MESSAGE_TONE,
  MESSAGE_TOPIC_LABEL,
} from "../../design-tokens/messageLabels";
import { formatShortDate } from "../../utils/formatPeriod";

type View = "waiting" | "answered" | "all";
type SortKey = "subject" | "sent";

/**
 * Messages (client): everything the organisation has asked RCS, newest first. Split by what the client wants to
 * know, "is anything still waiting for RCS?" and "what did RCS say?", with search and a topic filter so a long
 * history stays findable. Sent and Seen by RCS both mean RCS has not replied yet, so they share one view.
 */
export function ClientMessagesPage() {
  const navigate = useNavigate();
  const { data, error } = useClientQuery(clientListMessages);
  const [picked, setPicked] = useState<View | null>(null);
  const [topic, setTopic] = useState<"ALL" | ClientMessageTopic>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "ASC" | "DESC" }>({ key: "sent", dir: "DESC" });

  const messages = data ?? [];
  const waiting = messages.filter((m) => m.status !== "ANSWERED");
  const answered = messages.filter((m) => m.status === "ANSWERED");
  // Opens on what is still waiting for RCS, or on everything when nothing is.
  const view: View = picked ?? (waiting.length > 0 ? "waiting" : "all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = view === "waiting" ? waiting : view === "answered" ? answered : messages;
    return source
      .filter((m) => topic === "ALL" || m.topic === topic)
      .filter((m) => !q || m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q))
      .sort((a, b) => {
        const x = sort.key === "subject" ? a.subject.toLowerCase() : a.created_at;
        const y = sort.key === "subject" ? b.subject.toLowerCase() : b.created_at;
        const diff = x < y ? -1 : x > y ? 1 : 0;
        return sort.dir === "ASC" ? diff : -diff;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, view, topic, query, sort]);
  const paged = usePagination(rows, `${view}|${topic}|${query}|${sort.key}|${sort.dir}`);
  const sortProps = (key: SortKey) => ({
    isSortable: true,
    isSortHeader: sort.key === key,
    sortDirection: sort.key === key ? sort.dir : ("NONE" as const),
    onClick: () => setSort((cur) => ({ key, dir: cur.key === key && cur.dir === "DESC" ? "ASC" : "DESC" })),
  });

  const body = (
    <div className="flex flex-col gap-4" style={{ paddingBlockStart: 16 }}>
      <div className="flex flex-wrap items-end gap-4">
        <div style={{ minWidth: 240 }}>
          <Select
            id="message-topic-filter"
            size="md"
            labelText="About"
            value={topic}
            onChange={(e) => setTopic(e.target.value as "ALL" | ClientMessageTopic)}
          >
            <SelectItem value="ALL" text="Everything" />
            {(Object.keys(MESSAGE_TOPIC_LABEL) as ClientMessageTopic[]).map((t) => (
              <SelectItem key={t} value={t} text={MESSAGE_TOPIC_LABEL[t]} />
            ))}
          </Select>
        </div>
        <div style={{ flex: "1 1 260px", maxWidth: 420 }}>
          <Search
            size="md"
            labelText="Search messages"
            placeholder="Search subject or message"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={
            view === "waiting" && topic === "ALL" && !query.trim()
              ? "Nothing waiting for RCS"
              : view === "answered" && topic === "ALL" && !query.trim()
                ? "No replies yet"
                : "No messages match"
          }
          body={
            view === "waiting" && topic === "ALL" && !query.trim()
              ? "Every message you have sent has an answer."
              : "Try a different search or topic."
          }
        />
      ) : (
        <>
          <Layer>
            <Table aria-label="Your messages">
              <TableHead>
                <TableRow>
                  <TableHeader {...sortProps("subject")}>Subject</TableHeader>
                  <TableHeader>About</TableHeader>
                  <TableHeader {...sortProps("sent")}>Sent</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.rows.map((m: ClientMessage) => (
                  <TableRow
                    key={m.message_id}
                    onClick={() => navigate(`/client/messages/${encodeURIComponent(m.message_id)}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <RouterLink
                        className="cds--link"
                        to={`/client/messages/${encodeURIComponent(m.message_id)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {m.subject}
                      </RouterLink>
                    </TableCell>
                    <TableCell>{MESSAGE_TOPIC_LABEL[m.topic]}</TableCell>
                    <TableCell>{formatShortDate(m.created_at)}</TableCell>
                    <TableCell>
                      <StatusTag tone={CLIENT_VIEW_MESSAGE_TONE[m.status]}>{MESSAGE_STATUS_LABEL[m.status]}</StatusTag>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Layer>
          <TablePagination paged={paged} />
        </>
      )}
    </div>
  );

  return (
    <ClientLayout maxWidth={1320}>
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
        <Tabs
          selectedIndex={view === "waiting" ? 0 : view === "answered" ? 1 : 2}
          onChange={({ selectedIndex }) => setPicked((["waiting", "answered", "all"] as const)[selectedIndex])}
        >
          <TabList aria-label="Message views">
            <Tab>{`Waiting for RCS (${waiting.length})`}</Tab>
            <Tab>{`Answered (${answered.length})`}</Tab>
            <Tab>{`All messages (${messages.length})`}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="rcs-tab-panel-flush">{view === "waiting" && body}</TabPanel>
            <TabPanel className="rcs-tab-panel-flush">{view === "answered" && body}</TabPanel>
            <TabPanel className="rcs-tab-panel-flush">{view === "all" && body}</TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </ClientLayout>
  );
}
