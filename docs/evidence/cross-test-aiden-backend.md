# Cross-Test: Aiden's Final Backend Behaviour

**Date:** 2026-10-04
**Branch:** `test/e2e-uat-buffer-v2`
**Target:** Aiden's backend — override flow, case completion flow, severity-tier cooldown logic

---

## What Was Tested

Aiden implemented the core case resolution and auditor wellbeing backend. This cross-test runs the existing contract test suite against his implementation to verify three areas:

### 1. Override Flow
When an auditor submits a severity score that differs from the AI score, the system must flag the resolution as an override and record it in the audit log. Submitting an override with a blank or whitespace-only comment must be rejected with HTTP 400, and the case must remain unchanged.

### 2. Case Completion Flow
After an auditor resolves a case, the system must transition the case status to `COMPLETE`, persist `completed_at`, and surface the final outcome via the public `/api/status/:id` endpoint that reporters can poll.

### 3. Severity-Tier Cooldown
After completing a high-severity case, the auditor is placed on a mandatory rest cooldown:
- **S1** — no cooldown
- **S3** — 15-minute cooldown
- **S4** — 30-minute cooldown

A manager follow-up call clears the cooldown early. Auditors in cooldown are excluded from new case assignments. If every available auditor is in cooldown, the assignment endpoint returns HTTP 503. SOS triggers also save a cooldown to the DB and the value is returned in the wellbeing endpoint response.

---

## Test Commands

### Existing contract suite (Aiden's behaviour)
```bash
cd backend
python -m pytest tests/test_api.py -v -k "override or complete or cooldown"
```

### Additional cross-validation script
```bash
python -m pytest tests/test_cross_validation.py -v
```

Both run against an in-memory SQLite database with the full FastAPI app mounted via ASGI transport — no external services required.

---

## Output — Existing Contract Suite

```
============================= test session starts ==============================
platform darwin -- Python 3.11.12, pytest-9.1.1, pluggy-1.6.0
rootdir: IBM-RCS-Infrastructure-Team-2/backend
plugins: anyio-4.14.2
collected 44 items / 36 deselected / 8 selected

tests/test_api.py::ApiContractTests::test_complete_s1_case_does_not_set_cooldown                    PASSED [ 12%]
tests/test_api.py::ApiContractTests::test_complete_s3_case_sets_15_min_cooldown                     PASSED [ 25%]
tests/test_api.py::ApiContractTests::test_complete_s4_case_sets_30_min_cooldown                     PASSED [ 37%]
tests/test_api.py::ApiContractTests::test_cooldown_clears_after_manager_follow_up                   PASSED [ 50%]
tests/test_api.py::ApiContractTests::test_override_rejects_blank_comments_without_changing_the_case PASSED [ 62%]
tests/test_api.py::ApiContractTests::test_select_auditor_excludes_auditor_in_cooldown               PASSED [ 75%]
tests/test_api.py::ApiContractTests::test_select_auditor_returns_503_when_all_in_cooldown           PASSED [ 87%]
tests/test_api.py::ApiContractTests::test_sos_saves_cooldown_to_db_and_wellbeing_returns_it         PASSED [100%]

============= 8 passed, 36 deselected, 3 subtests passed in 0.80s ==============
```

---

## Output — Cross-Validation Script

```
============================= test session starts ==============================
platform darwin -- Python 3.11.12, pytest-9.1.1, pluggy-1.6.0
rootdir: IBM-RCS-Infrastructure-Team-2/backend
plugins: anyio-4.14.2
collected 9 items

tests/test_cross_validation.py::CrossValidationTests::test_aiden_complete_flow_sets_status_complete_and_public_readable PASSED [ 11%]
tests/test_cross_validation.py::CrossValidationTests::test_aiden_confirm_ai_score_records_is_override_false            PASSED [ 22%]
tests/test_cross_validation.py::CrossValidationTests::test_aiden_override_flow_records_is_override_true_in_audit_log   PASSED [ 33%]
tests/test_cross_validation.py::CrossValidationTests::test_aiden_s1_resolution_does_not_set_cooldown                   PASSED [ 44%]
tests/test_cross_validation.py::CrossValidationTests::test_aiden_s3_resolution_triggers_15_min_cooldown                PASSED [ 55%]
tests/test_cross_validation.py::CrossValidationTests::test_aiden_s4_resolution_triggers_30_min_cooldown                PASSED [ 66%]
tests/test_cross_validation.py::CrossValidationTests::test_manager_auditor_detail_completed_case_appears_in_recent     PASSED [ 77%]
tests/test_cross_validation.py::CrossValidationTests::test_manager_auditor_detail_includes_recent_cases                PASSED [ 88%]
tests/test_cross_validation.py::CrossValidationTests::test_manager_auditor_detail_returns_200_not_500                  PASSED [100%]

============= 9 passed in 0.97s ==============
```

---

## Per-Test Breakdown

| Test | What it asserts |
|------|----------------|
| `test_complete_s1_case_does_not_set_cooldown` | Resolving an S1 case leaves `cooldown_ends_at` as NULL on the auditor row |
| `test_complete_s3_case_sets_15_min_cooldown` | Resolving an S3 case sets `cooldown_ends_at` to exactly 15 minutes from now (±0.2 min tolerance) and `cooldown_trigger = "S3"` |
| `test_complete_s4_case_sets_30_min_cooldown` | Resolving an S4 case sets `cooldown_ends_at` to exactly 30 minutes from now and `cooldown_trigger = "S4"` |
| `test_cooldown_clears_after_manager_follow_up` | Calling the manager follow-up endpoint clears `cooldown_ends_at` back to NULL |
| `test_override_rejects_blank_comments_without_changing_the_case` | POST `/resolve` with `auditor_comment = ""`, `" "`, or `null` returns HTTP 400; DB row is unchanged |
| `test_select_auditor_excludes_auditor_in_cooldown` | The assignment selector skips auditors whose `cooldown_ends_at` is in the future |
| `test_select_auditor_returns_503_when_all_in_cooldown` | When every auditor is in cooldown, the internal assign endpoint returns HTTP 503 |
| `test_sos_saves_cooldown_to_db_and_wellbeing_returns_it` | POST `/sos` persists a cooldown row; GET `/wellbeing` response includes the cooldown timestamp |
| `test_aiden_override_flow_records_is_override_true_in_audit_log` | Auditor score ≠ AI score → `AuditLog.after_value.is_override = True` |
| `test_aiden_confirm_ai_score_records_is_override_false` | Auditor confirms AI score → `AuditLog.after_value.is_override = False` |
| `test_aiden_complete_flow_sets_status_complete_and_public_readable` | resolve → DB status = `COMPLETE`, `completed_at` set, public endpoint returns `Complete` |
| `test_aiden_s3_resolution_triggers_15_min_cooldown` | S3 resolve → 15-min cooldown on auditor row |
| `test_aiden_s4_resolution_triggers_30_min_cooldown` | S4 resolve → 30-min cooldown on auditor row |
| `test_aiden_s1_resolution_does_not_set_cooldown` | S1 resolve → no cooldown |
| `test_manager_auditor_detail_returns_200_not_500` | `/api/manager/auditors/:id` returns 200 (regression: was 500 due to `Case.submitted_at` bug) |
| `test_manager_auditor_detail_includes_recent_cases` | Response includes `recent_cases`, `exposure_minutes_today`, `cooldown` fields |
| `test_manager_auditor_detail_completed_case_appears_in_recent` | Completed case appears in `recent_cases` on the auditor detail response |

---

## Result

17 tests across both suites — all passed. Aiden's override, completion, and cooldown logic behaves correctly across all severity tiers and edge cases.
