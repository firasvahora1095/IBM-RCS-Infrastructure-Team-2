# Sprint 2 Frontend — UAT Run Results

**Branch:** `feature/frontend` · **Run on:** 17 September 2026 · **Checklist:** [`docs/SPRINT2-UAT-CHECKLIST.md`](../SPRINT2-UAT-CHECKLIST.md)

## What this was run against — read this first

The shared Code Engine test backend (`rcs-combined-test…codeengine.appdomain.cloud`) stopped
completing TLS handshakes partway through this session (TCP port 443 open, TLS failing from
curl, PowerShell and Chrome alike), so the checklist could not be run against it.

Instead, every check below was run in Chrome against a **local instance of the unmodified
backend source** from `origin/spike/week1-fullstack-experiment` (the branch that implements the
Sprint 2 API), with three test-only shims applied by a launcher script, not by editing the backend:

1. Postgres-only column types (`JSONB`, `ARRAY`) mapped to SQLite `JSON`, since no Postgres or
   Docker was available on the test machine.
2. `ibm_boto3` stubbed — COS storage isn't called by any endpoint the frontend uses.
3. The `auditor-1` seed row from `backend/schemas/seed_test_data.sql` inserted on startup.
   For checks 5 and 8 only, `auditor-2` and `manager-1` were also added to the local DB.

The frontend was the real build from this branch (`npm run dev`), using a synthetic MP4
container file with no media content (per the project's synthetic-footage-only guardrail).

**This does not replace a run against the deployed backend.** Re-run this checklist against
the Code Engine deployment once it is reachable again, and again at the Week 3 deployment.

## Results

| # | Stage | Check | Result | Evidence |
|---|---|---|---|---|
| 1 | Upload | A video submitted via the public form returns a visible Case ID | **Pass** | Upload via the real form returned case `ZO49SSG0HX`, shown on the confirmation screen. |
| 2 | Case ID retention | Case ID survives a refresh (local storage) and Copy works | **Pass** | Reloaded with navigation state cleared — ID restored from `localStorage`. "✓ Copied!" shown; OS clipboard contained `ZO49SSG0HX`. |
| 3 | Assignment | Case is assigned to an eligible Auditor with no manual step | **Pass** | Response `assigned_auditor: auditor-1`; case appeared in auditor-1's queue as a disabled "AI analysis in progress" row. A second upload was assigned to `auditor-2` by the weighted assignment. |
| 4 | Mock AI result | Case detail shows severity tier, narrative summary, incident timeline | **Pass** | After the backend's mock-AI test helper ran: S3 · High, CVI 72, narrative summary, and a proportional timeline segment 00:12–00:20. |
| 5 | Auditor review | Only own cases shown; override without comment rejected, with comment accepted | **Pass** | auditor-1's queue showed only its own case (auditor-2's `FVDDUK9YRY` absent; direct API access returned 404). Override with no comment: submit disabled with explanation in the UI, and the backend independently returned HTTP 400. With a comment: accepted. |
| 6 | Complete | Selecting an outcome transitions to Complete with no further step | **Pass** | Confirmation "This case has been marked Complete." DB row: `status=COMPLETE`, `effective_severity_score=72` (unchanged), `auditor_severity_score=46`, comment stored, `final_outcome=POLICY_VIOLATION_FOUND`. |
| 7 | Status lookup | Only Received / Being Reviewed / Complete shown; outcome shown once Complete | **Pass** | `FVDDUK9YRY` showed "Being Reviewed" with no internal state names in the page text; `ZO49SSG0HX` showed all steps complete and the RT-01 "Policy Violation Found" heading and message. |
| 8 | Manager scaffold | Dashboard renders without errors and reads as a placeholder | **Pass (local account only)** | `manager-1` login redirected to `/manager`; full "Scaffold — …" label visible; opening `/auditor` as a manager redirected back. **The deployed test backend has no manager account** — this still needs a real manager credential to verify there. |

## Additional checks run in the same session

| Check | Result |
|---|---|
| Task 60 — sign out, then browser Back to `/auditor` | **Pass** — redirected to login, no token in storage. |
| Task 102 — rating, comment and outcome survive leaving via the breadcrumb and a full page reload | **Pass** |
| UR-ST-07 — 5 invalid status lookups, then a 6th | **Pass** — attempts 1–5 showed the not-found state; the 6th showed "Too many invalid attempts. Try again later." and disabled lookups. |
| Session expiry — backend restarted (in-memory sessions wiped) while logged in | **Pass** — next staff request returned 401; user returned to login with "Your session has ended." |
| Wrong staff password | **Pass** — "Error: Incorrect staff ID or password." |
| Automated accessibility — axe-core (WCAG 2.1 A/AA + best practice) in Chrome on every P0 page/state | **Pass** — 0 violations after the fixes on this branch. |

## Defect found and fixed during this run

