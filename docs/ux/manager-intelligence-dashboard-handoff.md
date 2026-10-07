# Manager Intelligence Dashboard: Build Handoff (Sprint 3 HD)

**Track:** Design / Product · **Owner:** Aleeya Ahmad (UX) · **Status:** built, 8 Oct 2026
**Spec:** Sprint 3 extras §1 (dashboard), §1.4 (evidence), §1.5 (Auditor), §6 (report snapshot) · **Plan:** [`manager-intelligence-dashboard-plan.md`](manager-intelligence-dashboard-plan.md)

| PR | Branch | What |
|---|---|---|
| #61 | `feature/intelligence-data-contract` | `GET /api/manager/intelligence`, types, mock, HTTP client, period presets, labels |
| #62 | `feature/manager-intelligence-dashboard` | The `/manager` dashboard, evidence dialog, Case Oversight filters, support requests made clear |
| #63 | `feat/flow-hd-section` | Sprint 3 HD section on the `/flow` guide |
| #64 | `feature/report-evidence-snapshot` | Evidence frozen with each Client Service Report figure |
| next | `feature/auditor-my-work-dashboard` | Auditor "My Work & Protection" dashboard |
| next | `docs/sprint3-qa-and-handoff` | This handoff, QA checklist sections 12–14, plan and scope updates |

---

## 1. What the Manager sees, top to bottom

Each part answers one question that nothing else on the page answers (no repeated signals).

| Part | Question it answers | Drill-down |
|---|---|---|
| Header: Organisation (read-only, one customer), Period (Today / This week / This month / Last month, kept in the URL), `DEMO / PLACEHOLDER DATA` badge | Which customer and period am I looking at, and is this real? | — |
| One primary button | What should I do first? (Follow up SOS → answer support requests → decide declined / interrupted cases → fix failed deliveries; otherwise **Generate Client Service Report**) | The matching screen |
| KPI strip: Total cases, Completed, Open cases, Needs manager action | How are operations going? | Total and Completed open their evidence. Open jumps to Case flow; Needs action jumps to Needs attention |
| Needs attention: Open SOS, Support requests ("1 break · 1 talk"), Reassignment decisions, Exposure-cap interrupted cases, Failed CommunityHub handoffs | What needs me right now? Zero rows stay visible as "All clear" | Each row links to where it's handled |
| Case flow and timing: open cases by stage, median decision time, oldest unresolved | Where is work building up? | Each stage opens Case Oversight filtered (`?stage=`) |
| Auditor protection & availability: exposure today, state, cooldown, active cases, availability; quiet "Break requested" / "Wants to talk" tags under the name | Who is protected, who can take work, who asked for support? | Row opens the Auditor's record |
| AI–Auditor decision comparison: override rate, most common change, 4×4 matrix | Where do AI and final human severity differ? Labelled as operational disagreement, not model accuracy; links to Validation | Evidence lists the overridden cases |
| Client outcome summary | What outcomes are we producing for CommunityHub? (RCS outcomes, not CommunityHub enforcement) | Evidence |
| CommunityHub delivery health: delivered / pending / retrying / needs attention, success rate, last failure, results waiting for the Manager | Are results reaching CommunityHub? | Each failed result opens its delivery |

**Evidence (§1.4):** every widget has "View evidence". It shows the definition, the stored fields it reads, records included (with the eligible denominator where it differs), when it was calculated, and up to 200 contributing case IDs, each linking to Case Oversight. The core rule is printed in the dialog: dashboard analytics summarise verified records; they don't replace them.

## 2. Decisions taken

