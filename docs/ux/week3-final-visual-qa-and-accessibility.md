# Sprint 3, Week 3 (UX): final visual QA and accessibility pass

**Owner:** Aleeya Ahmad (UX) · **Branch:** `docs/week3-ux-final-qa`
**Plan task:** `[QUALITY ASSURANCE]` Final Visual QA & Accessibility Pass Across All Screens (90 min).
**Acceptance criteria:** all tested keyboard-only; contrast measured, not eyeballed; Master Document updated.
**Where it was run:** the local build (Vite dev server, mock data source) in Chrome, signed in as each person with the seed's test accounts. The deployed site was not tested; see section 7.

## Result in short

- **49 screens and states** across the five ways into RCS were measured with axe-core: the public site, the Reviewer, the Super Auditor, the Manager and the Client portal.
- **12 accessibility problems were found and fixed.** Several (hover-state contrast, invisible keyboard focus, browser tab titles) are the kind an automated score misses: the landing page scored 100 in Lighthouse, yet a keyboard user could not see where they were in its header.
- **After the fixes: no axe violations on any screen, the lowest measured text contrast is 4.54:1** (the AA bar is 4.5:1), and **every control on every screen checked shows a focus indicator** when reached with the keyboard.
- Not done, and flagged below: a screen-reader (NVDA) pass, and a check of the deployed site.

## 1. Method

| What | How |
|---|---|
| Automated checks | axe-core 4.13.0 run inside the live page, WCAG 2.0, 2.1 and 2.2 levels A and AA plus axe's best-practice rules. Run once per screen, at 1280×800 |
| Contrast | axe measures solid backgrounds. Text on a gradient, which axe marks "needs review", was measured separately: the text colour against **every colour stop** behind it, worst case reported. If the worst stop passes, the whole gradient passes |
| Keyboard | A real Tab key press first, so the browser is in keyboard mode and `:focus-visible` styles apply. Then every visible control on the screen was focused and checked for a visible change (outline, border, shadow or fill). Automated walkthroughs (`KeyboardNavigation.test.tsx`, 11 flows) cover the real task flows |
| Phone width | 390×844 mobile emulation. Checks that the page does not scroll sideways |
| Continuity with Week 2 | One Lighthouse accessibility run on `/` for comparison: Accessibility 100, Best Practices 100 |

The sweep is saved as a reusable script: [`week3-a11y-sweep.js`](week3-a11y-sweep.js). It runs axe, the gradient contrast measurement and the focus check in one call, against any list of screens.

## 2. Coverage

| Person | Screens and states | Count |
|---|---|---|
| Public (no sign-in) | `/` · `/rcs/team` · `/rcs/get-started` · `/communityhub` · `/communityhub/moderation` · `/report` · `/report/status` · `/report/contact` · `/report/confirmation` · `/flow` · `/staff/login` · `/client/login` | 12 |
| Reviewer | Case queue · Cooldown · Content warning dialog · Review workspace after consent · AI Buddy open · AI Buddy with an answer | 6 |
| Super Auditor | Case queue with the fallback list | 1 |
| Manager | Overview · Cases · Deliveries · Delivery (a failed one) · Client connections · Client reports · A report · Insights · Validation & Audit (four views) · Audit history · SOS inbox · An SOS alert · SOS follow-up · Reassignment queue · Reassign a case · Client messages · A message · A Reviewer's record · Case review · Exceptional access | 23 |
| Client portal | Case results · Service reports · A report · Messages · A message · Contact RCS · Home (redirects to reports) | 7 |
| **Total** | | **49** |

## 3. What was found, and what was changed

Each row is a defect measured on the running app, not a guess. The "Where" column says how many screens it affected.

