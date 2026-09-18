import type { DeclineReason } from "../services/types";

/**
 * AR-DF-03 decline reasons: labels and order exactly as adopted in the BA
 * baseline and the Auditor Figma Decline Reason Modal (25:137). The order is
 * part of the requirement, and none is ever pre-selected.
 */
export const DECLINE_REASON_OPTIONS: readonly { value: DeclineReason; label: string }[] = [
  { value: "MORE_SEVERE_THAN_AI", label: "Content more severe than AI indicated" },
  { value: "NEAR_EXPOSURE_LIMIT", label: "Near my exposure limit" },
  { value: "PERSONAL_TRIGGER", label: "Personal Trigger" },
  { value: "OTHER", label: "Other" },
];

export function declineReasonLabel(reason: DeclineReason): string {
  return DECLINE_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason;
}
