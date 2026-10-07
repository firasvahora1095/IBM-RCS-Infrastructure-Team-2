import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Dropdown, InlineNotification, Select, SelectItem, TextArea, TextInput } from "@carbon/react";
import { ClientHeader } from "../../components/shell/ClientHeader";
import { StaffPage } from "../../components/layout/StaffPage";
import { PageHeader } from "../../components/ui/PageHeader";
import { ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { clientListReports, clientSendMessage } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE, type ClientMessageTopic, type ServiceReport } from "../../services/types";
import { useClientAuth } from "../../hooks/useClientAuth";
import { useClientQuery } from "../../hooks/useClientQuery";
import {
  MESSAGE_MAX_BODY,
  MESSAGE_MAX_SUBJECT,
  MESSAGE_RESPONSE_PROMISE,
  MESSAGE_TOPIC_LABEL,
} from "../../design-tokens/messageLabels";
import { formatPeriod } from "../../utils/formatPeriod";

const TOPICS = Object.keys(MESSAGE_TOPIC_LABEL) as ClientMessageTopic[];
const NO_REPORT = { report_id: "", label: "No specific report" };

/**
 * Contact RCS (client): topic, an optional released report, a subject and
 * the message. Every field says what it's for; errors appear beside the
 * field once the user tries to send. On success the thread opens, showing
 * that RCS has it and what happens next.
 */
export function ClientNewMessagePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { token } = useClientAuth();
  const reports = useClientQuery(clientListReports);
  const [topic, setTopic] = useState<ClientMessageTopic | "">(params.get("report") ? "REPORT_QUESTION" : "");
  const [reportId, setReportId] = useState(params.get("report") ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportOptions = [
    NO_REPORT,
    ...(reports.data ?? []).map((r: ServiceReport) => ({
      report_id: r.report_id,
      label: `${formatPeriod(r.period_start, r.period_end)} (${r.report_id})`,
    })),
  ];
  const missing = { topic: !topic, subject: !subject.trim(), body: !body.trim() };

  async function send() {
    setTried(true);
    if (!token || missing.topic || missing.subject || missing.body) return;
    setSending(true);
    setError(null);
    try {
      const message = await clientSendMessage(token, {
        topic: topic as ClientMessageTopic,
        report_id: reportId || null,
        subject,
        body,
      });
      navigate(`/client/messages/${encodeURIComponent(message.message_id)}?sent=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
      setSending(false);
    }
  }

  return (
    <>
      <ClientHeader />
      <StaffPage maxWidth={720}>
        <PageHeader
          breadcrumb={<ManagerBreadcrumb trail={[{ label: "Messages", to: "/client/messages" }, { label: "New message" }]} />}
          title="Contact RCS"
          subtitle={MESSAGE_RESPONSE_PROMISE}
        />
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Select
            id="message-topic"
            labelText="What is it about?"
            value={topic}
            invalid={tried && missing.topic}
            invalidText="Choose what your message is about."
            onChange={(e) => setTopic(e.target.value as ClientMessageTopic)}
          >
            <SelectItem value="" text="Choose a topic" disabled hidden />
            {TOPICS.map((t) => (
              <SelectItem key={t} value={t} text={MESSAGE_TOPIC_LABEL[t]} />
            ))}
          </Select>
          <Dropdown
            id="message-report"
            titleText="Related report (optional)"
            label="No specific report"
            items={reportOptions}
            itemToString={(item) => item?.label ?? ""}
            selectedItem={reportOptions.find((o) => o.report_id === reportId) ?? NO_REPORT}
            onChange={({ selectedItem }) => setReportId(selectedItem?.report_id ?? "")}
          />
          <TextInput
            id="message-subject"
            labelText="Subject"
            maxLength={MESSAGE_MAX_SUBJECT}
            value={subject}
            invalid={tried && missing.subject}
            invalidText="Add a subject."
            onChange={(e) => setSubject(e.target.value)}
          />
          <TextArea
            id="message-body"
            labelText="Message"
            helperText="Please don't include personal details about the people in a reported post."
            rows={6}
            maxCount={MESSAGE_MAX_BODY}
            enableCounter
            value={body}
            invalid={tried && missing.body}
            invalidText="Write your message."
            onChange={(e) => setBody(e.target.value)}
          />
          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              role="alert"
              title="Your message wasn't sent."
              subtitle={error}
              style={{ maxWidth: "100%" }}
            />
          )}
          <div className="flex flex-wrap gap-3">
            <Button kind="ghost" onClick={() => navigate("/client/messages")}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send message"}
            </Button>
          </div>
        </form>
      </StaffPage>
    </>
  );
}
