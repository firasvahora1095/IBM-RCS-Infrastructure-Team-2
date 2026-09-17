import type { InternalCaseStatus, PublicCaseStatus } from "../services/types";

/**
 * RT-02 (docs/ba/ba-requirements-sprint2-final.md) is the single source for
 * both columns below — Devs are told to use it "rather than creating
 * separate status wording or casing". UR-ST-02: the Normal User must NEVER
 * see an internal workflow state name.
 */
const PUBLIC_STATUS: Record<InternalCaseStatus, PublicCaseStatus> = {
  SUBMITTED: "Received",
  AI_PROCESSING: "Being Reviewed",
  READY_FOR_REVIEW: "Being Reviewed",
  AUDITOR_REVIEW: "Being Reviewed",
  COMPLETE: "Complete",
};

const STAFF_LABELS: Record<InternalCaseStatus, string> = {
  SUBMITTED: "Submitted",
  AI_PROCESSING: "AI Processing",
  READY_FOR_REVIEW: "Ready for Review",
  AUDITOR_REVIEW: "Auditor Review",
  COMPLETE: "Complete",
};

const ALREADY_PUBLIC: readonly string[] = ["Received", "Being Reviewed", "Complete"];

/**
 * Converts any status string (internal, or already public) into a safe
 * public label. GET /api/status/{id} already returns the public label
 * today; we still map defensively in case a future endpoint or backend
 * change returns a raw internal value. Anything unrecognised falls back to
 * "Being Reviewed" rather than leaking an unknown string onto a public page.
 */
export function mapStatusToPublicLabel(status: string): PublicCaseStatus {
  if (status in PUBLIC_STATUS) {
    return PUBLIC_STATUS[status as InternalCaseStatus];
  }
  if (ALREADY_PUBLIC.includes(status)) {
    return status as PublicCaseStatus;
  }
  return "Being Reviewed";
}

/** Staff-facing label (RT-02's "Staff-Facing Label" column), never the raw enum. */
export function mapStatusToStaffLabel(status: InternalCaseStatus): string {
  return STAFF_LABELS[status] ?? status;
}
