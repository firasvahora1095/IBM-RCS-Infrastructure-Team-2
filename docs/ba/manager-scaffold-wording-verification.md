#  Manager Scaffold Wording Verification

## Objective

Verify that any Manager dashboard sections using scaffold, demo or placeholder content are clearly labelled and cannot be mistaken for live data.

## Verification

The Manager scaffold wording was checked in both mock and API data modes, with automated test coverage supporting the review.

| Screen | Route | Mock-mode labelling | API-mode behaviour |
|---|---|---|---|
| Oversight Dashboard | `/manager` | Persistent **Demo data** badge with tooltip stating the data is synthetic and not connected to the live backend | Shows that the feature is not connected to the backend |
| Auditor Detail | `/manager/auditors/:id` | Demo badge | Not-connected message |
| Case Oversight | `/manager/cases` | Demo badge | Not-connected message |
| Case Review Detail | `/manager/cases/:id/review` | AI narrative prefixed with **Mock:** | Not-connected message |
| Reassignment decision | `/manager/cases/:id/reassign` | Demo badge | Not-connected message |
| Exceptional raw access | `/manager/cases/:id/raw` | Synthetic test pattern is used instead of real footage | Not-connected message |
| SOS Inbox | `/manager/sos` | Demo badge | Not-connected message |
| SOS Alert Detail | `/manager/sos/:id` | AI narrative prefixed with **Mock:** | Not-connected message |
| SOS Follow-up | `/manager/sos/:id/follow-up` | Demo badge | Not-connected message |
| Declined / Reassignment Queue | `/manager/reassignment` | Demo badge and mock-prefixed reason text where applicable | Not-connected message |
| Validation View | `/manager/validation` | Explicit placeholder wording and illustrative labels | Not-connected message |

## Validation View wording

The Manager Validation View is explicitly labelled with:

> **Placeholder / mock data — not real validation results.**

It also uses:

> **Match rate (illustrative)**

and:

> **All values illustrative placeholder data.**

No pass/fail threshold is shown as though it were an adopted or real model-performance result.

## Result

The Manager scaffold wording passes the honesty check.

In mock mode, Manager screens clearly identify synthetic or mock content through the persistent **Demo data** badge, **Mock:** prefixes, or explicit placeholder wording.

In API mode, the demo indicators are hidden and Manager routes display a clear **not connected to the backend** message rather than showing empty or synthetic values that could be mistaken for real data.

The Validation View is explicitly marked as placeholder content and does not present illustrative values as real validation evidence.
