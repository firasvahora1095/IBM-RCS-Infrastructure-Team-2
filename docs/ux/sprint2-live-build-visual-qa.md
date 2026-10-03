# Sprint 2 — Final Live-Build Visual QA & P0/P1 Fixes (Task 101 / Gantt T57)

**Track:** Design / Product · **Sprint:** Sprint 2 · **Owner:** Aleeya Ahmad (UX) · **Date:** 03 Oct 2026
**Build tested:** live deployed build (Code Engine), not local — superseding the local-only review in [`sprint2-ui-review-figma-log.md`](sprint2-ui-review-figma-log.md) §6/§6a/§6b now that Task 104 (deploy) is done.
**Related:** [Integrated UI review against Figma (Tasks 57, 81, 96)](sprint2-ui-review-figma-log.md) · [Build-scope handoff (Task 54)](sprint2-build-scope-handoff.md) · [Accessibility baseline (Task 99)](sprint2-accessibility-baseline.md)

**AC (from the master plan):** "No P0/P1 visual issue remains open on the live build" and "Master documents updated to reflect this deliverable."

**Status: AC not yet met.** One real P0 and one P1 confirmed open on the live build (§2), both reproduced two ways — against the pre-seeded demo cases *and* against a case built from a real video uploaded through the public flow during this pass, which rules out "the demo data is the problem" as an explanation. Neither is frontend-fixable by UX alone — needs Firas.

---

## 1. Method

