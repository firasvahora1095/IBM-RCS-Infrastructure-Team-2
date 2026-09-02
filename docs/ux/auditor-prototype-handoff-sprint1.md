> ℹ️ **DRAFT 1 — SPRINT 1 WEEK 3**
> This is the first full build of the Auditor prototype, from a planning document (`auditor-prototype-plan.md`, Aleeya Ahmad, UX) that was reviewed and signed off by both UX and BA on 1 Sep 2026. All 46 `AR-*` IDs in [`docs/ba/persona-requirements-week2.md`](https://github.com/firasvahora1095/IBM-RCS-Infrastructure-Team-2/blob/main/docs/ba/persona-requirements-week2.md) (Jana Begum, BA) are traced. A handful of items are genuinely still open pending Week 3 Dev/pipeline confirmation or a BA-doc correction — see "Assumptions & Open Decisions" below. Team feedback is being requested on this draft — see the accompanying Teams message.

# Auditor Prototype — Handoff (Sprint 1, Week 3)

**Track:** Design / Product · **Sprint:** Sprint 1, Week 3 · **Owner:** Aleeya Ahmad (UX)
**Figma file:** [RCS Auditor Prototype — Sprint 1](https://www.figma.com/design/QGPZWRZRFeKxkl0NApc35D)
**Planning source:** `auditor-prototype-plan.md` (Aleeya Ahmad, UX — reviewed and signed off by Jana Begum, BA, 1 Sep 2026)

---

## What this is

A clickable Figma prototype of the Auditor (human content reviewer) flow: case assignment through submission, plus the full wellbeing layer — content-warning gate, blur-by-default review, exposure tracking, mandatory cooldowns, and SOS. The core design challenge this prototype answers is protecting Auditor wellbeing **structurally through the UI** — exposure limits, cooldowns, severity-aware case assignment, trauma-informed design — rather than relying on individual coping mechanisms. That principle is the north star for every screen, not just the four dedicated wellbeing screens.

Built on IBM Carbon Design System (v11) tokens throughout. Blue 60 is reserved exclusively for interactive/actionable elements — never applied to static text, badges, or non-interactive decoration.

**Platform assumption:** standard responsive web application, desktop-first (1280px-wide build canvas, following Carbon's 16-column grid), not mobile-first — the requirements doc doesn't mandate a device.

---

## Round 2 update (team feedback incorporated)

- **Mute/unmute icon clarity.** Team feedback on Draft 1: the audio mute/unmute `IconButton` on the Review Workspace was a plain coloured dot — nothing about it read as an audio control. Rebuilt both states as a real speaker glyph: **Muted** now shows the speaker with an X; **Unmuted** shows the speaker with sound-wave arcs. Fixed once at the master component level (`02 — Components`), so it propagated automatically to every instance across the file (Review Workspace, Session-expired-reauth, Connection-lost).

## Round 3 update (BA-doc fixes verified and incorporated)

Both items flagged to Jana in Draft 1's "Assumptions & Open Decisions" have been fixed on her side and verified directly against the actual files — see the updated status on items 2 and 5 below.

- **`docs/ba/persona-requirements-week2.md` cross-reference bug — RESOLVED.** `AR-WB-16` and `MR-SOS-07` now correctly point at each other in both directions.
- **Severity-scale doc contradiction — RESOLVED.** The conflicting "no tag imposes a hard floor" statement is gone, replaced by one consistent rule, and the floor mechanic is now unambiguous (raises the numeric CVI to 65, not just the displayed tier — closing one of the two gaps originally flagged). One item remains genuinely open, not a new problem: the confidence/qualification mechanism for "credible" `weapon_use` detection is still TBD with Aiden.

## Round 4 update (team feedback incorporated)

> Team feedback: "having 4.2 as a separate staging step for the psychological buffer is great, but I think that content should also be accessible on screen 4.3 alongside the video — similar to what Naresh showed us. Right now, 4.3 feels a bit too sparse, and if auditors want to re-check the AI narrative summary or audio graph while reviewing the footage, they currently have no way to access them."

- **AI Summary and Audio-intensity accordions added to the Review Workspace (4.3).** 4.2 stays the deliberate staging screen for first exposure — that structure is unchanged. But the context rail on 4.3 now has two more collapsible sections, alongside the existing Transcript accordion: **AI Summary** (the same narrative already established on 4.2) and **Audio intensity** (the same timestamped bar chart, resized to fit the rail). An Auditor can now recall either without leaving the workspace. Propagated to the two screens cloned from Review Workspace (Session-expired-reauth, Connection-lost) so neither silently missed the update.

## Round 5 update (informed-choice gap at 4.1, consent checkbox, entities on 4.3)

Four pieces of team feedback landed together, all really pointing at one underlying issue:

> "It'd be nice to add more to warning for a more wellbeing focus, if it makes logical sense... we should add a feature to go back to previous page, or they should complete up to 4.2 then make the choice to proceed or decline... Also in this flow, we need more information before deciding to proceed or decline so auditor can make a reasonable choice. Right now, it literally just says 'Graphic Violence,' which doesn't give them enough context to pick reasons like 'Content more severe than AI indicated,' 'Personal trigger,' or 'Other'... Naresh's example had auditor rights too — [a checkbox reading approximately] 'I understand this video contains disturbing material. I am trained to review this content and I consent to proceed.' Was that also our requirement?... What is your design rationale for not adding incident timeline and flagged entities to 4.3 from 4.2? If no good design rationale, add it too."

**The real finding, working through this carefully:** the Decline Reason Modal's own option list includes "Content more severe than AI indicated" — but that's only truthfully selectable if the Auditor has actually seen the AI's indication (severity tier + tags) *before* deciding. They hadn't — 4.1 showed only the flag-reason line. This was a genuine internal-consistency gap, not a stylistic nitpick, and it's the same root cause behind the first two points of feedback.

**What changed, with reasoning for each:**

- **Added severity tier + CVI + detected-tag pills to 4.1** (`physical_violence`, `weapon_present`, etc.) — categorical/abstract classification only, not narrative description or raw content, so it doesn't cross the line `AR-PV-07`/Marielle Lee's guidance protects. This closes the internal-consistency gap and directly answers the "not enough context" and "more wellbeing focus" feedback in one change. Tagged `[UX/BA judgment call]` — no `AR-*` ID mandates tags specifically at this screen.
- **Did not add a back/dismiss option at 4.1, and did not move the decision point past 4.2** (the two options offered). Reasoning: a back/dismiss path would reintroduce exactly the implicit-default escape hatch `AR-PV-02` and the "no backdrop dismiss, no X" decision were built to avoid — Decline already *is* the exit-without-proceeding path. Moving the decision point past the narrative-summary screen isn't necessary once severity+tags are visible at 4.1, and would delay `AR-AI-02`'s "narrative summary only after a deliberate proceed" gate for no remaining reason.
- **Added the consent checkbox**, informed by Naresh's own reference example — confirmed absent from `docs/ba/persona-requirements-week2.md`, so tagged `[UX/BA judgment call]`, not `[FINAL]`. Gates **Proceed only**, never Decline: requiring "consent to review" before declining would be logically backwards, and adding friction only to the exposure path (never the exit path) is consistent with `AR-WB-08` (wellbeing takes precedence), not in tension with it.
- **Added Flagged entities to 4.3's context rail.** Honest answer: there wasn't a good rationale for excluding them — added using the same recall-tier reasoning already applied to AI Summary/Audio intensity last round. Incident timeline, by contrast, **is** already on 4.3 — the scrubber marker ticks overlaid on the video — just not visually labeled as "the incident timeline," which is worth saying plainly rather than adding a redundant list.
- **Defined the three-tier "what shows where" criteria**, now documented on the Handoff page's Design rationale section:
  - **Tier 1 (4.1, before Proceed/Decline):** category/severity metadata only — flag reason, S-tier + CVI, tags. No narrative, no raw content.
  - **Tier 2 (4.2, after Proceed, before raw content):** full AI output, shown fresh for the first and only time — narrative summary, incident timeline (labeled list), entities, transcript, audio-intensity graph.
  - **Tier 3 (4.3, during review):** raw video + everything from Tier 2 available for recall, never fresh disclosure.

## Round 6 update (Auditor-to-Normal-User outcome mechanism closed)

Raised as an open question last round: nothing defined how an Auditor's assessment maps to what the Normal User actually sees on completion. Jana closed it directly in `docs/ba/persona-requirements-week2.md`:

> `AR-AI-14`: "The Auditor shall select a final case outcome as part of submitting a standard completed assessment. For cases with no SOS or Decline flag, this outcome shall determine the public-facing result and the case shall automatically progress to Complete. Internal severity/CVI, comments and Auditor details shall not be displayed to the Normal User."

- **Added a Final case outcome selector to Severity Adjustment & Comment (4.4)** — two options ("No Violation Found" / the still-unconfirmed second category, reusing the Normal User file's own illustrative placeholder rather than inventing a new label), separate from the CVI/severity control. Noted this only applies to standard (no SOS/Decline) cases — a flagged case's outcome is still decided by the Manager per `MR-CR-06`.
- **Submission Confirmation (4.8)** now records the selected outcome in the "What was recorded" summary and states the automatic-progression-to-Complete rule explicitly.
- **Flagged an ID-reuse issue to Jana, not silently absorbed:** `AR-AI-14` previously meant the timestamped audit-history requirement ("preserve a timestamped audit history of changes to AI-generated severity/CVI assessments, Auditor overrides, comments and case-status changes"). That content is gone from `docs/ba/persona-requirements-week2.md` now, not renumbered elsewhere — Jana appears to have reused the ID rather than assigned a new one. Logged under Needs Team Review on the Handoff page pending her confirmation either way.

## Round 7 update (AR-AI-14 ID-reuse concern resolved)

Jana has confirmed and pushed the fix: `AR-AI-12` (previously unused in this sequence) now carries the restored timestamped audit-history requirement, and `AR-AI-14` cleanly keeps the final-case-outcome meaning from Round 6. No content was lost, no ID collision remains. This closes item 6 from "Assumptions & Open Decisions" — removed below, not left marked resolved, per the Handoff page's own pending-items convention. Traceability table updated: `AR-AI-14`'s row no longer carries the ID-reuse caveat, and a new `AR-AI-12` row is added.

## Round 8 update (two untraced IDs found and closed — AR-PV-08, AR-AI-13)

A pass over the "all IDs accounted for" claim turned up two `AR-*` IDs that exist in `docs/ba/persona-requirements-week2.md` but weren't traced anywhere in this file or the plan document — a real gap in the traceability claim, independent of the Round 7 fix above.

- **`AR-PV-08`** ("the system shall require the Auditor to actively acknowledge the content warning before raw source content is revealed... required when raw content is first accessed and whenever the review has returned to a protected state before raw content is revealed again"). This turned out to already be built: the consent checkbox added at 4.1/4.6 back in Round 5 ("I understand this video contains disturbing material. I am trained to review this content and I consent to proceed"), tagged `[UX/BA judgment call]` at the time because no formal ID covered it yet. Retagged as `AR-PV-08` — no design change needed, just closing the traceability gap. The "returns to a protected state" clause is satisfied structurally: every resumption of raw-content review (post-SOS, post-decline-cancel, re-entering a case from the queue) already routes back through the Content Warning Modal rather than resuming directly into the Review Workspace.
- **`AR-AI-13`** ("the Auditor shall be able to return to the previous step or screen during an active case review without losing their current review progress or entered information"). This one was a genuine, unbuilt gap — no back-navigation existed anywhere in the flow. Added a "← Back to AI Analysis Summary" link on Review Workspace (4.3) and a "← Back to Review Workspace" link on Severity Adjustment & Comment (4.4), both `Ghost`/tertiary weight so they don't compete visually with the primary review controls. Neither auto-replays raw content on return (per `AR-AI-13`'s own Notes), and 4.4's link preserves the CVI value/comment already entered rather than resetting the screen. Scoped deliberately to *within* an active review (4.2↔4.3↔4.4) — does not extend back before the Content Warning Modal, consistent with the Round 5 decision to reject a back/dismiss option there.

Both are now in the Traceability table below. The "all IDs accounted for" count is corrected from 42 to 46 — the true total in `docs/ba/persona-requirements-week2.md`.

## Round 9 update (5.2 wired into the click-through; a leftover AR-WB-17 citation fixed; 5.4 exposure-bar bug fixed)

Team feedback surfaced two real problems: "how do you get to 5.2 Wellbeing Check-in, and why is there no way back?", and "5.4's exposure bar says at-limit but only shows half full."

- **5.2 Wellbeing Check-in was completely disconnected from the prototype.** Despite the Traceability table claiming "entry points at Review Workspace and Cooldown Screen," neither actually had a click reaction wired to it — it was an isolated illustrative frame with zero incoming or outgoing connections. Wired Review Workspace's (4.3) "Something about this one? Talk to your manager" text to navigate to 5.2 on click, and added a "← Return to Review Workspace" link on 5.2 back to 4.3. (No equivalent link exists on the Cooldown Screen (5.1) — its only wellbeing-adjacent element is the S4-mandatory check-in, which the plan document explicitly says is a *different* thing from this optional check-in, so nothing there was wired.) Updated the on-canvas documentation captions on 5.2 accordingly, since they used to say this screen was "not a screen the Auditor navigates to... shown here standalone for documentation purposes" — no longer accurate.
- **Found a leftover `AR-WB-17` citation** on 5.2's own Requirements Panel — the ID-reuse correction made earlier this session (Jana confirmed the check-in is `AR-WB-16`, not `AR-WB-17`) never reached this specific panel. Corrected.
- **5.4 Exposure Limit Reached (At-limit)'s header exposure bar was visually wrong.** Its text correctly read "120 / 120 min today" and its fill color had been changed to warning-yellow, but the fill's *width* was still the shared placeholder value every other screen uses (~52%, matching "62/120") — so it displayed as roughly half-full while claiming to be at the cap. Fixed to render fully filled.
- **Found a real Blue-60-interactive-only violation, across every other screen.** The persistent header's exposure `ProgressBar` fill is a purely decorative status indicator, not clickable — but it was built using interactive Blue 60, the exact rule this file has enforced everywhere else. Fixed at the `ProgressBar/Exposure` master component level and swept across all 17 screen instances, recoloured to Support Info Blue 70 — close enough in hue that it doesn't read as a visual change, but now semantically correct.

---

## File structure

The Figma file has 5 pages, matching the same systemization pattern used on the Normal User Prototype file:

1. **00 — Cover** — project title, scope, flow summary, and pointers to the plan/requirements docs and this handoff doc.
2. **01 — Foundations** — every Carbon token actually used, as real Figma variables: 16 colours (interactive Blue 60, grayscale, 4 support/status colours, 4 severity-tier colours), 9 spacing values (Carbon 2×Grid), 9 text styles (IBM Plex Sans/Mono productive type ramp). Documented visually with swatches, severity-tier previews, spacing bars, and type specimens.
3. **02 — Components** — a real component library, not one-off shapes: Button (Primary/Secondary/Tertiary/Danger), Tag (S1–S4 severity + Info/Success/Warning/Error status), InlineNotification (4 tones), ProgressBar (exposure indicator), Toggle, IconButton (mute/unmute), blur-intensity Slider (AI-reference marker, defaults to 100%), RadioButton, TextArea, SOS Button, Header/UIShell (persistent nav with exposure ProgressBar), Modal shell, DataTable row, Breadcrumb, and the Requirements Panel annotation component used on every screen.
4. **03 — Prototype** — all 21 screens/states, each with its own on-canvas Requirements Panel directly below it (internal-label pill, req-tag pills, element name, rationale — same convention as the Normal User file). Fully click-linked as a Figma prototype (19 connections, +2 in Round 8 for the new AR-AI-13 back-navigation links), flow starting point set to Login.
5. **04 — Handoff** — Design rationale (per screen), Open Decisions, a full per-ID Traceability table, Needs-Team-Review, Noticed-Elsewhere (cross-persona gaps), Accessibility & cross-cutting notes, a Handoff-for-the-developer section, and an Iteration History log — consolidated onto their own page, off-canvas from the shippable screens.

---

## The screens (21 screens/states, Login + 4 build phases)

**Phase A1 — Core flow:**
1. **Login** — Default and Error (invalid credentials) states.
2. **Dashboard / Case Queue** — Default populated queue with mixed Processing/Ready rows, persistent exposure indicator.
3. **Content Warning Modal** — flag reason shown before the question, genuinely equal-weight Proceed/Decline buttons, no dismiss.
4. **AI Analysis Summary** — S-tier/CVI badge, narrative summary, incident timeline, flagged entities, transcript + audio-intensity graph.
5. **Review Workspace** — blurred-by-default video, blur slider, grayscale toggle, audio mute, incident scrubber, per-case exposure breakdown, persistent SOS.

**Phase A2 — Decision & submission:**
6. **Severity Adjustment & Comment** — AI-suggested vs. Auditor-adjusted CVI, comment required on override.
7. **Decline Reason Modal** — 4 reasons, no default selection, Submit disabled until chosen.
8. **AI/STT Failure State** — pre-screen variant, defaults to maximum blur regardless of AI suggestion.
9. **Submission Confirmation** — Standard- and High-severity routing (the latter into Cooldown).
10. **Decline Confirmation** — neutral, zero case content shown.

**Phase A3 — Wellbeing:**
11. **Cooldown Screen** — S4-variant: real end-time, aggregate-only exposure status, mandatory check-in, Stop-my-shift option.
12. **Wellbeing Check-in** — talk-to-manager + break-request, distinct from SOS.
13. **SOS Trigger & Confirmation** — video replaced by neutral fill, on-screen acknowledgment, no resume path.
14. **Exposure Limit Reached** — capped warning-tone progress bar, non-punitive framing.

**Phase A4 — Edge cases:**
15. **Login — Locked-out.**
16. **Dashboard — Empty.**
17. **Dashboard — Cooldown-active** (rows locked, empty Ready section).
18. **Session-expired-reauth** — in-context modal over a paused Review Workspace, blur/grayscale state preserved.
19. **Connection lost during playback.**
20. **Submission fails to send** — form stays populated, plain retry.

*(20 named states above; the AI/STT Failure State's mid-review variant and the Wellbeing Check-in's illustrative frame bring the total to 21 built frames — see the Figma file's own screen list for the exact count.)*

---

## Design system tokens used

- **Colour:** Blue 60 `#0f62fe` (interactive-only — buttons, links, active slider fill/handle, focus states). Gray 10/20/30/50/70/100 (backgrounds, borders, text). Support colours: Red 60 (error), Green 50 (success), Yellow 30 (warning, paired with Gray 100 text), Blue 70 (info). Severity tiers: S1 Gray 20, S2 Yellow 30, S3 **Carbon Orange 40 `#ff832b`** (resolved during this build, per the plan's own explicit delegation to UX — reads distinct from S2/S4), S4 Red 60.
- **Type:** IBM Plex Sans (UI text — Regular/Medium/SemiBold), IBM Plex Mono (STT transcript timestamps, case IDs, raw CVI numbers only, matching Carbon's `code-01`/`code-02` convention).
- **Spacing/grid:** Carbon 8px 2×Grid (2–48px range), 16-column responsive grid for dashboard/queue layouts, fixed 2-column split for the Review Workspace.
- **Component fidelity:** real Carbon-pattern components throughout (see Components page), not static shapes — Button, Tag, Modal, Slider, ProgressBar, InlineNotification all built with token bindings, not hardcoded values.
- **Accessibility:** colour is never the sole status signal (every severity tag/notification pairs colour with text/icon); modals trap focus; the blur slider is fully keyboard-operable with `aria-valuenow`/`aria-valuetext`; icon-only controls carry state-aware accessible names; exposure-clock updates use a polite, batched `aria-live` region. Full detail on the Handoff page's Accessibility section.

---

## Traceability Table

| ID | Requirement | Screen | Status |
|---|---|---|---|
| AR-AS-01 | Auditor sees only assigned cases | Dashboard / Case Queue | Included |
| AR-AS-02 | Weighted round-robin assignment | Dashboard (background logic; queue reflects the result) | Included |
| AR-AS-03 | Assignment auto-triggers AI processing | Dashboard (Processing state) | Included |
| AR-AS-04 | Dashboard shows processing state, blocks review until ready | Dashboard (Processing state, disabled row) | Included |
| AR-AS-05 | Soft severity-aware deprioritisation (30-min window) | Dashboard (background assignment logic — no distinct visible UI) | Included by design omission |
| AR-AS-06 | Authenticated, role-scoped login | Login (Default, Error, Locked-out, Session-expired-reauth) | Included |
| AR-PV-01 | Content-warning modal before harmful content | Content Warning Modal | Included |
| AR-PV-02 | Neutral wording, genuine Proceed/Decline choice | Content Warning Modal | Included |
| AR-PV-03 | Blur/suppress by default | Dashboard (queue thumbnails); Review Workspace (video default) | Included |
| AR-PV-04 | Fine-grained self-controlled blur slider, defaults to 100% | Review Workspace | Included |
| AR-PV-05 | Grayscale toggle | Review Workspace | Included |
| AR-PV-06 | Independent audio mute | Review Workspace | Included |
| AR-PV-07 | Content revealed only after deliberate proceed | Content Warning Modal → Review Workspace (blur slider is the deliberate reveal act) | Included |
| AR-PV-08 | Active acknowledgement required before raw content is revealed, and again after returning to a protected state | Content Warning Modal (consent checkbox); AI/STT Failure State (same checkbox, severity-unknown variant) | Included |
| AR-AI-01 | Display AI severity/CVI rating | AI Analysis Summary; Severity Adjustment & Comment | Included |
| AR-AI-02 | Narrative summary before raw-content review | AI Analysis Summary; Review Workspace (recall, collapsible AI Summary accordion) | Included |
| AR-AI-03 | Incident timeline with timestamps | AI Analysis Summary; Review Workspace | Included |
| AR-AI-04 | Timeline marks every flagged incident, no minimum duration | AI Analysis Summary | Included |
| AR-AI-05 | Flagged entities linked to timestamps | AI Analysis Summary; Content Warning Modal (tag pills, classification only); Review Workspace (recall) | Included |
| AR-AI-06 | Transcript + audio-intensity graph | AI Analysis Summary; Review Workspace (transcript + collapsible audio-intensity accordion) | Included |
| AR-AI-07 | Auditor may override CVI; comment required if changed | Severity Adjustment & Comment | Included |
| AR-AI-08 | Both AI and Auditor-adjusted values stored | Severity Adjustment & Comment; Submission Confirmation | Included |
| AR-AI-09 | Auditor submits assessment to Manager queue | Submission Confirmation | Included |
| AR-AI-10 | AI/STT pre-screen failure → max blur, explicit failure state, deliberate choice | AI/STT Failure State | Included |
| AR-AI-11 | Mid-review AI/STT failure treated as unexpected exposure | AI/STT Failure State (mid-review variant, treated as SOS-equivalent) | Included |
| AR-AI-12 | Timestamped audit history of severity/override/comment/status changes | Severity Adjustment & Comment; Submission Confirmation (data-handling requirement, not a distinct visible screen) | Included |
| AR-AI-13 | Return to previous review step without losing progress; no auto-replay of raw content | Review Workspace (Back to AI Analysis Summary); Severity Adjustment & Comment (Back to Review Workspace, preserves CVI/comment) | Included |
| AR-AI-14 | Auditor selects a final case outcome for standard (no SOS/Decline) cases — determines the public-facing result (`UR-ST-03`) | Severity Adjustment & Comment (selector); Submission Confirmation (recorded in summary) | Included |
| AR-WB-01 | Track daily exposure time, display progress | Header exposure indicator, all screens; Dashboard; Review Workspace (per-case breakdown) | Included |
| AR-WB-02 | 120-minute default daily cap | Header exposure indicator | Included |
| AR-WB-03 | At-limit blocks further normal assignment | Exposure Limit Reached | Included |
| AR-WB-04 | Cooldown enforced after high-severity/unexpected exposure | Cooldown Screen | Included |
| AR-WB-05 | Immediately accessible SOS action | Review Workspace (persistent SOS button) | Included |
| AR-WB-06 | SOS records event, notifies Manager | SOS Trigger & Confirmation | Included |
| AR-WB-07 | Unexpected exposure logs, applies protections, emails Manager | SOS Trigger & Confirmation; AI/STT Failure State (mid-review variant) | Included |
| AR-WB-08 | Wellbeing outranks moderation speed | Reflected throughout — most explicitly Cooldown, SOS, Exposure Limit Reached | Included |
| AR-WB-09 | SOS pauses playback, returns to protected state, requires new Proceed to resume | SOS Trigger & Confirmation | Included |
| AR-WB-11 | Four-tier S1–S4 exposure-severity classification | Dashboard (severity tags); Content Warning Modal (S-tier + CVI); AI Analysis Summary; Cooldown Screen | Included |
| AR-WB-12 | Cooldown duration by tier; post-cooldown S3/S4 exclusion | Cooldown Screen (S4-variant); Dashboard (Cooldown-active state) | Included — review-block window value still open, see below |
| AR-WB-15 | Worst-tier-wins whole-case severity | Dashboard (severity tag); Content Warning Modal; AI Analysis Summary | Included |
| AR-WB-16 (Nice-to-Have) | Optional, low-friction wellbeing check-in, distinct from SOS | Wellbeing Check-in; real click-through entry point at Review Workspace, with a return path back | Included |
| AR-DF-01 | Auditor may decline instead of proceeding | Content Warning Modal (Decline path) | Included |
| AR-DF-02 | Declined case routes directly to Manager, no auto-reassignment | Decline Confirmation | Included |
| AR-DF-03 | Structured decline reason + optional free text, no default | Decline Reason Modal | Included |
| AR-DF-04 | Interface explains decline is a supported wellbeing action | Decline Reason Modal; Decline Confirmation | Included |
| AR-DF-05 | Decline workflow lower implementation priority | — | Priority/sequencing note, not a screen-level requirement |

---

## Assumptions & Open Decisions (for the team)

1. **`AR-WB-12` review-block window** — the working range is ~45–50 minutes; needs one final agreed value before Dev implements the S2 repeated-exposure trigger (`docs/ba/persona-requirements-week2.md` Week 3 follow-up #6). Still **OPEN**.
2. **`AR-WB-11` tag-to-tier / minimum-severity floor taxonomy** — still **OPEN**: the exact confidence/qualification mechanism for a "credible" vs. staged/toy `weapon_use` detection remains to be confirmed with Aiden against the real pipeline output. (The tag-floor rule itself is settled — see the severity-scale doc.)
3. **Login lockout threshold** — exact failed-attempt count and lockout duration not yet specified; `AR-AS-06` explicitly defers this to a later security spec. The Locked-out screen uses illustrative copy only.
4. **Max raw-video file size** — still a Week 3 Dev follow-up (shared with the Normal User file's `UR-VU-07`). Affects how reliably the Look-Ahead Assignment Check (Exposure Limit Reached) can compare a case's duration against remaining budget.
5. **No companion Manager Figma file exists yet.** Every screen in this file that describes a Manager-side destination — "moved to your manager's review queue" (Submission Confirmation), "notified your manager" (SOS), "your manager will review it directly" (Decline Confirmation) — is copy-only; there's nothing to click through to on the Manager side yet. `MR-OV-*`, `MR-SOS-*`, and `MR-CR-*` all remain unbuilt in Figma.

---

### Traceability
- Built from: `auditor-prototype-plan.md` (Aleeya Ahmad, UX — reviewed and signed off by Jana Begum, BA, 1 Sep 2026), itself built on `docs/ba/persona-requirements-week2.md` (Jana Begum, BA) and the `docs/ux/auditor-assumptions-note-sprint1-week2.md` research note in this repo.
- All 46 `AR-*` IDs in `docs/ba/persona-requirements-week2.md` are accounted for above — none silently dropped; `AR-DF-05` is a priority/sequencing note, not a screen-level requirement, and is flagged as such rather than omitted.
- **Action for Dev:** treat the table above as the build spec — every row is Included, not Deferred. Items still marked OPEN in "Assumptions & Open Decisions" need sign-off before their exact values are locked in.
