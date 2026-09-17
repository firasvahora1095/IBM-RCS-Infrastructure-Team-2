# Sprint 2 Build-Scope Handoff — All Three Prototypes

**Track:** Design / Product · **Sprint:** Sprint 1, Week 3 (Task 54 — Final Figma Consistency/Scope Pass) · **Owner:** Aleeya Ahmad (UX)
**For:** Firas (frontend build), and the team generally

---

## What this is

All three Figma prototypes — Normal User, Auditor, Manager — are fully built through their latest iteration round (Auditor Round 21, Manager Round 9, Normal User Round 13). This is not new design work. It's the Sprint 1 Week 3 wrap-up pass — Task 54, Final Figma Consistency/Scope Pass: confirm exactly which built screens are this sprint's job versus Sprint 3's, and confirm nothing left open in any handoff doc is actually a UX/Figma problem.

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

Two passes were made this session, not one:

**Pass 1 — targeted spot-check.** Checked the Auditor Dashboard, Manager Oversight Dashboard, and Normal User Case ID Confirmation screens for Carbon fidelity, text clipping, and header/nav consistency — all clean. One stale reference found and fixed: Screen 2's "View requirements"/"Contact support" footnote pointed to "see Open Decisions" for its placeholder link destinations, but that section has since been fully closed (Round 9) — reworded to correctly describe it as a Dev-owned detail, not a dangling design decision.

**Pass 2 — full pixel-by-pixel audit, every screen, all three files.** Run separately and explicitly because Pass 1 was a spot-check, not a full re-verification — every frame across all ~65 screens/states in all three Figma files was checked individually (Carbon token fidelity, type scale, spacing, component usage, edge cases, alternate states) rather than sampled. Results:

- **Manager file — fully clean.** No defects found across any screen. No Figma or doc changes needed beyond this note.
- **Auditor file — 2 real defects found and fixed** (now Round 20 in `auditor-prototype-handoff-sprint1.md`): Cooldown Screen (S4) copy implying an action the auditor has no way to perform, reworded to correctly attribute the mandatory check-in to the manager/support-initiated mechanism; Submission-fails-to-send state rebuilt from a raw hand-built frame into a genuine `Kind=Error` `InlineNotification` component instance, matching every other error state in the file.
- **Normal User file — 2 real defects found and fixed** (now Round 13 in `normal-user-prototype-handoff-sprint1-week1.md`): the Screen 1d "PREVIEW" tag was still IBM Plex Mono 11px despite Round 5 already fixing its colour — corrected to IBM Plex Sans Regular 12px, matching the file's own Case ID label convention; the "Add more information to this case" modal had three text elements at off-token sizes (13px/13px/11px, none matching this file's own `body-01`=14px or `helper-text-01`=12px) — corrected to 14px/12px/12px respectively, verified against this file's own repeated "(optional)" label pattern rather than guessed.

All fixes were verified visually with a fresh screenshot after each change — no clipping, overlap, or regressions introduced.

---

### Traceability
- Built from: `sprint2_plan_final_updated.md` (team Sprint 2 implementation plan) cross-referenced against the actual screen lists of all three Figma files as of Auditor Round 21 / Manager Round 9 / Normal User Round 13.
- **Action for Firas:** treat the table above as the literal build order for Sprint 2 — everything marked "Build now" is this sprint's job; everything marked "Sprint 3" should not be started yet, even if it's fully designed and sitting right there in the file.

---

## Build status after the full-shell decision (18 Sep 2026)

**Owner:** Aleeya Ahmad (UX) · **Branch:** `feature/frontend`

### What changed

On 17 Sep 2026 Hyuna (PM) redirected the frontend build:

- The frontend is now the **entire UI shell: every Figma screen, Sprint 3 screens included**. It runs on a mock data layer (`VITE_DATA_SOURCE=mock`, the default) that enforces the BA rules, so every flow can be demonstrated and reviewed now.
- **Firas connects Aiden's real DB/API** by implementing the `api` data source (`frontend/src/services/api/index.ts`). Each operation not yet connected shows "This feature isn't connected to the backend yet." instead of fake data.
- Hyuna's `spike/week1-fullstack-experiment` backend and its Code Engine URL were a personal test harness and **are not merged**.

The "Build now / Sprint 3" split in the map above still describes the **backend and live-data** scope. The table below records what the **UI shell** has built.

### Screen map

**Data source:** *api wired* = implemented against the Sprint 2 HTTP endpoints; *api not connected* = works on mock data, and api mode shows the not-connected message.

