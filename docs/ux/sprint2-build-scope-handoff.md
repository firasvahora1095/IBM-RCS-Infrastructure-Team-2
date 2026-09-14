# Sprint 2 Build-Scope Handoff — All Three Prototypes

**Track:** Design / Product · **Sprint:** Sprint 1, Week 3 (Task 54 — Final Figma Consistency/Scope Pass) · **Owner:** Aleeya Ahmad (UX)
**For:** Firas (frontend build), and the team generally

---

## What this is

All three Figma prototypes — Normal User, Auditor, Manager — are fully built through their latest iteration round (Auditor Round 19, Manager Round 7, Normal User Round 11). This is not new design work. It's the Sprint 1 Week 3 wrap-up pass — Task 54, Final Figma Consistency/Scope Pass: confirm exactly which built screens are this sprint's job versus Sprint 3's, and confirm nothing left open in any handoff doc is actually a UX/Figma problem.

Scope split below is derived directly from the Sprint 2 implementation plan's own stated scope (`sprint2_plan_final_updated.md`, team's local planning doc): Sprint 2 ships upload → case creation → assignment → AI severity/summary/timeline → Auditor confirm/override → final outcome → Complete → public status lookup, plus a **scaffolded, non-live** Manager dashboard. It explicitly defers blur/grayscale/mute, the content-warning/decline flow, exposure-time tracking and cooldown enforcement, SOS logging, declined-case reassignment, ground-truth validation, and full live Manager oversight to Sprint 3. Sprint 2's Auditor reviews AI output only — raw video is not sent to the Auditor browser this sprint.

---

## Screen-by-screen build map

Figma Node links jump straight to the frame in the file (open the file first, then click through). Node IDs are stable — they don't change if the screen is renamed or moved on the canvas.

### Normal User — build now (all of it)

The entire public-reporting flow is Sprint 2 P0. Nothing in this file is Sprint 3.
File: `https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv`

| Screen | Figma Node | Status |
|---|---|---|
| Video Upload (incl. identity-choice section) | [5:2](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=5-2) | **Build now** |
| Case ID Confirmation | [6:2](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=6-2) | **Build now** |
| Status/Notification — 3a lookup / 3b found / 3c not-found | [7:2](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=7-2) / [7:15](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=7-15) / [7:41](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=7-41) | **Build now** |
| Alt. 1b "paste a link" / 1c "add a screenshot" / 1d "identified" | [72:28](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=72-28) / [72:58](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=72-58) / [418:72](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=418-72) | Sprint 3 polish — Nice-to-Have, not P0 |
| Error states — consent-required / processing-failed | [73:29](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=73-29) / [73:41](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv?node-id=73-41) | Sprint 3 polish |

### Auditor
File: `https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D`

| Screen | Figma Node | Status |
|---|---|---|
| Login — Default / Error / Locked-out | [8:2](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=8-2) / [8:22](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=8-22) / [36:129](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=36-129) | **Build now** |
| Dashboard / Case Queue | [10:6](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=10-6) | **Build now** |
| AI Analysis Summary | [18:26](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=18-26) | **Build now** — severity/summary/timeline only, per Sprint 2's AI-output-only scope |
| Severity Adjustment & Comment | [25:53](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=25-53) | **Build now** — confirm/override + final-outcome selector |
| Submission Confirmation (standard-outcome path) | [25:280](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=25-280) | **Build now** |
| Content Warning Modal | [16:19](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=16-19) | Sprint 3 |
| Review Workspace (blur/grayscale/mute/SOS) | [20:35](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=20-35) | Sprint 3 |
| Decline Reason Modal / Decline Confirmation | [25:137](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=25-137) / [25:353](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=25-353) | Sprint 3 |
| AI/STT Failure State | [25:212](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=25-212) | Sprint 3 |
| Cooldown Screen | [31:99](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=31-99) | Sprint 3 |
| Wellbeing Check-in | [31:188](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=31-188) | Sprint 3 |
| SOS Trigger & Confirmation | [31:257](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=31-257) | Sprint 3 |
| Exposure Limit Reached | [34:121](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=34-121) | Sprint 3 |
| Dashboard — Empty / Cooldown-active | [36:146](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=36-146) / [36:189](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=36-189) | Sprint 3 |
| Session-expired-reauth / Connection-lost / Submission-fails-to-send | [36:235](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=36-235) / [42:352](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=42-352) / [42:405](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D?node-id=42-405) | Sprint 3 |

