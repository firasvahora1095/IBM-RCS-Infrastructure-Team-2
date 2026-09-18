# IBM RCS Infrastructure — Frontend

React + TypeScript single-page app containing the full UI shell for all three
personas — every screen in the Normal User, Auditor and Manager Figma
prototypes: public reporting, staff login, Auditor review and wellbeing
flows, and Manager oversight.

- **UI:** IBM Carbon Design System v11 (`@carbon/react`) owns every component
  and colour. Colours come from Carbon theme tokens (`var(--cds-…)`), never
  hardcoded hex values; where a Figma colour differs from Carbon, Carbon wins.
  Tailwind v4 is used for layout utilities only (no Preflight reset).
- **Routing:** React Router.
- **Data:** every page calls `src/services`, never `fetch` directly (see below).
- **Tests:** Vitest + React Testing Library, jest-axe for accessibility.

## Getting started

```bash
cp .env.example .env   # mock data by default — no backend needed
npm install
npm run dev            # http://localhost:5173
npm run build          # type-check + production build
```

## Checks

Run these from `frontend/` before pushing. All of them pass on `feature/frontend`.

| Command                                   | What it checks                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npx tsc -b`                              | Types                                                                                                   |
| `npm run lint` (`oxlint`)                 | Lint                                                                                                    |
| `npm run format:check` / `npm run format` | Prettier (print width 120)                                                                              |
| `npx vitest run --maxWorkers=2`           | Unit, component, accessibility and keyboard tests (about 3 minutes; `--maxWorkers=2` keeps memory down) |
| `npm run build`                           | Production build                                                                                        |

Where the tests are:

- `src/**/*.test.ts(x)`: component and page tests, next to the code.
- `src/services/mock/mockDataService.test.ts`: the BA business rules in the mock data source.
- `src/design-tokens/canonicalLabels.test.ts`: locks the RT-01, RT-02, severity, AR-DF-03 and Manager labels to the BA documents.
- `src/pages/**/*.a11y.test.tsx` and `src/pages/manager/ManagerPages.test.tsx`: jest-axe on every page and state.
- `src/test/KeyboardNavigation.test.tsx`: keyboard-only walkthroughs of every flow (Tab, arrows, Space, Enter, Escape; no clicks).

## Data sources

`VITE_DATA_SOURCE` picks where the UI's data comes from:

| Value            | What it does                                                                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mock` (default) | Synthetic demo data inside the frontend (`src/services/mock`), following the BA business rules (assignment formula, cooldowns, lookup lockout, etc.). Demo data persists per browser tab. Every header shows a **Demo data** badge so it's never mistaken for live data. |
| `api`            | The real backend at `VITE_API_BASE_URL` (`src/services/api`). Operations with no endpoint yet show a "not connected to the backend yet" notice instead of crashing.                                                                                                      |

In `api` mode, seven operations are wired to the Sprint 2 endpoints:
`createReport`, `getStatus`, `staffLogin`, `getAuditorCases`,
`getAuditorCaseDetail`, `resolveCase` and `getManagerDashboard`.
`getManagerDashboard` is kept in the contract and wired, but no page uses it
any more: the full Oversight Dashboard replaced the Sprint 2 scaffold.

**Connecting the real backend:** see
[`docs/frontend/BACKEND-INTEGRATION.md`](../docs/frontend/BACKEND-INTEGRATION.md)
for every service operation, the data shape the UI expects, and the Figma
screen that uses it.

## Demo (mock mode)

### Accounts

All passwords are `testpassword123`.

| Staff ID    | Who                                  | State in the seed data                    |
| ----------- | ------------------------------------ | ----------------------------------------- |
| `auditor-1` | Jordan Lee (all names are synthetic) | Main Auditor demo, no cooldown            |
| `auditor-2` | Priya Shah                           | In an S3 cooldown                         |
| `auditor-3` | Sam Nguyen                           | In an SOS cooldown, at the exposure limit |
| `auditor-4` | Reese Patel                          | In an SOS cooldown, with a break request  |
| `auditor-5` | Marcus Webb                          | In an SOS cooldown                        |
| `manager-1` | Alex Morgan                          | Manager screens                           |

