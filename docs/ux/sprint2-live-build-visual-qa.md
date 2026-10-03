# Sprint 2 — Final Live-Build Visual QA & P0/P1 Fixes (Task 101 / Gantt T57)

**Track:** Design / Product · **Sprint:** Sprint 2 · **Owner:** Aleeya Ahmad (UX) · **Date:** 03 Oct 2026
**Build tested:** live deployed build (Code Engine), not local — superseding the local-only review in [`sprint2-ui-review-figma-log.md`](sprint2-ui-review-figma-log.md) §6/§6a/§6b now that Task 104 (deploy) is done.
**Related:** [Integrated UI review against Figma (Tasks 57, 81, 96)](sprint2-ui-review-figma-log.md) · [Build-scope handoff (Task 54)](sprint2-build-scope-handoff.md) · [Accessibility baseline (Task 99)](sprint2-accessibility-baseline.md)

**AC (from the master plan):** "No P0/P1 visual issue remains open on the live build" and "Master documents updated to reflect this deliverable."

**Status: AC fully met. Both the P0 (§2.1) and the P1 (§2.2) are fixed and confirmed live on a fresh real-upload case (`NV7HOJOW7V6M4L50`) — video plays, incident timeline shows real proportional-width bars (10s and 15s ranges, visually distinct), narrative summary renders the new BA-approved multi-line format correctly.**

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

## 2. P0 / P1 findings

### 2.1 — P0 — Review Workspace showed no visual content at all — FIXED, confirmed live 03 Oct 2026

**What it was:** on every case tested — pre-seeded demo cases and two different real-video uploads — the Review Workspace's video pane rendered as a flat, featureless dark-grey rectangle. My first read of the evidence (no network request visible to `/api/auditor/cases/{id}/video`) pointed at the frontend. That was wrong, and cost two throwaway backend attempts before the real cause surfaced:

1. First guess: a COS suffix-range quirk (`bytes=-65536`, what a `<video>` element sends first to find an MP4's trailing moov atom). Fixed with a try/except retry — deployed, verified still broken live.
2. Second guess, same track: the try/except couldn't catch the real failure mode, so converted the suffix range to a start-anchored one before it ever reached COS — deployed, **verified still broken live** with a fresh real upload.
3. **Actual root cause:** a direct `curl` of the exact same URL succeeded fine, proving the backend streaming logic was never the problem — only the browser failed. Checked the CORS preflight directly (`curl -X OPTIONS -H "Access-Control-Request-Headers: range" <url>`) → `400 Bad Request: "Disallowed CORS headers"`. **`Range` was never in the backend's CORS `allow_headers`.** Frontend and backend sit on different subdomains in production, so any Range-bearing request — exactly what `<video>` sends on every seek and its first metadata probe — needs a CORS preflight, and that preflight had been rejecting it the whole time. The browser never even attempted the real request once preflight failed, which is why nothing ever showed up in the network log and why two rounds of backend logic fixes made no difference: the server was never being asked.

This also explains an earlier inconsistency that never added up: some manual Range-header `fetch()` probes "worked" during the original investigation while others didn't, with no code difference between them. A browser caches a successful preflight per (origin, method, header-set) for `Access-Control-Max-Age` (600s here) regardless of the header's *value* on later requests — an earlier lucky cached preflight made Range requests look fine for a while, then stopped, with nothing in the app having changed in between. That's what disguised a blanket CORS block as a narrow suffix-range quirk.

**Fix:** added `Range` to `CORSMiddleware`'s `allow_headers` (`backend/app/main.py`), plus `Access-Control-Expose-Headers` for `Content-Range`/`Accept-Ranges`/`Content-Length`. Confirmed three ways: the preflight itself now returns `200` with `range` allowed; a browser `fetch()` with the exact Range header the video element needs now succeeds with a real `206`; and Aleeya confirmed the video visually plays in a real browser (my own automated browser tooling turned out unable to load *any* video, even an unrelated known-good public test clip — a limitation of that tool, not a signal about the app, discovered and ruled out before concluding this).

The two earlier backend changes (converting any suffix range before it reaches COS) are left in place — not wrong, still good defensive practice, just not what was actually broken.

**Owner:** closed. Fixed by this session, confirmed live.

### 2.2 — P1 — Incident timeline collapses real multi-second ranges to dots — FIXED, confirmed live 03 Oct 2026

**What it was:** carried over from the previous session's code-diff review (`sprint2-ui-review-figma-log.md` §2/§4, commit `076e7fe`), confirmed against real pipeline output during this pass. The real-upload case's AI analysis genuinely flagged two multi-second ranges — `00:05–00:15` and `00:25–00:40` `multi_person_conflict` — and both rendered as an identical small dot at the start time, with no proportional-width bar showing the 10-second and 15-second durations.

**Fix:** restored the original point-vs-range distinction in `IncidentTimeline.tsx` — a genuine regression from `076e7fe`, which deleted that logic without updating the component's own test file or doc comment, both of which still specified the original design the whole time. Ranges render as a proportional-width coloured segment again (with a floor so a brief range stays visible, per AR-AI-04); true instant detections stay a dot.

**Verified:** all 9 of the component's own tests pass (one had been failing since `076e7fe`, untouched by anything else — confirms it was a pre-existing regression). Full frontend suite 218/218. Confirmed live on a fresh real-upload case (`NV7HOJOW7V6M4L50`): the 10s and 15s ranges now render as visibly different-width orange bars, not dots.

**Owner:** closed. Fixed by this session, confirmed live.

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

The rest of the Auditor flow (severity & comment submission, decline, cooldown, SOS) and the remaining Manager screens (Auditor Detail, exceptional raw access, SOS alert follow-up) weren't exercised to completion during the original pass, while §2.1 was still open — submitting against shared live demo data mid-QA risked corrupting state other testers rely on, and a real review was incomplete without the video pane working regardless. Worth a follow-up pass now that playback works, lower priority than closing §2.2.

---

## 7. Next steps

Both P0 and P1 are closed. Task 101's AC is met. The only remaining item is optional, non-blocking: a short follow-up pass on the screens that weren't exercised to completion while §2.1 was still open (§6 — severity submission, decline, cooldown, SOS, and the remaining Manager screens), now that the Review Workspace actually works end to end.
