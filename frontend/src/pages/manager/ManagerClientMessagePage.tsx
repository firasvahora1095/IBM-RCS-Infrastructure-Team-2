import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { Button, InlineNotification, TextArea } from "@carbon/react";
import { ManagerLayout } from "../../components/layout/ManagerLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadState, ManagerBreadcrumb } from "../../components/manager/ManagerBits";
import { StatusTag } from "../../components/ui/StatusTag";
import { MessageThread } from "../../components/messages/MessageThread";
import { getClientMessage, replyClientMessage } from "../../services";
import { ApiError, NETWORK_ERROR_MESSAGE } from "../../services/types";
import { useAuth } from "../../hooks/useAuth";
import { useStaffQuery } from "../../hooks/useStaffQuery";
import { useInPlaceSessionExpiry } from "../../hooks/useInPlaceSessionExpiry";
import {
  hasOpenGap,
  MANAGER_MESSAGE_STATUS_LABEL,
  MESSAGE_MAX_BODY,
  MESSAGE_TONE,
  REPLY_TEMPLATES,
} from "../../design-tokens/messageLabels";

/**
 * One client message (Manager). Opening it marks it "Seen by RCS" for the
 * client; the reply is signed "RCS" on their side, never with a staff name.
 */
export function ManagerClientMessagePage() {
  const { messageId = "" } = useParams<{ messageId: string }>();
  const { token } = useAuth();
  const { data, error, reload } = useStaffQuery((t) => getClientMessage(messageId, t), messageId);
  const { handleSessionError, sessionModal } = useInPlaceSessionExpiry("Your reply will be exactly as you left it.");
  const [reply, setReply] = useState("");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function send() {
    setTried(true);
    if (!token || !reply.trim() || hasOpenGap(reply)) return;
    setSending(true);
    setSendError(null);
    try {
      await replyClientMessage(messageId, token, reply);
      setReply("");
      setTried(false);
      reload();
    } catch (err) {
      if (!handleSessionError(err)) setSendError(err instanceof ApiError ? err.message : NETWORK_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  }

  return (
    <ManagerLayout showNav={false}>
      {sessionModal}
      <ManagerBreadcrumb
        trail={[
          { label: "Overview", to: "/manager" },
          { label: "Client messages", to: "/manager/messages" },
          { label: data?.display_name ?? messageId },
        ]}
      />
      <LoadState error={error} loading={!data && !error} what="this message" />
      {data && (
        <>
          <PageHeader
            title={data.display_name}
            meta={<StatusTag tone={MESSAGE_TONE[data.status]}>{MANAGER_MESSAGE_STATUS_LABEL[data.status]}</StatusTag>}
          />
          <div style={{ maxWidth: 880 }} className="flex flex-col gap-6">
            <MessageThread
              message={data}
              viewer="manager"
              reportHref={(id) => `/manager/reports/${encodeURIComponent(id)}`}
            />
            {data.topic === "DELIVERY_ISSUE" && (
              <section className="rcs-section" aria-labelledby="related-heading">
                <h2 id="related-heading" className="rcs-section-title">
                  Review the delivery first
                </h2>
                <p className="rcs-body">
                  Questions about a missing result are resolved from Deliveries. Retry or escalate the delivery, then
                  reply with your findings.
                </p>
                <div>
                  <Button kind="tertiary" as={RouterLink} to="/manager/deliveries?status=needs-attention">
                    Open failed deliveries
                  </Button>
                </div>
              </section>
            )}
            {!data.reply && (
              <section className="rcs-section" aria-labelledby="reply-heading">
                <h2 id="reply-heading" className="rcs-section-title">
                  Reply
                </h2>
                {!reply.trim() && (
                  <div>
                    <Button kind="tertiary" size="sm" onClick={() => setReply(REPLY_TEMPLATES[data.topic].body)}>
                      {REPLY_TEMPLATES[data.topic].label}
                    </Button>
                  </div>
                )}
                <TextArea
                  id="manager-reply"
                  labelText="Your reply"
                  helperText="The Client sees this signed by RCS. Share aggregate facts only: no Auditor names or case content."
                  rows={6}
                  maxCount={MESSAGE_MAX_BODY}
                  enableCounter
                  value={reply}
                  invalid={tried && (!reply.trim() || hasOpenGap(reply))}
                  invalidText={reply.trim() ? "Replace the text in [brackets] with your own words." : "Write a reply."}
                  onChange={(e) => setReply(e.target.value)}
                />
                {sendError && (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    hideCloseButton
                    role="alert"
                    title="The reply wasn't sent."
                    subtitle={sendError}
                    style={{ maxWidth: "100%" }}
                  />
                )}
                <div>
                  <Button disabled={sending} onClick={() => void send()}>
                    {sending ? "Sending…" : "Send reply"}
                  </Button>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </ManagerLayout>
  );
}
