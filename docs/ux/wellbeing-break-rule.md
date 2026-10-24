# Wellbeing break: how long it lasts, and what it does

**Decided:** 24 Oct 2026 (UX, from the BA's break flow in `docs/ba/extra-features.md` and the open question in `docs/Edge-Cases-QA-Checklist.md`, 6.2).
**Requirement:** AR-WB-16 (an Auditor can ask for a break without formal escalation), MR-SOS-07 (the Manager approves it, low-key).

## The problem this fixes

The BA's flow said what a break was (the Auditor asks, the Manager approves, the case stays assigned) but not how long it lasts or how it ends. In the build, an approved break read as "On break" for the **rest of the day** (until midnight UTC), the Auditor had no way to come back, and the system did **not** actually stop giving that Auditor new cases, although the screen said it would. The seeded demo made it visible: an Auditor whose break was approved 88 minutes earlier still showed as on a break and kept receiving cases.

## The rule

| Question | Answer |
|---|---|
| How long? | **15 minutes**, counted from the moment the Manager approves. It matches the S3 cooldown, the shortest protective pause the product already has. |
| How does it end? | By itself. There is nothing to press, and nothing for the Manager to close. |
| While it runs, what is blocked? | **New cases only:** weighted assignment, claiming a released case, taking a case from the fallback queue, and Manager reassignment (the screen offers the Auditor as unavailable, and the server refuses with 409). |
| What stays? | A case the Auditor already holds, with its progress. Exposure still counts only while video plays, so a pause adds nothing. |
| What does the Auditor see? | "On break · until 2:35 PM" on the dashboard, and in their request list ("On a break until…", then "Break over"). Before approval: "Waiting for your Manager. Once approved, your break lasts 15 minutes." |
| What does the Manager see? | "Approve 15-minute break" on the Auditor's record, then "On a break until…"; in the overview, "Unavailable (break)" with "Back at 2:35 PM". |
| What if it is never approved? | The request stays open until the Auditor withdraws it (as before). An open request blocks nothing. |

## Not done, on purpose

- The Auditor can't end a break early. If a client wants that, add a "I'm back" action; it needs a new request status, so it is a small migration.
- Opening a case already assigned to them is not blocked during a break. The break stops new cases, as the Auditor was already told ("a case you're reviewing stays with you").
- The length is one number, not a Manager setting.

## Changing the length

Two places, kept in step: `BREAK_MINUTES` in `backend/app/breaks.py` and `BREAK_MINUTES` in `frontend/src/design-tokens/breakRules.ts`. Tests: `backend/tests/test_break_requests.py`, `frontend/src/services/mock/breaks.test.ts`.
