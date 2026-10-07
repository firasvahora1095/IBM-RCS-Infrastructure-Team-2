import type { DeliveredOutcome, DeliveryStatus } from "../services/types";

/**
 * Case result handoff wording (docs/ux/b2b-end-to-end-flow-spec.md §7).
 * Pinned by deliveryLabels.test.ts so the Manager screens never drift.
 *
 * Moderation status and delivery status are always shown as two separate
 * facts: the Auditor's work can be complete while delivery still needs
 * attention (Sprint 3 extras §5).
 */
export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  SUCCESS: "Successful",
  PENDING: "Pending",
  RETRYING: "Retrying",
  NEEDS_ATTENTION: "Needs attention",
};

/** The machine-readable outcome value as it travels in the payload, shown in plain words for staff. */
export const PAYLOAD_OUTCOME_LABEL: Record<DeliveredOutcome, string> = {
  CLOSED_NO_REASSIGNMENT: "Closed without a decision",
  POLICY_VIOLATION_FOUND: "Policy violation found",
  NO_VIOLATION_FOUND: "No violation found",
};

export const MODERATION_COMPLETE_LABEL = "Complete";

export const DELIVERY_SPLIT_SENTENCE = "The Auditor's work is complete. Only the delivery needs attention.";

export const RESPONSIBILITY_BOUNDARY =
  "RCS decides the moderation finding. CommunityHub decides what enforcement to apply.";

export const DELIVERY_BOUNDARY_NOTE = "You can fix the delivery. You can't change the Auditor's decision.";

export const IDEMPOTENCY_NOTE =
  "The same delivery ID is reused on every retry, so CommunityHub never processes a result twice.";

/** What CommunityHub did with a result, in their moderators' words. */
export const PLATFORM_ACTION_LABEL: Record<"REMOVED" | "KEPT", string> = {
  REMOVED: "Post removed",
  KEPT: "Post kept",
};

/** What a CommunityHub account role can see. */
export const CLIENT_ROLE_LABEL: Record<"REPORTS" | "TRUST_SAFETY" | "ADMIN", string> = {
  REPORTS: "Reports",
  TRUST_SAFETY: "Trust & Safety",
  ADMIN: "Admin",
};

export const CLIENT_ROLE_SCOPE: Record<"REPORTS" | "TRUST_SAFETY" | "ADMIN", string> = {
  REPORTS: "Monthly service reports and messages",
  TRUST_SAFETY: "Case results, the moderation queue and messages",
  ADMIN: "Everything",
};
