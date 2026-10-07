import type { DeliveryStatus, FinalOutcome } from "../services/types";

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
export const PAYLOAD_OUTCOME_LABEL: Record<FinalOutcome, string> = {
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
