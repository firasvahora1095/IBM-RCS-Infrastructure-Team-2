# Sprint 2 — Final Live-Build Visual QA & P0/P1 Fixes (Task 101 / Gantt T57)

**Track:** Design / Product · **Sprint:** Sprint 2 · **Owner:** Aleeya Ahmad (UX) · **Date:** 03 Oct 2026
**Build tested:** live deployed build (Code Engine), not local — superseding the local-only review in [`sprint2-ui-review-figma-log.md`](sprint2-ui-review-figma-log.md) §6/§6a/§6b now that Task 104 (deploy) is done.
**Related:** [Integrated UI review against Figma (Tasks 57, 81, 96)](sprint2-ui-review-figma-log.md) · [Build-scope handoff (Task 54)](sprint2-build-scope-handoff.md) · [Accessibility baseline (Task 99)](sprint2-accessibility-baseline.md)

**AC (from the master plan):** "No P0/P1 visual issue remains open on the live build" and "Master documents updated to reflect this deliverable."

**Status: AC not yet met.** Two real P0s and one P1 were found on the live build (§2). None are frontend-fixable by UX alone — they need Firas/Aiden/Hyuna. This doc is the "master document updated" half of the AC; the "no open P0/P1" half is blocked on those fixes landing and a re-check.

---

## 1. Method

| | |
|---|---|
| Normal User | `https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud/` |
| Staff login | `https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud/staff/login` |
| Backend | `https://rcs-backend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud` (confirmed healthy, full real route set via `/openapi.json` — every Normal User/Auditor/Manager operation in [`docs/frontend/BACKEND-INTEGRATION.md`](../frontend/BACKEND-INTEGRATION.md) is wired now except 4 explicitly-deferred Normal User "nice to have" ops) |
| Accounts used | `auditor-01` / `test123` (Auditor), `manager-01` / `test123` (Manager) — see §2.1, the credentials originally given on the task card did not work |
| Browser | Chrome, real click-through, both roles, real pipeline data (not mock — no Demo data badge, confirming `VITE_DATA_SOURCE=api` is live) |
| Reference | Every screen compared against the already-documented Figma states in `sprint2-ui-review-figma-log.md` §2, not against Figma directly — see that doc for node IDs |

Normal User flow was exercised anonymously (upload tab-switching, submit-without-evidence error state, status lookup not-found state). Auditor flow was exercised end-to-end on two real cases (one S1, one S3) through content warning → AI Analysis Summary → Review Workspace → part-way into severity & comment (stopped short of submitting, to avoid mutating shared demo data mid-QA). Manager flow covered Oversight Dashboard, Case Oversight, SOS Inbox, Reassignment Queue (through to the decision screen, not submitted), and Validation.

---

## 2. P0 / P1 findings (open)

### 2.1 — P0 — Demo credentials on the task card don't work

**What:** The task card's demo logins (`auditor-01/demo-pass-01`, `auditor-02/demo-pass-02`, `auditor-03/demo-pass-03`, `manager-01/demo-mgr-01`) all return a real `401` from the live backend (confirmed via network inspection, not a frontend bug — `POST /api/staff/login` → `401`, request body/headers correct). The working credentials are `auditor-01` through `auditor-04` / `test123` and `manager-01` / `test123`.

**Impact:** Blocks every Auditor and Manager screen — only the public Normal User flow is reachable with the card's original credentials. Anyone else picking up this task card hits the same wall.

**Owner / fix:** Hyuna — update the task card's demo login block to the working set. Low effort, but blocking until done.

**Also noted:** the login form's own placeholder text reads "e.g. `auditor-1`" (no leading zero), while every real seeded account is `auditor-01`...`auditor-04` (with a leading zero). Worth a one-line placeholder fix so it doesn't mislead the next person the way the task card did — logged as P2 in §3.

### 2.2 — P0 — Review Workspace shows no visual content at all

**What:** On both cases tested (S1 `FJ6BH1SM0YZV9UE5`, S3 `8VHDTEGEL2K10NPX`), the Review Workspace's video pane renders as a flat, featureless dark-grey rectangle — not the real case footage, and not the documented synthetic test pattern fallback (`sprint2-ui-review-figma-log.md` §5: "The Review Workspace shows a synthetic test pattern in mock mode; `api` mode now streams the real COS video into the same player"). Confirmed at both 20% and 0% blur (ruling out the blur filter itself as the cause) and at two zoom levels (no texture, no grid, no colour variation at any zoom).

**Evidence:** no request to `/api/auditor/cases/{id}/video` fired for either case (checked via network inspection) — the frontend never attempted to stream real footage, and whatever renders in its place (a `data:` URI request was observed, most likely the synthetic-pattern image) produces a blank result, not the pattern the local-build review documented.

**Impact:** the Auditor has nothing to visually inspect on the one screen whose entire purpose is visual content review. This is the most severe finding in this pass — everything else downstream (severity confirmation, override, decline) happens without the Auditor having actually seen anything.

**Owner / fix:** Firas (frontend `ReviewWorkspace.tsx`/`SyntheticTestPattern`) and/or Aiden (whether these demo-seeded cases are expected to have real COS video at all). Needs a decision either way: if seeded demo cases intentionally have no real footage, the synthetic pattern must actually render; if real footage is expected, the video-stream wiring needs debugging.

