import type { FinalOutcome } from "../services/types";

/**
 * The review steps a draft can resume at, always behind the content warning
 * again (AR-PV-08). Never the confirmation, decline or SOS outcomes.
 */
export type DraftStep = "summary" | "workspace" | "severity";

export interface DraftResolution {
  auditorScore: number;
  comment: string;
  outcome: FinalOutcome | null;
  step: DraftStep;
  /** Whether the Auditor has set a rating themselves; required when the AI gave no score (AR-AI-10). */
  ratingTouched?: boolean;
}

const DRAFT_KEY_PREFIX = "rcs_draft_resolution_";

function draftKey(caseId: string): string {
  return `${DRAFT_KEY_PREFIX}${caseId}`;
}

/**
 * Sprint 2 Week 3 Task 102: "A severity override and comment survive a
 * round-trip to another screen and back." Keyed by case ID, so a
 * half-finished draft for one case never bleeds into a different case.
 *
 * sessionStorage, like the rest of the staff session (useAuth): a draft only
 * needs to survive navigation within this tab, and anything older than the
 * tab is stale by definition.
 */
export function loadDraftResolution(caseId: string): DraftResolution | null {
  try {
    const raw = sessionStorage.getItem(draftKey(caseId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<DraftResolution>;
    // Validate before trusting it: a malformed draft must not put the review
    // form into an impossible state (e.g. a score of 250).
    const scoreOk = typeof draft.auditorScore === "number" && draft.auditorScore >= 0 && draft.auditorScore <= 100;
    const outcomeOk =
      draft.outcome === null || draft.outcome === "NO_VIOLATION_FOUND" || draft.outcome === "POLICY_VIOLATION_FOUND";
    const stepOk = draft.step === "summary" || draft.step === "workspace" || draft.step === "severity";
    if (!scoreOk || !outcomeOk || !stepOk || typeof draft.comment !== "string") {
      return null;
    }
    return draft as DraftResolution;
  } catch {
    return null;
  }
}

export function saveDraftResolution(caseId: string, draft: DraftResolution): void {
  try {
    sessionStorage.setItem(draftKey(caseId), JSON.stringify(draft));
  } catch {
    // Storage full or unavailable: the review still works, it just won't
    // survive navigating away.
  }
}

export function clearDraftResolution(caseId: string): void {
  sessionStorage.removeItem(draftKey(caseId));
}

/** Removes every saved draft — called on sign-out so nothing outlives the session. */
export function clearAllDraftResolutions(): void {
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(DRAFT_KEY_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}