| | |
|---|---|
| Normal User | `https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud/` |
| Staff login | `https://rcs-frontend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud/staff/login` |
| Backend | `https://rcs-backend.2emp87e5l3yh.ca-tor.codeengine.appdomain.cloud` (confirmed healthy, full real route set via `/openapi.json` — every Normal User/Auditor/Manager operation in [`docs/frontend/BACKEND-INTEGRATION.md`](../frontend/BACKEND-INTEGRATION.md) is wired now except 4 explicitly-deferred Normal User "nice to have" ops) |
| Accounts used | `auditor-01`/`auditor-02`, `manager-01` — `test123` (the credentials printed on the task card didn't match; team already has the right set, so not logged as a finding) |
| Browser | Chrome, real click-through, both roles, real pipeline data (not mock — no Demo data badge, confirming `VITE_DATA_SOURCE=api` is live) |
| Reference | Every screen compared against the already-documented Figma states in `sprint2-ui-review-figma-log.md` §2, not against Figma directly — see that doc for node IDs |

Normal User flow was exercised both anonymously (upload tab-switching, submit-without-evidence error state, status lookup not-found state) **and end to end with a real upload**: submitted `Demo Video For User Flow - 45 sec.mp4` (a real ~45s clip, compressed to 7MB for the upload tool, otherwise untouched) through the public form, got case `7KZLRA0YBTE70MPR` back, and tracked it through the real pipeline to assignment (to `auditor-02`) and review. Auditor flow was exercised on three cases — two pre-seeded demo cases (one S1, one S3) and the one real upload above — through content warning → AI Analysis Summary → Review Workspace → part-way into severity & comment (stopped short of submitting, to avoid mutating shared demo data mid-QA). Manager flow covered Oversight Dashboard, Case Oversight, SOS Inbox, Reassignment Queue (through to the decision screen, not submitted), and Validation.

---

## 2. P0 / P1 findings (open)

### 2.1 — P0 — Review Workspace shows no visual content at all

**What:** On all three cases tested — two pre-seeded demo cases *and* the real-video upload from this pass — the Review Workspace's video pane renders as a flat, featureless dark-grey rectangle, never the real footage and never the documented synthetic test pattern fallback (`sprint2-ui-review-figma-log.md` §5: "The Review Workspace shows a synthetic test pattern in mock mode; `api` mode now streams the real COS video into the same player"). Confirmed at both 20% and 0% blur (ruling out the blur filter as the cause) and at two zoom levels (no texture, no grid, no colour variation at any zoom).

**This is confirmed as a genuine frontend bug, not a data problem.** The obvious alternative explanation — that the pre-seeded demo cases never had real video uploaded to COS, so there's nothing to stream — was ruled out directly: `7KZLRA0YBTE70MPR` was built from an actual video I uploaded through the public form minutes earlier in this same session, so it unquestionably has real COS-stored footage (confirmed indirectly too — its AI analysis is a genuinely unique, frame-specific description of that exact video, e.g. spotting a "Bud Light logo" at 00:35, not generic boilerplate). It shows the identical blank pane.

**Evidence:** checked the full network request log for the Review Workspace, not just a `video` URL filter — **zero requests to `/api/auditor/cases/{id}/video` ever fire**, for any case. Two `data:` URI `GET`s do fire (almost certainly the `SyntheticTestPattern` component's own output), so the fallback path is being reached, but whatever it renders is visually blank. This narrows the bug to the frontend's `ReviewWorkspace.tsx`/`SyntheticTestPattern` — either the real-video branch (`activeVideoUrl`) never gets a truthy value even when a real stream exists, or the synthetic-pattern branch itself renders nothing.

**Impact:** the Auditor has nothing to visually inspect on the one screen whose entire purpose is visual content review, on any case — pre-seeded or real.

**Owner / fix:** Firas — the network evidence above should point straight at the right component; this doesn't need backend/Aiden involvement, since the console shows no video request even attempted.

### 2.2 — P1 — Incident timeline collapses real multi-second ranges to dots

**What:** carried over from the previous session's code-diff review (`sprint2-ui-review-figma-log.md` §2/§4, commit `076e7fe`), now directly confirmed against real pipeline output. The real-upload case's AI analysis genuinely flagged two multi-second ranges — `00:05–00:15` and `00:25–00:40` `multi_person_conflict` — and both rendered as an identical small dot at the start time, with no proportional-width bar showing the 10-second and 15-second durations. Still needs Firas's decision (proportional-range fix vs. explicit "deliberate, keep" sign-off) — not re-logged as a new item, see the existing entry in the Figma review log.

---

## 3. Not a defect — clarified by the real-upload test

The transcript/audio-intensity duplication flagged after the 18 Sep review's code-diff pass (two different pre-seeded demo cases showing byte-identical transcript and audio-graph content) **is a demo-seed limitation, not a pipeline bug.** The real-upload case got its own genuinely unique Watson STT transcript (imperfect, as real STT on noisy crowd/commentary audio often is, but clearly real — not boilerplate) and its own unique audio-intensity graph. `backend/scripts/demo_seed.py`/`seed_demo.py` evidently reuses one canned transcript across its seeded cases, which is a reasonable shortcut for demo data but is worth a one-line doc note so it isn't mistaken for a pipeline defect again. Not logged as an open item.

---

## 4. Confirmed still matching the documented Figma review (no new issue)

Spot-checked against `sprint2-ui-review-figma-log.md` §2 and confirmed live:

- **Normal User:** Upload content switcher (dark selected segment), Submit-report-always-enabled fix (`272ce01`), Paste-a-link tab, Status lookup not-found state (real 404 from the backend, not a frontend stub), and the full real upload → case ID → pipeline → assignment path end to end.
- **Auditor:** Content warning gate consent-checkbox focus fix (`04c0140`), AI Analysis Summary layout and CVI/effective-score copy, flagged-entities-with-timestamps (including real object/brand detection on the uploaded video), incident timeline positioned proportionally **by start time** (see the open duration-bar issue, §2.2).
- **Manager:** Oversight Dashboard exposure/state/cooldown columns, Case Oversight RT-02 status labels, SOS Inbox honest empty state ("No SOS alerts have been raised."), Reassignment Queue's "Limited headroom"/"Unavailable" treatment with live-computed headroom minutes, Validation View's placeholder banner (still honestly labelled even in `api` mode, per Task 96).

## 5. P2 backlog (cosmetic, not blocking)

| # | Screen | Issue | Note |
|---|---|---|---|
| 1 | Content warning gate | Longer real AI-generated tags (e.g. "Officer responds to disturbance") truncate visually with an ellipsis and no hover tooltip on some pre-seeded cases. The full text is correctly in the accessible name (confirmed via the page's accessibility tree), so this is a sighted-user-only issue, not a screen-reader one. | Tag pill width/wrap needs to handle longer real AI output |
| 2 | Staff login | Placeholder text "e.g. `auditor-1`" doesn't match the real seeded ID format `auditor-01`/`auditor-02` (leading zero) | One-line copy fix |
| 3 | Manager Oversight Dashboard | An Auditor's exposure can show unrounded minutes (e.g. "46.9 / 120 min"); the Auditor's own header badge rounds to a whole number (`f3f61fe`). The rounding fix wasn't applied to this second display location | Apply the same `Math.round` to the Oversight Dashboard table |

**Not a bug (confirmed against existing design decisions):** the Reassignment Queue and declined-case review both show "Unknown" for which Auditor declined the case. This matches the documented rule "No per-Auditor decline counts anywhere, by design (MR-CR-02)" in `docs/frontend/BACKEND-INTEGRATION.md` — logged here only so a future reviewer doesn't re-flag it.

---

## 6. Not yet checked (scope note, not a blocker)

Given the §2.1 P0, the rest of the Auditor flow (severity & comment submission, decline, cooldown, SOS) and the remaining Manager screens (Auditor Detail, exceptional raw access, SOS alert follow-up) weren't exercised to completion this pass — submitting against shared live demo data mid-QA risked corrupting state other testers rely on, and a real review is incomplete without the video pane working regardless. Re-run once §2.1 is fixed.

---

## 7. Next steps

1. Firas fixes the blank Review Workspace (§2.1) — confirmed frontend-side via network evidence, this is the AC blocker.
2. Once fixed, re-run this pass end to end (including severity submission, decline, SOS, and the remaining Manager screens) against `7KZLRA0YBTE70MPR` (still sitting in `auditor-02`'s queue) and close out the Task 101 AC.
3. The incident-timeline duration-bar question (§2.2) can be decided independently, any time.
