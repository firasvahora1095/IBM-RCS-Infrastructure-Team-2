# Manager Intelligence Dashboard & Sprint 3 Extras: Design and Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax. **Switch the session to Opus before Phase B (code).** Phase A (this document) is design only.

**Goal:** Build the Sprint 3 HD / wow feature, the **Manager Intelligence Dashboard** (with evidence drill-down and a frozen-evidence Client Service Report), plus the secondary **Auditor "My Work & Protection"** dashboard, into the deployed RCS app in genuine IBM Carbon, matching the existing screens.

**Architecture:** One new read endpoint `GET /api/manager/intelligence` computes every widget and its evidence from stored records, reusing `compute_metrics` internals in `backend/app/b2b.py`. The frontend gets a matching `getManagerIntelligence` data-service operation (mock and HTTP), and the existing `/manager` page is rebuilt around six widgets using the existing UI kit (`Section`, `StatTile`, `BarList`, `SegmentedBar`, `StatusTag`). Report generation stores the same evidence with the frozen figures.

**Tech Stack:** React 19, Vite, TypeScript, `@carbon/react` 1.116, `@carbon/icons-react`, Tailwind utilities (layout only), SCSS kit (`styles/_b2b-kit.scss`), Vitest + axe; FastAPI, SQLAlchemy, unittest/pytest (SQLite in CI).

**Spec:** `C:\Users\aleey\Downloads\Capstone-IBM\RCS_Sprint3_Extra_Features_CLEAN_notfinal.md` (§1 dashboard, §1.5 Auditor, §6 report, §9 check-in vs SOS). Also read: `RCS_B2B_High_Level_End_to_End_Flow_notfinal.md`, `RCS Sprint 3 Edge Cases QA Checklist_notfinal.md`, `docs/ux/b2b-flow-build-handoff.md`, `docs/ux/backend-vs-visual-scope.md`, `docs/ba/ba-requirements-sprint2-final.md` (MR-OV-01…08, MR-SOS-07, AR-WB-*).

**Status of this document:** written 7 Oct 2026 by reading the spec, the three companion docs, the repo at `main` (`c2e4b7b`), and the code. The deployed apps return HTTP 200 for both `rcs-frontend` and `rcs-frontend-test` (checked with curl), but the browser tool timed out, so **no live visual comparison was made**. Phase B Task 0 does that on a local build.

## Global Constraints

Copied from the spec and the project rules; every task inherits them.

- **Real Carbon.** Carbon React components and tokens only (`--cds-*`). No hex colours in new SCSS. Carbon type styles and spacing scale. No new visual language.
- **One primary button per screen**, then secondary/tertiary/ghost. Follow Carbon button defaults; do not override Carbon spacing globally.
- **Status tags** use `StatusTag` + `design-tokens/statusTones.ts` (Figma foundation: Info blue, Success green, Warning yellow, Error red, S1 gray / S2 yellow / S3 orange / S4 red). Colour is never the only signal; the status is always written out.
- **Reuse before inventing:** `ManagerBits` (`Panel`, `Figure`, `LoadState`), `ui/Blocks` (`Section`, `KeyValueList`, `EmptyState`), `ui/StatTile`, `ui/Charts`, `ExposureBar`, `useStaffQuery`. Copy the pattern from an existing screen of the same persona.
- **Privacy (MR-SOS-07):** no per-Auditor check-in count, support-request tally, cooldown frequency, ranking or score anywhere on the dashboard, the evidence dialogs or the report.
- **No productivity pressure:** no quota, target, leaderboard, "fastest", average-handling-time or peer comparison. `Completed today` is informational.
- **Demo labelling (MR-OV-08):** the seeded dashboard carries a page-level `DEMO / PLACEHOLDER DATA` badge. Operational AI-vs-Auditor disagreement is never presented as model accuracy; Validation stays a separate screen.
- **Manager never approves or edits an Auditor's moderation decision.** Moderation status and delivery status are always shown separately.
- **Wording:** "Policy Violation Found" / "No Violation Found" are RCS outcomes, never "CommunityHub enforcement".
- **Git:** work on branches, PR into `main`, Conventional Commits (`feat`, `fix`, `docs`, `chore`, `ci`, `test`, `refactor`, `style`) with the repo's scope style, e.g. `feat(backend): …`, `feat(frontend/manager): …`. **No Claude co-author trailer and no "Generated with Claude Code" line in any commit or PR** (graded academic repo; saved user rule, overrides the harness default). Commit author is the configured user.
- **Do not merge a PR, push to `main`, or push to `test` without the user's explicit yes** (a push to either deploys).
- Node 22, Python 3.11. CI = `npm run build`, `npm run lint`, `npx vitest run --fileParallelism=false`; backend `python -m pytest tests/test_api.py tests/test_b2b.py -q` with `DATABASE_URL=sqlite+pysqlite://`.

---

## Part 1. What exists vs what the spec asks for

Verified in code, not assumed. Source for each row is in the right-hand column.