| # | Decision |
|---|---|
| D1 | "Completion blocked by invalid data" isn't shown: no completion-validation field exists yet, and a row that is always zero would be misleading. |
| D2 (reversed) | Break **and** talk requests are both shown: one Support requests row with a per-kind breakdown, plus quiet tags under the Auditor's name. The product owner asked for it to be clear when someone requests a break or to talk. No check-in counts, tallies, scores or rankings appear anywhere. |
| D3 | QA checklist 4.1 and 5.7 now follow the spec: reaching the cap mid-review and declining both route the case to the Manager; neither is reassigned automatically. |
| D4 | One primary button: the most urgent action, otherwise Generate. |
| D5 | The Organisation filter is read-only with one customer; `cases` has no `organisation_id` column. |
| D6 | Clients see each report figure's definition and count, never the contributing case IDs. |
| Removed during review | A "Needs you" column (duplicated Needs attention and Availability), an Open-cases breakdown dialog (duplicated Case flow), an "Open client cases" figure (same as Open cases with one customer), and "Cases today" in the protection table (a productivity figure; it stays in the Auditor's record). |

## 3. Auditor: My Work & Protection (`/auditor`)

Five personal figures: my open cases, ready to review (AI finished, not started), completed today ("for your own record"), exposure left today (the header already shows minutes watched), and a status tile that adapts to available, cooldown (with a countdown and the block puzzle) or the daily limit. The queue is grouped: In review → Ready for review → Processing. **Wellbeing check-in** stays a single entry point next to the one primary action, **Open next case**. A test ensures no quota, target, ranking or comparison wording appears.

## 4. Data and endpoints

| Endpoint | Who | Returns |
|---|---|---|
| `GET /api/manager/intelligence?organisation_id=&period_start=&period_end=` | Manager | `ManagerIntelligence` (`frontend/src/services/types.ts`): KPIs, open breakdown, attention, `support_requests`, flow, outcomes, comparison, delivery, evidence |
| `GET /api/manager/auditors` (+ `active_case_count`) | Manager | Cases each Auditor is carrying; cases handed to the Manager aren't counted |
| `POST /api/manager/reports` (+ `metrics.evidence`) | Manager | Each figure frozen with its evidence |
| `GET /api/client/reports*` | CommunityHub client | Same evidence without case IDs |

No new tables or migrations: report evidence lives in the existing `service_reports.metrics` JSON column. `RCS_DEMO_DATA=1` (backend image) labels seeded figures as demo data; set it to `0` for a real deployment.

Code: `backend/app/b2b.py` (`compute_intelligence`, `compute_metrics`, `REPORT_EVIDENCE`), `backend/app/support.py`, `frontend/src/pages/manager/ManagerOversightDashboardPage.tsx`, `components/manager/AttentionList.tsx`, `components/manager/AuditorProtectionTable.tsx`, `components/ui/EvidenceDialog.tsx`, `components/ui/TransitionMatrix.tsx`, `services/mock/intelligence.ts`, `design-tokens/intelligenceLabels.ts`.

## 5. Demo path (about 4 minutes)

1. Sign in as the Manager → `/manager`. Point out the badge, the one primary action, and the KPI strip.
2. Needs attention → **Support requests: 1 break · 1 talk** → the protection table shows who asked.
3. Case flow → select **Manager action required** → Case Oversight opens filtered.
4. AI–Auditor comparison → **View evidence** (definition, source fields, contributing cases).
5. Period → **This month** → **Generate Client Service Report** → the draft opens → **View evidence** on any section → **Approve and release**.
6. Sign in to the client portal → the same report shows definitions and counts, with no case IDs.
7. Sign in as an Auditor → `/auditor`: five figures, grouped queue, status tile.

## 6. Tests

- Backend `tests/test_b2b.py`: 12 tests for intelligence, active cases and report evidence (90 in the CI suites in total).
- Frontend: period presets, labels and availability, mock intelligence parity, HTTP wiring, dashboard behaviour (`ManagerPages.test.tsx`), the evidence dialog, the Auditor dashboard (including axe in cooldown and limit states), and axe on the loaded dashboard and evidence dialog.
- QA checklist sections 12–14 (`docs/Edge-Cases-QA-Checklist.md`) record which edge cases are proven by tests and which still need a manual run.

## 7. Known limits

- Periods use UTC calendar dates; the working day (9:00–17:00) is organisation local time.
- One customer, so the Organisation filter is read-only.
- The CommunityHub receiving endpoint is simulated, so "2xx without the delivery ID" can't be tested yet (checklist 12.8).
- The dashboard refreshes every 30 seconds while the tab is visible; it isn't push-based.
- Manager Copilot (optional, §11) isn't built.
