import type { AttentionKind, AuditorOverviewRow, InternalCaseStatus, OpenBucket } from "../services/types";
import type { StatusTone } from "./statusTones";

/**
 * Wording and status colours for the Manager Intelligence Dashboard
 * (Sprint 3 extras §1). Tones follow design-tokens/statusTones.ts: error when
 * someone must act now, warning when a decision is waiting.
 */

/** MR-OV-08: seeded or mock figures are always labelled. */
export const PROVENANCE_BADGE = "DEMO / PLACEHOLDER DATA";
export const PROVENANCE_BADGE_TITLE =
  "These figures come from seeded demo records, not real operations. They show how the dashboard works.";

/** Whether an Auditor can be given new harmful-content cases right now. */
export type Availability = "AVAILABLE" | "COOLDOWN" | "NO_NEW_CASES" | "SOS_PROTECTION";

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  AVAILABLE: "Available",
  COOLDOWN: "In cooldown",
  NO_NEW_CASES: "No new cases today",
  SOS_PROTECTION: "SOS protection",
};

export const AVAILABILITY_TONE: Record<Availability, StatusTone> = {
  AVAILABLE: "success",
  COOLDOWN: "info",
  NO_NEW_CASES: "warning",
  SOS_PROTECTION: "error",
};

/**
 * SOS first, then the daily limit (it lasts the rest of the working day), then
 * a running cooldown. An S4/SOS cooldown stays in force until the Manager's
 * check-in is recorded, even after its timer ends.
 */
export function availabilityOf(row: AuditorOverviewRow, now: number): Availability {
  if (row.open_sos) return "SOS_PROTECTION";
  if (row.exposure_state === "AT_LIMIT") return "NO_NEW_CASES";
  const c = row.cooldown;
  if (c && (Date.parse(c.ends_at) > now || (c.requires_check_in && !c.check_in_completed_at))) return "COOLDOWN";
  return "AVAILABLE";
}

/** Who needs protecting first: an open SOS, a support request waiting, then exposure against their own limit. */
export function protectionNeed(row: AuditorOverviewRow): number {
  const ratio = row.exposure_limit_minutes ? row.exposure_minutes_today / row.exposure_limit_minutes : 0;
  const asked = (row.open_requests?.break_requests ?? 0) + (row.open_requests?.talk_requests ?? 0) > 0;
  return (row.open_sos ? 10 : 0) + (asked ? 5 : 0) + ratio;
}

export interface AttentionWording {
  label: string;
  /** Shown beside the count when it's above zero. */
  status: string;
  tone: StatusTone;
  /** Where the Manager acts on it. */
  to: string;
}

/** Needs Attention rows, in priority order: only items waiting for the Manager. */
export const ATTENTION: Record<AttentionKind, AttentionWording> = {
  SOS: { label: "Open SOS", status: "Act now", tone: "error", to: "/manager/sos" },
  SUPPORT_REQUEST: { label: "Support requests", status: "Waiting for you", tone: "warning", to: "/manager" },
  REASSIGNMENT: {
    label: "Reassignment decisions",
    status: "Decision needed",
    tone: "warning",
    to: "/manager/reassignment",
  },
  CAP_INTERRUPTED: {
    label: "Exposure-cap interrupted cases",
    status: "Decision needed",
    tone: "warning",
    to: "/manager/reassignment",
  },
  FAILED_HANDOFF: {
    label: "Failed CommunityHub handoffs",
    status: "Retry or escalate",
    tone: "error",
    to: "/manager/deliveries?status=needs-attention",
  },
};

export const ATTENTION_ORDER: readonly AttentionKind[] = [
  "SOS",
  "SUPPORT_REQUEST",
  "REASSIGNMENT",
  "CAP_INTERRUPTED",
  "FAILED_HANDOFF",
];

/** Case Oversight wording (RT-02 staff labels), plus the Manager-decision stage. */
export const OPEN_BUCKET_LABEL: Record<OpenBucket, string> = {
  SUBMITTED: "Submitted / waiting",
  AI_PROCESSING: "AI Processing",
  READY_FOR_REVIEW: "Ready for Review",
  AUDITOR_REVIEW: "Auditor Review",
  MANAGER_ACTION: "Manager action required",
};

export const OPEN_BUCKET_ORDER: readonly OpenBucket[] = [
  "SUBMITTED",
  "AI_PROCESSING",
  "READY_FOR_REVIEW",
  "AUDITOR_REVIEW",
  "MANAGER_ACTION",
];

/**
 * Carbon tokens per stage: gray for waiting, then Blue 20 → 60 → 80 as a case
 * moves through review, so the order reads at a glance. The Manager stage is
 * the only warm colour and is also striped, so it never relies on colour alone.
 */
export const OPEN_BUCKET_COLOR: Record<OpenBucket, string> = {
  SUBMITTED: "var(--cds-border-strong-01)",
  AI_PROCESSING: "var(--cds-tag-background-blue)",
  READY_FOR_REVIEW: "var(--cds-interactive)",
  AUDITOR_REVIEW: "var(--cds-button-primary-active)",
  MANAGER_ACTION: "var(--cds-support-warning)",
};

/** Where each stage opens in Case Oversight. */
export function caseOversightLink(bucket: OpenBucket): string {
  return `/manager/cases?stage=${bucket}`;
}

/** The stage an open case is in; a case waiting for a Manager decision counts only there. */
export function openBucketOf(status: InternalCaseStatus, managerFlag: string | null): OpenBucket | null {
  if (status === "COMPLETE") return null;
  return managerFlag ? "MANAGER_ACTION" : status;
}

export function isOpenBucket(value: string | null): value is OpenBucket {
  return value !== null && (OPEN_BUCKET_ORDER as readonly string[]).includes(value);
}

export const COMPARISON_NOTE =
  "Operational disagreement between the AI's first severity and the Auditor's final severity. It isn't model accuracy, and it doesn't mean either one was wrong.";

export const EVIDENCE_RULE =
  "Dashboard analytics summarise verified RCS records; they don't replace the underlying evidence.";