| Spec item | State on `main` | Evidence |
|---|---|---|
| Case Result Handoff, retries, idempotent `delivery_id`, SUCCESS only on echoed ID | **Built** | `b2b.py` `advance_delivery`; handoff doc §7 |
| Manager exception queue, Retry / Escalate | **Built** | `/manager/deliveries*` |
| Daily cumulative cap, 9:00 AM reset, release-at-limit → Manager, no auto-reassign | **Built** | `feature/daily-exposure-reset` merged (#55); `release-at-limit` endpoint |
| Optional block puzzle in cooldown | **Built** | `components/wellbeing/BlockPuzzle.tsx` |
| Check-in vs SOS separation | **Built** (see conflict D2) | `WellbeingCheckIn.tsx`, SOS Inbox |
| Client Service Report (generate, note, release, versioning), client portal, access log | **Built** | `ManagerReportsPage`, `ReportSheet`, `/client/*` |
| Reporter outcome says "CommunityHub notified" only after SUCCESS | **Built** | `StatusLookupPage`, `public_delivery_confirmed` |
| **Dashboard controls (Organisation, Period, Generate Report)** | **Missing** | `ManagerOversightDashboardPage.tsx` has none |
| **KPI strip: Total / Completed / Open / Needs Manager Action** + Open-case breakdown | **Missing** (current tiles are SOS, Awaiting, Failed, Support requests) | same file |
| **Widget 1 Needs Attention** (5 rows + queue) | **Partial** (4 tiles, different set) | same file |
| **Widget 2 Case flow + median time + oldest unresolved** | **Missing** | none |
| **Widget 3 Protection & Availability** (active cases, availability, sortable) | **Partial** (table has "Cases today", no availability/active cases) | same file; `list_auditors` in `main.py:1292` |
| **Widget 4 AI–Auditor comparison matrix** | **Missing** (only a single override % inside reports) | `compute_metrics` has `override_rate` only |
| **Widget 5 Client Outcome Summary** | **Missing** on dashboard (exists inside the report sheet) | `ReportSheet.tsx` |
| **Widget 6 CommunityHub Delivery Health** (+ failed list, success rate) | **Partial** (one sentence under "CommunityHub") | same file |
| **Evidence / "How is this calculated?"** per metric | **Missing** | spec §1.4 |
| **Report snapshots store metric definition + evidence + contributing IDs** | **Missing** (report stores figures only) | `generate_report` stores `compute_metrics` output |
| **`DEMO / PLACEHOLDER DATA` badge** | **Partial** (only "Demo data" in mock mode) | `DemoDataBadge.tsx` |
| **Auditor KPI strip (5) + grouped My Queue + protection panel** | **Partial** (4 panels, flat table, "Open next case") | `AuditorDashboardPage.tsx` |
| `completion_validation = BLOCKED_INVALID` (spec §4.3) | **Not implemented**, no field exists | `Case` model; resolve returns 400 instead |
| `organisation_id` on cases | **Not on `cases`** (deliveries and history have it; one customer exists) | `models.py` |
| Manager Copilot | **Deferred by spec** (§11, optional) | out of scope |

## Part 2. Conflicts and gaps found (each needs a decision, see Part 9)

1. **D1: `BLOCKED_INVALID` has no data.** Spec Needs Attention row 5 ("Completion blocked by invalid data") needs a `completion_validation` state. Today an invalid resolve is simply rejected with 400 and nothing is stored. A fake always-zero row would be dishonest. **Recommendation:** omit the row, list it as "deferred until a completion-validation field exists", and say so in the handoff doc.
2. **D2: dashboard shows routine "Wants to talk" requests, spec says log-only.** Spec §1.2 W1/W3 and §9.1 (MR-SOS-07): a routine check-in is *logged only, no Manager action*; only a **break request** gets a low-key marker + Approve. The merged PR #58 shows "Support requests waiting" (breaks **and** talk requests) as a tile and "Wants to talk" tags. **Recommendation:** dashboard counts and tags break requests only; talk requests stay in the Auditor's View Details log.
3. **D3: QA checklist contradicts the spec in two places.** Checklist 4.1 says "Auditor reaches exposure limit mid-review: *case completes normally*"; spec §2 says stop raw playback, preserve progress, route to Manager (`EXPOSURE_CAP_REACHED`). Checklist 5.7 says a declined case is "*returned to queue*"; spec §4.6 (AR-DF-02/CV-07) says routed to the Manager, never auto-reassigned. The code follows the spec. **Recommendation:** fix both checklist rows (done in the docs PR) and keep the spec.
4. **D4: primary-button clash.** Spec puts `[Generate Client Service Report]` in the controls row; the current page already has a context-aware primary ("Follow up SOS…"). Two primaries breaks the one-primary rule. **Recommendation:** the most urgent action is primary while anything needs the Manager; **Generate** is primary only when nothing needs action, otherwise `tertiary`.
5. **D5: organisation filter has one option.** Only CommunityHub exists and cases carry no `organisation_id`. **Recommendation:** render the Carbon `Dropdown` as `readOnly` with the single customer so the control and the data contract exist, and do not migrate `cases`.
6. **D6: client sees evidence?** Spec §6.5 shows "Contributing records: 184 case IDs" inside the *report*. **Recommendation:** Manager preview shows definition, source fields and the case-ID list; the client portal shows definition, source fields, frozen value and record count, not the ID list.
7. **Sprint 3 plan says "daily/weekly reset"; the extras doc defines daily only** (already open point 4 in the handoff). Build daily only.
8. **Period and timezone:** reports and the new endpoint use UTC date bounds; the working day is 9:00–17:00 organisation local time. State this in the evidence ("Period uses UTC dates") rather than silently differing.

---

## Part 3. Page-by-page design

### 3.0 The full flow and what each stop shows

| # | Screen | Route | Change in this plan |
|---|---|---|---|
| 01 | RCS product page | `/rcs` | Verify only |
| 02 | Organisation set-up wizard | `/rcs/get-started` | Verify only |
| 03 | CommunityHub post → Report | `/communityhub` | Verify only |
| 04 | Report form + Case ID | `/`, `/case-confirmation` | Verify; edge cases 1.x–2.x |
| 05 | Reporter status | `/status` | Verify delivery-aware wording |
| 06 | **Auditor dashboard** | `/auditor` | **Rebuilt: My Work & Protection** (§3.2) |
| 06b | Auditor review / cooldown | `/auditor/cases/:id`, `/auditor/cooldown` | Verify |
| 07 | Deliveries, customer | `/manager/deliveries*`, `/manager/customers/communityhub` | Add deep links from dashboard widgets |
| 08 | **Manager Intelligence Dashboard** | `/manager` | **Rebuilt, HD feature** (§3.1) |
| 08b | Case Oversight | `/manager/cases` | Add `?status=` / `?flag=` filter from the case-flow bar and Open Cases |
| 09 | **Reports: generate, review, release** | `/manager/reports*` | **Generate pre-fills from dashboard org + period; frozen evidence** (§3.3) |
| 10 | Client sign-in, list, view, download | `/client/*` | Evidence line under each figure (§3.4) |
| 11 | Contact RCS | `/client/messages*`, `/manager/messages*` | Verify only |
| — | Flow guide | `/flow` | Add a Manager-dashboard step |

### 3.1 Manager Intelligence Dashboard (`/manager`)

**Goal:** a five-second service picture, then "what needs me", then "where is work building up", then people, quality, client, delivery. Reading order follows the spec's questions: *How are operations going → What needs me → Where is work → Who is protected → Where do AI and humans differ → What are we producing → Is it reaching the client.*

```text
┌ ManagerTopNav (unchanged) ──────────────────────────────────────────────┐
│ Manager Intelligence Dashboard            [DEMO / PLACEHOLDER DATA] tag │  h1 28/36 semibold
│ Operations, wellbeing and client delivery at a glance.  (helper)        │
│ ┌ Organisation ▾ ┐ ┌ Period ▾ ┐                [Generate Client Service │
│ │ CommunityHub   │ │This week │                 Report]  (see D4)       │
│ └────────────────┘ └──────────┘  Calculated 10:41 AM · Period 5–11 Oct  │
├─────────────────────────────────────────────────────────────────────────┤
│ OPERATIONS AT A GLANCE (aria-label), 4 x StatTile, lg=4 columns each    │
│ Total cases | Completed | Open cases (link/dialog) | Needs manager      │
│ 186  Selected period | 142 Selected period | 44 Current backlog | 4     │
│ each tile has a ghost "View evidence" below the figure                  │
├─────────────────────────────────────────────────────────────────────────┤
│ Section "Needs attention"   [Open attention queue ghost]                │
│ ▌SOS alerts open                 1   [Error tag "Act now"]   >          │
│ ▌Reassignment decisions          3   [Warning tag]           >          │
│ ▌Exposure-cap interrupted        1   [Warning tag]           >          │
│ ▌Failed CommunityHub handoffs    2   [Error tag]             >          │
│ ▌Break requests to approve       1   [Warning tag]           >          │
│ (rows with 0 are muted "All clear", never hidden: the Manager learns    │
│  the system is watching them. 3px error accent only when count > 0)    │
├─────────────────────────────────────────────────────────────────────────┤
│ Section "Case flow and timing"                                          │
│ SegmentedBar (5 segments) + legend that are links to Case Oversight     │
│ Median decision time 42 min | Oldest unresolved 3 h 12 min (RCS-0184)   │
├───────────────────────────────────────┬─────────────────────────────────┤
│ Section "Auditor protection &         │ Section "Client outcome summary │
│ availability" (lg=10)                 │ — CommunityHub" (lg=6)          │
│ Carbon DataTable, sortable            │ SegmentedBar 2 outcomes + %     │
│ Auditor|Exposure bar|State|Cooldown|  │ BarList S1–S4 final severity    │
│ Active cases|Availability|>           │ "Open client cases: 44"         │
├───────────────────────────────────────┼─────────────────────────────────┤
│ Section "AI–Auditor decision          │ Section "CommunityHub delivery  │
│ comparison" (lg=10)                   │ health" (lg=6)                  │
│ Override rate 13.4% (23 of 172)       │ 4 mini figures + success rate   │
│ 4x4 transition matrix (table)         │ failed list (case, attempts,    │
│ note: operational, not accuracy       │ reason, [View]) or "None failed"│
└───────────────────────────────────────┴─────────────────────────────────┘
```

**Controls**
- Carbon `Dropdown` ×2 (not native `Select`), `size="md"`, labelled visibly (`titleText`). Period options: Today, This week (Mon–Sun, default), This month, Last month. Selected period is kept in the URL (`?period=this-week`) so it survives refresh/back and is shareable.
- Organisation: `Dropdown readOnly` with CommunityHub (D5).
- Helper line "Calculated {time} · {formatPeriod}". Data refreshes every 30 s while the tab is visible (QA 7.1–7.3: new SOS or cooldown must appear without a manual reload).
- `DEMO / PLACEHOLDER DATA`: Carbon `Tag type="purple"` (same kind as `DemoDataBadge`), `title` explains it. Driven by `provenance: "DEMO"` from the API (the whole deployment is seeded) and by `isMockData`.

**Widgets (what, where the number comes from, what a click does)**

| Widget | Numbers | Source fields (shown in evidence) | Click / drill-down |
|---|---|---|---|
| Total cases | cases with `created_at` in period | `cases.created_at`, `case_history.created_at` | tile → evidence dialog |
| Completed | `status=COMPLETE` and `completed_at` in period | `cases.status`, `cases.completed_at` | evidence |
| Open cases | current non-COMPLETE; **not** Total − Completed (spec §1.2) | `cases.status`, `cases.manager_flag` | dialog with the 5-row breakdown (Submitted, AI Processing, Ready for Review, Auditor Review, Manager action required), each row a link to `/manager/cases?status=…`; sum equals the tile (mutually exclusive buckets, Manager-action takes precedence) |
| Needs manager action | SOS + reassignment + cap-interrupted + failed handoffs + break requests (the same rows as the widget below; sum shown) | audit/SOS/delivery fields | scroll to Needs attention |
| Needs attention | five rows | `cases.manager_flag`, `deliveries.delivery_status`, SOS state, `wellbeing_requests` | each row routes: SOS → `/manager/sos`; Reassignment & Cap → `/manager/reassignment`; Failed → `/manager/deliveries?status=needs-attention`; Break → first Auditor with a request |
| Case flow | counts per state, median decision minutes, oldest unresolved age + case ID | `cases.status`, `created_at`, `completed_at` | legend link → `/manager/cases?status=` |
| Protection & availability | per Auditor exposure / limit, state, cooldown left, active cases, availability | `auditors.exposure_minutes`, `exposure_limit_minutes`, `cooldown_ends_at`, `active_case_count` | row → Auditor detail (unchanged) |
| AI–Auditor comparison | override rate, eligible, 4×4 matrix, top transition | AI tier vs final tier on decided completed cases | evidence dialog lists cases per transition |
| Client outcomes | violation / no-violation %, S1–S4, open client cases | `final_outcome`, final tier | evidence |
| Delivery health | success / pending / retrying / needs attention, success rate, last failure time, failed list | `deliveries.*` | `[View]` → `/manager/deliveries/:id`; "View all" → Deliveries |

Exact definitions come from the spec §1.2 calculation block and are stored once, server side, as the evidence `definition`.

**Protection & availability specifics (privacy-safe, no productivity)**
- Default order: open SOS first, then highest exposure ratio, never by cases completed. Carbon `DataTable` with sortable headers for Auditor, Exposure, State, Active cases, Availability. `Cases today` is removed from this table (it is a productivity figure; it remains in Auditor Detail).
- `Availability` = `Available` / `In cooldown` / `SOS protection` / `No new cases today` (at limit wins over cooldown). Text tag via `StatusTag`; the spec table is the reference (A available, B no new cases, C cooldown).
- No check-in count, no support tally, no cooldown frequency. The "Needs you" column keeps only `SOS` and `Break requested` tags (D2).

**AI–Auditor comparison specifics**
- Heading note (always visible): "Operational disagreement between AI and final human severity. It is not model accuracy; see Validation." with a link to `/manager/validation`.
- Matrix is a real `<table>` with `<caption>`, row headers `AI S1…S4`, column headers `Final S1…S4`, the **number in every cell** (colour is never the signal). Diagonal (agreement) cells use neutral `--cds-layer-accent-01`; off-diagonal cells tint `--cds-support-info` by share, capped so dark text keeps ≥ 4.5:1 (measure it, do not eyeball). Off-diagonal is deliberately **blue, not red**: disagreement is evidence, not an error, and RCS must not label AI or Auditor "wrong" (spec §1.2 W4).
- "Most common change: S2 → S3 (8)". Empty state when fewer than the minimum eligible cases.

**States (every widget)**
- Loading: Carbon `SkeletonText` / `DataTableSkeleton` per widget (the page renders its frame immediately).
- Error: per-widget `InlineNotification kind="error"` via `LoadState`, with a retry; one failed widget never blanks the page.
- Empty: designed `EmptyState` text ("No cases were received in this period").
- Median not reportable (< 3 cases): "Not enough completed cases to state a median" (reuses `MIN_CASES_FOR_MEDIAN`).

**Responsive (Carbon grid):** `sm` 4 columns single stack; `md` KPI 2×2, widget pairs stack; `lg` as the sketch (KPI 4×4, widgets 10/6). Use the existing `.rcs-grid` + `Column` pattern from the current dashboard.

**Accessibility:** each widget is `<section aria-labelledby>`; heading order h1 → h2 per widget; Needs-attention rows are real links with an `aria-label` of "{label}: {n}. Go to …"; matrix and tables have captions and `scope`; dialog focus is trapped and returns to the opener; `prefers-reduced-motion` already disables bar transitions; run axe (`B2bPages.a11y.test.tsx` pattern).

**Evidence dialog** (spec §1.4): Carbon `ComposedModal` `size="md"` titled with the metric ("Completed cases: 142"). Body = `KeyValueList`: Organisation, Period, **Definition**, **Source fields** (mono), **Records included** ("23 of 172 eligible"), **Last calculated**. Below, a Carbon `Table size="sm"` of contributing case IDs (first 200, "and 61 more" when truncated) with each ID linking to `/manager/cases?search=…`. Footer: one `Close` button (primary) only. Trigger: ghost `Button size="sm"` "View evidence" on tiles and widgets. Core rule printed once in the dialog footer text: "Dashboard analytics summarise verified RCS records; they do not replace the underlying evidence."

### 3.2 Auditor dashboard: My Work & Protection (`/auditor`)

Personal, not performance. One primary: **Open next case**. No quota/target/peer wording anywhere (a test asserts this).

```text
Case queue                                         [Open next case] (primary)
KPI strip (5 tiles, Carbon grid lg=3,3,3,3,4):
 My open cases | Ready to review | Completed today | Today's exposure     | Status
      3        |       2         |      4 (info)   | 45 / 120 min bar     | Available
Section "My queue" (grouped, one Carbon table per group with a heading+count)
  Ready to review (2)   RCS-0184  S3  AI analysis ready      [Open]
  Processing (1)        RCS-0205      AI analysis in progress [View status → disabled link text]
  In review (1)         RCS-0177      Review in progress     [Resume]
Section "My protection status"   (the adaptive card, wording from spec §1.5)
  Today's exposure 45/120 · Remaining allowance 75 min · Current state Available · Cooldown None
  [Wellbeing check-in] (tertiary, the single check-in entry, per PR #60)
  cooldown: "12:34 remaining. No new harmful-content case will be assigned…" + [Play block puzzle]
  cap reached: "Daily exposure limit reached 120/120. No further normal cases today."
Completed today (existing list, informational)
```
- **Status** tile adapts: Available / Cooldown (live mm:ss) / Daily limit reached; it replaces the separate adaptive card in the row so the strip stays five tiles.
- Tile definitions (spec §1.5): open = assigned non-COMPLETE; ready = `READY_FOR_REVIEW` assigned; completed today = completed since the 9:00 AM working-day start (reuse backend `completed_today`; frontend uses the queue's COMPLETE rows already scoped to today); exposure from `getMyWellbeing`.
- The Auditor still sees only their own cases (no change to API scoping).
- No new endpoint; everything derives from `getAuditorCases` + `getMyWellbeing`.

### 3.3 Reports (`/manager/reports`, `/manager/reports/:id`)

- **Generate Client Service Report** on the dashboard calls `generateReport(org, period)` then navigates to the new draft. Same button on the Reports page uses the dashboard's last selected period via the URL param.
- **Snapshot rule (spec §6.2):** `ServiceReport.metrics` (a JSON column, so **no migration**) gains an `evidence` object with, per metric: `definition`, `source_fields`, `records_included`, `case_ids` (capped), `calculated_at`. Released reports never change; a corrected figure creates a new version (already enforced).
- Manager preview shows a "View evidence" ghost button under each report section (frozen values, labelled "Frozen in v1"); the release dialog is unchanged. The "Not in a client report" list is unchanged and the note field keeps its no-names/no-wellbeing guidance.

### 3.4 Client portal (`/client/reports/:id`)
- Each figure gets one quiet helper line: "Calculated from {n} completed cases · definition…". Definitions already exist in `METRIC_DEFINITIONS`; add `records_included` from the frozen evidence. Case-ID lists are **not** sent to the client (D6): `_report_payload(..., for_client=True)` strips `case_ids`.

### 3.5 Wiring checks that are not new screens
Cap-interrupted and declined cases both appear in the Reassignment Queue (`declined-cases` returns `DECLINED` and `CAP_REACHED`); SOS Inbox, Deliveries and Auditor Detail keep their routes. Verify each dashboard link lands on a page that shows the item that was counted.

---

## Part 4. Data contract

`frontend/src/services/types.ts` (new, next to `ReportMetrics`):

```ts
export type PeriodKey = "today" | "this-week" | "this-month" | "last-month";
export type Provenance = "DEMO" | "LIVE";
export type OpenBucket = "SUBMITTED" | "AI_PROCESSING" | "READY_FOR_REVIEW" | "AUDITOR_REVIEW" | "MANAGER_ACTION";
export type AttentionKind = "SOS" | "REASSIGNMENT" | "CAP_INTERRUPTED" | "FAILED_HANDOFF" | "BREAK_REQUEST";

export interface MetricEvidence {
  title: string;
  definition: string;
  source_fields: string[];
  records_included: number;
  /** Denominator where it differs, e.g. 23 included of 172 eligible. */
  records_eligible: number | null;
  calculated_at: string; // ISO 8601
  case_ids: string[]; // capped at 200
  case_ids_truncated: boolean;
}

export interface AttentionItem {
  kind: AttentionKind;
  count: number;
}

export interface FailedDeliveryRow {
  delivery_id: string;
  case_id: string;
  attempts: number;
  reason: string | null;
  last_attempt_at: string | null;
}

export interface ManagerIntelligence {
  organisation_id: string;
  organisation_name: string;
  period_start: string; // yyyy-mm-dd inclusive
  period_end: string;
  calculated_at: string;
  provenance: Provenance;
  kpis: { total_cases: number; completed: number; open_cases: number; needs_manager_action: number };
  open_breakdown: Record<OpenBucket, number>;
  attention: AttentionItem[]; // always the five kinds, count may be 0
  flow: {
    median_decision_minutes: number | null;
    oldest_unresolved_minutes: number | null;
    oldest_unresolved_case_id: string | null;
  };
  outcomes: { violation: number; no_violation: number; severity: Record<SeverityTier, number>; open_client_cases: number };
  comparison: {
    eligible: number;
    overrides: number;
    override_rate: number; // 0-1
    matrix: Record<SeverityTier, Record<SeverityTier, number>>; // [ai][final]
    top_transition: { from: SeverityTier; to: SeverityTier; count: number } | null;
  };
  delivery: {
    health: DeliveryHealth;
    success_rate: number | null; // 0-1; null when nothing delivered or failed yet
    last_failed_at: string | null;
    failed: FailedDeliveryRow[]; // NEEDS_ATTENTION only, newest first, max 5
  };
  evidence: Record<
    | "total_cases" | "completed" | "open_cases" | "needs_manager_action" | "case_flow"
    | "outcomes" | "severity" | "override_rate" | "delivery_success_rate" | "protection",
    MetricEvidence
  >;
}
```

`DataService` addition (`types.ts`) and delegate (`services/index.ts`):

```ts
getManagerIntelligence(token: string, query: { organisationId: string; periodStart: string; periodEnd: string }): Promise<ManagerIntelligence>;
```

`AuditorOverviewRow` gains `active_case_count: number` (backend `list_auditors` adds `"active_case_count": int(a.active_case_count or 0)`; mock mirrors it).

Endpoint: `GET /api/manager/intelligence?organisation_id=&period_start=&period_end=` (Manager role; 400 on invalid period, 404 unknown org, same validation as `generate_report`).

Rules the computation must follow (all from the spec, pinned by tests):
- `total_cases` = records with `created` in period; `completed` = `completed` in period; `open_cases` = **current** live cases with status ≠ COMPLETE (history is all complete) → not `total − completed`.
- Open buckets are mutually exclusive: `manager_flag ∈ {DECLINED, CAP_REACHED}` → `MANAGER_ACTION`, else the case `status`. Bucket sum == `open_cases`.
- `needs_manager_action` = sum of the five attention counts. Break requests = `WellbeingRequest.kind == "BREAK_REQUEST" and status == "OPEN"`; **talk requests are excluded** (D2).
- Comparison uses decided completed cases with both AI and final tier (same filter as `compute_metrics.comparable`); `override_rate = overrides / eligible`.
- Median uses `MIN_CASES_FOR_MEDIAN`; oldest unresolved = min `created_at` over open live cases.
- `success_rate = success / (success + needs_attention)`; pending/retrying are not failures.
- `provenance = "DEMO"` while `RCS_DEMO_DATA` is unset or `"1"` (default; every deployment is seeded). Add the variable to `backend/Dockerfile` with a comment; flipping it to `0` is how a real deployment drops the badge.
- No Auditor name, check-in count or support tally appears in the payload except the existing `AuditorOverviewRow` fields.

---

## Part 5. Branches, PRs and commits

All branches from latest `main`. Each PR must pass `PR checks` before it is offered for merge. **Ask the user before merging or pushing to `test`/`main`.** Deploy verification: after a PR is green, ask whether to merge the branch into `test` (deploys `rcs-frontend-test` / `rcs-backend-test`), then verify there.

| # | Branch | PR title | Commits (planned, Conventional) |
|---|---|---|---|
| 0 | `docs/manager-intelligence-plan` (this branch) | `docs(ux): Manager Intelligence Dashboard design and build plan` | `docs(ux): add the Manager Intelligence Dashboard plan` |
| 1 | `feature/intelligence-data-contract` | `feat: Manager intelligence endpoint, types and mock` | `refactor(backend): share the open-SOS lookup`; `feat(backend): intelligence metrics and evidence`; `feat(backend): active case count on the Auditor overview`; `feat(frontend/services): intelligence types, mock and HTTP client`; `test: period, availability and intelligence rules` |
| 2 | `feature/manager-intelligence-dashboard` | `feat(frontend/manager): Manager Intelligence Dashboard` | `feat(frontend/ui): evidence dialog, transition matrix and linked legends`; `feat(frontend/manager): controls, KPI strip and Needs Attention`; `feat(frontend/manager): case flow, protection, comparison, outcomes and delivery widgets`; `feat(frontend/manager): filter Case Oversight from the dashboard`; `test(frontend): dashboard behaviour and accessibility` |
| 3 | `feature/report-evidence-snapshot` | `feat: frozen evidence in Client Service Reports` | `feat(backend): store evidence with report snapshots`; `feat(frontend/reports): generate from the dashboard and show frozen evidence`; `test: report evidence stays frozen after release` |
| 4 | `feature/auditor-my-work-dashboard` | `feat(frontend/auditor): My Work and Protection dashboard` | `feat(frontend/auditor): five-tile strip and grouped queue`; `feat(frontend/auditor): protection status panel`; `test(frontend/auditor): no-pressure wording and accessibility` |
| 5 | `docs/sprint3-qa-and-handoff` | `docs: Sprint 3 handoff and QA checklist updates` | `docs(ux): Manager Intelligence Dashboard handoff`; `docs(qa): reconcile checklist with the Sprint 3 rules and add handoff cases`; `docs(ux): update backend-vs-visual scope and flow guide` |

PR 1 merges before PR 2/3/4 branch (they need the types). PRs 2, 3, 4 are independent after that. PR bodies: Summary, Spec/reference links, Screens changed (before/after screenshots), Test plan (commands + results), Decisions taken (D1–D6), Not included. **No attribution footer.**

---

## Part 6. File map

**Backend**
- Modify `backend/app/b2b.py`: extend `_records` with `case_id`, `status`, `flag`; add `compute_intelligence`, `GET /api/manager/intelligence`; make `generate_report` store `evidence`; make `_report_payload` strip `case_ids` for clients.
- Modify `backend/app/support.py`: add `unresolved_sos_auditors(db)`, `open_break_request_count(db)`.
- Modify `backend/app/main.py`: `get_sos_summary` uses `unresolved_sos_auditors`; `list_auditors` adds `active_case_count`.
- Modify `backend/Dockerfile`: `RCS_DEMO_DATA` default.
- Test: `backend/tests/test_b2b.py` (new `IntelligenceTests`), existing fixtures.

**Frontend**
- Modify `frontend/src/services/types.ts`, `services/index.ts`, `services/api/httpClient.ts`, `services/mock/index.ts`, `services/mock/b2b.ts`.
- Create `frontend/src/services/mock/intelligence.ts` (pure compute, mirrors the backend), `frontend/src/utils/periods.ts`, `frontend/src/design-tokens/intelligenceLabels.ts`.
- Create `frontend/src/components/ui/EvidenceDialog.tsx`, `components/ui/TransitionMatrix.tsx`, `components/manager/AttentionList.tsx`, `components/manager/AuditorProtectionTable.tsx`.
- Modify `components/ui/Charts.tsx` (optional `to` per `Segment` so legend items can be links), `styles/_b2b-kit.scss` (matrix + attention row + legend link styles, tokens only), `hooks/useStaffQuery.ts` (optional `refreshMs`).
- Rewrite `pages/manager/ManagerOversightDashboardPage.tsx`; modify `ManagerCaseOversightPage.tsx` (URL filters), `ManagerReportsPage.tsx`, `ManagerReportDetailPage.tsx`, `components/reports/ReportSheet.tsx`, `pages/client/ClientReportViewPage.tsx`.
- Modify `pages/auditor/AuditorDashboardPage.tsx`.
- Tests: `utils/periods.test.ts`, `design-tokens/intelligenceLabels.test.ts`, `services/mock/intelligence.test.ts`, `services/api/httpClientB2b.test.ts` (extend), `pages/manager/ManagerPages.test.tsx` (extend), `pages/B2bPages.a11y.test.tsx` (extend), `pages/auditor/AuditorDashboardPage.test.tsx` (extend).

---

## Part 7. Tasks

Work in a fresh worktree or on the branch named per task. Run the backend and frontend suites before every PR. Baseline first (Task 0).

### Task 0: Baseline and live look

**Files:** none changed.

- [ ] **Step 1:** `git checkout main && git pull --ff-only`; `cd frontend && npm ci && npm run build && npm run lint && npx vitest run --fileParallelism=false`. Record the result (the handoff notes 3 failures were fixed in PR #42; backend `test_storage.py`/`test_video_analysis.py` fail on `main` and are not run in CI).
- [ ] **Step 2:** `cd backend && pip install -r requirements.txt && DATABASE_URL=sqlite+pysqlite:// python -m pytest tests/test_api.py tests/test_b2b.py -q`. Record the result.
- [ ] **Step 3:** run the frontend in mock mode (`VITE_DATA_SOURCE=mock npm run dev`), sign in `manager-1` / `test123`, screenshot `/manager`, `/manager/reports`, `/auditor` as `auditor-1`. Open the deployed test app in the browser and screenshot the same pages. Save to `docs/ux/evidence/intelligence-before/` (if the browser tool is unresponsive, say so and use the local screenshots only).
- [ ] **Step 4:** confirm the demo data makes *This week* meaningful: `compute_metrics` for Monday–Sunday of the current week returns non-zero `cases_received` (history stops yesterday, live cases are "now"). If it is thin on a Monday/Tuesday, widen `_historical_cases` in `backend/app/b2b_seed.py` to include the last 14 days of weekday cases (test: seeded week has ≥ 5 completed cases).
- [ ] **Step 5:** no commit.

### Task 1: Period helper (PR 1)

**Files:** Create `frontend/src/utils/periods.ts`, `frontend/src/utils/periods.test.ts`.

**Produces:** `periodFor(key: PeriodKey, now: Date): { start: string; end: string }` and `PERIOD_OPTIONS`. Dates are local calendar dates formatted `yyyy-mm-dd` (never `toISOString`, which shifts to UTC).

- [ ] **Step 1: failing test**

```ts
import { describe, expect, it } from "vitest";
import { periodFor } from "./periods";

// Wednesday 7 October 2026
const now = new Date(2026, 9, 7, 10, 41);

describe("periodFor", () => {
  it("today is one day", () => expect(periodFor("today", now)).toEqual({ start: "2026-10-07", end: "2026-10-07" }));
  it("this week runs Monday to Sunday", () =>
    expect(periodFor("this-week", now)).toEqual({ start: "2026-10-05", end: "2026-10-11" }));
  it("this week on a Sunday still starts the Monday before", () =>
    expect(periodFor("this-week", new Date(2026, 9, 11))).toEqual({ start: "2026-10-05", end: "2026-10-11" }));
  it("this month", () => expect(periodFor("this-month", now)).toEqual({ start: "2026-10-01", end: "2026-10-31" }));
  it("last month crosses the year boundary", () =>
    expect(periodFor("last-month", new Date(2026, 0, 15))).toEqual({ start: "2025-12-01", end: "2025-12-31" }));
});
```

- [ ] **Step 2:** `npx vitest run src/utils/periods.test.ts` → FAIL (module missing).
- [ ] **Step 3: implement**

```ts
import type { PeriodKey } from "../services/types";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This week" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function periodFor(key: PeriodKey, now: Date): { start: string; end: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "today":
      return { start: fmt(now), end: fmt(now) };
    case "this-week": {
      const sinceMonday = (now.getDay() + 6) % 7;
      const monday = new Date(y, m, now.getDate() - sinceMonday);
      const sunday = new Date(y, m, now.getDate() - sinceMonday + 6);
      return { start: fmt(monday), end: fmt(sunday) };
    }
    case "this-month":
      return { start: fmt(new Date(y, m, 1)), end: fmt(new Date(y, m + 1, 0)) };
    case "last-month":
      return { start: fmt(new Date(y, m - 1, 1)), end: fmt(new Date(y, m, 0)) };
  }
}
```

- [ ] **Step 4:** run → PASS. **Step 5:** `git add frontend/src/utils/periods*.ts && git commit -m "feat(frontend/utils): period presets for the Manager dashboard"`.

### Task 2: Availability helper and labels (PR 1)

**Files:** Modify `frontend/src/design-tokens/managerLabels.ts`, `statusTones.ts`; Create `intelligenceLabels.ts` and its test.

**Produces:** `type Availability`, `availabilityOf(row: AuditorOverviewRow, now: number): Availability`, `AVAILABILITY_LABEL`, `AVAILABILITY_TONE` (Available → `success`, In cooldown → `info`, SOS protection → `error`, No new cases today → `warning`), `ATTENTION_LABEL` / `ATTENTION_TONE` / `ATTENTION_TARGET`, `OPEN_BUCKET_LABEL`, `PROVENANCE_BADGE = "DEMO / PLACEHOLDER DATA"`.

- [ ] **Step 1: failing test** (`intelligenceLabels.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { availabilityOf } from "./intelligenceLabels";
import type { AuditorOverviewRow } from "../services/types";

const base: AuditorOverviewRow = {
  auditor_id: "a", display_name: "A", exposure_minutes_today: 10, exposure_limit_minutes: 120,
  exposure_state: "UNDER", cooldown: null, cases_today: 0, active_case_count: 0,
};
const now = Date.parse("2026-10-07T10:00:00Z");
const cooldown = (endsAt: string) =>
  ({ ends_at: endsAt, trigger: "S3", requires_check_in: false, check_in_completed_at: null }) as AuditorOverviewRow["cooldown"];

describe("availabilityOf", () => {
  it("is Available when nothing blocks assignment", () => expect(availabilityOf(base, now)).toBe("AVAILABLE"));
  it("is In cooldown while the cooldown runs", () =>
    expect(availabilityOf({ ...base, cooldown: cooldown("2026-10-07T10:12:00Z") }, now)).toBe("COOLDOWN"));
  it("ignores a cooldown that already ended", () =>
    expect(availabilityOf({ ...base, cooldown: cooldown("2026-10-07T09:00:00Z") }, now)).toBe("AVAILABLE"));
  it("At limit wins over cooldown", () =>
    expect(availabilityOf({ ...base, exposure_state: "AT_LIMIT", cooldown: cooldown("2026-10-07T10:12:00Z") }, now)).toBe("NO_NEW_CASES"));
  it("an open SOS is SOS protection", () =>
    expect(availabilityOf({ ...base, open_sos: true, exposure_state: "AT_LIMIT" }, now)).toBe("SOS_PROTECTION"));
});
```

Adjust the `cooldown` literal to the real `CooldownState` fields in `types.ts` (read it first).
- [ ] **Step 2:** FAIL. **Step 3:** implement `availabilityOf` as in the design (SOS → at limit → cooldown → available). **Step 4:** PASS. **Step 5:** commit `feat(frontend/manager): availability and attention labels`.

### Task 3: Backend intelligence computation (PR 1)

**Files:** Modify `backend/app/support.py`, `main.py`, `b2b.py`, `Dockerfile`; Test `backend/tests/test_b2b.py`.

**Interfaces — Produces:** `support.unresolved_sos_auditors(db) -> list[Auditor]`, `support.open_break_request_count(db) -> int`, `b2b.compute_intelligence(db, org_id, period_start, period_end, now) -> dict` matching `ManagerIntelligence`, route `GET /api/manager/intelligence`.

- [ ] **Step 1: refactor with the existing tests as safety net.** Move the query in `main.get_sos_summary` (Auditor `cooldown_trigger == "SOS"`, `cooldown_check_in_done == 0`, `cooldown_ends_at` not null) into `support.unresolved_sos_auditors`; make `get_sos_summary` call it. Run `python -m pytest tests/test_api.py tests/test_b2b.py -q` → still green. Commit `refactor(backend): share the open-SOS lookup`.
- [ ] **Step 2: failing tests** in a new `IntelligenceTests(unittest.TestCase)` that copies the `setUp` of `B2bContractTests` (same in-memory engine, `seed_b2b`, manager login). Tests (write them with concrete asserts against the seeded data and cases you insert):
  1. `test_kpis_follow_the_definitions`: insert 3 live cases (created in period; one COMPLETE in period, one AUDITOR_REVIEW, one SUBMITTED created *before* the period) → `total_cases` counts only in-period creations; `open_cases` includes the pre-period open case; assert `open_cases != total_cases - completed`.
  2. `test_open_breakdown_is_exclusive_and_sums_to_open`: a `DECLINED` case with status AUDITOR_REVIEW counts under `MANAGER_ACTION` only; `sum(open_breakdown.values()) == kpis.open_cases`.
  3. `test_attention_counts_and_talk_requests_excluded`: one unresolved SOS Auditor, one `CAP_REACHED` case, one `DECLINED`, one NEEDS_ATTENTION delivery, one OPEN `BREAK_REQUEST` and one OPEN `TALK_TO_MANAGER` → counts 1/1/1/1/1 and `needs_manager_action == 5`.
  4. `test_comparison_matrix_and_rate`: known AI/final tier pairs → exact matrix cells, `override_rate`, `top_transition`.
  5. `test_median_hidden_below_minimum`, `test_oldest_unresolved`, `test_success_rate_ignores_pending`.
  6. `test_no_auditor_wellbeing_in_payload`: serialise the response and assert it contains none of `"talk_requests"`, `"check_in"`, `"support"` keys.
  7. `test_requires_manager_and_validates_period`: no token → 401; auditor token → 403; bad dates → 400; unknown org → 404.
  8. `test_evidence_case_ids_capped`: > 200 records → `len(case_ids) == 200` and `case_ids_truncated is True`.
- [ ] **Step 3:** run → FAIL. **Step 4:** implement. Core code:

```python
EVIDENCE_CASE_ID_CAP = 200
OPEN_BUCKETS = ("SUBMITTED", "AI_PROCESSING", "READY_FOR_REVIEW", "AUDITOR_REVIEW", "MANAGER_ACTION")


def _open_bucket(case: Case) -> str:
    if case.manager_flag in ("DECLINED", "CAP_REACHED"):
        return "MANAGER_ACTION"
    return case.status


def _evidence(title, definition, fields, ids, now, eligible=None) -> dict:
    ids = sorted(ids)
    return {
        "title": title,
        "definition": definition,
        "source_fields": fields,
        "records_included": len(ids),
        "records_eligible": eligible,
        "calculated_at": iso(now),
        "case_ids": ids[:EVIDENCE_CASE_ID_CAP],
        "case_ids_truncated": len(ids) > EVIDENCE_CASE_ID_CAP,
    }
```

  `compute_intelligence` builds on `_records(db)` (add `case_id`, `status`, `flag` to each dict; keep existing keys so `compute_metrics` is unchanged), computes the sections exactly as Part 4, takes definitions from one `DEFINITIONS` dict (reuse the wording of `METRIC_DEFINITIONS` in `reportLabels.ts` so dashboard, report and client agree), and returns `provenance = "DEMO" if os.getenv("RCS_DEMO_DATA", "1") != "0" else "LIVE"`. Route:

```python
@router.get("/api/manager/intelligence")
async def get_intelligence(
    organisation_id: str,
    period_start: str,
    period_end: str,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    validate_period(period_start, period_end)  # extract from generate_report, same 400 message
    org = _find_organisation(db, organisation_id)
    now = datetime.now(timezone.utc)
    advance_deliveries(db, now)
    return compute_intelligence(db, org, period_start, period_end, now)
```

  Extract the date validation in `generate_report` into `validate_period` and use it from both.
- [ ] **Step 5:** run the suite → PASS (all, not just new). **Step 6:** add `ENV RCS_DEMO_DATA=1` with a comment to `backend/Dockerfile`. **Step 7:** commit `feat(backend): intelligence metrics and evidence`.
- [ ] **Step 8:** add `active_case_count` to `list_auditors`; extend an existing overview test; commit `feat(backend): active case count on the Auditor overview`.

### Task 4: Frontend contract: types, mock, HTTP (PR 1)

**Files:** Modify `services/types.ts`, `services/index.ts`, `services/api/httpClient.ts`, `services/mock/index.ts`, `services/mock/b2b.ts`; Create `services/mock/intelligence.ts` + test; extend `httpClientB2b.test.ts`.

- [ ] **Step 1:** add the Part 4 types and `getManagerIntelligence` to `DataService`; `active_case_count` on `AuditorOverviewRow` (mock seeds and `getAuditorOverview` fill it from `MockCase` assigned and not complete).
- [ ] **Step 2: failing test** `intelligence.test.ts` against the same scenarios as backend tests 1–5 using the mock store helpers from `b2b.test.ts`. Run → FAIL.
- [ ] **Step 3:** implement `computeIntelligence(source, org, start, end, now)` as a pure function reusing `periodBounds`, `finalTierOf`, `median`; mock `getManagerIntelligence` calls it with the live mock store and `provenance: "DEMO"`.
- [ ] **Step 4:** HTTP: `GET /api/manager/intelligence` with query params; extend `httpClientB2b.test.ts` to assert method, URL, auth header, and error mapping (401 → session expiry, 400 → `ApiError`).
- [ ] **Step 5:** `npm run build && npm run lint && npx vitest run --fileParallelism=false` → green. **Step 6:** commit `feat(frontend/services): intelligence types, mock and HTTP client`. **Open PR 1.**

### Task 5: UI kit pieces (PR 2)

**Files:** Create `components/ui/EvidenceDialog.tsx`, `components/ui/TransitionMatrix.tsx`, `components/manager/AttentionList.tsx`; Modify `components/ui/Charts.tsx`, `styles/_b2b-kit.scss`, `hooks/useStaffQuery.ts`.

- [ ] **Step 1: failing tests** (Vitest + Testing Library):
  - `EvidenceDialog`: renders title, definition, source fields, "23 of 172", the case-ID table, "and 61 more" when truncated, closes on Escape, returns focus to the opener, passes axe.
  - `TransitionMatrix`: renders 16 numeric cells with a caption and `scope` headers; diagonal cells use the neutral class; off-diagonal cells never use an error/warning class; passes axe.
  - `SegmentedBar` with `to` on segments renders legend entries as links; without `to` it is unchanged (existing report tests must still pass).
  - `useStaffQuery({ refreshMs })` re-fetches on the interval and stops when `document.hidden`.
- [ ] **Step 2:** FAIL. **Step 3:** implement.
  - `EvidenceDialog({ open, onClose, evidence, valueLabel, organisation, period })`: Carbon `ComposedModal size="md"`, `ModalHeader` (title `"{evidence.title}: {valueLabel}"`), `ModalBody` with `KeyValueList` and a Carbon `Table size="sm"` of IDs (each a `RouterLink` to `/manager/cases?search={id}`), `ModalFooter` with one primary `Button kind="primary"` "Close". Footer line: the core rule sentence.
  - `TransitionMatrix({ matrix })`: `<table className="rcs-matrix">` with `<caption>` "AI severity (rows) against final Auditor severity (columns)". Cell shade via `style={{ "--share": share }}` and SCSS `background: color-mix(in srgb, var(--cds-support-info) calc(var(--share) * 40%), transparent)`.
  - SCSS (tokens only): `.rcs-matrix`, `.rcs-matrix-diagonal`, `.rcs-attention-row` (grid: icon, label, tag, chevron; hover `--cds-layer-hover-01`; focus ring `--cds-focus`; error accent `box-shadow: inset 3px 0 0 var(--cds-support-error)` only when `data-urgent`), `.rcs-legend a`.
  - `AttentionList({ items })`: one real `<a>` (RouterLink) per kind using `ATTENTION_LABEL/TONE/TARGET`; count 0 renders muted with "All clear" and no tag.
- [ ] **Step 4:** PASS. **Step 5:** commit `feat(frontend/ui): evidence dialog, transition matrix and linked legends`.

### Task 6: Dashboard page (PR 2)

**Files:** Rewrite `pages/manager/ManagerOversightDashboardPage.tsx`; Create `components/manager/AuditorProtectionTable.tsx`; Modify `ManagerPages.test.tsx`, `B2bPages.a11y.test.tsx`.

- [ ] **Step 1: failing page tests** (mock data source, existing `ManagerPages.test.tsx` helpers):
  - renders the h1 "Manager Intelligence Dashboard", the badge text `DEMO / PLACEHOLDER DATA`, Organisation (read-only, "CommunityHub") and Period (default "This week") controls;
  - the four KPI tiles show values equal to `getManagerIntelligence`; clicking **Open cases** evidence shows five bucket rows summing to the tile;
  - changing Period calls the service with the new dates and updates `?period=`;
  - Needs-attention rows link to the exact routes in Part 3.1; a zero row shows "All clear";
  - **exactly one primary button** on the page in both states (urgent item present / nothing urgent) (D4);
  - protection table default order puts open-SOS first, then exposure ratio; sorting by Exposure reverses it; no text matching `/check-in|ranking|score|leaderboard|target/i`;
  - comparison note and Validation link present; matrix has 16 cells;
  - a rejected widget query shows that widget's error and the rest render;
  - axe passes (default, loading, error, empty period).
- [ ] **Step 2:** FAIL. **Step 3:** implement. Skeleton:

```tsx
export function ManagerOversightDashboardPage() {
  const [params, setParams] = useSearchParams();
  const periodKey = (params.get("period") as PeriodKey) ?? "this-week";
  const { start, end } = useMemo(() => periodFor(periodKey, new Date()), [periodKey]);
  const intel = useStaffQuery((t) => getManagerIntelligence(t, { organisationId: "communityhub", periodStart: start, periodEnd: end }), { refreshMs: 30_000, deps: [start, end] });
  const overview = useStaffQuery(getAuditorOverview, { refreshMs: 30_000 });
  const [evidenceKey, setEvidenceKey] = useState<keyof ManagerIntelligence["evidence"] | null>(null);
  // urgent = first attention item with count > 0, in the order SOS, Break request, Reassignment, Cap, Failed handoff
  // primary action: urgent ? { label, to } : Generate; Generate is kind="tertiary" when urgent
  return (
    <ManagerLayout>
      <header> h1 + provenance Tag + helper </header>
      <Controls /> {/* two Carbon Dropdowns + Generate button */}
      <section aria-label="Operations at a glance"><Grid className="rcs-grid" condensed>…4 × <Column sm={4} md={4} lg={4}><StatTile …/></Column></Grid></section>
      <Section title="Needs attention" …><AttentionList items={intel.data.attention} /></Section>
      <Section title="Case flow and timing" …><SegmentedBar … /></Section>
      <Grid className="rcs-grid" condensed>
        <Column sm={4} md={8} lg={10}><Section title="Auditor protection & availability">…<AuditorProtectionTable rows={overview.data} /></Section></Column>
        <Column sm={4} md={8} lg={6}><Section title="Client outcome summary — CommunityHub">…</Section></Column>
        <Column sm={4} md={8} lg={10}><Section title="AI–Auditor decision comparison">…<TransitionMatrix /></Section></Column>
        <Column sm={4} md={8} lg={6}><Section title="CommunityHub delivery health">…</Section></Column>
      </Grid>
      <EvidenceDialog … />
    </ManagerLayout>
  );
}
```

  Each `Section` gets a ghost `View evidence` button in its `actions` slot. `Generate` calls `generateReport` then `navigate(/manager/reports/${id})`, with a `Loading` state and an `InlineNotification` on failure. Keep the existing "Daily exposure totals reset at 9:00 AM…" helper line under the protection table. Remove the separate "Support requests waiting" tile and the "Wants to talk" tag (D2); keep `Break requested` and `SOS`.
  Update `useStaffQuery` usage to match its real signature (read it first; add `refreshMs` / `deps` only if absent).
- [ ] **Step 4:** PASS (page + a11y). **Step 5:** commit in the planned slices (controls/KPI/attention; widgets; filters). Also add `?status=` and `?flag=` support to `ManagerCaseOversightPage` using `useSearchParams` (test: `/manager/cases?status=AUDITOR_REVIEW` preselects the filter and the segment legend links land there). Commit `feat(frontend/manager): filter Case Oversight from the dashboard`.
- [ ] **Step 6:** local browser check at 1584, 1056 and 400 px wide against Part 3.1; screenshots to `docs/ux/evidence/intelligence-after/`; contrast of matrix cells measured with a tool (record ratios in the PR). **Open PR 2.**

### Task 7: Report evidence snapshot (PR 3)

**Files:** Modify `backend/app/b2b.py`, `services/mock/b2b.ts`, `components/reports/ReportSheet.tsx`, `ManagerReportsPage.tsx`, `ManagerReportDetailPage.tsx`, `ClientReportViewPage.tsx`, tests.

- [ ] **Step 1: failing backend tests:** (a) generating a report stores `metrics["evidence"]` with `definition`, `source_fields`, `records_included`, `case_ids`; (b) after release, creating new cases and regenerating the same period returns a **new version** and v1's evidence/figures are byte-identical; (c) `GET /api/client/reports/{id}` has no `case_ids` anywhere in the JSON but still has `definition` and `records_included` (D6); (d) a Manager `GET` includes `case_ids`.
- [ ] **Step 2:** FAIL. **Step 3:** implement: `generate_report` merges `compute_intelligence(...)["evidence"]` into the stored metrics; `_report_payload(for_client=True)` deep-copies and removes `case_ids`. Mirror in the mock.
- [ ] **Step 4:** UI tests then code: Manager preview shows "View evidence" under each section and "Frozen in v{n}"; the client view shows "Calculated from {n} completed cases" under figures and **no** evidence button/case list. Dashboard **Generate** passes the dashboard organisation and period; the Reports page generate form defaults to the `?period=` value.
- [ ] **Step 5:** all suites green. **Step 6:** commit slices; **open PR 3.**

### Task 8: Auditor My Work & Protection (PR 4)

**Files:** Modify `pages/auditor/AuditorDashboardPage.tsx`, `AuditorDashboardPage.test.tsx`.

- [ ] **Step 1: failing tests:** five tiles with the spec labels (My open cases, Ready to review, Completed today, Today's exposure, Status) and correct values for a known queue; queue grouped as "Ready to review (n)", "Processing (n)", "In review (n)" with actions Open / View status / Resume; Status tile shows Available, a live cooldown countdown, and "Daily limit reached"; protection panel text per spec §1.5 (remaining allowance, "No new harmful-content case will be assigned while cooldown is active"); exactly one `Wellbeing check-in` button; **no text matching** `/quota|target|rank|leaderboard|fastest|average handling|behind|ahead of/i`; no other Auditor's data; axe in default, cooldown, and limit states. Keep every existing test green (cooldown locking, release-all-at-limit, session expiry).
- [ ] **Step 2:** FAIL. **Step 3:** implement. Replace the "Your day" `<section>` with the five-tile `Grid`; the Status tile absorbs the adaptive cooldown/limit card; group `openCases` by `READY_FOR_REVIEW`, `AI_PROCESSING`/`SUBMITTED`, `AUDITOR_REVIEW` and render one Carbon `Table` per non-empty group under an `h2` with the count (reuse the existing row component and the locked-row logic); move the single `Wellbeing check-in` button into a "My protection status" `Section`. `Open next case` stays the only primary.
- [ ] **Step 4:** PASS; local check at 3 widths in the three states (use the demo scenarios menu in mock mode). **Step 5:** commit slices; **open PR 4.**

### Task 9: Docs and QA reconciliation (PR 5)

**Files:** Create `docs/ux/manager-intelligence-dashboard-handoff.md`; Modify `docs/Edge-Cases-QA-Checklist.md`, `docs/ux/backend-vs-visual-scope.md`, `docs/ux/b2b-flow-build-handoff.md` (open points 5), `pages/marketing/FlowHubPage.tsx` (one new step).

- [ ] **Step 1:** handoff doc: screens, routes, endpoint, data contract, decisions D1–D6 as taken, demo path (`/flow` → dashboard → evidence → Generate → release → client view), deferred list (BLOCKED_INVALID, Copilot, multi-org, timezone note).
- [ ] **Step 2:** QA checklist: fix 4.1 and 5.7 to the spec behaviour (D3); add **Section 12 CommunityHub handoff** (delivery failure → 3 attempts → NEEDS_ATTENTION; duplicate POST keeps one delivery; same `delivery_id` on retry; 2xx without matching `delivery_id` is not SUCCESS; case reopen never happens on failure; Manager Retry idempotent; closed-without-decision delivered), **Section 13 dashboard/evidence** (period with no cases; Open ≠ Total − Completed; bucket sum; evidence cap 200; SOS appears within 30 s; two Managers see the same numbers; Auditor token on `/api/manager/intelligence` → 403; client token → 401/403), **Section 14 client reports** (released only, wrong organisation looks identical to missing, access log entries, no case IDs in client payload).
- [ ] **Step 3:** run the new checklist rows against local mock and, with the user's go-ahead, the test deployment; fill the Result column honestly (pass/fail/not run).
- [ ] **Step 4:** commit `docs(...)` slices; **open PR 5.**

### Task 10: Full verification before offering merges

- [ ] Build, lint, frontend suite, backend CI suite on every branch (exact commands in Global Constraints). Report real numbers; do not claim green without running.
- [ ] One continuous manual pass in mock mode and (with permission) on the test deployment: reporter submits → Auditor resolves → delivery → dashboard counts change → Generate → release → client views → denied state; capture the final screenshots.
- [ ] Axe and keyboard-only pass on `/manager`, evidence dialog, `/auditor` (tab order matches visual order; dialog trap and focus return).
- [ ] Ask the user: merge PR 1, then 2–5, and whether to push to `test` for deploy checks.

---

## Part 8. Self-review against the spec

| Spec section | Covered by |
|---|---|
| §1.1 controls, demo badge, data-contract note | Part 3.1 controls, Part 4 provenance, Task 3/6 |
| §1.2 KPI strip, Open Cases breakdown | Tasks 3, 6 (bucket dialog, exclusive buckets) |
| Widgets 1–6 | Part 3.1 table, Task 6 (Widget 1 row 5 deferred, D1) |
| §1.3 layout | Part 3.1 sketch, Carbon grid sizes |
| §1.4 evidence button + core rule | EvidenceDialog, Task 5 |
| §1.5 Auditor KPIs, queue, protection panel | Part 3.2, Task 8 |
| §2 daily cap, reset, cap-mid-case | Already built; Task 9 QA rows; Needs-Attention "cap-interrupted" row |
| §3 block puzzle | Already built; verify in Task 10 |
| §4 handoff, retries, exception queue | Already built; dashboard widget 6 + QA section 12 |
| §6 report snapshot, evidence, exclusions | Part 3.3, Task 7 |
| §7–8 client role, secure access, logging | Already built; D6 and QA section 14 |
| §9 check-in vs SOS | D2; Needs-attention counts break requests only |
| §10 reporter outcome | Already built; verify Task 10 |
| §11 Copilot | Deferred by spec |
| Privacy (MR-SOS-07), no productivity pressure | Global Constraints + tests in Tasks 3, 6, 8 |

Known limits to state honestly in the handoff: period uses UTC dates; cases carry no `organisation_id` (single customer); the receiving CommunityHub endpoint is simulated; AI accuracy on Validation remains placeholder.

## Part 9. Decisions needed from the user (yes/no)

**All accepted as recommended by the user on 7 Oct 2026.**

1. **D1:** omit the "Completion blocked by invalid data" row until a completion-validation field exists? *(recommended: yes, omit and document)*
2. **D2:** dashboard counts break requests only; routine talk requests stay in the Auditor's View Details log, which removes the "Support requests waiting" tile and "Wants to talk" tag added in PR #58? *(recommended: yes)*
3. **D3:** change checklist rows 4.1 and 5.7 to match the spec? *(recommended: yes)*
4. **D4:** Generate is primary only when nothing needs the Manager, otherwise tertiary? *(recommended: yes)*
5. **D5:** read-only single-option Organisation dropdown, no `cases.organisation_id` migration? *(recommended: yes)*
6. **D6:** clients see definition, count and frozen value, not the contributing case-ID list? *(recommended: yes)*
7. Period presets Today / This week / This month / Last month, This week default? *(recommended: yes)*
8. Merge order PR 1 → 2/3/4 → 5, one at a time with your go-ahead, and a `test`-branch deploy check after each? *(recommended: yes)*

---

## Part 10. Kickoff prompt for the Opus session

```text
Switch complete: you are on Opus. Repo: C:\Users\aleey\Downloads\IBM-RCS-Infrastructure-Team-2 (branch docs/manager-intelligence-plan).

Read, in this order, before touching code:
1. docs/ux/manager-intelligence-dashboard-plan.md (the plan, its Global Constraints and Part 9 decisions)
2. C:\Users\aleey\Downloads\Capstone-IBM\RCS_Sprint3_Extra_Features_CLEAN_notfinal.md (the spec)
3. C:\Users\aleey\Downloads\Capstone-IBM\RCS_B2B_High_Level_End_to_End_Flow_notfinal.md and "RCS Sprint 3 Edge Cases QA Checklist_notfinal.md"
4. docs/ux/b2b-flow-build-handoff.md, docs/ux/backend-vs-visual-scope.md, docs/GIT-WORKFLOW.md, .github/workflows/pr-checks.yml
5. The code the plan names: pages/manager/ManagerOversightDashboardPage.tsx, pages/auditor/AuditorDashboardPage.tsx, components/ui/*, components/manager/ManagerBits.tsx, styles/_b2b-kit.scss, services/types.ts, services/mock/*, backend/app/b2b.py, main.py, support.py, tests/test_b2b.py.

Then execute the plan with superpowers:subagent-driven-development, task by task, TDD, on the branches and with the Conventional Commit messages in Part 5. Rules that override anything else: real IBM Carbon only and match the existing screens; one primary button per screen; no Claude co-author or "Generated with Claude Code" lines in commits or PRs; do not merge, or push to main or test, without my explicit yes; report real test output, never assumed. Start with Task 0 and tell me the baseline results before Task 1.
```
