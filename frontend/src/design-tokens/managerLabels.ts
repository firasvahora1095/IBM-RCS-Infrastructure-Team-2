import type {
  CooldownState,
  ExposureState,
  InternalCaseStatus,
  SosAlertStatus,
  SosFollowUpOutcome,
  SosTrigger,
} from "../services/types";
import { mapStatusToStaffLabel } from "./statusLabels";

/** MR-OV-05 exposure states, as the Manager Figma dashboard labels them (78:69). */
export const EXPOSURE_STATE_LABEL: Record<ExposureState, string> = {
  UNDER: "Under",
  APPROACHING: "Approaching",
  AT_LIMIT: "At limit",
};

/** SOS Inbox status column (Figma 103:151). Unacknowledged rows show an Acknowledge button instead. */
export const SOS_STATUS_LABEL: Record<SosAlertStatus, string> = {
  UNACKNOWLEDGED: "Unacknowledged",
  IN_PROGRESS: "Acknowledged — in progress",
  RESOLVED: "Resolved",
};

/**
 * What raised an SOS alert, on SOS Alert Detail. Figma 103:197 only designs the
 * Auditor's own SOS; AR-AI-11 failures use the same alert (Auditor Figma 25:212
 * annotation), so the Manager is told which one it was.
 */
export const SOS_TRIGGER_LABEL: Record<SosTrigger, string> = {
  AUDITOR_SOS: "Auditor SOS",
  AI_FAILURE_MID_REVIEW: "AI failure mid-review",
};

/** Structured follow-up outcomes, in Figma order (103:228). None is pre-selected. */
export const SOS_FOLLOW_UP_OPTIONS: readonly { value: SosFollowUpOutcome; label: string }[] = [
  { value: "NO_FURTHER_ACTION", label: "Followed up — no further action" },
  { value: "REASSIGNED_REMAINING_CASES", label: "Followed up — reassigned remaining cases" },
  { value: "AUDITOR_STOPPED_SHIFT", label: "Followed up — Auditor stopped shift" },
];

/**
 * Staff-facing status in Manager lists. RT-02's staff labels, plus "Manager
 * Review" for a declined or SOS case awaiting a Manager decision: RT-02 has
 * no internal state for that yet (flagged for the BA), so it is derived from
 * the case's flag rather than invented as a new status value.
 */
export function managerStatusLabel(status: InternalCaseStatus, managerFlag: "DECLINED" | "SOS" | null): string {
  if (managerFlag && status !== "COMPLETE") return "Manager Review";
  return mapStatusToStaffLabel(status);
}

/** Cooldown column text on the Oversight Dashboard (MR-OV-03). */
export function cooldownSummary(cooldown: CooldownState | null, now: number = Date.now()): string {
  if (!cooldown) return "—";
  const remaining = Math.ceil((Date.parse(cooldown.ends_at) - now) / 60_000);
  if (remaining > 0) return `${remaining} min left`;
  return cooldown.requires_check_in && !cooldown.check_in_completed_at ? "Check-in pending" : "—";
}
