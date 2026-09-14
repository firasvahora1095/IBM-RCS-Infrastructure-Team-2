# Sprint 2 Build-Scope Handoff — All Three Prototypes

**Track:** Design / Product · **Sprint:** Sprint 1, Week 3 (T10) · **Owner:** Aleeya Ahmad (UX)
**For:** Firas (frontend build), and the team generally

---

## What this is

All three Figma prototypes — Normal User, Auditor, Manager — are fully built through their latest iteration round (Auditor Round 19, Manager Round 7, Normal User Round 11). This is not new design work. It's the Sprint 1 Week 3 wrap-up pass (T10): confirm exactly which built screens are this sprint's job versus Sprint 3's, and confirm nothing left open in any handoff doc is actually a UX/Figma problem.

Scope split below is derived directly from the Sprint 2 implementation plan's own stated scope (`sprint2_plan_final_updated.md`, team's local planning doc): Sprint 2 ships upload → case creation → assignment → AI severity/summary/timeline → Auditor confirm/override → final outcome → Complete → public status lookup, plus a **scaffolded, non-live** Manager dashboard. It explicitly defers blur/grayscale/mute, the content-warning/decline flow, exposure-time tracking and cooldown enforcement, SOS logging, declined-case reassignment, ground-truth validation, and full live Manager oversight to Sprint 3. Sprint 2's Auditor reviews AI output only — raw video is not sent to the Auditor browser this sprint.

---

## Screen-by-screen build map

### Normal User — build now (all of it)

The entire public-reporting flow is Sprint 2 P0. Nothing in this file is Sprint 3.

| Screen | Status |
|---|---|
| Video Upload (incl. identity-choice section) | **Build now** |
| Case ID Confirmation | **Build now** |
| Status/Notification (3a/3b/3c) | **Build now** |
| Alternate states (1b "paste a link," 1c "add a screenshot," 1d "identified," error variants) | Sprint 3 polish — Nice-to-Have, not P0 |

### Auditor

| Screen | Status |
|---|---|
| Login (Default/Error/Locked-out) | **Build now** |
| Dashboard / Case Queue | **Build now** |
| AI Analysis Summary | **Build now** — severity/summary/timeline only, per Sprint 2's AI-output-only scope |
| Severity Adjustment & Comment | **Build now** — confirm/override + final-outcome selector |
| Submission Confirmation (standard-outcome path) | **Build now** |
| Content Warning Modal | Sprint 3 |
| Review Workspace (blur/grayscale/mute/SOS) | Sprint 3 |
| Decline Reason Modal / Decline Confirmation | Sprint 3 |
| AI/STT Failure State | Sprint 3 |
| Cooldown Screen | Sprint 3 |
| Wellbeing Check-in | Sprint 3 |
| SOS Trigger & Confirmation | Sprint 3 |
| Exposure Limit Reached | Sprint 3 |
| Dashboard — Empty / Cooldown-active | Sprint 3 |
| Session-expired-reauth, Connection-lost, Submission-fails-to-send | Sprint 3 |

### Manager — scaffold only

| Screen | Status |
|---|---|
| Login (shared with Auditor) | **Build now** |
| TopNav shell / page navigation structure | **Build now** |
| Oversight Dashboard | **Build now** — static/placeholder shell, no live exposure data |
| Consolidated Case Oversight | **Build now** — static/placeholder shell |
| Auditor Detail | Sprint 3 |
| SOS Banner / Inbox / Alert Detail / Acknowledge & Follow-up | Sprint 3 |
| Case Review Detail | Sprint 3 |
| Declined/Reassignment Queue, Reassignment Action (+5.3b/5.3c) | Sprint 3 |
| Exceptional Raw-Content Access (5.4a/b/c) | Sprint 3 |
| Validation View | Sprint 3 |
| Edge-case screens (session-expired, exposure-limit-save-fails, reassignment-target-unavailable) | Sprint 3 |

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
