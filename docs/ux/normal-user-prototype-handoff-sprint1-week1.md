> ℹ️ **UPDATED FOR SPRINT 1 WEEK 2 — MOST OPEN ITEMS NOW CLOSED**
> This prototype was built against the Sprint 1 Week 1 baseline in `Normal User Persona Requirements-BA.md` and has since been reconciled against Jana's finalised Sprint 1 Week 2 baseline in `Requirements-BA.md`. Status-stage wording, the format/duration baseline, and the data-retention rule are now closed decisions; only the exact wording of the second outcome category, the max raw-video file size, and the leave-without-saving mechanism remain genuinely open — see "Assumptions & Open Decisions" below.

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

## File structure

The Figma file has 5 pages, matching the systemization pattern used on the team's Login Restyle reference file:
1. **00 — Cover** — project title, flow description, pointers to the requirements doc and this handoff doc.
2. **01 — Foundations** — every colour token actually used across the 3 screens as a swatch + token-name + token-meta row (with computed WCAG contrast ratios per pairing, not estimates), the type scale as spec+sample pairs, and an **Accessibility** section documenting tab order per screen, focus-state behaviour, and the colour-never-alone rule.
3. **02 — Components** — real Figma component sets with named variants: `Button / Primary` (Default/Hover/Pressed/Focused/Disabled), `Button / Tertiary` (Default/Hover/Disabled), `Button / Ghost` (Default/Hover/Disabled), `Text Input` (Default/Focused/Filled/Error/Disabled), `Inline Notification` (Error/Warning/Success, each with a real nested `Icon Badge` instance), `Icon Badge` (Success/Warning/Error/Info — real vector glyphs, not text characters).
4. **Normal User Prototype** — the 5 flow frames, built from **instances** of the components above (not one-off static shapes), plus on-canvas text annotations below each frame citing the requirement ID(s) each element satisfies — the same dev-note pattern originally used only on Screen 3c, now applied consistently across all 3 screens.
5. **03 — Annotations & Handoff** — the design-rationale, requirement-traceability, accessibility-report, open-decisions, developer-handoff, and iteration-history panels consolidated onto their own page, off-canvas from the shippable screens.

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
| UR-ID-05 | Optional email/SMS opt-in | Screen 2, deprioritized secondary element | Included — Nice-to-Have, styled deliberately smaller than the case ID/copy action |
| UR-ID-06 | Inform user they must retain the case ID | Screen 2 warning banner | Included |
| UR-ID-07 | Retain case ID locally (browser storage) | Screen 2 small-print note | Included |
| UR-ID-08 | Non-sequential, non-guessable case ID format | Screen 2 (ID string styled as random alphanumeric, not a counter) | Included |
| UR-ID-09 | Warn before navigating away without saving | Screen 2 modal (annotated interaction) | Included — Nice-to-Have |
| UR-ST-01 | Retrieve status using case ID | Screen 3a | Included |
| UR-ST-02 | Update status through user-facing stages | Screen 3b, 3-step progress indicator | Included — wording ("Received → Being Reviewed → Complete") is now **closed and final** for Sprint 2 |
| UR-ST-03 | Display final outcome | Screen 3b outcome text | Included — **partially closed**: "No Violation Found" is a confirmed literal label; the alternate action-taken category's exact wording is still open; "Escalated" is never shown as a public outcome |
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
| UR-NFR-05 | Case ID treated as a sensitive access token (no exposure via URL/analytics/logs) | Screen 3a, Dev-facing annotation | Included as annotation — new requirement since Week 1, same treatment pattern as UR-ST-07 |

---

## Assumptions & Open Decisions (for the client)

1. **Status-stage wording** (UR-ST-02) — **CLOSED.** "Received → Being Reviewed → Complete" is now the confirmed, final wording for Sprint 2. No longer open for re-litigation without a scope conversation.
2. **Outcome categories** (UR-ST-03) — **PARTIALLY CLOSED.** "No Violation Found" is now a confirmed public-facing outcome label. The exact wording of the alternate action-taken category is still open. "Escalated" must never be shown as a public outcome — an escalated case stays "Being Reviewed" until a final outcome exists.
3. **File format / duration / size** (UR-VU-05, UR-VU-07) — **MOSTLY CLOSED.** Format list (MP4/MOV/WEBM/AVI) is now a final Sprint 2 baseline. Duration target of ~10–15 minutes is client-confirmed for Sprint 2 testing (not a hard maximum). Max file size remains OPEN — a Week 3 Dev follow-up for Firas/Aiden to validate through the real pipeline test.
4. **Data retention duration** (UR-NFR-03) — **CLOSED** as a provisional project rule: retain closed case records for 12 months post-closure, then eligible for deletion/de-identification unless a legal/business need applies. Not a claim of legal mandate. Still not surfaced as an exact figure in the UI.
5. **Leave-without-saving warning** (UR-ID-09) — still **OPEN**. Modeled as a modal triggered on navigate-away; the actual mechanism (browser `beforeunload` vs. in-app route guard) is a Dev implementation decision, annotated but not dictated here.
6. **Rate-limiting** (UR-ST-07) — largely **CLOSED**. The BA doc now proposes a specific threshold (5 invalid attempts / 10 min → 15-minute lockout), annotated as a Dev-facing note on the not-found frame rather than built as a visible UI state. Dev may still adjust the exact numbers if needed.
7. **Case ID exposure in URLs/logs** (UR-NFR-05) — new mandatory requirement, not previously tracked. Not an open decision so much as a Dev implementation constraint: case ID must not appear in URL query strings, third-party analytics, or unredacted application logs anywhere across the status flow (3a/3b/3c). Documented as a Dev-facing annotation on Screen 3a.

---

### Traceability
- Originally built on: `Normal User Persona Requirements-BA.md` (Jana, BA, Sprint 1 Week 1) and the 4 persona snapshots in `/persona snapshots`.
- Reconciled as of Round 4 against: `Requirements-BA.md` (Jana, BA, Sprint 1 Week 2 — Final BA baseline for Sprint 2 handover), Normal User Requirements section.
- IBM branding directive sourced from the 21 Aug 2026 non-tech support session minutes (Meeting No. 1, decision #4). "Design your own" directive sourced from the client Sprint 1 Q&A notes (Naresh Olladapu, Q11).
- **Action for Dev:** treat the traceability table above as the build spec; anything marked Deferred is deliberately out of this sprint's scope, not an oversight. Items still marked OPEN in "Assumptions & Open Decisions" need sign-off before their exact values are locked in.
