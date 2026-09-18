import type { CaseOutcome, FinalOutcome } from "../services/types";

/**
 * RT-01 — Final Outcome Taxonomy (docs/ba/ba-requirements-sprint2-final.md),
 * internal values PM-confirmed 2026-09-16. The Auditor sends the internal
 * value; the public status page shows the heading and supporting message.
 *
 * RT-01's scope note also applies to anything built on top of this copy:
 * public wording must not state or imply that content was removed or
 * reported to authorities.
 */
export interface OutcomeDisplay {
  title: string;
  body: string;
}

const OUTCOME_COPY: Record<CaseOutcome, OutcomeDisplay> = {
  NO_VIOLATION_FOUND: {
    title: "No Violation Found",
    body: "Your report has been reviewed and no policy violation was identified based on the available information.",
  },
  POLICY_VIOLATION_FOUND: {
    title: "Policy Violation Found",
    body: "Your report has been reviewed and a policy violation was identified. Thank you for taking the time to submit your report.",
  },
  // A declined case the Manager closes with "No reassignment needed". The
  // approved label is a single content-neutral sentence (Normal User handoff
  // Round 8); it's split into heading and body here without changing a word.
  // Not yet in RT-01 — flagged for the BA to add.
  CLOSED_NO_REASSIGNMENT: {
    title: "This case has been reviewed and closed.",
    body: "No further action is required from you.",
  },
};

/**
 * Accepts whatever raw string is stored in the database and returns the
 * current RT-01 copy. Besides the internal values, it recognises the
 * human-readable labels and the older test value "Violation Found", which
 * already exist in test-backend data from before RT-01 was confirmed — so
 * old cases still display correctly without a data migration.
 *
 * Returns null (rather than throwing) for anything unrecognised: this runs
 * during render on a PUBLIC page with no error boundary, and a thrown error
 * there would blank the whole screen for a member of the public. The page
 * shows the Complete status without an outcome block instead, and the raw
 * value is never printed.
 */
export function mapOutcomeToDisplay(rawOutcome: string): OutcomeDisplay | null {
  const normalized = rawOutcome
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (normalized === "NO_VIOLATION_FOUND") {
    return OUTCOME_COPY.NO_VIOLATION_FOUND;
  }
  if (normalized === "POLICY_VIOLATION_FOUND" || normalized === "VIOLATION_FOUND") {
    return OUTCOME_COPY.POLICY_VIOLATION_FOUND;
  }
  if (normalized === "CLOSED_NO_REASSIGNMENT") {
    return OUTCOME_COPY.CLOSED_NO_REASSIGNMENT;
  }
  return null;
}

/** The two options in the Auditor's outcome selector: RT-01 value + Auditor label. */
export const OUTCOME_OPTIONS: ReadonlyArray<{ value: FinalOutcome; label: string }> = [
  { value: "NO_VIOLATION_FOUND", label: OUTCOME_COPY.NO_VIOLATION_FOUND.title },
  { value: "POLICY_VIOLATION_FOUND", label: OUTCOME_COPY.POLICY_VIOLATION_FOUND.title },
];