### 2.3 — P1 — Transcript & audio-intensity data doesn't match the case

**What:** The S1 case (`FJ6BH1SM0YZV9UE5`, AI summary: "routine traffic stop with no significant use of force... no policy violations identified") shows the **identical transcript and audio-intensity graph** as the unrelated S3 case (`8VHDTEGEL2K10NPX`, AI summary: "significant use of force... pepper spray... subject sustained minor injuries") — same five lines ("Stop, you need to calm down." ... "Do not resist. Stay on the ground." ... "Get on the ground! Now!"), same bar-chart shape, pixel for pixel.

**Impact:** this is an accuracy/honesty issue, not a cosmetic one — an Auditor reviewing the S1 case would see audio evidence of a confrontational, forceful incident that contradicts the case's own AI summary and severity tier. Whatever's driving this (shared placeholder data in the demo seed, or a real STT-pipeline wiring bug) needs to be distinguished, because the second possibility would also affect real uploads.

**Owner / fix:** Aiden (STT/transcript pipeline wiring) — needs to confirm whether `backend/scripts/demo_seed.py` / `seed_demo.py` intentionally reuses one canned transcript for every seeded case (acceptable for a demo, but should be documented as such) or whether this is a real per-case data bug.

---

## 3. P2 backlog (cosmetic, not blocking)

| # | Screen | Issue | Note |
|---|---|---|---|
| 1 | Content warning gate | Longer real AI-generated tags (e.g. "Officer responds to disturbance") truncate visually with an ellipsis and no hover tooltip. The full text is correctly in the accessible name (confirmed via the page's accessibility tree), so this is a sighted-user-only issue, not a screen-reader one. Didn't occur on the S1 case's shorter tags. | Tag pill width/wrap needs to handle real (longer) AI output, not just the short mock strings this was built and reviewed against |
| 2 | Staff login | Placeholder text "e.g. `auditor-1`" doesn't match the real seeded ID format `auditor-01` (leading zero) | One-line copy fix |
| 3 | Manager Oversight Dashboard | `auditor-01`'s exposure shows unrounded ("46.9 / 120 min"); the Auditor's own header badge rounds to a whole number (`f3f61fe`, confirmed in the earlier code-diff review on `docs/ux/sprint2-ui-review-figma-log.md` §2). The rounding fix wasn't applied to this second display location | Apply the same `Math.round` to the Oversight Dashboard table |

**Not a bug (confirmed against existing design decisions):** the Reassignment Queue and declined-case review both show "Unknown" for which Auditor declined the case. This matches the documented rule "No per-Auditor decline counts anywhere, by design (MR-CR-02)" in `docs/frontend/BACKEND-INTEGRATION.md` — logged here only so a future reviewer doesn't re-flag it.

---

## 4. Confirmed still matching the documented Figma review (no new issue)

Spot-checked against `sprint2-ui-review-figma-log.md` §2 and confirmed live:

- **Normal User:** Upload content switcher (dark selected segment), Submit-report-always-enabled fix (`272ce01`), Paste-a-link tab, Status lookup not-found state (real 404 from the backend, not a frontend stub).
- **Auditor:** Content warning gate consent-checkbox focus fix (`04c0140`), AI Analysis Summary layout and CVI/effective-score copy, flagged-entities-with-timestamps, incident timeline positioned proportionally **by start time** (though see the already-open P1 on duration bars, carried over from the previous session — §5).
- **Manager:** Oversight Dashboard exposure/state/cooldown columns, Case Oversight RT-02 status labels, SOS Inbox honest empty state ("No SOS alerts have been raised."), Reassignment Queue's "Limited headroom"/"Unavailable" treatment with live-computed headroom minutes, Validation View's placeholder banner (still honestly labelled even in `api` mode, per Task 96).

---

## 5. Carried over from the previous session (still open, now confirmed with real data)

The incident-timeline dots-only regression flagged in `sprint2-ui-review-figma-log.md` §2/§4 (commit `076e7fe`) is now directly confirmed on a real case: the S3 case's real 3-second range ("00:55–00:58 Pepper spray deployed") renders as an identical dot to the instant events, with no proportional-width bar. Still needs Firas's decision (proportional-range fix vs. explicit "deliberate, keep" sign-off) — not re-logged as a new item here, see the existing entry.

---

## 6. Not yet checked (scope note, not a blocker)

Given the P0s found, the rest of the Auditor flow (severity & comment submission, decline, cooldown, SOS) and the remaining Manager screens (Auditor Detail, exceptional raw access, SOS alert follow-up) weren't exercised to completion this pass — submitting against shared live demo data mid-QA risked corrupting state other testers rely on, and the video-pane P0 (§2.2) makes a real review incomplete regardless. Re-run once §2.2 is fixed.

---

## 7. Next steps

1. Hyuna updates the task card's demo credentials (§2.1) — unblocks anyone else picking this up.
2. Firas/Aiden resolve the blank Review Workspace (§2.2) — this is the AC blocker.
3. Aiden confirms whether the shared transcript (§2.3) is a known demo-seed limitation or a real pipeline bug.
4. Once §2.2 is fixed, re-run this pass end to end (including severity submission, decline, SOS, and the remaining Manager screens) and close out the Task 101 AC.
