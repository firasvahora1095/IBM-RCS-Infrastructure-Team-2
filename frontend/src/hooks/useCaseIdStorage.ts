const STORAGE_KEY = "rcs_last_case";

export interface StoredCase {
  caseId: string;
  createdAt: string; // ISO timestamp of when this browser saved it
}

/**
 * UR-ID-07: the Case ID must survive a page refresh via local storage — not
 * a server-side session, because there is no account to attach one to.
 * Plain functions rather than a stateful React hook: the two pages that use
 * this (Upload writes, Case ID Confirmation reads) each touch it once and
 * don't need to react to live changes.
 *
 * Every storage call is wrapped in try/catch because localStorage can throw
 * (Safari private browsing, storage disabled by policy, quota exceeded). A
 * failure here must never block a public user's report from submitting —
 * they still see their case ID on screen and can copy it.
 */
export function saveCaseId(caseId: string): void {
  const record: StoredCase = { caseId, createdAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable — the confirmation page still receives the ID via
    // navigation state, so there's nothing else to do here.
  }
}

export function loadCaseId(): StoredCase | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCase>;
    // Guard against unexpected content (e.g. an older format) rather than
    // rendering "undefined" as someone's case ID.
    return typeof parsed.caseId === "string" ? (parsed as StoredCase) : null;
  } catch {
    return null;
  }
}
