import type { DeliveryStatus, ExposureState, ReportStatus, WellbeingRequestStatus } from "../services/types";

/**
 * One status colour scheme for every screen, from the Figma foundation Tag
 * kinds (Info, Success, Warning, Error) plus the gray used for S1
 * (docs/ux/ux-audit-checklist.md rule B4):
 *
 * - success: done, nothing to do (Delivered, Released, Connected)
 * - info: the system is working on it (Pending)
 * - warning: needs a look soon (Retrying, Approaching, Declined, Break requested)
 * - error: someone needs to act, or a hard stop (Needs attention, SOS, At limit)
 * - neutral: routine or final (Draft, Complete)
 *
 * The status is always written out, so colour is never the only signal.
 */
export type StatusTone = "success" | "info" | "warning" | "error" | "neutral";

export const DELIVERY_TONE: Record<DeliveryStatus, StatusTone> = {
  SUCCESS: "success",
  RETRYING: "warning",
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
  OPEN: "info",
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
