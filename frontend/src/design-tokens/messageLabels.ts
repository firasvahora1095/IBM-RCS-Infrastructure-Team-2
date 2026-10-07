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
