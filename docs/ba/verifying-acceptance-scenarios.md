## Acceptance Scenarios (Sprint 2 Week 1 E2E)

**Source:** `docs/ba/acceptance-scenarios-sprint2.md`  
**Owner:** Janataarah Begum  
**Method:** Manual — clicked through the live UI at http://localhost:5174 connected to the real backend at http://localhost:8081. One step (mock AI injection) has no UI button and required a direct API call — see note in the table below.

### Pre-test fixes required before manual testing was possible

| Fix | Detail |
|-----|--------|
| `VITE_DATA_SOURCE=api` added to `.env.local` | Frontend was defaulting to mock mode — no real API calls were made until this was set |
| `acknowledgeContentWarning` bypass in `services/api/index.ts` | Content warning acknowledgement endpoint does not exist in the backend (out of Week 1 scope). Without this bypass the case detail screen showed "This feature isn't connected to the backend yet" and could not be opened |
| DB column renames | `cases.assigned_auditor` → `assigned_auditor_id`, `audit_logs.id` → `audit_log_id` (older schema mismatch with current `models.py`) |
| Auditor password reset | DB had a bcrypt hash from an older setup; updated to PBKDF2 via `app.auth.hash_password`. Password: `correct horse battery staple` |

### Test case

```
Case ID: NJL7AV0O1YQ4GJPL
Assigned auditor: auditor-1
Video: IBM-RCS Infrastructure - A1_T2_Team_Presentation.mp4
```

### Steps and results

| # | Scenario | How tested | Expected | Observed | Result |
|---|----------|-----------|----------|----------|--------|
| 1 | Upload returns a Case ID | **Manual** — went to upload page, selected real MP4, clicked Submit | Unique Case ID shown on confirmation screen | Case ID `NJL7AV0O1YQ4GJPL` displayed, status "Received" | PASS |
| 2 | Case record is created | **Manual** — navigated to status lookup, entered the Case ID | Status page loads with "Being Reviewed" | Status showed "Being Reviewed" with correct case ID | PASS |
| 3 | Case assigned to an auditor | **Manual** — logged in as auditor-1, checked dashboard | Case appears in queue with `AI_PROCESSING` | Case visible in auditor-1's queue, assigned correctly | PASS |
| 4 | Mock AI result appears | **API call** (no UI button) — `POST /api/internal/cases/{id}/mock-ai-result` with `X-Internal-API-Key: dev-secret` header, then reopened case in browser | Severity tier, narrative summary, and incident timeline displayed | S3, narrative summary, timeline `[12s–20s]` all visible in case detail | PASS |
| 5 | Auditor can confirm or override | **Manual** — tried override without comment; then confirmed without changing score | Override blocked without comment; confirm accepted | Override showed "A comment is required"; confirm submitted successfully | PASS |
| 6 | Auditor selects a final outcome | **Manual** — checked available outcomes in the UI | Only two RT-01 outcomes available | Only `NO_VIOLATION_FOUND` and `POLICY_VIOLATION_FOUND` shown | PASS |
| 7 | Case progresses to Complete | **Manual** — clicked Submit on resolution form | Case moves to `Complete` without Manager approval | Status immediately `Complete` with correct outcome | PASS |
| 8 | Public user can check status | **Manual** — looked up Case ID on public status page | "Complete" + outcome shown; no internal data exposed | Showed `Complete`, outcome, `submitted_at` only — no severity score, auditor name, etc. | PASS |

**Overall: 8 / 8 PASS**

---

## Known Limitations / Notes

- **`/api/internal/cases/{id}/mock-ai-result`** requires `INTERNAL_API_KEY` env var to be set at backend startup. Without it the endpoint returns `503 "Internal API is not configured"`. Set `INTERNAL_API_KEY=dev-secret` (or any string) when running locally.
- **Auditor password** in the DB was a bcrypt hash from an older setup. Updated to PBKDF2 hash using `app.auth.hash_password`. Password for both `auditor-1` and `auditor-2` is: `correct horse battery staple` (from `tests/test_api.py`).
- **DB column renames** above are local only — not applied to any shared/deployed environment.