| Figma node | Screen / state | Route | Built | Data source | Sprint (backend scope) |
|---|---|---|---|---|---|
| NU 5:2 | Upload — video | `/` | Yes | api wired (`createReport`) | 2 |
| NU 72:28 | Upload — link | `/` (Paste a link) | Yes | api not connected (`createLinkReport`) | 3 |
| NU 72:58 | Upload — screenshot | `/` (Add a screenshot) | Yes | api not connected (`createScreenshotReport`) | 3 |
| NU 418:72 | Upload — identified reporter | `/` | Yes | api wired (same submission) | 3 polish |
| NU 73:29 / 73:41 | Consent error / processing failed | `/` | Yes | mock + api | 3 polish |
| NU 6:2 | Case ID confirmation (+ send me updates) | `/case-confirmation` | Yes | mock; updates api not connected (`requestStatusUpdates`) | 2 |
| NU 7:15 / 7:16 / 7:41 | Status lookup / found / not found | `/status` | Yes | api wired (`getStatus`) | 2 |
| NU 145:75 | Outcome preview / Complete | `/status` | Yes | api wired | 2 |
| NU 80:31 | Add more information | `/status` (dialog) | Yes | api not connected (`addCaseInformation`) | 3 |
| NU 102:80 | Updates enabled | `/case-confirmation` | Yes | mock | 3 |
| A 8:2 / 8:22 / 36:129 · M 1:342 / 1:355 / 1:1170 | Staff login / error / locked out | `/staff/login` | Yes | api wired (`staffLogin`) | 2 |
| A 10:6 | Case queue | `/auditor` | Yes | api wired (`getAuditorCases`) | 2 |
| A 36:146 / 36:189 / 34:121 | Queue empty / cooldown active / exposure limit | `/auditor` | Yes | mock; wellbeing api not connected (`getMyWellbeing`) | 3 |
| A 16:19 / 25:212 | Content warning / AI-failure gate | `/auditor/cases/:caseId` | Yes | api not connected (`acknowledgeContentWarning`) | 3 |
| A 25:137 / 25:353 | Decline reason / decline confirmation | same | Yes | api not connected (`declineCase`) | 3 |
| A 18:26 | AI Analysis Summary | same | Yes | api wired (`getAuditorCaseDetail`) | 2 |
| A 20:35 | Review Workspace | same | Yes | exposure api not connected (`recordExposure`) | 3 |
| A 31:188 | Wellbeing check-in | same | Yes | api not connected (`requestWellbeingSupport`) | 3 |
| A 25:53 / 42:405 / 25:280 | Severity & comment / submission fails / confirmation | same | Yes | api wired (`resolveCase`) | 2 |
| A 31:257 | SOS trigger & confirmation | same | Yes | api not connected (`triggerSos`) | 3 |
| A 25:212 note (AR-AI-11) | AI/STT failure **mid-review** | same | **No** — Figma has no separate frame; its annotation says to treat it exactly like 31:257 SOS | api not connected | 3 (UI-shell backlog, Task 4.3) |
| A 31:99 | Cooldown | `/auditor/cooldown` | Yes | api not connected (`getMyWellbeing`) | 3 |
| A 36:235 · M 1:1231 | Session-expired re-authentication | in place | Yes | api wired (`staffLogin`) | 3 |
| A 42:352 | Connection lost | Review Workspace | Yes | browser offline events + demo | 3 |
| M 94:132 | TopNav (all five sections live) | Manager section pages | Yes | — | 2 |
| M 78:69 | Oversight Dashboard | `/manager` | Yes | api not connected (`getAuditorOverview`) | 2 scaffold → 3 live |
| M 103:294 | SOS banner + header badge | Manager pages | Yes | api not connected (`getSosSummary`) | 3 |
| M 86:94 / 356:364 / 357:314 / 197:309 | Auditor Detail / limit saved / break approved / save fails | `/manager/auditors/:auditorId` | Yes | api not connected (`getAuditorDetail`, `setExposureLimit`, `approveBreakRequest`) | 3 |
| M 86:198 | Consolidated Case Oversight | `/manager/cases` | Yes | api not connected (`getCaseOversight`) | 2 scaffold → 3 live |
| M 103:151 / 103:197 / 103:228 | SOS Inbox / Alert Detail / Follow-up | `/manager/sos`, `/manager/sos/:alertId`, `/manager/sos/:alertId/follow-up` | Yes | api not connected (`listSosAlerts`, `getSosAlert`, `acknowledgeSosAlert`, `logSosFollowUp`) | 3 |
| M 119:289 | Declined / Reassignment Queue | `/manager/reassignment` | Yes | api not connected (`listDeclinedCases`) | 3 |
| M 118:198 | Case Review Detail | `/manager/cases/:caseId/review` | Yes | api not connected (`getManagerCaseReview`) | 3 |
| M 119:405 / 344:282 / 357:397 / 197:321 | Reassignment / no reassignment / confirmed / target unavailable | `/manager/cases/:caseId/reassign` | Yes | api not connected (`getReassignmentContext`, `reassignCase`, `closeWithoutReassignment`) | 3 |
| M 1:454 / 1:512 / 1:612 | Exceptional raw-content access | `/manager/cases/:caseId/raw?from=…` | Yes | api not connected (`getCaseForExceptionalAccess`, `recordExceptionalAccess`) | 3 |
| M 136:257 | Validation View | `/manager/validation` | Yes, labelled placeholder | api not connected (`getValidationSummary`) | 3 |

