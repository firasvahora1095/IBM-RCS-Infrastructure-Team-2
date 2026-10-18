import type {
  CooldownState,
  ExposureState,
  InternalCaseStatus,
  SosAlertStatus,
  SosFollowUpOutcome,
  SosTrigger,
} from "../services/types";
import { mapStatusToStaffLabel } from "./statusLabels";

/**
 * MR-OV-05 exposure states. The Figma dashboard (78:69) says Under, Approaching,
 * At limit; the BA's standard (docs/ba/extra-features.md §11.1) names the state
 * outright, so the word "limit" is never left to the column heading.
 */
export const EXPOSURE_STATE_LABEL: Record<ExposureState, string> = {
  UNDER: "Within limit",
  APPROACHING: "Near limit",
  AT_LIMIT: "Limit reached",
};

/** SOS inbox status column (Figma 103:151). Unacknowledged rows show an Acknowledge button instead. */
export const SOS_STATUS_LABEL: Record<SosAlertStatus, string> = {
  UNACKNOWLEDGED: "Unacknowledged",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

/**
 * What raised an SOS alert, on SOS alert Detail. Figma 103:197 only designs the
 * Auditor's own SOS; AR-AI-11 failures use the same alert (Auditor Figma 25:212
 * annotation), so the Manager is told which one it was.
 */
export const SOS_TRIGGER_LABEL: Record<SosTrigger, string> = {
  AUDITOR_SOS: "Auditor SOS",
  AI_FAILURE_MID_REVIEW: "AI failure mid-review",
};

/** Structured follow-up outcomes, in Figma order (103:228). None is pre-selected. */
export const SOS_FOLLOW_UP_OPTIONS: readonly { value: SosFollowUpOutcome; label: string }[] = [
  { value: "NO_FURTHER_ACTION", label: "Auditor is fine to continue" },
  { value: "REASSIGNED_REMAINING_CASES", label: "Remaining cases moved to other Auditors" },
  { value: "AUDITOR_STOPPED_SHIFT", label: "Auditor stopped for the day" },
];

/**
 * Case status on the Manager screens, in the BA's UI wording standard
 * (docs/ba/extra-features.md §11.1): Processing, Ready for Review, In Review,
 * Complete, Needs reassignment, Blocked.
 *
 * Why this and not RT-02's staff column: RT-02 fixes the internal-to-PUBLIC
 * mapping, which is unchanged, and says staff screens "may use human-readable
 * versions of internal states". §11.1 is later (Sprint 3), written for exactly
 * this audience, and names the two states a Manager acts on. So the Manager
 * screens use §11.1; the Auditor screens and the public status keep RT-02.
 *
 * Needs reassignment and Blocked are derived from the case's flag, not new
 * status values: a declined case or one stopped at the exposure cap needs a new
 * Auditor; a case with an open SOS is blocked until the Manager has followed up.
 */
export function managerStatusLabel(status: InternalCaseStatus, managerFlag: "DECLINED" | "SOS" | "CAP_REACHED" | null): string {
  if (status === "COMPLETE") return "Complete";
  if (managerFlag === "SOS") return "Blocked";
  if (managerFlag) return "Needs reassignment";
  switch (status) {
    case "SUBMITTED":
    case "AI_PROCESSING":
      return "Processing";
    case "READY_FOR_REVIEW":
      return "Ready for review";
    case "AUDITOR_REVIEW":
      return "In review";
    default:
      return mapStatusToStaffLabel(status);
  }
}

/** Cooldown column text on the Oversight Dashboard (MR-OV-03). */
export function cooldownSummary(cooldown: CooldownState | null, now: number = Date.now()): string {
  if (!cooldown) return "—";
  const remaining = Math.ceil((Date.parse(cooldown.ends_at) - now) / 60_000);
  if (remaining > 0) return `${remaining} min left`;
  return cooldown.requires_check_in && !cooldown.check_in_completed_at ? "Check-in pending" : "—";
}
