import { Link as RouterLink } from "react-router-dom";
import { ProgressIndicator, ProgressStep } from "@carbon/react";
import type { ClientMessage } from "../../services/types";
import { MESSAGE_TOPIC_LABEL } from "../../design-tokens/messageLabels";

const when = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * One "Contact RCS" conversation, the same for the client and the Manager:
 * where it is (Sent, Seen by RCS, Answered), what was asked, and the reply.
 * `reportHref` builds the link to the related report for the viewer's surface.
 */
export function MessageThread({
  message,
  reportHref,
  viewer,
}: {
  message: ClientMessage;
  reportHref: (reportId: string) => string;
  viewer: "client" | "manager";
}) {
  const step = message.status === "ANSWERED" ? 2 : message.status === "SEEN" ? 1 : 0;
  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator currentIndex={step} spaceEqually aria-label="Message progress">
        <ProgressStep label="Sent" secondaryLabel={when(message.created_at)} complete={step >= 0} />
        <ProgressStep
          label={viewer === "client" ? "Seen by RCS" : "Opened"}
          secondaryLabel={message.seen_at ? when(message.seen_at) : undefined}
          complete={step >= 1}
        />
        <ProgressStep
          label="Answered"
          secondaryLabel={message.reply ? when(message.reply.at) : undefined}
          complete={step >= 2}
        />
      </ProgressIndicator>

      <section className="rcs-section" aria-labelledby="message-subject">
        <div className="flex flex-col gap-1">
          <h2 id="message-subject" className="rcs-section-title">
            {message.subject}
          </h2>
          <p className="rcs-helper">
            {MESSAGE_TOPIC_LABEL[message.topic]} · {viewer === "manager" ? `${message.display_name}, ${message.organisation_name} · ` : ""}
            {when(message.created_at)}
          </p>
        </div>
        {message.report_id && (
          <p style={{ fontSize: 14 }}>
            About report{" "}
            <RouterLink className="cds--link" to={reportHref(message.report_id)}>
              {message.report_id}
            </RouterLink>
          </p>
        )}
        <p style={{ fontSize: 14, lineHeight: "20px", whiteSpace: "pre-line" }}>{message.body}</p>
      </section>

      {message.reply && (
        <section
          className="rcs-section"
          aria-labelledby="message-reply"
          style={{ boxShadow: "inset 3px 0 0 var(--cds-support-success)" }}
        >
          <div className="flex flex-col gap-1">
            <h2 id="message-reply" className="rcs-section-title">
              Reply from {message.reply.by}
            </h2>
            <p className="rcs-helper">{when(message.reply.at)}</p>
          </div>
          <p style={{ fontSize: 14, lineHeight: "20px", whiteSpace: "pre-line" }}>{message.reply.body}</p>
        </section>
      )}
    </div>
  );
}