**Review evidence:** screen-by-screen comparison and deliberate differences in the [UI review log](sprint2-ui-review-figma-log.md) (Task 57); copy in the [microcopy audit](sprint2-microcopy-audit.md) (Task 100); keyboard and contrast results in the [accessibility baseline](sprint2-accessibility-baseline.md) (Task 99).

### Open items — every one owned

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | RT-01: add the `CLOSED_NO_REASSIGNMENT` public outcome ("This case has been reviewed and closed. No further action is required from you.") | Jana | Open |
| 2 | RT-02 has no internal state for a declined or SOS case awaiting a Manager; the build derives "Manager Review" from `manager_flag`. Add a state or confirm the flag approach | Jana (with Aiden) | Open |
| 3 | Suggested blur reference for S1/S2/S4 (placeholders 20/40/90%; only S3 = 70% comes from Figma) | Aleeya | Open |
| 4 | Copy written during the build with no Figma source (microcopy audit §4, items 4a–4g) | Aleeya | Open |
| 5 | Requirement IDs visible in staff UI copy (AR-WB-11, AR-WB-12, AR-AI-04, AR-AS-04) — keep or strip | Aleeya | Open |
| 6 | Does "Carbon over Figma" extend to corner radius (8px on the public card, staff login card, TrustBanner)? | Aleeya | Open |
| 7 | "Send me updates": mock says "Updates enabled", api mode says "aren't available yet" — confirm both | Aleeya | Open |
| 8 | Status preview "whether the content was actioned" vs RT-01's scope note (proposed rewording in the audit) | Aleeya / Jana | Open |
| 9 | Login: "RCS — Staff" eyebrow; Staff ID vs Figma 36:129 "work email" | Aleeya / Aiden | Open |
| 10 | S2 cooldown rule as built (≥120s exposure on the case, or a second S2 within 45 min) — confirm | Jana | Open |
| 11 | Seeded demo puts Auditors 2–5 in cooldowns, so new public uploads assign to auditor-1 in mock mode — acceptable for demos? | Aleeya | Open |
| 12 | `MR-OV-08` validation pass/fail threshold | Firas / Aiden build the pipeline; Jana signs off | Sprint 3 |
| 13 | Tag-to-tier taxonomy and the `weapon_use` floor against the real pipeline (Task 93); includes `AR-WB-11` confidence qualification | Jana / Aiden | Open |
| 14 | Merge order of `feature/frontend` vs Aiden's backend; independent review by someone other than the implementer (Sprint 2 rule #4) | Hyuna | Open |
| 15 | Link-report consent label says "my video" (Figma 72:28 too) — proposed wording in the audit | Aleeya | Open |
| 16 | Upload "Submit report" disabled until evidence exists vs Figma's enabled button | Aleeya | Open (P2) |
| 17 | AI-failure row in the Auditor queue has a blank severity cell — add "Unknown"? | Aleeya | Open (P2) |
| 18 | AI/STT failure mid-review (AR-AI-11): build as the SOS path per the 25:212 annotation | Firas (UI shell) | Backlog |
| 19 | Live-build re-check of the Figma review (Task 81) and axe sweep | Aleeya / Firas | Blocked on deployment (Task 104) |
| 20 | Screen-reader pass (NVDA / VoiceOver) before Sprint 3 usability sessions | Aleeya | Open |
