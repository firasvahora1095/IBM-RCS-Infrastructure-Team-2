# Sprint 2 Assignment Logic Hardening

## Purpose

This task re-verifies and hardens the Sprint 2 weighted Auditor assignment logic and round-robin tie-break behaviour.

The implementation under test is:

`backend/app/assignment.py`

## Weighted assignment

The backend selects the Auditor with the lowest weighted assignment score.

For Sprint 2:

- active case count contributes to the weighted score
- exposure minutes are currently passed as zero because exposure/cooldown tracking belongs to the later sprint scope
- the backend remains the authoritative source of the assignment decision

The protected endpoint is:

`POST /api/internal/assignments/select-auditor`

## Tie-breaking

When Auditors have equal weighted scores, assignment is deterministic.

The selector prefers:

1. an Auditor who has never previously been assigned
2. otherwise, the least recently assigned Auditor
3. Auditor ID as the final deterministic tie-break

This provides round-robin behaviour when Auditors have equal scores.

## Edge cases tested

Automated tests now verify:

- different active case counts select the lower-load Auditor
- an equally scored never-assigned Auditor is preferred
- equally scored previously assigned Auditors use least-recent assignment ordering
- a single eligible Auditor is selected correctly
- no eligible Auditors returns a handled HTTP 409 response rather than crashing

## Validation

Assignment selector tests:

- 5 tests passed

No changes to the assignment scoring implementation were required because the existing logic passed all hardening scenarios.

The tests are located in:

`backend/tests/test_api.py`