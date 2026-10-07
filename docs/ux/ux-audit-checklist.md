# UX audit: checklist and method

Every screen in the app is checked against the rules below. Results are in
`ux-audit-results.md`. Sources: IBM Carbon v11 guidance (buttons, forms,
notifications, empty states, data tables), WCAG 2.2 AA, Nielsen's 10
heuristics, and the team's own Figma rules (from `auditor-prototype-plan.md`
and `manager-prototype-plan.md`, since the Figma file itself isn't reachable
from this machine).

## 1. Rules

### A. Action hierarchy (Carbon buttons + Figma)
- A1. **At most one primary button per screen** (per view state). A modal
  counts as its own screen.
- A2. The rest step down: secondary → tertiary → ghost. Destructive actions
  use `danger` and confirm first.
- A3. In a button group, the primary sits on the right, secondary to its
  left (Carbon order).
- A4. Navigation ("Back to …", "View …") is a ghost button or a link, never
  a primary.
- A5. Blue 60 (`--cds-interactive`, primary, link) is for interactive
  things only. Never on static text, badges or decoration (Figma rule).
- A6. **Deliberate exception (Figma, Marielle Lee):** Proceed / Decline on
  the content warning are equal weight and the same size, so neither looks
  like the default. Not counted as a breach.
- A7. Request support (low-key, tertiary/ghost) and SOS (urgent, danger) must
  look clearly different.
- A8. Button labels say what happens ("Release report", not "OK" or
  "Submit"), sentence case.

### B. Layout and hierarchy
- B1. Exactly one `h1`, and headings never skip a level.
- B2. The page's purpose is clear within 5 seconds: title, then a one-line
  description.
- B3. Primary content and action are above the fold at 1280×720.
- B4. Consistent page frame: same header, margins, grid and type scale as
  other screens of the same persona.
- B5. Nothing on the screen without a job. Each element answers a user
  need; decoration is removed.
- B6. Works at 320 px wide without horizontal scroll (WCAG 1.4.10).

### C. Feedback and states (Nielsen 1, 9)
- C1. Loading, empty, error and success states exist and say what to do next.
- C2. Errors are specific, polite, and placed next to the cause.
- C3. Async actions show progress and disable double submission.
- C4. Status is never shown by colour alone (text or icon too).

### D. Forms
- D1. Every input has a visible label (placeholder is not a label).
- D2. Required versus optional is marked; optional fields say "(optional)".
- D3. Validate on submit or blur, never block typing. The first error gets
  focus.
- D4. The submit button is disabled only when the reason is visible, or
  stays enabled and explains on click.

### E. Safety and trust (product rules)
- E1. Destructive or irreversible actions confirm, and say what happens.
- E2. Trauma-aware wording: plain, calm, no graphic detail.
- E3. The persona only sees what they're allowed to see. For example, the
  Auditor never sees delivery status, the client never sees staff names.
- E4. A demo or simulated surface is labelled as such.

### F. Accessibility (WCAG 2.2 AA)
- F1. axe: no violations.
- F2. The whole screen works by keyboard, with a visible focus ring, a
  logical tab order and no traps.
- F3. Text contrast is 4.5:1 or more; UI and icon contrast is 3:1 or more.
- F4. Targets are at least 24×24 px (2.5.8).
- F5. Live regions announce async results.
- F6. Reduced motion is respected.

### G. Content
- G1. Plain English, sentence case, consistent terms (Case ID, Auditor,
  Manager).
- G2. No jargon or internal IDs shown to public users.
- G3. Dates and times are readable and in one consistent format.

## 2. How to test

| Check | Method |
|---|---|
| A1, A3, B1, D1 | **Automated scan** in the browser: every route and view state, counting visible `.cds--btn--primary` outside modals, `h1`s, heading order and unlabelled inputs. Script: `docs/ux/ux-audit-scan.js`. |
| F1 | Existing jest-axe suites (`*.a11y.test.tsx`) plus axe on new states. |
| F2 | Existing keyboard tests (`KeyboardNavigation.test.tsx`) plus a manual tab-through of new screens. |
| A2, A4–A8, B2–B5, C, E, G | **Screen-by-screen review**: read the page code and the rendered page, and record a verdict per rule. Every element must have a reason to exist. |
| B6 | 320 px check (browser zoom 400% when window resizing is unavailable). |
| F3 | Carbon tokens are AA by design; custom colours are measured, not eyeballed. |

Fixes are made only where a rule is broken, with the rule ID in the commit
message, so every change can be justified.