**CVI rating slider desync** (check 5): typing a rating into the slider's number field could leave
the slider and the recorded rating disagreeing (e.g. slider 9, recorded 90), which would have
submitted the wrong override score. Fixed in `fix(auditor): keep the CVI rating slider in sync
while a rating is typed`, then re-verified in Chrome by typing and by keyboard.

---

## Update — 18 September 2026: scope change and mock-mode results

### What changed since the 17 September run

- **The backend used above was a personal test harness.** Hyuna (PM) clarified on 17 Sep that
  `spike/week1-fullstack-experiment` and its Code Engine URL are her own test harness and will
  never be merged. The 17 Sep results show the frontend works against that harness's API shape.
  They are not evidence about the team's real backend.
- **The frontend is now the full UI shell** (every Figma screen, Sprint 3 included). It runs on a
  synthetic **mock data source** by default, with a **Demo data** badge in every header. Firas
  connects Aiden's real API through the `api` data source
  ([`docs/frontend/BACKEND-INTEGRATION.md`](../frontend/BACKEND-INTEGRATION.md)).
- **Check 8 is out of date.** The Manager "scaffold" was replaced by the full Oversight
  Dashboard. The honesty requirement behind check 8 still applies: nothing mock may pass for
  live data (Task 96).

### Mock-mode results (automated, `feature/frontend`)

Each check below is covered by automated tests that run against the mock data source, which
follows the BA rules. Full suite: **29 test files / 215 tests pass** (`npx vitest run
--maxWorkers=2`, 18 Sep 2026). These are **test results, not a manual walkthrough**, and they
do not replace the live UAT.

| # | Stage | Result | Evidence (test file → test) |
|---|---|---|---|
| 1 | Upload | **Pass** | `UploadPage.test.tsx` → "submits successfully, saves the Case ID, and navigates to the confirmation page"; `mockDataService.test.ts` → "creates a case in the RCS-XXXX-XXXX format…" and "rejects unsupported formats like the backend does (UR-VU-06)" |
| 2 | Case ID retention | **Pass** | `useCaseIdStorage.test.ts` → "survives being read back after a simulated page refresh"; `CaseIdConfirmationPage.test.tsx` → "shows the case ID saved in this browser (survives a refresh)", "copies the case ID to the clipboard…", and "tells the user to copy manually if the clipboard write fails…" |
| 3 | Assignment | **Pass** | `mockDataService.test.ts` → "…assigns it automatically (AR-AS-03)", "assigns to the lowest weighted score (AR-AS-02) and skips auditors at their exposure limit", "never assigns to an Auditor in a cooldown (AR-WB-04)" |
| 4 | AI result (mock) | **Pass** | `AuditorCaseDetailPage.test.tsx` → "shows the severity, narrative summary and timeline from the real API shape"; `mockDataService.test.ts` → "finishes simulated AI analysis once its time has passed"; `AuditorDashboardPage.test.tsx` → processing rows can't be opened |
| 5 | Auditor review | **Pass** | `mockDataService.test.ts` → "requires a valid session and only shows an Auditor their own cases (AR-AS-01)", "rejects an override without a comment, and completes a case with one (AR-AI-07, MR-CR-06)"; `AuditorCaseDetailPage.test.tsx` → "requires an explicit outcome, and a comment only when the rating differs from the AI's" |
| 6 | Complete | **Pass** | `AuditorCaseDetailPage.test.tsx` → "sends the RT-01 outcome value and shows the confirmation copy"; `KeyboardNavigation.test.tsx` → the Auditor review ends at "This case has been marked Complete." |
| 7 | Status lookup | **Pass** | `mockDataService.test.ts` → "only ever returns public status labels (UR-ST-02)"; `StatusLookupPage.test.tsx` → "never shows an internal state name, even if the API returns one", "shows the RT-01 outcome copy for a completed case…", "disables lookups… once rate-limited (UR-ST-07)" |
| 8 | Manager (now the full Oversight Dashboard) | **Pass** | `ManagerPages.test.tsx` → every Manager section "is reachable, renders without error and is labelled as demo data (Tasks 103, 96)"; "labels the validation data as a placeholder everywhere it appears"; `AppHeader.test.tsx` → the Demo data badge |

Accessibility for these flows: jest-axe on every page and state, plus keyboard-only
walkthroughs in `src/test/KeyboardNavigation.test.tsx`. See
[`docs/ux/sprint2-accessibility-baseline.md`](../ux/sprint2-accessibility-baseline.md).

### Still pending: the live UAT

The checklist must still be run by hand against the **deployed** build and Aiden's real backend
(Tasks 104 and 105, with Hyuna running the live UAT). That run should also re-check checks 3–4
with real pipeline output (Task 83) and check 8 with a real Manager account. Until then,
Sprint 2 UAT is **passed in mock mode only**.
