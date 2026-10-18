import type { DeliveryStatus, ExposureState, ReportStatus, WellbeingRequestStatus } from "../services/types";

/**
 * One status colour system for every screen (docs/ux/tag-colour-system.md). A colour is chosen by what the state
 * MEANS, never by which screen it appears on, and each family is used for one meaning so tags next to each other
 * can always be told apart:
 *
 * - error, solid red: critical. Something failed or someone is at risk. SOS, Unacknowledged, Failed, Timed out,
 *   Limit reached, Blocked.
 * - warning, yellow: caution. A limit is near or something needs a look. Near limit, Needs reassignment,
 *   AI override.
 * - info, blue: in progress. Someone or something is already on it. Pending, Retrying, In Review, In progress, Seen.
 * - success, solid green: done and good. Delivered, Released, Approved, Followed up, Connected, Answered.
 * - request, magenta: a request that is waiting for a person. Support requests, a new Client message.
 * - neutral, gray: routine, final or informational. Draft, Complete, Within limit, Unavailable, Declined.
 *
 * In a list where every item is already waiting for the Manager, a "Waiting" tag says nothing, so it is left off:
 * a tag appears only when it tells one item apart from the others.
 *
 * Severity (S1 to S4) is a separate ordered scale in purple and is never used for a status. The state is always
 * written out and the tags with a state carry an icon, so colour is never the only signal.
 */
export type StatusTone = "success" | "info" | "warning" | "error" | "request" | "neutral";

export const DELIVERY_TONE: Record<DeliveryStatus, StatusTone> = {
  SUCCESS: "success",
  RETRYING: "info",
  PENDING: "info",
  NEEDS_ATTENTION: "error",
};

export const REPORT_TONE: Record<ReportStatus, StatusTone> = {
  RELEASED: "success",
  DRAFT: "neutral",
};

export const EXPOSURE_TONE: Record<ExposureState, StatusTone> = {
  UNDER: "neutral",
  APPROACHING: "warning",
  AT_LIMIT: "error",
};

export const INTEGRATION_TONE = { READY: "success", ERROR: "error" } as const satisfies Record<string, StatusTone>;

/** An Auditor's support request, as both the Auditor and the Manager see it. */
export const WELLBEING_TONE: Record<WellbeingRequestStatus, StatusTone> = {
  OPEN: "request",
  APPROVED: "success",
  FOLLOWED_UP: "success",
  WITHDRAWN: "neutral",
};

export const WELLBEING_STATUS_LABEL: Record<WellbeingRequestStatus, string> = {
  OPEN: "Waiting for your manager",
  APPROVED: "Break approved",
  FOLLOWED_UP: "Followed up",
  WITHDRAWN: "Withdrawn",
};

/** An SOS alert: critical until someone has it, then in progress, then done. */
export const SOS_TONE: Record<"UNACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED", StatusTone> = {
  UNACKNOWLEDGED: "error",
  IN_PROGRESS: "info",
  RESOLVED: "success",
};

/** A Client's message: waiting for RCS, being looked at, answered. */
export const CLIENT_MESSAGE_TONE: Record<"SENT" | "SEEN" | "ANSWERED", StatusTone> = {
  SENT: "request",
  SEEN: "info",
  ANSWERED: "success",
};

/** The Manager's wording for a case's status. Only the two that need the Manager are coloured as such. */
export function caseStatusTone(label: string): StatusTone {
  switch (label) {
    case "Blocked":
      return "error";
    case "Needs reassignment":
    case "Awaiting release":
      return "warning";
    case "In review":
    case "Processing":
      return "info";
    default:
      return "neutral";
  }
}