### Manager — scaffold only
File: `https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse`

| Screen | Figma Node | Status |
|---|---|---|
| Login (shared with Auditor) | [1:342](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=1-342) | **Build now** |
| TopNav shell (component, `02 — Components` page) | [94:132](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=94-132) | **Build now** |
| Oversight Dashboard | [78:69](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=78-69) | **Build now** — static/placeholder shell, no live exposure data |
| Consolidated Case Oversight | [86:198](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=86-198) | **Build now** — static/placeholder shell |
| Auditor Detail | [86:94](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=86-94) | Sprint 3 |
| SOS Banner / Inbox / Alert Detail / Acknowledge & Follow-up | [103:294](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=103-294) / [103:151](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=103-151) / [103:197](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=103-197) / [103:228](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=103-228) | Sprint 3 |
| Case Review Detail | [118:198](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=118-198) | Sprint 3 |
| Declined/Reassignment Queue, Reassignment Action (+5.3b/5.3c) | [119:289](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=119-289) / [119:405](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=119-405) | Sprint 3 |
| Exceptional Raw-Content Access — 5.4a/b/c | [1:454](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=1-454) / [1:512](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=1-512) / [1:612](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=1-612) | Sprint 3 |
| Validation View | [136:257](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=136-257) | Sprint 3 |
| Session-expired-reauth / Exposure-limit-save-fails / Reassignment-target-unavailable | [1:1231](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=1-1231) / [197:309](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=197-309) / [197:321](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse?node-id=197-321) | Sprint 3 |

---

## Open-items ownership audit

Every item still open in any of the three handoff docs' "Assumptions & Open Decisions" sections, checked directly against each doc as it stands today — none require a further Figma change.

| Item | Doc | Owner | Why it's not a UX blocker |
|---|---|---|---|
| `AR-WB-11` — exact confidence/qualification mechanism for a "credible" `weapon_use` detection | `auditor-prototype-handoff-sprint1.md` | **Aiden (Dev)** | Pipeline/ML confidence-scoring question against the real schema. The UI already displays effective-vs-raw severity correctly regardless of how this resolves. |
| `MR-OV-08` — validation acceptance threshold (recall/accuracy pass-fail number) | `manager-prototype-handoff-sprint1.md` | **Firas/Aiden (Dev)** to build the continuous-testing pipeline; **Jana (BA)** to sign off the final number | Retargeted to Sprint 3 by PM — needs real pipeline results to exist before a defensible number can be set. The Validation View already renders correctly with placeholder/mock data explicitly labelled as such. |
| — | `normal-user-prototype-handoff-sprint1-week1.md` | — | **Zero open items.** Every previously-tracked decision (status wording, file size, both outcome labels, leave-without-saving mechanism, case-ID-in-logs) is closed. |

**Confirmed:** nothing above requires touching Figma. Both remaining items are pipeline/data questions the UI already handles correctly either way.

---

## Consistency pass (this session)

Spot-checked the Auditor Dashboard, Manager Oversight Dashboard, and Normal User Case ID Confirmation screens for Carbon fidelity, text clipping, and header/nav consistency — all clean. One stale reference found and fixed: Screen 2's "View requirements"/"Contact support" footnote pointed to "see Open Decisions" for its placeholder link destinations, but that section has since been fully closed (Round 9) — reworded to correctly describe it as a Dev-owned detail, not a dangling design decision.

---

### Traceability
- Built from: `sprint2_plan_final_updated.md` (team Sprint 2 implementation plan) cross-referenced against the actual screen lists of all three Figma files as of Auditor Round 19 / Manager Round 7 / Normal User Round 11.
- **Action for Firas:** treat the table above as the literal build order for Sprint 2 — everything marked "Build now" is this sprint's job; everything marked "Sprint 3" should not be started yet, even if it's fully designed and sitting right there in the file.
