# Sprint 3 — Edge Cases QA Checklist (Draft)

**Purpose:** Cover abnormal, boundary, and concurrent scenarios that normal happy-path testing misses.

---

## 1. File Upload (Reporter)

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 1.1 | Upload a 0-byte file | Rejected with clear error; no case created | Pass | "File is too small to be a valid video" |
| 1.2 | Upload a non-video file (`.jpg`, `.pdf`) renamed to `.mp4` | Rejected after content check; not passed to AI | Pass | "File contents do not match a valid MP4 video" |
| 1.3 | Upload a corrupted video (unplayable) | Rejected or flagged; AI analysis does not hang | Pass | "File contents do not match a valid MP4 video" |
| 1.4 | Submit the upload form twice rapidly (double-click) | Only one case created; second submit ignored | Pass | Second submit ignored |

---

## 2. Case ID & Status Lookup (Reporter)

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 2.1 | Look up a Case ID that does not exist | Clear "not found" message; no 500 error | Pass | "We couldn't find a case with that ID" |
| 2.2 | Enter a Case ID with special characters (`'; DROP TABLE`) | Input sanitised; no crash or SQL error | Pass | "We couldn't find a case with that ID" |
| 2.3 | Enter a very long string as Case ID (500+ chars) | Rejected gracefully | Pass | "We couldn't find a case with that ID" |
| 2.4 | Look up a case that is still being processed | Shows `Being Reviewed` or equivalent; not blank | Pass | "Being Reviewed" shown correctly |
| 2.5 | Refresh the status page repeatedly | Status remains consistent; no race condition | Pass | Status consistent on repeated check |

---

## 3. Auditor — Session & Authentication

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 3.1 | Token expires mid-review (during video playback) | In-place session expiry prompt; entered data preserved | Pass | Re-auth modal shown; blur/grayscale/mute settings preserved |
| 3.2 | Token expires mid-resolve (just before submit) | Prompt shown; resolve not silently lost | Pass | Same re-auth modal flow as 3.1 |
| 3.3 | Same account open in two browser tabs | Both tabs remain functional; no data corruption | Pass | Both tabs remain functional |
| 3.4 | Log out then press browser back button | Redirected to login; protected page not accessible | Pass | Redirected to login page |
| 3.5 | Manually modify the auth token in localStorage | Request rejected with 401 | Pass | 401 returned, auto-logout triggered |

---

## 4. Auditor — Exposure & Cooldown

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 4.1 | Auditor reaches exposure limit mid-review | Raw playback stops, entered progress is kept, and the case returns to the Manager with reason `EXPOSURE_CAP_REACHED`; it is never reassigned automatically. No new normal case that working day | Pass | AT_LIMIT auditors excluded from auto-assignment and shown as Unavailable in manual reassign dropdown; near-limit auditors show Limited headroom per spec |
| 4.2 | Auditor in mandatory cooldown receives assignment attempt | Assignment blocked; cooldown not cancelled | Pass | `reassign_case` now returns 409 if target auditor is in cooldown; cooldown auditors shown as Unavailable in reassign dropdown |
| 4.3 | Auditor under SOS protection receives assignment attempt | Assignment blocked | Pass | `reassign_case` now returns 409 if target auditor has active SOS; SOS auditors shown as Unavailable in reassign dropdown |
| 4.5 | S4 case completed → Auditor immediately assigned another S4 | Blocked by 30-min cooldown rule | Pass | Same fix as 4.2 — cooldown check added to manual reassign path |
| 4.6 | Exposure resets after logout/login | Exposure must NOT reset; persists across sessions | Pass | Exposure persists across logout/login |

---

## 5. Auditor — Case Review & Resolve

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 5.1 | Resolve attempted on an already-COMPLETE case | Rejected with 400/409; case not duplicated | Pass | UI blocks access to completed cases |
| 5.2 | Resolve attempted before AI analysis is complete | Blocked or queued appropriately | Pass | UI blocks resolve before AI analysis complete |
| 5.3 | Auditor submits resolve with no `final_outcome` field | Validation error returned; case not corrupted | Pass | Submit button disabled until outcome selected |
| 5.4 | Auditor submits `auditor_severity_score` identical to AI score | `is_override` recorded as `false` | Pass | `auditor_severity=None` when score matches AI (no separate score stored) |
| 5.5 | Auditor submits `auditor_severity_score` different from AI | `is_override` recorded as `true`; both scores stored | Pass | `ai_severity=S2`, `auditor_severity=96` both stored |
| 5.6 | Auditor declines a case | Case routes to the Manager's Reassignment Queue (never auto-reassigned); the Manager decides. Auditor exposure not incremented by the decline itself | Pass | Declined case appears in Manager reassignment queue |
| 5.7 | Auditor triggers SOS during review | SOS recorded; Manager notified; case handling paused | Pass | SOS triggers Manager notification |

