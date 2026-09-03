> ℹ️ This is the first full build of the Manager prototype, from a planning document (`manager-prototype-plan.md`, Aleeya Ahmad, UX) built on [`docs/ba/persona-requirements-week2.md`](https://github.com/firasvahora1095/IBM-RCS-Infrastructure-Team-2/blob/main/docs/ba/persona-requirements-week2.md) (Jana Begum, BA). All 22 `MR-*` IDs are traced. The client explicitly declined to demo the Manager role and told the team to design it from imagination, so this file carries more `[UX judgment call]` decisions than the Auditor file — each one is called out below, not silently absorbed. A handful of items are genuinely still open pending Week 3 Dev/pipeline confirmation — see "Assumptions & Open Decisions" below. Team feedback is being requested on this draft.

# Manager Prototype — Handoff (Sprint 1, Week 3)

**Track:** Design / Product · **Sprint:** Sprint 1, Week 3 · **Owner:** Aleeya Ahmad (UX)
**Figma file:** [RCS Manager Prototype — Sprint 1](https://www.figma.com/design/0qMhTLDlozGkcdqcgbwyse)
**Planning source:** `manager-prototype-plan.md` (Aleeya Ahmad, UX — built on `docs/ba/persona-requirements-week2.md`, Jana Begum, BA)

---

## What this is

A clickable Figma prototype of the Manager (oversight lead) flow: exposure/workload monitoring across roughly ten Auditors, SOS alert response, and declined-case reassignment. Unlike the Auditor's single linear click-path, the Manager's flow is fundamentally **a dashboard the Manager returns to repeatedly**, with independent sub-flows branching off it rather than one start-to-finish journey — Oversight, SOS, Case Review/Reassignment, and Exceptional Raw-Content Access. The design principle carried over unchanged from the Auditor file: wellbeing outranks moderation speed (`MR-OV-06`, `MR-CR-05`) — the Manager makes almost every routine decision from structured AI/Auditor context, **without needing to view raw harmful content by default**.

No real Managers were interviewed for this project — the client deliberately left the role undesigned as a genuine gap, not an oversight — so the three working postures behind this design (Jordan: reactive/incident-centred, Reese: proactive/oversight-centred, Sam: reassignment-and-fairness-centred) are a team-defined working hypothesis, not validated fact. Reese's calm, glanceable "default working register," punctuated only occasionally by the urgent register Jordan's SOS persona lives in, is the reasoning behind keeping SOS alerts visually loud and routine wellbeing check-ins deliberately quiet — the same screen shouldn't ask the Manager to context-switch into "emergency mode" for something that isn't one.

Built on IBM Carbon Design System (v11) tokens throughout — the same token set as the Auditor file, reused directly rather than hand-reconstructed, to guarantee visual consistency across the two prototypes. Blue 60 is reserved exclusively for interactive/actionable elements — never applied to static text, badges, or non-interactive decoration.

**Platform assumption:** standard responsive web application, desktop-first (1280px-wide build canvas, following Carbon's 16-column grid), not mobile-first — the requirements doc doesn't mandate a device, same assumption as the Auditor file.

---

## Build & self-review notes (pre-Draft-1 QA)

Before this draft went to the team, it went through the same kind of review pass the Auditor file received across its Round 2–13 iterations — done in one internal sweep here since there's no team feedback yet to respond to round-by-round. Documented honestly so the team can see what's already been checked, not just what's being asked about:

- **No dead ends — full click-graph audit.** Every screen's actual wired `reactions` were catalogued, not just visual appearance. Found and fixed one real dead end: Login — Error state's "Log in" button had zero wired reactions; wired it to Dashboard, simulating a successful retry after correcting credentials. Login — Locked-out correctly has **no** wired action — the button is disabled during lockout, which is accurate security behaviour, not a gap.
- **Accessibility — two real WCAG 2.2 AA contrast failures found and fixed.** (1) Warning-yellow (`#f1c21b`) used as raw text fill on white background in four places — measured ~1.7:1, badly failing the 4.5:1 minimum. Fixed by switching to Gray 100 text; the colour-coding is still conveyed via the adjacent Tag/chip component, consistent with the file's "colour is never the sole signal" principle. (2) The Header's "Sign out" link used interactive Blue 60 text on the dark Gray 100 header background — Blue 60 is calibrated for light backgrounds (5.04:1 on white) but only ~3.49:1 on dark Gray 100, failing 4.5:1. Fixed at the `Header=Manager` master component (propagates everywhere): white text + underline instead of colour-only signalling.
- **InlineNotification contrast — two further failures found on top of the above**, since this file inherited the component by direct reuse from the Auditor file: Success-tone and Error-tone prefix text used their accent colour on a pale tint background, measuring ~3.0:1 and ~4.28:1 respectively. Fixed at the master component and at every individual instance already placed on real screens (Login Error, Login Locked-out, both 6A.2 edge-case screens) — master-level propagation alone did not reach existing instances. The same fix was carried back to the source Auditor file, since it inherited the bug there too (see the Auditor handoff doc's Round 13 entry).
- **Row-highlight contrast convention.** The flagged-row background on Case Oversight (Gray 20, `#e0e0e0`) numerically passed WCAG AA (~13:1) but is conventionally reserved for borders/disabled states in Carbon, not full-row highlight tints — too heavy a wash regardless of passing contrast math. Lightened to Gray 10 (`#f4f4f4`); still clearly distinguishable via the tint + left-accent bar + flag chip together.
- **Button hierarchy — one Primary per screen, with one documented exception.** Auditor Detail's exposure-limit and break-request actions both started as Primary buttons. Resolved to **Approve = Primary, Save limit = Secondary** — Approve (responding to an actual pending break request) is the action a Manager landing on this screen right now is more likely to have come to complete, versus Save limit, a routine/optional admin task not necessarily needed on any given visit. "Primary action" here means the action that completes the user's current goal, not necessarily the one named in the screen's title. Content Warning Modal's Proceed/Decline (5.4a) is a deliberate, justified exception — both genuinely equal-weight per `AR-PV-02`'s "genuine choices" requirement, not an oversight.
- **Back-navigation, added where justified, mirroring the Auditor file's `AR-AI-13` pattern.** Added an explicit "← Back to SOS Alert Detail" tertiary button on SOS Acknowledge & Follow-up (previously the only way back was a breadcrumb that jumped past the immediate previous step straight to SOS Inbox), and "← Back to Case Review Detail" on Reassignment Action, near the decision panel — justified because the Manager may be mid-way through the Auditor-selection dropdown and want to recheck the decline comment. Two intentional exceptions, verified against the same Auditor-file precedent rather than assumed: the Exceptional Raw-Content Access AI Analysis Summary screen (5.4b) has no back-link, mirroring the Auditor file's own considered Round 5 decision not to add one at the equivalent full-disclosure screen (avoids a re-disclosure loophole); the Content Warning Modal (5.4a) has no back/dismiss, since Decline itself *is* the exit-without-proceeding path.
- **Sign-out wiring completeness.** "Sign out" is baked into the `Header=Manager` master component, so it's visually present on every header-bearing screen — but an initial pass had only wired the click reaction on the screens built up to that point in the session, leaving 7 screens built afterward with a Sign out link that looked clickable but did nothing. A full-file interactive-element audit (not just spot checks) found and fixed all 7; all 14 header-bearing screens now navigate to Login on sign-out.
- **No emoji.** A full scan across all five pages confirmed zero emoji-range characters; the Search and Overflow-menu icons are real vector glyphs, not text-character stand-ins.

---

## File structure

The Figma file has 5 pages, matching the same systemization pattern used on the Auditor and Normal User files:

1. **00 — Cover** — project title, scope, flow summary, and pointers to the plan/requirements docs and this handoff doc.
2. **01 — Foundations** — the same Carbon token set as the Auditor file, carried over directly: 16 colours (interactive Blue 60, grayscale, 4 support/status colours, 4 severity-tier colours), 9 spacing values (Carbon 2×Grid), 9 text styles (IBM Plex Sans/Mono productive type ramp).
3. **02 — Components** — the Auditor file's real component library, reused directly, plus Manager-specific additions: Button (Primary/Secondary/Tertiary/Danger), Tag (S1–S4 severity + Info/Success/Warning/Error status), InlineNotification (4 tones), ProgressBar (exposure indicator), Toggle, IconButton, blur-intensity Slider, RadioButton, TextArea, SOS Button, Header/UIShell (Manager variant, persistent nav + exposure/oversight indicator), Modal shell, DataTable row, Breadcrumb, the Requirements Panel annotation component — plus new Manager-only components: `TopNav` (5 tabs: Dashboard / Case Oversight / SOS Inbox / Reassignment Queue / Validation), `OverflowMenu`, `Search`, `Filter`, `SOSBanner` (persistent, urgent-tone), and a lightweight Carbon-token `ValidationBarChart` (built as a `DataTable` + CSS bars, not the separate `@carbon/charts` library, per the plan's own resolved decision to keep the dependency footprint light).
4. **03 — Prototype** — 23 screens/states across 4 build phases plus 1 documentation-only reference frame (24 built frames total), each with its own on-canvas Requirements Panel directly below it — same annotation convention as the Auditor and Normal User files. Fully click-linked as a Figma prototype, flow starting point set to Login.
5. **04 — Handoff** — Design rationale, Open Decisions, a full 22-row `MR-*` traceability matrix, an Accessibility report, a Handoff-for-the-developer section, and (new as of Round 2) an Iteration History log, consolidated onto their own page, off-canvas from the shippable screens — matching the Auditor file's own convention of starting that log once team-feedback rounds begin.

---

## The screens (23 screens/states, Login + 4 build phases)

**Login:**
1. **Login** — Default, Error (invalid credentials), and Locked-out states — shared Login/auth pattern with the Auditor file.

**Phase M1 — Oversight core:**
2. **Oversight Dashboard** — Auditors under this Manager's oversight, exposure progress bars, Under/Approaching/At-limit visual states, active-cooldown rows.
3. **Auditor Detail** — per-Auditor drill-down: exposure/limit summary, individually adjustable exposure limit, recent activity, pattern-flagged marker, embedded Wellbeing Check-in section (routine check-ins + break requests, distinct from SOS). Round 3: both the exposure-limit "Save limit" and break-request "Approve" actions are now wired to their own minimal confirmation states (**Exposure limit saved**, **Break request approved**) — previously dead despite `MR-OV-04`/`MR-SOS-07` reading Included.
4. **Consolidated Case Oversight** — broader case-level visibility across all Auditors, with flagged (SOS/Declined) rows visually distinguished, search/filter. Round 3: the SOS- and Declined-flagged rows are now wired to SOS Alert Detail and Case Review Detail respectively — previously dead despite being this screen's stated purpose.

**Phase M2 — SOS:**
5. **SOS Alert Banner** *(documentation reference frame, not a standalone screen — the banner itself is a persistent element retrofitted onto Dashboard/Auditor Detail/Case Oversight/SOS Inbox)*.
6. **SOS Inbox** — unacknowledged, acknowledged-in-progress, and resolved SOS events in one queue. Round 3: a second Acknowledge button and two persistent-nav tab reactions, both previously dead, are now wired.
7. **SOS Alert Detail** — exposure/case/AI-severity context for the affected Auditor, without requiring raw source-video viewing, Acknowledge action. Round 3: gained the same low-prominence exceptional raw-content-access link already present on Reassignment Action, closing a gap between this screen's own copy and its actual affordances.
8. **SOS Acknowledge & Follow-up** — follow-up note + structured outcome options, logs the response.

**Phase M3 — Case review & reassignment:**
9. **Case Review Detail** — AI-output panel, Auditor assessment/comment, decline reason, entry point into the reassignment decision.
10. **Declined/Reassignment Queue** — declined cases awaiting a Manager decision; deliberately **no** aggregated per-Auditor decline-count column (`MR-CR-04`/`AR-DF-03` no-scrutiny principle).
11. **Reassignment Action** — inline SLA/exposure context for the declining Auditor and candidate Auditors, Reassign-vs-No-reassignment decision panel, low-prominence escape-hatch link to exceptional raw-content access. A required note field and a second state, **Reassignment Action — No-Reassignment Confirmation** (5.3b, added Round 2), now gate the "Confirm no reassignment" action instead of it navigating straight to the queue with no confirmation. Round 3 added a third state, **Reassignment Action — Reassignment Confirmed** (5.3c), gating "Confirm reassignment" the same way 5.3b already gates "Confirm no reassignment" — previously that button navigated straight to the queue with no confirmation at all.
12. **Exceptional Raw-Content Access — Content Warning Modal** — adapted from the Auditor file's own screen, same protections, Manager-appropriate framing.
13. **Exceptional Raw-Content Access — AI Analysis Summary** — adapted, header swapped to Manager.
14. **Exceptional Raw-Content Access — Review Workspace** — adapted; SOS button, wellbeing check-in link, and live exposure counter deliberately **removed** (none apply to a Manager's own rare exceptional-viewing session — the plan's resolved decision explicitly rules out an exposure counter/cap here). Its exit button's wiring was already correct (back to Reassignment Action) but was labelled with leftover Auditor-file terminology ("Continue to severity & comment," a screen that doesn't exist here); relabelled to "Return to reassignment decision" (Round 2 fix).
15. **Validation View** — AI pipeline output vs. manually labelled ground truth on the project's synthetic/staged validation set, with a mandatory placeholder/mock-data banner and a text-equivalent panel for the bar chart.

**Phase M4 — Edge cases:**
16. **Session-expired-reauth** — in-context modal over a paused SOS Follow-up form (preserves in-progress notes, not blur/grayscale state — the Manager equivalent isn't reviewing raw content by default).
17. **Exposure limit save fails** — InlineNotification error state, entered value retained, retry action. Round 3: brought to full-screen parity (Header=Manager, Sign-out, breadcrumb) matching every other screen's baseline, per the Auditor file's own equivalent edge-case screens (4.6/6.1/6.2) precedent — remains intentionally unreachable from the main click-path, matching that same precedent (not a gap). "Save limit (retry)" is now wired to the same success confirmation a first-try save reaches.
18. **Reassignment target unavailable** — InlineNotification error state ("this Auditor is no longer available — please choose another"). Round 3: same full-screen-parity treatment as item 17, plus a real "Choose another Auditor" button (previously none existed) wired back to Reassignment Action.

*(18 named screens above; Login's 3 states, Reassignment Action's 3 states (5.3a/b/c — b added Round 2, c added Round 3), and Auditor Detail's 3 states (Default plus 2 new Round 3 confirmation states) bring the total to the 23 stated at the top of this section — see the Figma file's own screen list for the exact count, plus the 1 documentation-only SOS Banner reference frame, for 24 built frames total.)*

---

## Design system tokens used

- **Colour:** Blue 60 `#0f62fe` (interactive-only — buttons, links, active slider fill/handle, focus states). Gray 10/20/30/50/70/100 (backgrounds, borders, text). Support colours: Red 60 (error), Green 50 (success), Yellow 30 (warning, paired with Gray 100 text), Blue 70 (info, and the exposure ProgressBar's decorative fill — deliberately not interactive Blue 60, since it isn't clickable). Severity tiers: S1 Gray 20, S2 Yellow 30, S3 Carbon Orange 40 `#ff832b`, S4 Red 60 — same resolved palette as the Auditor file.
- **Type:** IBM Plex Sans (UI text — Regular/Medium/SemiBold), IBM Plex Mono (case IDs, raw CVI numbers, matching Carbon's `code-01`/`code-02` convention).
- **Spacing/grid:** Carbon 8px 2×Grid (2–48px range), 16-column responsive grid for dashboard/queue layouts.
- **Component fidelity:** real Carbon-pattern components throughout (see Components page), reused directly from the Auditor file's own component set rather than hand-reconstructed, plus the Manager-only additions listed under File structure above.
- **Accessibility:** colour is never the sole status signal (every severity tag/notification pairs colour with text/icon; flagged Case Oversight rows pair tint with a left-accent bar and flag chip); the exposure ProgressBar uses Support Info Blue 70, not interactive Blue 60; Sign-out on the dark header uses white text + underline rather than colour alone. Full detail on the Handoff page's Accessibility report and the Build & self-review notes above.

---

## Round 2 update (team feedback incorporated)

Two pieces of team feedback landed on Draft 1, both pointing at real gaps rather than surface nitpicks — assessed and fixed directly in the Figma file, not just written up here.

**No-reassignment outcome was genuinely unclear — real gap, now closed.**

> Team feedback (Firas): "If the Manager clicks 'Confirm No Reassignment', does that mean the case is just closed as is? Right now, it just redirects to the dashboard, which means the case is finalized based on the initial AI output?"

Confirmed directly against the live prototype: Reassignment Action's "No reassignment needed" option had caption copy promising a required audit-trail note ("A brief required note is captured for the audit trail if this option is chosen instead") with no actual text-input field to enter one, and "Confirm no reassignment" navigated straight back to the Declined/Reassignment Queue with zero confirmation step — nothing shown, nothing logged, no stated outcome. That's exactly what made it read as "closed on the initial AI output alone." Neither `MR-CR-03` nor `MR-CR-04` specify a post-decision outcome, but `MR-CR-06`'s framing (standard cases auto-progress "with no active Manager approval" — implying declined cases specifically *do* need it) rules out silent AI-only closure as correct behaviour here.

What changed:
- **Added a required `TextArea` field** (reused directly from the file's own component set — the same component already used on Auditor Detail's Wellbeing Check-in section, not a new one) under the "No reassignment needed" option, so the note the caption already promised can actually be entered. Tightened the caption to match reality.
- **"Confirm no reassignment" no longer navigates straight to the queue.** It now opens a new state, **Reassignment Action — No-Reassignment Confirmation (5.3b)**, which echoes back the case ID and the Manager's note verbatim, states plainly the case is not auto-closed/marked Complete by this action, and only then offers a "Return to Dashboard" button. Modelled on this file's own SOS Acknowledge & Follow-up ("logs the response") pattern and the Auditor file's Submission Confirmation ("what was recorded" echo-back) pattern — reusing established patterns, not inventing a new one.
- **`[UX judgment call]`: what "no reassignment" means downstream is deliberately left open, not hard-coded.** The literal semantic opposite of "Confirm reassignment" (move to a different Auditor) most naturally reads as "return this case to the original declining Auditor" — but the Auditor file's own Decline Reason Modal includes wellbeing-motivated decline reasons (e.g. "Personal trigger"), and unconditionally routing a case back to the Auditor who declined it for that reason would cut directly against this file's own north-star principle (`AR-WB-08`/`MR-OV-06`: wellbeing outranks moderation speed). Rather than silently picking a rule the BA doc doesn't specify and a static prototype can't enforce conditionally, 5.3b's copy deliberately does **not** assert a specific downstream owner — it states only that the decision and note are logged and the case remains active, not Complete. Logged as a new, genuinely open item below.

**Exceptional raw-content access exists but the exit button was mislabelled — real bug, now fixed.**

> Team feedback: "As mentioned in MR-CR-08, viewing the raw footage is allowed in exceptional cases. Are we excluding these exceptional cases from the prototype for now?"

Not excluded — all three screens (Content Warning Modal, AI Analysis Summary, Review Workspace) already existed and are listed as screens 12–14, reachable via a real, if intentionally low-prominence, link on Reassignment Action ("View raw content (exceptional access, same protections as an Auditor)"), consistent with `MR-CR-05`/`MR-CR-08`. Tracing the flow to its actual end turned up why it reads as excluded: the Review Workspace's exit button was labelled **"Continue to severity & comment"** — literal Auditor-file terminology, describing a screen ("Severity Adjustment & Comment") that doesn't exist anywhere in the Manager screen set. Checked the button's actual wiring before touching it: it was **already correctly wired back to Reassignment Action** — only the label was wrong, not a dead click. A Manager reaching the end of the one flow this feedback asks about would still land somewhere correct, but the label itself made the flow look broken or borrowed from the wrong prototype.

What changed:
- **Relabelled the button** from "Continue to severity & comment" to "Return to reassignment decision." No rewiring needed — the destination was already right.
- Confirmed no other Manager-inappropriate Auditor terminology exists on the Content Warning Modal, AI Analysis Summary, or Review Workspace screens, and that the "Back to AI Analysis Summary" button on Review Workspace was already correct and unaffected.

---

## Round 3 update (full end-to-end completeness audit)

Prompted by a self-initiated, full click-graph audit ahead of build sign-off, not by team feedback — every one of the file's built frames had its actual wired `reactions` catalogued directly (not inferred from appearance), cross-checked against screenshots and against the Auditor file's own more mature, 14-round precedent for how this project handles analogous situations. Seven real issues found and closed; one further consequence surfaced by fix #7 is logged as a new Open Decision rather than force-fixed, since a static prototype can't build it.

**Auditor Detail: two live-looking buttons were completely dead — and the Traceability Table had been claiming both were Included the whole time.** "Save limit" (`MR-OV-04`) and "Approve" (`MR-SOS-07`) had zero wired reactions, sitting directly beside a routine check-in row that's correctly non-interactive by design. Worth stating plainly: both requirement rows below have read "Included" since Draft 1 despite the literal control implementing each one being dead — a traceability-table false-positive, not just a UI gap. Fixed with two new minimal states cloned from Auditor Detail, kept deliberately separate rather than combined into one — combining "limit saved" and "break approved" into a single confirmation would falsely assert both happened together when a given visit may only involve one: **Auditor Detail — Exposure limit saved** (adds a Success InlineNotification near the exposure-limit control only) and **Auditor Detail — Break request approved** (the Wellbeing Check-in section's "Break requested [Approve]" row becomes a "Break approved" status tag). Nothing else changes on either. "Save limit" and "Approve" now route to their respective new state; both clones were verified to keep `Header=Manager` as a linked instance, not a detached copy, after the Auditor file's own Round 13 hit exactly that failure mode.

**SOS Inbox: a second, visually-identical Acknowledge button was dead.** Jordan Lee's row worked; Marcus Webb's — same style, same weight — silently did nothing. Wired to the same representative SOS Alert Detail destination Jordan Lee's already uses, consistent with this file's existing one-representative-destination convention (Declined/Reassignment Queue, Auditor Detail, Case Review Detail all already work this way — both SOS rows landing on identical content is the established pattern, not a bug).

**SOS Inbox's persistent nav was missing two tab reactions that work on every other screen.** Directly compared against Consolidated Case Oversight's TopNav instance: everywhere else in the file, only the current tab is correctly unwired. On SOS Inbox specifically, the Dashboard and Case Oversight tabs were also dead — an isolated defect on this one screen's nav instance, not a file-wide pattern. Wired to match every other screen (Dashboard → Oversight Dashboard, Case Oversight → Consolidated Case Oversight).

**Consolidated Case Oversight's own flagged rows — the ones the screen exists to surface — had zero click reactions.** The SOS-flagged and Declined-flagged rows (each visually distinguished per this screen's stated purpose) led nowhere; standard rows correctly remain non-interactive per `MR-CR-06`'s auto-progress principle and `MR-CR-04`/`AR-DF-03`'s no-aggregated-scrutiny stance, so no change there. Wired the SOS row to SOS Alert Detail and the Declined row to Case Review Detail, reusing the same representative-destination convention used everywhere else in this file.

**Reassignment Action: "Confirm reassignment" had the same unconfirmed dead-end Round 2 already fixed on its sibling button — just left in place on the more consequential action.** "Confirm no reassignment" got a required note and a confirmation state (5.3b) in Round 2; "Confirm reassignment" — which actually changes case ownership — still navigated straight to the queue with no confirmation at all. Closed the same way: added **Reassignment Action — Reassignment Confirmed (5.3c)**, echoing back the case ID and the newly-assigned Auditor's name, stating plainly the case is now active in that Auditor's queue and not yet auto-marked Complete (mirroring 5.3b's own framing and `MR-CR-06`), then "Return to Dashboard." Unlike 5.3b, this one carries no open `[UX judgment call]` about downstream ownership — reassigning to a specifically named Auditor isn't ambiguous the way "no reassignment" was.

**Two of the file's own counted screens were bare content fragments, not real builds.** "Exposure Limit — Save fails" and "Reassignment target unavailable" (items 17–18 above) were each ~900×360px — an italic caption plus one bordered panel, no `Header=Manager`, no Sign-out, no breadcrumb, and in the second case, no button at all — while every other screen in the file is a full 1280px build. Checked the Auditor file's four equivalent edge-case screens (4.6, 6.1, 6.2 ×2) directly for precedent before touching anything: all four also have zero incoming clicks from the main flow — this project's established convention is that system-triggered edge cases (a real network failure, a real session timeout) aren't something a user clicks their way into, and that's correct, not a gap. But every one of those four Auditor-file frames still has a full header, Sign-out, and a real working exit — none of them are bare stubs. Brought both Manager frames up to that same full-screen baseline (Header=Manager with wired Sign-out, breadcrumb, full-width build) without adding an artificial "simulate failure" entry link into either — doing so would deviate from, not match, this project's own precedent. "Save limit (retry)" now routes to the new Auditor Detail — Exposure limit saved state (a successful retry should land on the same confirmation a first-try success does, matching how Login Error's own retry lands on Dashboard rather than a neutral screen); "Reassignment target unavailable" gained a real "Choose another Auditor" button routing back to Reassignment Action.

**SOS Alert Detail's own on-screen copy asserted an exceptional-access path exists with no way to reach it.** The screen states raw-content access is "a separate, deliberate path if genuinely needed," but carried no link to it — only Reassignment Action's low-prominence escape hatch actually existed. Added the identical low-prominence "View raw content (exceptional access, same protections as an Auditor)" link, wired to the same Content Warning Modal used elsewhere. **Flagged, not silently patched over:** the Content Warning Modal's Decline button and the Review Workspace's exit button are each a single wired reaction, hardcoded to return to Reassignment Action — a Manager entering the exceptional-access flow from this new SOS link and then declining or exiting will still land on Reassignment Action, a screen with no bearing on the SOS case they came from. A static prototype can't conditionally route one button by entry point; this is the same class of limitation Round 2 already named rather than papered over for the no-reassignment downstream-routing question. Logged as a new, genuinely open item below rather than forced into a fix that isn't really buildable here.

**Scoped out, deliberately, not silently:** a Dashboard/SOS-Inbox zero-alerts empty state (no requirement calls for it, and three dedicated edge-case screens already cover this territory), an Auditor-side AI/STT-failure or connection-lost equivalent for the Manager's own exceptional raw-content viewing (`MR-CR-07`'s explicit lower-priority framing, and the Manager's raw-content viewing is rare/exceptional by design, unlike the Auditor's continuous exposure to the pipeline), and a drill-down affordance for SOS Inbox's already-"Acknowledged"/"Resolved" rows (Priya Shah, Sam Nguyen — real and defensible, but deferred rather than ballooning this round's scope) — all considered, none built, all recorded here rather than left unaddressed.

Also checked and confirmed still solid, no action needed: Login's 3 states, the exceptional-access trio (Content Warning Modal / AI Analysis Summary / Review Workspace — Round 2's fixes hold up), Session-expired-reauth (matches the Auditor file's own Round-11-fixed pattern exactly — stated identity, preserved notes, a decline path; being unreachable via click is *correct* here too, matching Auditor's own `6.1` precedent, not a gap), Case Review Detail, Validation View, and the one-representative-row-wired-per-list pattern on Dashboard and Declined/Reassignment Queue (deliberate, consistent prototype fidelity, not a bug).

---

## Round 4 update (BA/PM decisions close 5 open items)

Hyuna (PM) sent a batch of decisions resolving several items that had sat open in the Assumptions & Open Decisions list below — applied directly, not left as suggestions to re-confirm later.

- **`MR-OV-08` validation pass/fail threshold — retargeted to Sprint 3, not resolved with a number.** Setting a defensible threshold needs continuous testing infrastructure this project doesn't have yet; PM's call is to stop treating this as a Sprint 2 blocker. Updated the Validation View's methodology note to say so explicitly rather than leaving it open-ended.
- **Login lockout threshold — closed: 5 failed attempts, 15-minute lockout**, aligned with `UR-ST-07`'s existing rate-limiting precedent on the Normal User file (a reasonable default already established elsewhere in the system, not invented fresh for staff login). Locked-out screen's illustrative "12 minutes" placeholder corrected to 15.
- **Max raw-video file size — closed: 500MB temporary placeholder**, assuming a 10–15 min 1080p MP4 baseline; Dev validates and adjusts through the real pipeline. Shared with the Auditor and Normal User files' own equivalent open items, both updated to match this round.
- **`SR-SA-02`–`04` (Staff Access & Authentication) — closed generically.** Standard token/session-based authentication is sufficient; deliberately **not** naming a specific stack in the requirements/handoff docs, per PM's own direction that pinning implementation choices into ACs is too rigid. No design change — this was already satisfied structurally.
- **No-reassignment downstream routing — closed with a concrete rule.** Selecting "No reassignment needed" now transitions the case straight to Complete; the Manager's rationale note is stored to the audit trail for the record, and the public status lookup shows "Complete" — same as any other completed case. Updated `5.3b`'s copy accordingly (it previously stated the opposite: that the case was *not* marked Complete, per the more conservative Round 2 stance before this rule existed).
- **New, narrower open question surfaced by the above, not resolved by PM's decision.** The Normal User file's `UR-ST-03` outcome-text mechanism (closed Round 6, cross-file) is scoped to *standard* cases, deriving its outcome label from the Auditor's own final-case-outcome selection (`AR-AI-14`) at submission. A case completed via this Manager no-reassignment path never goes through that selector — no Auditor ever completed a review on it — so while the case *stage* reaching Complete is now settled, what *outcome text* a Normal User actually sees for this specific path is genuinely undecided. Not guessed at; logged as a new open item below and cross-referenced in the Normal User doc.
- **Exceptional-access exit routing — closed as a Dev implementation item, not a design gap.** PM's call: Dev implements the conditional "return to actual origin screen" logic directly in code. No Figma/prototype change needed — the single hardcoded destination remains as a known, accepted static-prototype limitation.

---

## Round 5 update (no-reassignment outcome text resolved)

Closes the narrower question Round 4 surfaced rather than guessed at: what outcome text the Normal User sees when a case reaches Complete via a Manager's "No reassignment needed" decision, since that path never goes through the Auditor's own final-case-outcome selection (`AR-AI-14`) the way standard cases do.

- **Resolution: a dedicated third outcome label, not a reuse of either Auditor-determined one.** Reusing "No Violation Found" would assert a content verdict nobody actually made — the Manager's decision is a process call (whether reassignment is warranted), not a raw-content review, and the Reassignment Queue's own decline reasons aren't always about content (e.g. "Near my exposure limit," "Personal trigger"). Making the copy decline-reason-aware was considered and rejected — it just relocates the same problem into more copy variants instead of resolving it, and reintroduces exactly the branching-logic question Round 2 already declined to solve for downstream routing.
- **The label:** *"This case has been reviewed and closed. No further action is required from you."* — deliberately content-neutral, same for every decline reason. `5.3b`'s Success notification now states this is what the public status lookup shows, alongside the internal Complete/audit-trail confirmation.
- Cross-referenced in the Normal User handoff doc's own Round 8 update, where the same label was added to the outcome-preview mockup and Screen 3b's Requirements panel.

---

## Traceability Table

| ID | Requirement | Screen | Status |
|---|---|---|---|
| MR-OV-01 | Dashboard shows Auditors under oversight + workload/exposure info | Oversight Dashboard | Included |
| MR-OV-02 | Exposure progress indicator per Auditor | Oversight Dashboard | Included |
| MR-OV-03 | Active cooldown status + remaining time, where applicable | Oversight Dashboard (cooldown-active row) | Included |
| MR-OV-04 | Manager sets/adjusts individual Auditor exposure limit | Auditor Detail | Included |
| MR-OV-05 | Visually distinguish comfortably-below / approaching / at limit | Oversight Dashboard (3-state colour system, Approaching = 75%, At Limit = 100%) | Included |
| MR-OV-06 | Broader role-based visibility than Auditors | Oversight Dashboard; Consolidated Case Oversight | Included |
| MR-OV-08 | Distinct validation view vs. live oversight, AI output vs. ground truth | Validation View | Included — placeholder/mock data explicitly labelled; pass/fail threshold open, see below |
| MR-SOS-01 | SOS notifies Manager, event available for follow-up | SOS Inbox; SOS Alert Detail | Included |
| MR-SOS-02 | Unexpected exposure triggers an email notification to the Manager | — | Included by design omission (background/system behaviour, not a distinct visible screen) |
| MR-SOS-03 | Unresolved SOS appears as a visually urgent in-app banner | SOS Banner (persistent, on Dashboard/Auditor Detail/Case Oversight/SOS Inbox) | Included |
| MR-SOS-04 | Manager acknowledges SOS, records follow-up begun | SOS Alert Detail (Acknowledge); SOS Acknowledge & Follow-up | Included |
| MR-SOS-05 | SOS view shows exposure/case context without requiring raw video by default | SOS Alert Detail | Included |
| MR-SOS-06 | Manager follows up with the affected Auditor | SOS Acknowledge & Follow-up | Included |
| MR-SOS-07 (Nice-to-Have) | View an Auditor-raised wellbeing check-in/break request, distinct from SOS | Auditor Detail (embedded Wellbeing Check-in section) | Included |
| MR-CR-01 | Review AI output, Auditor assessment/comments, adjusted severity/CVI | Case Review Detail | Included |
| MR-CR-02 | Declined case appears in Manager review/reassignment queue | Declined/Reassignment Queue | Included |
| MR-CR-03 | Decide reassignment using comments, exposure/SLA info, AI output | Reassignment Action | Included |
| MR-CR-04 (Nice-to-Have) | Queue displays structured decline reason + optional comments | Declined/Reassignment Queue | Included |
| MR-CR-05 | Routine reassignment decisions possible without viewing raw footage | Case Review Detail; Reassignment Action | Included |
| MR-CR-06 | Standard (no SOS/Decline) cases auto-progress to Complete, no active Manager approval; remain visible in consolidated view | Consolidated Case Oversight (2 example rows) | Included |
| MR-CR-07 | Reassignment workflow remains lower implementation priority | — | Priority/sequencing note, not a screen-level requirement |
| MR-CR-08 | Exceptional Manager raw-content access passes through the same content-warning/exposure protections as an Auditor | Exceptional Raw-Content Access (Content Warning Modal / AI Analysis Summary / Review Workspace, adapted from the Auditor file) | Included |

---

## Assumptions & Open Decisions (for the team)

*(Items resolved across Rounds 4–5 — login lockout, max file size, `SR-SA-02`–`04`, no-reassignment outcome text, exceptional-access exit routing — have been removed from this list; the decisions and reasoning behind each are preserved in their respective Round update entries above, not repeated here.)*

1. **`MR-OV-08` validation acceptance threshold** — genuinely **OPEN**, retargeted to Sprint 3 (Round 4): setting a defensible pass/fail number needs continuous testing infrastructure this project doesn't have yet, so it's no longer a Sprint 2 blocker. No pass/fail number is shown anywhere in the file; the Validation View's placeholder/mock data stays explicitly labelled as such until a real number exists. **Owner:** Dev (Firas/Aiden) to build the continuous-testing pipeline; Jana (BA) to sign off the final threshold once real results exist — not a UX/Figma decision, nothing left to design here.

---

### Traceability
- Built from: `manager-prototype-plan.md` (Aleeya Ahmad, UX), itself built on `docs/ba/persona-requirements-week2.md` (Jana Begum, BA) and the `docs/ux/manager-assumptions-note-sprint1-week2.md` / `docs/ux/research-notes-manager-persona-week1.md` research notes in this repo.
- All 22 `MR-*` IDs in `docs/ba/persona-requirements-week2.md` are accounted for above — none silently dropped; `MR-CR-07` is a priority/sequencing note, not a screen-level requirement, and `MR-SOS-02` is a background/system-behaviour requirement with no distinct screen, both flagged as such rather than omitted.
- **Action for Dev:** treat the table above as the build spec — every row is Included, not Deferred. Items marked OPEN in "Assumptions & Open Decisions" need sign-off before their exact values are locked in.
