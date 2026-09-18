> ℹ️ **UPDATED FOR SPRINT 1 WEEK 2 — MOST OPEN ITEMS NOW CLOSED**
> This prototype was built against the Sprint 1 Week 1 baseline in `Normal User Persona Requirements-BA.md` and has since been reconciled against Jana's finalised Sprint 1 Week 2 baseline in `Requirements-BA.md`. Status-stage wording, the format/duration baseline, the data-retention rule, the max raw-video file size (500MB placeholder, Round 7), and both outcome-category labels (Round 9) are now closed decisions; only the leave-without-saving mechanism remains genuinely open — see "Assumptions & Open Decisions" below.

# Normal User Prototype — Handoff (Sprint 1, Week 1)

**Track:** Design / Product · **Sprint:** Sprint 1, Week 1 · **Owner:** Aleeya Ahmad (UX)
**Figma file:** [RCS Normal User Prototype — Sprint1 Week1](https://www.figma.com/design/WVsLoKZU9y4v75xWWSUNCv)

---

## What this is

A clickable Figma prototype of the Normal User flow: video upload → case ID confirmation → status/notification lookup and result. Built against IBM Carbon Design System tokens (not the kickoff demo UI, per the client's explicit "design your own" direction in the Sprint 1 Q&A call). No account/login exists anywhere in the flow.

**Platform assumption:** standard responsive web application, desktop-first (1280×800 build canvas — sized to fit a 14" laptop viewport without scrolling — following Carbon's own 16-column grid and breakpoint system, not mobile-first. The requirements doc does not mandate a device, so this was not assumed from the persona photos/phone references alone.

## Round 2 update (team visual-feedback pass)

Team feedback added, within the existing 3-screen structure (no new top-level screens): Screen 1 gained a trust banner, an encryption/security notice, concrete (placeholder) size/length numbers, a 500-char limit on the description field, two alternate evidence-type states (1b "Paste a link," 1c "Add a screenshot," switched by the existing chips), and two new error states (consent-required, post-upload processing failure). Screen 2 gained split email/phone fields (phone with country code), a "Copied!" confirmation, placeholder "View requirements"/"Contact support" links, and a "Submit another report" reset button. Screen 3b gained a Case Details block, a refined current-status panel, "What happens next" and "Outcome (when completed)" panels, and an "Add more information to this case" modal. All 3 screens' headers gained a "?" help button (flagged for an accessible label via a Dev note). The team's reference image (5-stage progress bar with "AI Processing"/"Assigned") was explicitly **not** adopted — kept the existing 3-stage "Received → Being Reviewed → Complete" model per UR-NFR-01 and the BA doc's own draft wording; only the reference's visual treatment (icon-per-stage, spacing, colour/text pairing) was applied. All new elements are tagged with requirement IDs (or marked as deliberate UX additions with justification) in each screen's Requirements panel.

## Round 3 update (visual polish pass)

A visual-only pass — no new features, fields, screens, or copy changes to anything already tied to a requirement ID. Still exactly 3 top-level screens and the same 3-stage status model ("Received → Being Reviewed → Complete").

- **Real icon components, everywhere.** Every status/notification badge across the file was a plain ellipse with a text character inside it (✓, !). These are now real vector icons — checkmark, exclamation (shared by Warning/Error, differentiated by badge colour), and a new **Info** glyph — built into the `Icon Badge` component (now 4 variants: Success/Warning/Error/Info) and reused everywhere via real instances, including inside `Inline Notification`'s own icon slot. Every one-off frame that was duplicating this pattern by hand (progress-indicator badges, Screen 1b/1c validation errors, the consent-required and processing-failed error cards) was converted to a real component instance — a file-wide scan now finds zero look-alike one-offs.
- **Screen 3b de-duplicated.** The status result screen showed the same "Being Reviewed" state three times in a row (progress bar → a full status card → a "What happens next" card repeating all 3 stages again). Merged the status card and the "what happens next" card into one panel: current stage stays prominent (icon + title + description), remaining stages now sit underneath as a compact "Coming up" list (icon + smaller text, no separate card). The progress bar at the top is untouched — it's the correct at-a-glance summary. Net result: Screen 3b dropped from 1290px to 1136px tall with no content lost, only the third repetition.
- **Screen 1 trust banner fixed.** The reassurance banner ("Your report is reviewed carefully and confidentially") had a stray white-filled wrapper frame sitting on top of its blue tint (a build artifact, not a deliberate layer), and used a checkmark icon, which is semantically wrong for a neutral heads-up note — nothing has succeeded yet at that point. Fixed the fill bug, swapped the icon to the new Info glyph, and moved the banner to sit after the page heading/subtitle instead of above them, matching standard page hierarchy (title establishes context first, supporting notices follow).
- **Documentation clearly separated from shippable UI.** The per-screen "Requirements traced on this screen" panels and the floating "ALTERNATE STATE —" canvas labels used to sit right next to the real screens with nothing marking them as non-product. Kept the original white panel / IBM-blue requirement-ID chips as-is (that palette read well and there was no reason to change it) and added a single small dark "INTERNAL — NOT PART OF THE UI" tag above each panel heading, plus an "INTERNAL —" prefix on each floating alternate-state label. That's the only change — same familiar colours, now unambiguously marked as reference material rather than UI.
- **Elevation audit.** Checked every Content Card and modal for consistent Carbon-style elevation (8px corner radius, subtle drop shadow). All of them already had it — no changes needed there.

## Round 4 update (Sprint 2 Week 2 requirements reconciliation)

A traceability-and-copy pass reconciling this prototype against Jana's finalised Sprint 1 Week 2 baseline in `Requirements-BA.md`, which closed or partially closed several items that were open when this file was first built. No new screens or top-level structure changes — same 3 screens, same 3-stage status model.

- **Duration/size guidance corrected.** Screen 1's helper text previously read "Max length: 30 minutes (placeholder)," framing duration as a hard cap with a fabricated number. The Week 2 baseline confirms a ~10–15 minute **target** for Sprint 2 testing — explicitly *not* a hard maximum (UR-VU-07) — so the copy now states that target and drops the invented "2GB" file-size placeholder entirely in favour of an honest "to be confirmed with Dev" note, since no real number exists yet (a genuine Week 3 Dev follow-up).
- **Status wording and outcome categories updated to closed/partially-closed.** UR-ST-02's "Received → Being Reviewed → Complete" wording is now closed and final, not pending. UR-ST-03 is partially closed: "No Violation Found" is now a confirmed literal outcome label; the exact wording of the second (action-taken) category is still open, and an escalated case is never shown as "Escalated" — it stays "Being Reviewed" until a final outcome exists. The outcome-preview mockup's disclaimer was rewritten accordingly.
- **Two new NFRs traced.** UR-NFR-04 (encryption in transit/at rest) and UR-NFR-05 (case ID as a sensitive access token — no exposure via URL query strings, analytics, or logs) are new since the Week 1 baseline. UR-NFR-04 is satisfied by the existing "encrypted and securely processed" notice on Screen 1 (previously mistagged against UR-NFR-02/03 — corrected). UR-NFR-05 is documented as a new Dev-facing annotation on Screen 3a, following the same pattern already used for UR-ST-07's rate-limiting note.
- **UR-VU-09 acknowledged.** This is a testing/QA requirement (validate the pipeline across varying video durations), not a UI element — added to the traceability table with an explicit "out of visual scope" note rather than leaving it silently absent.
- **Data-retention rule closed.** UR-NFR-03 is now a settled provisional project rule (12 months post-closure, then eligible for deletion/de-identification), not a pending Week 2 decision. It remains correctly out of visual scope — no exact figure is shown to end users.
- **Bug fix, not a requirement change:** the lock icon next to the Screen 1 encryption notice had a stray solid Blue 60 fill rendering as a plain blue square on a static, non-interactive element. Cleared the fill; the icon shapes underneath (already the correct neutral Gray 70) now render as intended.

## Round 5 update (housekeeping pass, cross-referenced against the Auditor prototype build)

A small cleanup pass while building out the companion Auditor prototype file surfaced two loose ends in this file worth closing, plus one structural addition for parity between the two files' Handoff pages.

- **Removed the untouched "Option 2" exploration.** Five frames re-exploring Screens 1/2/3a/3b/3c sat on the Prototype canvas with no documentation anywhere and no prototype links pointing to them — ambiguous whether they were a live alternate exploration or a stale leftover. Confirmed with Aleeya as stale; deleted outright.
- **Bug fix, not a requirement change:** the "PREVIEW" badge on the outcome-preview mockup (Screen 3b, "what Complete looks like") had a static, non-interactive fill in Blue 60 — the same class of bug as Round 4's lock-icon fix, just missed that pass. Recoloured to neutral Gray 20 fill / Gray 70 text.
- **Added a full per-ID traceability table directly on the Figma Handoff page** ("03 — Annotations & Handoff"), alongside the existing grouped-narrative traceability panel. Same 38 rows as the Traceability Table below, now visible on-canvas as well as in this doc — brought in for consistency with the equivalent table built into the new Auditor prototype file's own Handoff page.

## Round 6 update (Auditor-to-Normal-User outcome mechanism closed)

Raised as an open question while building out the Auditor prototype: nothing defined how an Auditor's assessment maps to what a reporting user actually sees on completion. Jana closed it directly in `docs/ba/persona-requirements-week2.md`, updating `UR-ST-03`:

> "The system shall display the final public-facing outcome of the submitted report when the case reaches Complete. For standard cases with no SOS or Decline flag, the public-facing outcome shall be derived from the Auditor's submitted final case outcome." Notes: "Internal severity/CVI, Auditor comments and Auditor identity shall not be exposed to the Normal User. The exact positive public-facing outcome label remains to be confirmed."

- **Updated the outcome-preview mockup's own annotation and Screen 3b's Requirements panel** to state the now-defined mechanism explicitly, rather than leaving "how is this decided" unaddressed. No visible copy on Screen 3b itself changed — the two possible outcome labels were already correct; this closes the *mechanism* question behind them.
- **Narrowed the Open Decisions panel's `UR-ST-03` item** from "partially closed" to "mechanism now closed" — the only thing still open is the exact wording of the second (action-taken) outcome category.
- On the Auditor side, this is implemented as a new **Final case outcome** selector on the Severity Adjustment & Comment screen (`AR-AI-14`) — see `auditor-prototype-handoff-sprint1.md`'s Round 6/Round 7 updates for the full picture. The `AR-AI-14` ID-reuse concern flagged in Round 6 is now resolved: Jana restored the displaced audit-history requirement under `AR-AI-12`, so no content was lost.

## Round 7 update (BA/PM decision extends the Complete mechanism; file-size resolved)

- **A second path to Complete, from the Manager prototype.** PM decided that when a Manager selects "No reassignment needed" on a declined case, it now transitions straight to Complete (rationale note stored to the audit trail, not shown publicly) — not just the Auditor's own final-case-outcome selection at submission (`AR-AI-14`). Updated the outcome-preview mockup's annotation and Screen 3b's Requirements panel to state both paths explicitly.
- **New, narrower open question, not resolved by this decision.** `UR-ST-03`'s outcome-*text* mechanism was closed in Round 6 for standard cases only — the label comes from the Auditor's final-case-outcome selection. A case completed via the Manager's no-reassignment path never goes through that selector, so while the *stage* reaching Complete is now settled, what *outcome text* actually displays for this path is genuinely undecided — not guessed at here. Logged below, cross-referenced in the Manager handoff doc's own Round 4 update.
- **Max raw-video file size (`UR-VU-07`) — closed: 500MB temporary placeholder**, assuming a 10–15 min 1080p MP4 baseline; Dev to validate and adjust through the real pipeline. Matches the Auditor and Manager files' own equivalent items, both updated this round. Format list and duration target remain as previously settled (MP4/MOV/WEBM/AVI, ~10–15 min target).

## Round 8 update (no-reassignment outcome text resolved)

Closes the narrower question Round 7 surfaced rather than guessed at: what outcome text displays when a case reaches Complete via a Manager's "No reassignment needed" decision on the Manager prototype, since that path never goes through the Auditor's own final-case-outcome selection (`AR-AI-14`).

- **Resolution: a dedicated third outcome label**, distinct from both Auditor-determined ones ("No Violation Found" and the still-pending action-taken category) — reusing either would assert a content verdict the Manager never actually made; their decision is a process call, and the underlying decline reasons aren't always about content in the first place.
- **The label:** *"This case has been reviewed and closed. No further action is required from you."* — deliberately content-neutral, same regardless of decline reason (making it decline-reason-aware was considered and rejected — it just relocates the branching-logic problem this file has already declined to solve elsewhere). Added to the outcome-preview mockup's annotation and Screen 3b's Requirements panel.
- Cross-referenced in the Manager handoff doc's own Round 5 update, where `5.3b`'s confirmation screen was updated to state this is what the public sees.

## Round 9 update (action-taken outcome category resolved)

Client direction: anything closeable with solid reasoning is clear to implement directly, rather than waiting on a separate confirmation round. Closes the one remaining piece of `UR-ST-03`.

- **The label: "Violation Found"** — the exact grammatical mirror of the already-confirmed "No Violation Found" (same head noun and verb, differing only by the negation). Reusing this pattern means a reader who already recognises "No Violation Found" parses its counterpart with zero new vocabulary — the same "matched pair" discipline already used for InlineNotification tones and the Login state trio elsewhere in this file.
- **Deliberately doesn't name a specific action** (the previous placeholder said "The content has been removed"). `AR-AI-14` gives the Auditor a binary selector — "No Violation Found" or the alternate category — not a menu of specific remedial actions, so nothing guarantees removal is what happened in every case. Confirming "Content Removed" as the literal label would assert a fact the data model doesn't actually capture. "Violation Found" states only what's certain: a violation was determined to exist. Same discipline as "Escalated" never being shown as a public outcome, or the AI's own output never being presented as adopted.
- **Matches industry precedent for reporter-facing (not subject-facing) outcome notices.** Major platforms consistently keep the report-outcome label shown to the person who *filed* a report generic ("violates policy" / "doesn't violate policy"), reserving specific enforcement detail for the party being actioned — the same restraint `UR-ST-04` already commits this file to (no auditor identity/internal logic exposed to the Normal User).
- **Updated copy:** the outcome-preview mockup's body text now reads "Violation Found. This content was reviewed against our content policy and confirmed to violate it. Appropriate action has been taken — no further action is needed from you. This case is now closed." Screen 3b's Requirements panel and the mockup's own annotation updated to state both labels as confirmed.

## Round 10 update (Foundations page completeness — cross-file colour audit)

A cross-file consistency check against the Manager and Auditor files' own Foundations pages worked in this file's favour: this file's `InlineNotification` component (Error `#fff1f1`, Warning `#fcf4d6`, Success `#defbe6`) was already using authentic Carbon v11 tint values — it was the *other two* files whose notification tints turned out to be fabricated approximations (see their own Round 6/16 entries). Two real, smaller gaps found in this file's own Foundations page and closed:

- **`color/green-10` (`#defbe6`) was missing from the Colour section** despite being the exact background this file's own Success notification already used — added, matching the existing swatch style and computed-contrast-ratio pattern (Gray 100 text on this bg: 16.4:1, passes AAA).
- **`color/blue-70` (`#0043ce`) was used but never catalogued** — it's the Primary button's hover-state fill, confirmed by inspecting the actual component, not assumed. Added as a swatch noting its specific role, since it isn't used for text/icon fills anywhere in this flow the way it is in the Auditor/Manager files (there, it also doubles as the Info support colour).

## Round 11 update (anonymous-vs-identified reporting choice added, per Marielle Lee's expert interview)

**The gap.** Marielle Lee's expert interview (Q3) recommended giving reporters an explicit choice — stay anonymous, or leave contact details for follow-up — rather than only offering contact fields as a passive, post-submission opt-in. This file's only existing contact-related field, `UR-ID-05` (Screen 2's optional email/SMS opt-in), answers a different question: whether a reporter who has *already submitted* wants a status-update ping. It never actually asks, at the point of reporting, whether the report itself should be anonymous or identified — a real gap between the interview recommendation and what was built, not something previously tracked as open.

**Added to Screen 1**, directly below the optional description field and above the consent checkbox: a labelled choice — *"How would you like to submit this report?"* — using real Carbon RadioButton geometry (18px circle, Gray 70 border unselected / Blue 60 border + filled dot selected, spec matched directly against the Auditor file's own built `RadioButton` component), not the evidence-type chip pattern. A first pass reused the chip-selector style from evidence type (`UR-NTH-01`/`02`/`03`) — caught in review as a real mistake, not a stylistic nitpick: a second solid-Blue-60 pill next to "Upload video" read as a second competing call-to-action alongside "Submit report," violating the one-primary-action-per-screen convention this project follows everywhere else. Rebuilt with radio buttons instead, which is also the correct Carbon component for an exclusive two-option choice in the first place.
- **"Report anonymously"** — default/selected, consistent with `UR-VU-02`'s no-account baseline; nothing changes for a reporter who ignores this section entirely.
- **"Include my name & email"** — selecting this reveals two lightweight fields (Name, Email — real `Text Input` component instances, matching the file's existing input styling exactly), matching Marielle's own guidance to keep this "name, email, message," not a full account.

**Deliberately kept separate from `UR-ID-05`.** Reusing that field would have conflated two different questions — "should this report be identified" (asked once, at submission) versus "do you want status updates later" (Screen 2, after a case ID already exists). Collapsing them would mean a reporter who wants to stay anonymous but still get a status ping (or vice versa) couldn't express that combination.

**Tagged `[UX call]`, not a formal requirement ID** — no `UR-*` ID mandates this specifically; it's a direct response to expert-interview evidence, following the same treatment as every other unassigned team judgment call in this file. Documented on Screen 1's Requirements Panel, plus a new alternate-state frame (Screen 1d) showing the "identified" selection with both fields revealed, matching this file's existing convention for evidence-type alternates (1b, 1c).

## Round 12 update (Screen 1 ↔ 1d click-through wired — real gap closed)

Round 11 adopted Screen 1d "matching this file's existing convention for evidence-type alternates (1b, 1c)" — but unlike 1b/1c, the identity-choice radio buttons carried zero prototype reactions on either screen: clicking "Include my name & email" on Screen 1 did nothing, and there was no way back from Screen 1d to Screen 1 either. A real click-through gap, not a documentation gap — the same failure mode the Auditor file's own Round 9 found and fixed for its Wellbeing Check-in screen, and worth calling out precisely because the prototype needs to demonstrate every flow end to end, including Nice-to-Haves, not just the P0 path.

Wired to match the exact pattern already used by the evidence-type chips: Screen 1's "Include my name & email" radio now navigates to Screen 1d (`SMART_ANIMATE`, 0.3s ease-out — identical transition to the 1b/1c chip links); Screen 1d's "Report anonymously" radio navigates back to Screen 1, same transition. Neither already-selected option (Screen 1's "Report anonymously," Screen 1d's "Include my name & email") carries a reaction, matching the no-self-navigation convention the evidence chips already use. Screen 1d's own Submit button and "check case status" link were already correctly wired onward to Screen 2/3a — verified directly, not assumed, before treating this as fully closed.

**Follow-up fix, same pass: Name/Email fields were rendering oversized and in the wrong typeface.** Flagged directly by Aleeya on review — the fields looked "really weird and large" once the identified state was actually visible, not just documented. Root cause, confirmed by inspection: the shared `Text Input` component was originally built for the Case ID lookup field, where 16px IBM Plex Mono is correct per this file's own convention (case IDs are one of the few things Mono is reserved for). Reusing that component for Name/Email on Screen 1d correctly overrode the placeholder *text* but never overrode the *font* — so "Jordan Lee" and "jordan@example.com" were rendering at 16px Mono, the same treatment as a case ID, instead of Carbon's real `body-01` spec (IBM Plex Sans, 14px) that every other input value in this file uses. Fixed on both instances only — the shared master component was left untouched, since 16px Mono is still correct there for its actual Case ID use on Screen 3a.

## Round 13 update (pixel-by-pixel pass — one further font defect found)

A full screen-by-screen re-check of every Normal User frame (not a spot-check) turned up two instances of the same defect class as Round 12's follow-up fix — text set at an off-token size that doesn't match any Carbon type-scale value used elsewhere in this file:

- **"PREVIEW" tag on Screen 1d (node `86:87`)** was still set in IBM Plex Mono at 11px, even though Round 5 had already corrected its fill colour on this same element and moved on without checking the typeface. Compared directly against the verified-correct "Case ID" label elsewhere in the file (12px, IBM Plex Sans, Regular) and fixed to match — IBM Plex Sans Regular, 12px.
- **"Add more information to this case" modal (node `80:31`, `UR-NTH-05`)** had three text elements at sizes that don't correspond to any token in this file's own type scale: the textarea placeholder at 13px, the "+ Attach a file (optional)" action label at 13px, and the closing disclaimer line at 11px. Checked against a low-confidence flag rather than fixed on a guess — then confirmed as a real defect, not deliberate microcopy, by cross-referencing this file's own repeated pattern for identical element types: every other "(optional)" label in this file (`Add more detail (optional)`, `Email (optional)`, `Phone (optional)`) is set at 12px, matching `helper-text-01`; the placeholder is input-value text, which the file's own convention (see Round 12's Name/Email fix) sets at `body-01` 14px, not 13px. Fixed all three: textarea placeholder → 14px, "+ Attach a file (optional)" → 12px, disclaimer line → 12px. Re-screenshotted after the fix — no clipping or overlap, modal reads cleanly.

No other typography, spacing, or component defects found across the remaining screens in this pass — confirmed clean.

## File structure

The Figma file has 5 pages, matching the systemization pattern used on the team's Login Restyle reference file:
1. **00 — Cover** — project title, flow description, pointers to the requirements doc and this handoff doc.
2. **01 — Foundations** — every colour token actually used across the 3 screens as a swatch + token-name + token-meta row (with computed WCAG contrast ratios per pairing, not estimates), the type scale as spec+sample pairs, and an **Accessibility** section documenting tab order per screen, focus-state behaviour, and the colour-never-alone rule.
3. **02 — Components** — real Figma component sets with named variants: `Button / Primary` (Default/Hover/Pressed/Focused/Disabled), `Button / Tertiary` (Default/Hover/Disabled), `Button / Ghost` (Default/Hover/Disabled), `Text Input` (Default/Focused/Filled/Error/Disabled), `Inline Notification` (Error/Warning/Success, each with a real nested `Icon Badge` instance), `Icon Badge` (Success/Warning/Error/Info — real vector glyphs, not text characters).
4. **Normal User Prototype** — the 5 flow frames, built from **instances** of the components above (not one-off static shapes), plus on-canvas text annotations below each frame citing the requirement ID(s) each element satisfies — the same dev-note pattern originally used only on Screen 3c, now applied consistently across all 3 screens.
5. **03 — Annotations & Handoff** — the design-rationale, requirement-traceability (grouped narrative *and*, as of Round 5, a full per-ID table), accessibility-report, open-decisions, developer-handoff, and iteration-history panels consolidated onto their own page, off-canvas from the shippable screens.

## The 3 screens (5 frames total — Screen 3 covers 3 sub-states)

1. **Video Upload** — file uploader, format/size guidance, consent notice, submit, inline error state.
2. **Case ID Confirmation** — success confirmation, prominent case ID (IBM Plex Mono), "Copy Case ID" primary action, retention warning banner, leave-without-saving modal (annotated interaction), deprioritized email/SMS opt-in.
3. **Status / Notification** — three linked sub-states in one flow: lookup (empty) → result (found, 3-step progress indicator) → result (generic not-found).

All frames are wired with real Figma prototype connections (click reactions), not laid out side by side. Flow starting point is set on Screen 1.

## Design system tokens used

- **Colour:** Blue 60 `#0f62fe` (primary actions, current-step ring), Gray 100 `#161616` (header bg, primary text), Gray 70 `#525252` (secondary text, unfocused input underline), Gray 10 `#f4f4f4` (page bg, case ID block fill), White 0 `#ffffff` (card bg), Gray 20 `#e0e0e0` (borders, future-step icon), Green 50 `#24a148` (success icon badge), Green 10 not used directly — success uses solid Green 50 badge on white, Yellow 30 `#f1c21b` / Yellow 10 `#fcf4d6` (warning notification fill+icon), Red 60 `#da1e28` / Red 10 `#fff1f1` (error notification fill+icon). Saved as local Figma paint styles (`Carbon/*`) in the file.
- **Type:** IBM Plex Sans (UI text, Regular/Medium/SemiBold), IBM Plex Mono (case ID display and input placeholder only).
- **Spacing/grid:** Carbon 8px spacing scale, 16-col grid, 32px gutter, 1440px desktop canvas, 48px fixed header height, 48px button height (14px vertical padding + 20px line-height, matching Carbon's `lg` button size).
- **Component fidelity:** real Carbon button geometry (0 corner-radius, correct Primary/Tertiary/Ghost variants — not just color swaps), Carbon-style underlined text input (Gray 10 fill + bottom border, not a full box border), a 3-state Progress Indicator (checkmark-in-circle for complete, ringed-dot for current, hollow circle for future, with colour-coded connector segments), and icon-badge notifications (colour-coded circle + glyph, tinted background, dismiss affordance) instead of plain colour bars.
- **Accessibility:** every status state pairs an icon with a plain-language text label — never colour alone (UR-NFR-01). Focus, contrast ratios, and tab order are detailed in the Stage 8 design-system notes delivered alongside this build (see chat/Planner record for Sprint 1 Week 1).

---

## Traceability Table

| ID | Requirement | Screen | Status |
|---|---|---|---|
| UR-VU-01 | Upload and submit a video for review | Screen 1 | Included |
| UR-VU-02 | Submit without an account | All screens | Included |
| UR-VU-03 | Submission enters review without a content decision at intake | Screen 1 (system behaviour) | Included |
| UR-VU-04 | Immediate confirmation or error on submit | Screen 1 → Screen 2 / inline error | Included |
| UR-VU-05 | Support MP4/MOV/WEBM/AVI | Screen 1 helper text | Included — **closed**, final Sprint 2 baseline |
| UR-VU-06 | Inform + guide on unsupported format | Screen 1 inline error | Included |
| UR-VU-07 | Target duration for Sprint 2 testing (~10–15 min, not a hard max); max file size TBD | Screen 1 helper text | Included — duration target **closed** (client-confirmed); max file size still open, Week 3 Dev follow-up |
| UR-VU-08 | Basic file-integrity validation (malware scanning optional, not MVP) | Screen 1 (system behaviour; surfaces via same error pattern) | Included |
| UR-VU-09 | Validate across varying video durations | — | Included by design omission — testing/QA requirement, not a UI element |
| UR-ID-01 | Auto-generate unique case ID | Screen 2 (system behaviour) | Included |
| UR-ID-02 | Display case ID immediately after submission | Screen 2 | Included |
| UR-ID-03 | Case ID usable to retrieve case | Screen 3a | Included |
| UR-ID-04 | "Copy Case ID" option | Screen 2 primary button | Included |
| UR-ID-05 | Optional email/SMS opt-in | Screen 2, deprioritized secondary element | Included — Nice-to-Have, styled deliberately smaller than the case ID/copy action. Distinct from the Screen 1 reporting-identity choice below (Round 11) — this is about receiving updates on an already-submitted case, not whether the report itself is identified |
| *(no ID — `[UX call]`)* | Anonymous-vs-identified reporting choice | Screen 1, below the optional description field; alternate state on Screen 1d | Included — added Round 11, per Marielle Lee's expert interview (Q3); default anonymous, "Include my name & email" reveals lightweight Name/Email fields |
| UR-ID-06 | Inform user they must retain the case ID | Screen 2 warning banner | Included |
| UR-ID-07 | Retain case ID locally (browser storage) | Screen 2 small-print note | Included |
| UR-ID-08 | Non-sequential, non-guessable case ID format | Screen 2 (ID string styled as random alphanumeric, not a counter) | Included |
| UR-ID-09 | Warn before navigating away without saving | Screen 2 modal (annotated interaction) | Included — Nice-to-Have. Mechanism (browser `beforeunload` vs. in-app route guard) closed 2026-09-09 (Hyuna/PM): left to Dev's discretion, no visible UI difference either way |
| UR-ST-01 | Retrieve status using case ID | Screen 3a | Included |
| UR-ST-02 | Update status through user-facing stages | Screen 3b, 3-step progress indicator | Included — wording ("Received → Being Reviewed → Complete") is now **closed and final** for Sprint 2 |
| UR-ST-03 | Display final outcome | Screen 3b outcome text | Included — **fully closed** (Round 9): derived from the Auditor's own final-case-outcome selection at submission (`AR-AI-14`); resolves to "No Violation Found" or "Violation Found" (both confirmed literal labels, deliberately parallel construction); "Escalated" is never shown as a public outcome. A declined case reaching Complete via a Manager's "no reassignment needed" decision shows its own dedicated third label instead — "This case has been reviewed and closed. No further action is required from you." — deliberately content-neutral, distinct from the two Auditor-determined labels above (Round 8) |
| UR-ST-04 | No auditor identity / internal logic exposed | Screen 3b (deliberately omitted) | Included |
| UR-ST-05 | Email/SMS status updates | Screen 2, small opt-in field | Included — Nice-to-Have, genuinely functional (captures email/phone), styled small/secondary below the case ID |
| UR-ST-06 | Secure link/code for email/SMS updates | Screen 2, opt-in field note | Included — Nice-to-Have, stated in copy ("we'll text or email you a secure one-time link"); actual token/link generation is a Dev implementation detail |
| UR-ST-07 | Rate-limit invalid lookup attempts | Screen 3c, Dev-facing annotation | Included as annotation — backend/session behaviour, not a distinct visual state |
| UR-ST-08 | Generic "not found" message | Screen 3c | Included |
| UR-ST-09 | Estimated review timeframe | Screen 3b | Included — Nice-to-Have |
| UR-NTH-01 | Link submission as alternative to upload | Screen 1, evidence-type chips | Included — Nice-to-Have, styled as a secondary chip; video stays the default/fastest path |
| UR-NTH-02 | Optional screenshot evidence | Screen 1, evidence-type chips | Included — Nice-to-Have, same chip row as UR-NTH-01 |
| UR-NTH-03 | Choice between evidence types | Screen 1, evidence-type chips | Included — user picks one type rather than being required to provide every type |
| UR-NTH-04 | Optional free-text description | Screen 1, optional description field | Included — placed after the required upload step so it never blocks submission |
| UR-NTH-05 | Add follow-up info to an existing case | Screen 3b, tertiary action | Included — "Add more information to this case," tertiary-styled below the core status content |
| UR-NTH-06 | Content warning before re-displaying submitted content | — | Included by design omission — none of the 3 screens ever re-display the user's submitted content, so no warning mechanism is needed in this flow |
| UR-NFR-01 | Plain language, screen-reader support, no colour-only status | All screens | Included |
| UR-NFR-02 | Consent/privacy notice at submission | Screen 1 | Included |
| UR-NFR-03 | Data-retention policy | — | Out of visual scope — **closed** as a provisional 12-month post-closure project rule; not a UI element |
| UR-NFR-04 | Encryption in transit/at rest | Screen 1, encryption/security notice near Submit | Included — corrected from an earlier mistag against UR-NFR-02/03 |
| UR-NFR-05 | Case ID treated as a sensitive access token (no exposure via URL/analytics/logs) | Screen 3a, Dev-facing annotation | Included as annotation — same treatment pattern as UR-ST-07. Closed 2026-09-09 (Hyuna/PM): implementation mechanism left to Dev's discretion |

---

## Assumptions & Open Decisions (for the team)

*(Items resolved in Rounds 7–9 — max raw-video file size, the Manager no-reassignment path's outcome text, the action-taken outcome category wording — and closed 2026-09-09 by Hyuna/PM — the leave-without-saving mechanism (UR-ID-09) and case-ID-in-logs (UR-NFR-05), both left to Dev's discretion since neither has a visible UI/behavioural difference to specify at BA level — have been removed from this list; the decisions and reasoning are preserved in those Round update entries above, not repeated here.)*

No items remain open in this list — every previously-tracked open decision for this file has now been resolved. See the Traceability Table above for what each item's Status column now cites.

---

### Traceability
- Originally built on: `Normal User Persona Requirements-BA.md` (Jana, BA, Sprint 1 Week 1) and the 4 persona snapshots in `/persona snapshots`.
- Reconciled as of Round 4 against: `Requirements-BA.md` (Jana, BA, Sprint 1 Week 2 — Final BA baseline for Sprint 2 handover), Normal User Requirements section.
- IBM branding directive sourced from the 21 Aug 2026 non-tech support session minutes (Meeting No. 1, decision #4). "Design your own" directive sourced from the client Sprint 1 Q&A notes (Naresh Olladapu, Q11).
- **Action for Dev:** treat the traceability table above as the build spec; anything marked Deferred is deliberately out of this sprint's scope, not an oversight. Items still marked OPEN in "Assumptions & Open Decisions" need sign-off before their exact values are locked in.
- Sprint 2 vs. Sprint 3 build scope: see `sprint2-build-scope-handoff.md`.

---

## Sprint 2 build status (18 Sep 2026)

*Appended after the frontend build on `feature/frontend`. Nothing above this section was changed.*

Every screen in this file is built in the frontend (`frontend/`, React + IBM Carbon), and was compared against Figma at laptop and desktop sizes.

| Screen | Figma | Route / how to reach it |
|---|---|---|
| Upload — video | 5:2 | `/` |
| Upload — link | 72:28 | `/` → Paste a link |
| Upload — screenshot | 72:58 | `/` → Add a screenshot |
| Upload — identified reporter | 418:72 | `/` → Include my name & email |
| Consent error | 73:29 | `/` → submit without ticking consent |
| Processing failed | 73:41 | Demo scenarios → Fail my next submission (sign in as staff first), then upload |
| Case ID confirmation | 6:2 | `/case-confirmation` (after a submit) |
| Status — lookup / not found / Being Reviewed | 7:65 (7:2, 7:15, 7:41) | `/status`, e.g. `RCS-7Q3M-K91X` |
| Outcome / Complete | 145:75 | `/status` → `RCS-4H8P-2DXC` |
| Add more information | 80:31 | `/status` → Add more information |

Main deviations for this file: the Carbon content switcher colour and Carbon square corners on the cards and banners. Decided and fixed on 18 Sep 2026: "Submit report" is always enabled and explains what's missing on submit, as in 5:2 and 73:29; the link-report consent label now says "the linked content"; and the status preview says "whether a policy violation was found". Figma 72:28 and the 7:16 preview text were updated to match.

**Deliberate deviations from Figma:** every difference between this file and the build, with its class (P0/P2/Deliberate), status and reason, is in the [Sprint 2 UI review log](sprint2-ui-review-figma-log.md). The rule used throughout: **IBM Carbon over Figma** — where a Figma colour or control differs from Carbon, the build uses the Carbon theme token or stock Carbon component. No hex colours are hardcoded in the app.

**Copy that still needs sign-off:** [microcopy audit §4](sprint2-microcopy-audit.md). **Accessibility:** [accessibility baseline](sprint2-accessibility-baseline.md) (jest-axe on every page and state, keyboard-only walkthrough of every flow).

**Open items:** every remaining item, with its owner, is in the [build-scope handoff → Open items — every one owned](sprint2-build-scope-handoff.md). They are not repeated here, so there is one list to keep current.

**Data:** the build runs on a synthetic mock data source by default, with a **Demo data** badge in every header. Firas connects Aiden's real API through the `api` data source; see [`docs/frontend/BACKEND-INTEGRATION.md`](../frontend/BACKEND-INTEGRATION.md). The live UAT and the live re-check of this review wait on the deployment (Task 104).