---

## 6. Manager — Auditor Detail & Exposure Limit

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 6.1 | Navigate to detail page for an Auditor ID that does not exist | Clear 404 message; no 500 error | Pass | "Case not found" 404 shown |
| 6.2 | Approve a break request | Auditor navigated back after approval | Pass | **Answered (24 Oct 2026):** a break is 15 minutes from approval, blocks new cases while it runs, and ends by itself. Rule and reasoning: `docs/ux/wellbeing-break-rule.md`. (Original open question: should a cooldown-like protection apply to the Auditor after break is approved or requested? Not specified — needs alignment with BA/Aleeya.) |

---

## 7. Manager — Dashboard Concurrency

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 7.1 | Dashboard loaded while an Auditor is mid-cooldown | Cooldown timer reflects real remaining time | Pass | Timer accurate |
| 7.2 | Auditor goes into SOS while Manager has dashboard open | Manager sees updated state on next load or live | Pass | Dashboard updates correctly |

---

## 8. AI Processing

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 8.1 | AI service times out or returns an error | Case not silently stuck; error state visible to Manager | Not run | Requires AI service mocking |
| 8.2 | AI returns an out-of-range severity score | Backend validates and rejects or caps the value | Not run | Requires AI service mocking |
| 8.3 | AI returns empty transcript / no entities | Review proceeds with available data; no crash | Not run | Requires AI service mocking |
| 8.4 | Same case sent to AI twice (duplicate trigger) | Only one AI result stored; no duplicate audit log entries | Not run | Requires AI service mocking |

---

## 9. Audit Log Integrity

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 9.1 | Override recorded — confirm both AI and Auditor scores stored | `before_value` has AI score; `after_value` has Auditor score | Pass | `ai_tier=S2`, `auditor_tier=S4`, `auditor_score=96` both in audit log; override visible in Manager UI |
| 9.2 | Case completed — confirm `completed_at` is set | `completed_at` is not null after resolve | Pass | `completed_at` set on both test cases |
| 9.3 | Audit log entries are append-only | No existing log entry can be deleted or modified via API | Pass | No DELETE/PATCH endpoints exist for AuditLog |
| 9.4 | Manager reads audit log for a case with no overrides | Log shows lifecycle events only; no override entry present | Pass | Only `REVIEW_STARTED` and `CASE_RESOLVED` actions present |

---

## 10. Role & Permission Boundaries

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 10.1 | Auditor tries to access Manager dashboard URL directly | Redirected or 403 | Pass | Redirected to own Auditor screen |
| 10.2 | Reporter tries to access Auditor review URL directly | Redirected or 403 | Pass | Redirected to own Reporter screen |
| 10.3 | Unauthenticated request to any protected API endpoint | 401 returned; no data leaked | Pass | `GET /api/auditor/cases` without token → 401 |

---

## 11. Extreme Timestamps

> **Note:** These scenarios require system clock manipulation and were not tested manually. Worth testing before production deployment — particularly 11.2 (clock skew on cooldown expiry) and 11.1 (workday boundary edge case at 23:59:59 AEST).

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 11.1 | Case submitted at 23:59:59 local time | Assigned to correct workday window | Not run | Requires system clock change |
| 11.2 | Cooldown end time in the past (clock skew) | Cooldown treated as expired; Auditor available | Not run | Requires system clock change |
| 11.3 | System clock set far in the future then back | Exposure/cooldown calculations remain consistent | Not run | Requires system clock change |

---

## 12. CommunityHub Case Result Handoff