| # | Problem (WCAG) | Where | Fix | Result |
|---|---|---|---|---|
| 1 | **Contrast on a hovered row.** Carbon draws Blue 60 button and link text on its row-hover grey (`#e8e8e8`): 4.08:1 against the 4.5:1 bar (1.4.3) | Manager Cases and Client messages, the Reviewer's case queue, the Overview's "Needs you" rows | While a row is hovered, its buttons and links use the darker link blue (`#0043ce`) until the control itself is hovered | 6.4:1. Re-measured with a real pointer on Cases and on a "Needs you" row: no violations |
| 2 | **CommunityHub logo mark contrast.** White on the green gradient's lighter end: 4.02:1 (1.4.3) | `/communityhub` and the moderation page | Darkened the gradient's end colour | 5.24:1 |
| 3 | **No visible focus on the app header's logo link** in the Reviewer, Manager and Client headers (2.4.7) | Every signed-in page | Added the same 2px focus ring used across the app | Visible on all three headers |
| 4 | **No visible focus anywhere in the white site header**: the logo, "How it works", "Product", "The team", "Security", "FAQ", "Report content", "Sign in" (2.4.7). Carbon's focus style is built for its dark header and draws nothing on the white one | Landing, team, set-up and demo guide pages, plus the reporting pages' logo | Added the 2px focus ring to every control in that header | 0 gaps on all 10 public screens measured |
| 5 | **Skip link led nowhere.** "Skip to main content" pointed at an element that did not exist (2.4.1) | `/rcs/get-started` | Gave the page's main area the target ID | axe skip-link rule passes |
| 6 | **Browser tab titles.** Only two pages set a title, and neither put the old one back, so the tab read "Demo guide" on every screen visited afterwards, including the Manager Overview. All other pages used one generic title (2.4.2) | Every screen | One `PageTitle` component names each screen from a route table ("Overview", "Case queue", "Delivery", ...), with no IDs in titles. A test fails if a route is added without a title | Tab title follows the screen on all 49 |
| 7 | **Sign-in brand panel was outside any landmark** (best practice, 1.3.1) | `/staff/login`, `/client/login` | The panel is now a landmark named for its audience ("For RCS Reviewers and Managers") | axe region rule passes |
| 8 | **The landing page's demo card had a label on a plain container**, which screen readers ignore (4.1.2) | `/` | Gave the card a group role so its label is announced | Rule passes |
| 9 | **Empty table headers**: the expand column had no text (1.3.1) | Validation's Technical log, Audit history | Added hidden text "Expand to see details" and "Expand to see what changed" | Rule passes |
| 10 | **Heading order**: the Technical log jumped from the page heading to a level-3 heading (1.3.1) | Validation, Technical log | Made it a level-2 heading | Rule passes |
| 11 | **Duplicate field IDs.** The same filter form was mounted in two tabs with identical IDs, so a label could point at the wrong field | Validation | Each tab's form gets its own IDs | Rule passes |
| 12 | **Sideways scroll on a phone.** The demo guide's four-column accounts table made the whole page scroll at 390px (1.4.10) | `/flow` | The table scrolls inside its own labelled, focusable region, which is positioned so Carbon's hidden header text stays inside it | No page-level scroll; the table scrolls inside |

One more, not a WCAG item: an empty Technical log used to say "No invocations match these filters" even when no filter was applied. It now says "No AI requests have been recorded yet..." and keeps the filter wording only when a filter is on. This matters for the live demo, see [`week3-demo-materials-check.md`](week3-demo-materials-check.md).

## 4. Results after the fixes

| Person | Violations before | After | Lowest measured text contrast | Worst gradient text |
|---|---|---|---|---|
| Public (12) | 2 violations (skip link; sign-in landmark on 2 pages) and 1 review item (demo card label) | **0** | 4.54:1 | Landing and team 5.00 · Demo guide 6.43 · Sign-in 7.49 · CommunityHub 5.24 (was 4.02) |
| Reviewer (6) and Super Auditor (1) | 1 (hover contrast on the queue) | **0** (the hover fix is one shared table rule; see section 8) | 4.54:1 | 5.86 (header) |
| Manager (23) | 3 violations (hover contrast; empty table header on 2 pages; heading order) and 1 review item (duplicate field IDs) | **0** | 4.55:1 | 5.86 (header) |
| Client portal (7) | 0 | **0** | 5.0:1 | 5.86 (header) |

The lowest figures (4.54 and 4.55) are Carbon secondary text on its grey layers. They pass, but they are the ones to watch if a colour is ever changed.

## 5. Keyboard-only results

Every visible control was focused with the keyboard held as the last input. "Gaps" are controls that took focus but showed no visible change.

