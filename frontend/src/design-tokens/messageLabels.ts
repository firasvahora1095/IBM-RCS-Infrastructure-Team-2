import type { ClientMessageStatus, ClientMessageTopic } from "../services/types";
import type { StatusTone } from "./statusTones";

export const MESSAGE_TOPIC_LABEL: Record<ClientMessageTopic, string> = {
  REPORT_QUESTION: "A question about a report",
  DELIVERY_ISSUE: "A case result we didn't receive",
  ACCOUNT_ACCESS: "Signing in or account access",
  OTHER: "Something else",
};

/** The client's view of where their message is. */
export const MESSAGE_STATUS_LABEL: Record<ClientMessageStatus, string> = {
  SENT: "Sent",
  SEEN: "Seen by RCS",
  ANSWERED: "Answered",
};

/** The Manager's view of the same message. */
export const MANAGER_MESSAGE_STATUS_LABEL: Record<ClientMessageStatus, string> = {
  SENT: "New",
  SEEN: "Needs a reply",
  ANSWERED: "Answered",
};

export const MESSAGE_TONE: Record<ClientMessageStatus, StatusTone> = {
  SENT: "info",
  SEEN: "warning",
  ANSWERED: "success",
};

/** Said wherever a client contacts RCS, so they know what to expect. */
export const MESSAGE_RESPONSE_PROMISE = "RCS replies within one working day. Urgent safety concerns should still go through your platform's own processes.";

export const MESSAGE_MAX_BODY = 2000;
export const MESSAGE_MAX_SUBJECT = 120;

/**
 * Starting points for a reply, by topic. They keep to what a reply may say (aggregate facts, no Auditor names or
 * case content) and leave [bracketed] gaps for the Manager's own facts. A reply can't be sent while a gap is open.
 */
export const REPLY_TEMPLATES: Record<ClientMessageTopic, { label: string; body: string }> = {
  REPORT_QUESTION: {
    label: "Answer a report question",
    body: "Thank you for your question about the report. The figures are aggregate and come from completed case records. [Your answer.]",
  },
  DELIVERY_ISSUE: {
    label: "Reply about a delivery",
    body: "Thank you for flagging this. We checked the delivery to CommunityHub and [what you found]. Results are retried automatically, and we will confirm once it has been received.",
  },
  ACCOUNT_ACCESS: {
    label: "Reply about access",
    body: "Thank you for getting in touch about access. [What you have done, or what you need from them.]",
  },
  OTHER: {
    label: "Start a reply",
    body: "Thank you for your message. [Your reply.]",
  },
};

/** True while a template still has a [bracketed] gap to fill. */
export function hasOpenGap(text: string): boolean {
  return /\[[^\]]*\]/.test(text);
}
