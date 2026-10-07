# Backend vs visual-only: build scope for the end-to-end flow

**Purpose:** one page so the team knows which parts of the RCS journey need a
real backend (data, rules, audit trail) and which are visual only (demo or
simulated screens that only need to look and click right).
**Status as of:** 7 Oct 2026, `main`. Related: [`b2b-flow-build-handoff.md`](b2b-flow-build-handoff.md).

## The line in one sentence

**From the moment a report is submitted to RCS** (the report form at `/`)
**to the moment a CommunityHub user reads a result or a report** is real
backend. **Everything before that** (a customer discovering and buying RCS,
setting up their organisation, and the CommunityHub website itself) **and
the presenter tools** are visual only.

```
VISUAL ONLY                         | REAL BACKEND                                                     | VISUAL ONLY (their side)
RCS website → buy / set up → CommunityHub feed | report → AI → Auditor → Manager → result delivery → reports → client portal | CommunityHub feed and their own moderation UI
   /rcs   /rcs/get-started   /communityhub     |  /  /status  /auditor/*  /manager/*  /client/*                             |  (the handoff into RCS, and the results back, are real)
```

## Real backend (keep building and testing here)

| Stage | Screens | What the backend owns | Status |
|---|---|---|---|
| Reporter submits | `/`, `/case-confirmation` | Upload, validation, storage, Case ID, the optional post link from CommunityHub | Built |
| Reporter checks status | `/status` | Public status, lookup lockout; "CommunityHub notified" only once delivery succeeds | Built |
| AI pre-screen | (no screen) | Frame extraction, watsonx.ai analysis, speech-to-text, severity score | Built (pipeline team) |
| Assignment | (no screen) | Wellbeing-aware assignment (exposure, cooldown, daily cap and reset) | Built |
| Auditor review | `/auditor`, `/auditor/cases/:id`, `/auditor/cooldown` | Case access, video stream, exposure tracking, decision, decline, SOS, cooldowns, release at daily cap, stop shift | Built |
| Auditor support | Request support (case, cooldown, queue) | Support requests with optional reason, withdraw, Manager approve/follow-up | Built |
| Manager oversight | `/manager`, `/manager/auditors/:id`, `/manager/sos*`, `/manager/reassignment`, `/manager/cases*`, `/manager/audit-logs` | Overview counts, Auditor record, exposure limits, SOS follow-up, reassignment and close, exceptional access (logged), audit history | Built |
| Result delivery | `/manager/deliveries*`, `/manager/customers/communityhub` | One delivery per completed case, retries, escalation, delivery health | Built (the receiving endpoint is simulated, see below) |
| Service reports | `/manager/reports*` | Generate from stored records, note, release, access log | Built |
| Client portal | `/client/login`, `/client/reports*`, `/client/messages*` | Client sign-in (separate session and lockout), released reports only, deny-by-default and logged, Contact RCS messages and replies | Built |
| Per-case results for CommunityHub | `/client/cases`, CommunityHub moderation queue | Case results log, CommunityHub's remove/keep action back to RCS, client roles (Reports / Trust & Safety / Admin), "closed without a decision" delivered | **In progress** (`feature/case-results`) |

Rules the backend must keep enforcing (don't move these to the frontend):
moderation status and delivery status stay separate; the Manager never edits
an Auditor's decision; clients only ever see their own organisation's
released data; every client view and Manager exceptional access is logged.

## Visual only (no backend needed)

| Screen | Why visual only | What it needs |
|---|---|---|
| RCS website `/rcs` | Marketing page: explains the product | Copy and layout only |
| Organisation set-up `/rcs/get-started` | B2B sign-up is sales-led in reality (contract, then accounts are provisioned); the wizard shows the steps | Click-through only; nothing is saved |
| CommunityHub feed `/communityhub` | It's the customer's own product, simulated to show where the report button lives | Static posts. The only real part is the handoff: "Continue to RCS" opens the real report form with the post link |
| CommunityHub moderation queue | CommunityHub's own tool; shown so the demo can follow a result to the action taken | The page is simulated, but it reads and writes through the real case-results endpoints |
| Flow guide `/flow` | Presenter tool linking every stage | Links only |
| Demo scenarios menu (mock mode) | Forces states for demos (connection lost, failed delivery, cooldowns) | Mock data source only; hidden when connected to the backend |
| Optional cooldown puzzle | Wellbeing break activity | Frontend only; stores nothing |

## Simulated inside the real backend (good enough for the capstone)

These run on the real backend but stand in for something outside RCS. Each one
is a clearly named place to plug in the real thing later.

| Piece | What's simulated | Where to replace it |
|---|---|---|
| CommunityHub's results endpoint | Delivery attempts succeed or fail against a simulated endpoint instead of a real signed HTTPS callback | `backend/app/b2b.py`: `advance_delivery` / `_endpoint_available` |
| "Test connection" on the customer page | Returns a simulated latency | `test_integration` in `b2b.py` |
| AI accuracy on Validation | Placeholder figures (`is_placeholder: true`) until a labelled validation set exists | `/api/manager/validation` |
| Governance log | Seeded example calls; real watsonx.governance is out of scope | `GovernanceLogEntry` seed in `b2b_seed.py` |
| Demo data | Accounts, cases, reports and messages reset on every backend restart | `scripts/seed_demo.py` |

## Not connected yet (shows "not connected" or is hidden)

Link and screenshot reports, adding information to an existing case, and
status-update email/SMS. Nice-to-haves, not needed for the main flow.

## Not started (later, by agreement)

Manager Intelligence Dashboard (trends, evidence drill-down) and Manager
Copilot.

## Demo accounts (deployed test and live, password `test123`)

| Who | Account |
|---|---|
| Auditors | `auditor-01` to `auditor-04` |
| Manager | `manager-01` |
| CommunityHub reports | `ch-user-17` |
| CommunityHub Trust & Safety, Admin | `ch-mod-04`, `ch-admin-01` (arrive with `feature/case-results`) |
