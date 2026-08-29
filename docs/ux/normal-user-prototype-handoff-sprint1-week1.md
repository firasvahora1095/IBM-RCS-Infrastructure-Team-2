> ⚠️ **PROVISIONAL — SEVERAL COPY/CATEGORY DECISIONS STILL OPEN**
> This prototype implements the Sprint 1 Week 1 baseline in `Normal User Persona Requirements-BA.md` (owner: Janataarah Begum, BA). Status-stage wording, outcome categories, file limits, and retention duration are all flagged pending in that source doc and inherited here as **provisional** — see "Assumptions & Open Decisions" below before treating any specific number or category label as final.

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

## File structure

The Figma file has 4 pages, matching the systemization pattern used on the team's Login Restyle reference file:
1. **00 — Cover** — project title, flow description, pointers to the requirements doc and this handoff doc.
2. **01 — Foundations** — every colour token actually used across the 3 screens as a swatch + token-name + token-meta row (with computed WCAG contrast ratios per pairing, not estimates), the type scale as spec+sample pairs, and an **Accessibility** section documenting tab order per screen, focus-state behaviour, and the colour-never-alone rule.
3. **02 — Components** — real Figma component sets with named variants: `Button / Primary` (Default/Hover/Pressed/Focused/Disabled), `Button / Tertiary` (Default/Hover/Disabled), `Button / Ghost` (Default/Hover/Disabled), `Text Input` (Default/Focused/Filled/Error/Disabled), `Inline Notification` (Error/Warning/Success, each with a real nested `Icon Badge` instance), `Icon Badge` (Success/Warning/Error/Info — real vector glyphs, not text characters).
4. **Normal User Prototype** — the 5 flow frames, built from **instances** of the components above (not one-off static shapes), plus on-canvas text annotations below each frame citing the requirement ID(s) each element satisfies — the same dev-note pattern originally used only on Screen 3c, now applied consistently across all 3 screens.

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
| UR-VU-05 | Support MP4/MOV/WEBM/AVI | Screen 1 helper text | Included — provisional, pending Dev confirmation |
| UR-VU-06 | Inform + guide on unsupported format | Screen 1 inline error | Included |
| UR-VU-07 | Enforce max file size/duration | Screen 1 helper text | Included — provisional, pending Dev confirmation |
| UR-VU-08 | Basic file-integrity validation | Screen 1 (system behaviour; surfaces via same error pattern) | Included |
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
| UR-ST-02 | Update status through user-facing stages | Screen 3b, 3-step progress indicator | Included — wording ("Received → Being Reviewed → Complete") taken directly from the BA doc's own draft proposal, not invented |
| UR-ST-03 | Display final outcome | Screen 3b outcome text | Included — placeholder copy, outcome categories pending Week 2 internal decision |
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
| UR-NFR-03 | Data-retention policy | — | Out of visual scope — policy decision pending Week 2, not a UI element |

---

## Assumptions & Open Decisions (for the client)

1. **Status-stage wording** (UR-ST-02) — used the BA doc's own draft proposal ("Received → Being Reviewed → Complete") verbatim. Not yet confirmed with the client as final.
2. **Outcome categories** (UR-ST-03) — placeholder copy only; exact categories (e.g. Content Removed / No Violation Found / Escalated) are explicitly deferred to a Week 2 internal decision in the source doc.
3. **File format/size limits** (UR-VU-05, UR-VU-07) — the proposed format list is shown as helper text; exact size/duration limits are left as "to be confirmed with Dev" copy since no number exists yet.
4. **Data retention duration** (UR-NFR-03) — not surfaced in the UI; policy pending Week 2 review.
5. **Leave-without-saving warning** (UR-ID-09) — modeled as a modal triggered on navigate-away; the actual mechanism (browser `beforeunload` vs. in-app route guard) is a Dev implementation decision, annotated but not dictated here.
6. **Rate-limiting** (UR-ST-07) — annotated as a Dev-facing note on the not-found frame rather than built as a visible UI state, since the 5-attempts/15-minute logic is session/IP-driven backend behavior.

---

### Traceability
- Builds on: `Normal User Persona Requirements-BA.md` (Jana, BA) and the 4 persona snapshots in `/persona snapshots`.
- IBM branding directive sourced from the 21 Aug 2026 non-tech support session minutes (Meeting No. 1, decision #4). "Design your own" directive sourced from the client Sprint 1 Q&A notes (Naresh Olladapu, Q11).
- **Action for Dev:** treat the traceability table above as the build spec; anything marked Deferred is deliberately out of this sprint's scope, not an oversight.
