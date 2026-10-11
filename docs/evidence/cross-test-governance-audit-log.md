# Cross-Test: Governance Audit-Logging API & Schema

**Date:** 2026-10-11  
**Branch tested:** `feature/governance-fallback`  
**Tester:** Hyuna Bae

---

## What Was Tested

Independent verification that the audit-log schema and governance API record correctly across all required client fields.

---

## Test Results

```
tests/test_governance_fallback.py::test_intent_receipt_and_immutable_replay          PASSED
tests/test_governance_fallback.py::test_recording_failure_prevents_dispatch_...      PASSED
tests/test_governance_fallback.py::test_no_applicable_leakage_rule_...               PASSED
tests/test_governance_fallback.py::test_malformed_provider_envelope_is_received_...  PASSED
tests/test_governance_fallback.py::test_pipeline_preserves_run_artifacts_...         PASSED
tests/test_governance_fallback.py::test_ingestion_auth_validation_and_safe_...       PASSED
tests/test_governance_fallback.py::test_same_tier_override_preserves_raw_...         PASSED
tests/test_governance_fallback.py::test_receipt_replay_and_naive_date_rejection      PASSED
tests/test_governance_fallback.py::test_stale_reviewed_run_cannot_resolve_...        PASSED
tests/test_governance_postgres.py::test_legacy_migration_and_full_backup_restore     SKIPPED

9 passed, 1 skipped
```

> Skipped test requires a live PostgreSQL connection — not available in local test environment.

---

## 3 Client-Required Fields Confirmed

Verified via `test_ingestion_auth_validation_and_safe_manager_projection`:

| Field | Verified |
|-------|----------|
| Prompt Leakage status | ✓ `NOT_DETECTED` recorded and returned in manager projection |
| Source Attribution | ✓ persisted reference returned, raw content never exposed |
| AI vs Auditor comparison | ✓ `ai_auditor_comparison` saved on resolution, delta and tier recorded |

---

## What Each Test Covers

| Test | What it verifies |
|------|-----------------|
| `test_intent_receipt_and_immutable_replay` | Intent committed before IBM call; receipt is immutable once recorded |
| `test_recording_failure_prevents_dispatch` | If DB write fails, IBM is never called |
| `test_no_applicable_leakage_rule` | `NOT_CHECKED` recorded when no rule applies |
| `test_malformed_provider_envelope` | Invalid response marked `INVALID`, not silently accepted |
| `test_pipeline_preserves_run_artifacts` | Run ID, accumulated score, COS paths all persisted correctly |
| `test_ingestion_auth_validation` | All 3 client fields confirmed; manager API returns safe projection only |
| `test_same_tier_override` | Raw and effective AI scores preserved separately from human scores |
| `test_receipt_replay` | Duplicate receipts retained; conflicting receipts rejected |
| `test_stale_reviewed_run` | Resolved case cannot be overwritten by a replacement run |

---

## Implementation Reference

- [`backend/app/governance_recorder.py`](../../backend/app/governance_recorder.py)
- [`backend/app/governance_api.py`](../../backend/app/governance_api.py)
- [`backend/tests/test_governance_fallback.py`](../../backend/tests/test_governance_fallback.py)