Results: "Pass (automated)" names the test that proves it; "Not run" still needs a manual pass.

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 12.1 | Auditor completes a case | Exactly one delivery is created (`DEL-<case>`), status PENDING; no Manager approval | Pass (automated) | `test_final_decision_queues_one_delivery_that_the_public_sees_only_once_delivered` |
| 12.2 | CommunityHub endpoint unavailable | 3 automatic attempts, then NEEDS_ATTENTION in the Manager's exception queue | Pass (automated) | `test_failed_delivery_retries_automatically_then_waits_for_the_manager` |
| 12.3 | Delivery fails | Moderation status stays COMPLETE; a failed delivery never reopens the case | Pass (automated) | same test |
| 12.4 | Manager retries a failed delivery | Same `delivery_id` is reused (idempotency); a second retry after success adds no attempt | Pass (automated) | same test |
| 12.5 | Retry or escalate without a note | Escalation without a note is refused (400) | Pass (automated) | `test_escalation_needs_a_note` |
| 12.6 | Manager closes a case without reassignment | CommunityHub still receives `CLOSED_NO_REASSIGNMENT`, with no severity | Pass (automated) | `test_closed_without_reassignment_still_tells_the_customer` |
| 12.7 | Reporter checks status before delivery succeeds | Status says Complete but never claims CommunityHub was notified | Pass (automated) | test in 12.1 (`public_delivery_confirmed`) |
| 12.8 | CommunityHub answers 2xx without echoing the `delivery_id` | Treated as unverifiable and retried, not SUCCESS | Not testable yet | The CommunityHub endpoint is simulated; needs a real or stubbed HTTP receiver |
| 12.9 | Delivery failure shown to the Auditor | Never shown: delivery is a Manager concern | Not run | Check `/auditor` and the review screen manually |

---

## 13. Manager Intelligence Dashboard & Evidence

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 13.1 | Open cases vs Total − Completed | Open is the current backlog, including cases received before the period | Pass (automated) | `test_intelligence_kpis_follow_the_definitions` |
| 13.2 | Open-case stages | Each open case is in exactly one stage; stages add up to Open | Pass (automated) | `test_open_breakdown_is_exclusive_and_sums_to_open` |
| 13.3 | Support requests | Break and talk requests are both counted, with a per-kind breakdown; nobody is named in the payload | Pass (automated) | `test_attention_counts_support_requests_of_both_kinds`, `test_intelligence_never_names_an_auditor` |
| 13.4 | Fewer than 3 completed cases | Median decision time isn't stated | Pass (automated) | `test_timing_and_delivery_figures` |
| 13.5 | Pending / retrying deliveries | Not counted as failures in the success rate | Pass (automated) | same test |
| 13.6 | More than 200 contributing records | Evidence lists 200 case IDs and says the list was cut | Pass (automated) | `test_evidence_lists_at_most_two_hundred_case_ids` |
| 13.7 | Auditor or client token on `/api/manager/intelligence` | 403 / 401; bad period 400; unknown organisation 404 | Pass (automated) | `test_intelligence_requires_a_manager_and_a_valid_period` |
| 13.8 | New SOS while the dashboard is open | Appears within 30 seconds without a reload | Not run | Needs two sessions |
| 13.9 | Period with no cases | Every widget shows an empty state, no errors | Not run | Use "Today" before any case is created |
| 13.10 | Exactly one primary button | Most urgent action is primary; Generate is primary only when nothing is urgent | Pass (automated) | `ManagerPages.test.tsx` |
| 13.11 | Accessibility | Dashboard and evidence dialog have no axe violations | Pass (automated) | `B2bPages.a11y.test.tsx` |

---

## 14. Client Service Report Evidence & Access

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 14.1 | Report generated | Each figure is stored with its definition, source fields, count and case IDs | Pass (automated) | `test_report_snapshot_stores_evidence_for_each_figure` |
| 14.2 | New cases after release | Released v1 is byte-identical; regenerating makes v2 | Pass (automated) | `test_released_report_evidence_never_changes` |
| 14.3 | Client views or lists a report | Definitions and counts, never contributing case IDs | Pass (automated) | `test_client_report_keeps_definitions_but_never_lists_case_ids` |
| 14.4 | Client opens a draft, another organisation's or a missing report | All look identical ("not found") and each is logged as DENIED | Pass (automated) | `test_client_sees_only_released_reports_for_their_organisation` |

---

## Notes

- **Open question (needs Aleeya confirmation):** When Auditor overrides AI severity, should Manager dashboard / oversight show the Auditor's final severity or the AI's original? Current assumption: Auditor's decision shown everywhere; audit log retains both. Needs alignment before governance UI is finalised.
- Concurrent scenarios (5.1, 6.5, 7.x) require two separate browser sessions or API clients to test properly.
- Items in section 10 should be re-tested any time a new role or route is added.
- Sections 12–14 cover the CommunityHub handoff, the Manager Intelligence Dashboard and client report evidence (added 8 Oct 2026).
