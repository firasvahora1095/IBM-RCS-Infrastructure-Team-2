# Sprint 3 — Edge Cases QA Checklist (Draft)

**Purpose:** Cover abnormal, boundary, and concurrent scenarios that normal happy-path testing misses.

---

## 1. File Upload (Reporter)

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 1.1 | Upload a 0-byte file | Rejected with clear error; no case created |  | |
| 1.2 | Upload a non-video file (`.jpg`, `.pdf`) renamed to `.mp4` | Rejected after content check; not passed to AI |  | |
| 1.3 | Upload a corrupted video (unplayable) | Rejected or flagged; AI analysis does not hang |  | |
| 1.4 | Upload a file larger than the size limit | Rejected before upload completes; clear size error |  | |
| 1.5 | Upload audio-only file (no video stream) | Handled gracefully; no silent crash |  | |
| 1.6 | Disconnect internet mid-upload | Upload fails cleanly; no partial case created |  | |
| 1.7 | Submit the upload form twice rapidly (double-click) | Only one case created; second submit ignored |  | |

---

## 2. Case ID & Status Lookup (Reporter)

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 2.1 | Look up a Case ID that does not exist | Clear "not found" message; no 500 error |  | |
| 2.2 | Enter a Case ID with special characters (`'; DROP TABLE`) | Input sanitised; no crash or SQL error |  | |
| 2.3 | Enter a very long string as Case ID (500+ chars) | Rejected gracefully |  | |
| 2.4 | Look up a case that is still being processed | Shows `Being Reviewed` or equivalent; not blank |  | |
| 2.5 | Refresh the status page repeatedly | Status remains consistent; no race condition |  | |

---

## 3. Auditor — Session & Authentication

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 3.1 | Token expires mid-review (during video playback) | In-place session expiry prompt; entered data preserved |  | |
| 3.2 | Token expires mid-resolve (just before submit) | Prompt shown; resolve not silently lost |  | |
| 3.3 | Same account open in two browser tabs | Both tabs remain functional; no data corruption |  | |
| 3.4 | Log out then press browser back button | Redirected to login; protected page not accessible |  | |
| 3.5 | Manually modify the auth token in localStorage | Request rejected with 401 |  | |

---

## 4. Auditor — Exposure & Cooldown

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 4.1 | Auditor reaches exposure limit mid-review | Case completes normally; no new assignment until limit clears |  | |
| 4.2 | Auditor in mandatory cooldown receives assignment attempt | Assignment blocked; cooldown not cancelled |  | |
| 4.3 | Auditor under SOS protection receives assignment attempt | Assignment blocked |  | |
| 4.4 | Cooldown timer expires while Auditor is on a different page | Next assignment available without needing refresh |  | |
| 4.5 | S4 case completed → Auditor immediately assigned another S4 | Blocked by 30-min cooldown rule |  | |
| 4.6 | Exposure resets after logout/login | Exposure must NOT reset; persists across sessions |  | |

---

## 5. Auditor — Case Review & Resolve

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 5.1 | Two Auditors attempt to resolve the same case simultaneously | Only one succeeds; second gets a clear conflict error |  | Requires two sessions |
| 5.2 | Resolve attempted on an already-COMPLETE case | Rejected with 400/409; case not duplicated |  | |
| 5.3 | Resolve attempted before AI analysis is complete | Blocked or queued appropriately |  | |
| 5.4 | Auditor submits resolve with no `final_outcome` field | Validation error returned; case not corrupted |  | |
| 5.5 | Auditor submits `auditor_severity_score` identical to AI score | `is_override` recorded as `false` |  | |
| 5.6 | Auditor submits `auditor_severity_score` different from AI | `is_override` recorded as `true`; both scores stored |  | |
| 5.7 | Auditor declines a case | Case returned to queue; Auditor exposure not incremented |  | |
| 5.8 | Auditor triggers SOS during review | SOS recorded; Manager notified; case handling paused |  | |

---

## 6. Manager — Auditor Detail & Exposure Limit

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 6.1 | Navigate to detail page for an Auditor ID that does not exist | Clear 404 message; no 500 error |  | |
| 6.2 | Set exposure limit below minimum (< 30 min) | Input rejected; current limit unchanged |  | |
| 6.3 | Set exposure limit above maximum (> 480 min) | Input rejected; current limit unchanged |  | |
| 6.4 | Save limit while network is slow / times out | Error shown with retry option; limit not silently corrupted |  | |
| 6.5 | Two Managers update the same Auditor's limit simultaneously | Last-write-wins or conflict detected; no silent data loss |  | Requires two sessions |
| 6.6 | Approve a break request that has already been approved | Second approval rejected gracefully |  | |

---

## 7. Manager — Dashboard Concurrency

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 7.1 | Dashboard loaded while an Auditor is mid-cooldown | Cooldown timer reflects real remaining time |  | |
| 7.2 | Auditor goes into SOS while Manager has dashboard open | Manager sees updated state on next load or live |  | |
| 7.3 | Multiple Managers viewing dashboard simultaneously | No data corruption; each sees consistent state |  | Requires two sessions |

---

## 8. AI Processing

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 8.1 | AI service times out or returns an error | Case not silently stuck; error state visible to Manager |  | |
| 8.2 | AI returns an out-of-range severity score | Backend validates and rejects or caps the value |  | |
| 8.3 | AI returns empty transcript / no entities | Review proceeds with available data; no crash |  | |
| 8.4 | Same case sent to AI twice (duplicate trigger) | Only one AI result stored; no duplicate audit log entries |  | |

---

## 9. Audit Log Integrity

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 9.1 | Override recorded — confirm both AI and Auditor scores stored | `before_value` has AI score; `after_value` has Auditor score |  | |
| 9.2 | Case completed — confirm `completed_at` is set | `completed_at` is not null after resolve |  | |
| 9.3 | Audit log entries are append-only | No existing log entry can be deleted or modified via API |  | |
| 9.4 | Manager reads audit log for a case with no overrides | Log shows lifecycle events only; no override entry present |  | |

---

## 10. Role & Permission Boundaries

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 10.1 | Auditor tries to access Manager dashboard URL directly | Redirected or 403 |  | |
| 10.2 | Reporter tries to access Auditor review URL directly | Redirected or 403 |  | |
| 10.3 | Manager tries to access another Manager's auditor list | Only own auditors visible (if scoped) — confirm scope |  | |
| 10.4 | Unauthenticated request to any protected API endpoint | 401 returned; no data leaked |  | |

---

## 11. Extreme Timestamps

| # | Scenario | Expected behaviour | Result | Notes |
|---|---|---|---|---|
| 11.1 | Case submitted at 23:59:59 local time | Assigned to correct workday window |  | |
| 11.2 | Cooldown end time in the past (clock skew) | Cooldown treated as expired; Auditor available |  | |
| 11.3 | System clock set far in the future then back | Exposure/cooldown calculations remain consistent |  | |

---

## Notes

- Concurrent scenarios (5.1, 6.5, 7.x) require two separate browser sessions or API clients to test properly.
- Items in section 10 should be re-tested any time a new role or route is added.
- This checklist covers core RCS flows only. CommunityHub Handoff edge cases (delivery failure, duplicate POST, idempotency) will be added when that feature is implemented.
