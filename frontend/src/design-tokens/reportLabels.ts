import type { ReportStatus } from "../services/types";

/**
 * Client service report wording (docs/ux/b2b-end-to-end-flow-spec.md §7),
 * pinned by reportLabels.test.ts.
 */
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  DRAFT: "Draft",
  RELEASED: "Released",
};

/** Never in a client report (Sprint 3 extras §6.3). */
export const NOT_IN_CLIENT_REPORT: readonly string[] = [
  "Individual Auditor wellbeing or exposure history",
  "SOS, support or counselling details",
  "Raw harmful footage",
  "Internal Manager notes",
  "Internal validation commentary",
  "Internal technical errors",
];

export const RELEASE_CONFIRM_BODY =
  "CommunityHub's authorised users will be able to view and download it. You can't edit a released report; you can create a new version.";

export const NO_SLA_NOTE = "No service-level target has been agreed, so none is shown.";

export const OVERRIDE_AGGREGATE_NOTE = "Aggregate only. Not an individual performance measure.";

export const CLIENT_EMPTY = "No reports released yet. When RCS releases a report, it will appear here.";

export const CLIENT_DENIED = "You don't have access to this report.";

export const ACCESS_DISCLOSURE = "Access to this page is logged.";

/** Plain-language definitions behind each report figure ("How is this calculated?"). */
export const METRIC_DEFINITIONS = {
  received: "Reports submitted to RCS for this customer during the period.",
  completed: "Cases with a final human decision recorded during the period.",
  open: "Cases received on or before the last day of the period that weren't complete by then.",
  outcomes: "The Auditor's final outcome for each case completed in the period.",
  severity: "The final severity after human review: the Auditor's rating where they changed it, otherwise the AI rating they confirmed.",
  timeliness: "The middle value of time from report received to final decision, for cases completed in the period.",
  overrides: "Completed cases where the final human severity differs from the AI's initial severity.",
  workflow: "Completed cases that were declined by one reviewer and decided by another.",
  delivery: "Results sent to CommunityHub for cases completed in the period, by delivery status.",
} as const;