| Screens | Controls checked | Take focus | Gaps (before → after) |
|---|---|---|---|
| Public, 10 screens | 6 to 51 per screen | all | 8 on each of four pages (the white header) and 1 on each reporting page (its logo) → **0** |
| Manager, 8 screens (Overview, Cases, Deliveries, Client connections, Technical log, Audit history, Messages, a Reviewer's record) | 17 to 42 per screen | all | measured after the fix: **0** |
| Reviewer: queue, cooldown, content warning dialog | 16 · 9 · 3 | all | measured after the fix: **0** |
| Client portal, 4 screens | 13 to 25 per screen | all | 1 per screen (the header logo link) → **0** |

**The content warning dialog** is a Carbon modal: it has the focus-trap sentinels in the accessibility tree, all three of its controls show focus, and the keyboard walkthrough tests exercise it. I did not Tab around it by hand in the browser.

Two items the check lists but are not defects: Carbon's dropdown chevron is deliberately outside the tab order (`tabindex="-1"`; the field itself is the keyboard target), and the CommunityHub search box shows its ring on the wrapper around it as a 1px brand-green line. It is visible but thinner than the 2px ring used elsewhere; CommunityHub is the simulated third-party page, so it was left.

## 6. Reflow at phone width (390px)

18 screens fit with no sideways scroll: the landing, team, set-up, CommunityHub (feed and moderation), report, status, contact and confirmation pages, the staff sign-in page, the Reviewer's queue, cooldown and case page, and the Client portal's five pages. The demo guide did not, and is fixed (problem 12).

## 7. Reviewed and left alone

| Item | Why it is not a defect |
|---|---|
| `aria-valid-attr-value` "needs review" on 12 of the 23 Manager screens | Carbon's closed dropdown points `aria-controls` at a list that only exists while open. Known library behaviour; axe cannot confirm it and marks it for review |
| `colour-contrast` once flagged on the "Show audit history" button (white on grey, 1.7:1) | axe sampled the button during Carbon's 70ms colour fade on first render. Settled, it is white on `#0f62fe` at 5.0:1, and a re-run shows no violation. A measurement artefact |
| Text on gradients that axe marks "needs review" (31 elements on the landing page) | Measured by hand against every colour stop, worst case 5.00:1. All pass |

## 8. Not covered, and why

| Item | Why |
|---|---|
| **Screen reader (NVDA) pass** | Needs a person with NVDA. The AI Buddy's live-region behaviour and the content warning dialog are the parts automated tools cannot judge. Still open from Week 2 |
| **The deployed site** | The sweep needs the dev server (it loads axe from `node_modules`), and signed-in screens need demo passwords typed into a hosted site. The live Code Engine build should be hand-checked by a team member |
| **Safari and Firefox** | Chrome only |
| **Manager and Reviewer screens at phone or tablet width** | The Manager's tools are desktop-first. Public and Client pages were checked at 390px; tablet (672px) was not |
| **Reviewer's queue hover, re-measured after the fix** | The fix is one rule shared by every table (verified with a real pointer on Manager Cases). The Reviewer's own queue was re-measured for focus, not re-hovered |
| **"Status never by colour alone" (1.4.1)** | Only partly automatable. Nothing added this sprint relies on colour alone (the new check-in row and the Client page figures all carry text), but this pass did not re-inspect every older tag. Week 2's inspection stands |

## 9. How to re-run it

1. `npm run dev` in `frontend/`, open the app, sign in as the person to check.
2. Open DevTools, paste [`week3-a11y-sweep.js`](week3-a11y-sweep.js) into the console.
3. Press Tab once in the page, then run `await rcsA11ySweep(["/manager", "/manager/cases"])`. It prints a table: violations, lowest contrast, worst gradient text, controls without a focus indicator.

For a screen that needs a click (a dialog, a tab), open it by hand and run `await rcsA11ySweep([location.pathname + location.search])`.

## Master Document Update

- This document is the Week 3 accessibility and visual QA record. [`sprint2-accessibility-baseline.md`](sprint2-accessibility-baseline.md) now points here, so the baseline and the final pass read as one history.
- [`week2-b2b-click-through-and-accessibility.md`](week2-b2b-click-through-and-accessibility.md) is the Week 2 predecessor (15 screens, Lighthouse); this pass extends it to all 49 and adds the measurements Lighthouse's score hides.
- Open items for the team's blocker log: NVDA pass (owner: UX, needs a person with NVDA); hand-check of the deployed site (owner: Dev, with the Final Deploy check).