Because Auditors 2–5 start in cooldowns, new public uploads are assigned to
`auditor-1` in mock mode.

### Case and alert IDs

| ID                              | What it shows                                                |
| ------------------------------- | ------------------------------------------------------------ |
| `AR-2026-00417`                 | Full S3 case from the Figma sample                           |
| `AR-2026-00418`                 | AI analysis still processing (can't be opened)               |
| `AR-2026-00419`                 | S1 case                                                      |
| `AR-2026-00420`                 | S4 case                                                      |
| `AR-2026-00421`                 | AI analysis failed before review (AR-AI-10)                  |
| `AR-2026-00398`                 | Declined ("Near my exposure limit"), waiting for the Manager |
| `SOS-demo0001` … `SOS-demo0004` | SOS alerts in the Manager inbox                              |
| `RCS-7Q3M-K91X`                 | Public status lookup: Being Reviewed                         |
| `RCS-4H8P-2DXC`                 | Public status lookup: Complete, No Violation Found           |

### Demo scenarios menu

In mock mode the gear icon in the staff header opens **Demo scenarios**. It
forces the edge states the Figma prototypes design for:

- Drop the connection for 8 seconds (Auditor Figma 42:352)
- Fail my next submission or save (42:405; Manager 197:309)
- Fail AI analysis mid-review (AR-AI-11; open a case first)
- Make the next reassignment target unavailable (Manager 197:321)
- Expire my session (36:235; Manager 1:1231)
- Put me at my exposure limit (34:121)
- Start a 15-minute S3 or 30-minute S4 cooldown (31:99), and end my cooldown
- Reset all demo data

The menu never renders in `api` mode.

## Routes

| Route                               | Screen                                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                 | Normal User upload (video, link or screenshot)                                                                                   |
| `/case-confirmation`                | Case ID confirmation                                                                                                             |
| `/status`                           | Public status lookup, add more information                                                                                       |
| `/staff/login`                      | Shared staff login (Auditor and Manager)                                                                                         |
| `/auditor`                          | Auditor case queue                                                                                                               |
| `/auditor/cases/:caseId`            | Case review: content warning → AI summary → Review Workspace → severity & comment → confirmation, plus decline, SOS and check-in |
| `/auditor/cooldown`                 | Cooldown                                                                                                                         |
| `/manager`                          | Oversight Dashboard                                                                                                              |
| `/manager/auditors/:auditorId`      | Auditor Detail                                                                                                                   |
| `/manager/cases`                    | Consolidated Case Oversight                                                                                                      |
| `/manager/cases/:caseId/review`     | Case Review Detail                                                                                                               |
| `/manager/cases/:caseId/reassign`   | Reassignment                                                                                                                     |
| `/manager/cases/:caseId/raw?from=…` | Exceptional raw-content access                                                                                                   |
| `/manager/sos`                      | SOS Inbox                                                                                                                        |
| `/manager/sos/:alertId`             | SOS Alert Detail                                                                                                                 |
| `/manager/sos/:alertId/follow-up`   | SOS follow-up                                                                                                                    |
| `/manager/reassignment`             | Declined / Reassignment queue                                                                                                    |
| `/manager/validation`               | Validation View (placeholder data, always labelled)                                                                              |

## Sprint 2 review documents

- [UI review against Figma + honesty checklist](../docs/ux/sprint2-ui-review-figma-log.md) (Tasks 57, 81, 96): every deliberate deviation from Figma, with its reason.
- [Microcopy audit](../docs/ux/sprint2-microcopy-audit.md) (Task 100): copy checked against the BA baseline and Figma, and what still needs sign-off.
- [Accessibility baseline](../docs/ux/sprint2-accessibility-baseline.md) (Task 99): axe results, the keyboard walkthrough and known gaps.
- [Build-scope handoff](../docs/ux/sprint2-build-scope-handoff.md) (Task 54): screen map and every open item with its owner.
