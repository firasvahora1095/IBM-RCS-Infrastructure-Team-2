# UX audit: results

Rules and method are in [`ux-audit-checklist.md`](ux-audit-checklist.md). Run on
7 Oct 2026 against the mock build (same screens as the deployed api build).

**How each screen was checked**
- **Auto:** `ux-audit-scan.js` on the rendered screen. It covers A1 (one
  primary), B1 (one h1, no skipped heading levels) and D1 (labelled inputs).
- **Visual:** a screenshot reviewed against rules A–G.
- **Code:** button kinds and states read from the page source.
- **Tests:** the existing jest-axe and keyboard suites (F1, F2) pass.

## Foundations applied app-wide

| Finding | Rule | Change |
|---|---|---|
| Status colours differed between pages, and success wasn't distinguishable from neutral. | B4, C4 | One scheme from the Figma Tag sheet: Success green, Warning yellow, Error red, Info blue and neutral gray, in `design-tokens/statusTones.ts`. Every status tag uses it, including the exposure states, SOS, Declined and break requests. Success tags use dark text, because white on that green is 3.3:1 and fails AA. |
| Long empty space at the end of buttons. | — | This is Carbon's default icon slot, also present on every older screen. Kept as Carbon default (team decision). |
| Gaps between side-by-side buttons. | B4 | They match the older screens (`gap-3`). Kept. |

## Screen by screen

✅ = passes every rule checked · 🔧 = fixed in this audit · 📝 = kept, with a reason

| Screen | Checked | Result |
|---|---|---|
| `/` Report form (including the CommunityHub variant) | Auto, code | ✅ One primary per step. The source field is marked optional. |
| `/case-confirmation` | Auto, code | ✅ |
| `/status` | Auto, code | ✅ The delivery sentence shows only once delivery is confirmed (E3). |
| `/rcs` Product page | Auto, code | 🔧 Three primaries cut to one (A1, A2). The hero keeps the primary, the sticky sub-nav's "Get started" becomes tertiary, and the closing call-to-action becomes secondary. |
| `/rcs/get-started` Onboarding | Auto, code | ✅ One primary per step; Back is a lower-weight button. |
| `/communityhub` (simulated) | Auto, code | ✅ Labelled as simulated (E4); one primary (Create post). |
| `/flow` | Auto | ✅ Now shows the deployed account IDs in api mode (G1). |
| `/staff/login`, `/client/login` | Auto | ✅ |
| `/auditor` queue, case steps, cooldown | Auto, code | ✅ States are exclusive, so one primary at a time. 📝 Proceed and Decline have equal weight by design (A6, Figma). Request support is ghost and SOS is danger (A7). |
| `/manager` Dashboard | Auto, visual | ✅ 📝 The red edge on the SOS and failed-handoff tiles reuses the SOS Inbox's existing row marker. 📝 Each row's "Adjust exposure limit" tertiary comes from the Figma design. Recommend a ghost button or overflow menu later, to reduce repetition. |
| `/manager/cases` | Auto | 🔧 SOS and Declined tags moved to the shared scheme. |
| `/manager/sos` | Auto | 🔧 Each row had a primary "Acknowledge", so several primaries showed at once (A1). Now secondary: still strong, without competing. |
| `/manager/sos/:id`, `/follow-up` | Auto | ✅ |
| `/manager/reassignment`, `/cases/:id/review`, `/reassign` | Auto, code | ✅ The success state's "Return to Dashboard" is a separate state. |
| `/manager/auditors/:id` | Auto | 🔧 Break approved and requested tags moved to the shared scheme (success, warning). |
| `/manager/validation` | Auto | ✅ Still labelled as placeholder data (E4). |
| `/manager/deliveries` | Auto, visual | ✅ 📝 The Moderation status column repeats "Complete" on purpose: Sprint 3 requires moderation and delivery status shown separately. |
| `/manager/deliveries/:id` | Auto, visual | 🔧 "Needs attention" was shown twice, beside the title and in the status card (B5). The title copy is removed. ✅ Retry is primary, Escalate is secondary, and escalation confirms in a modal (E1). |
| `/manager/customers/communityhub` | Auto | 🔧 The "Customer" tag repeated the subtitle (B5) and is removed. The connection tag now reads "Connected", in success green. |
| `/manager/reports`, `/reports/:id` | Auto, code | ✅ One primary each. Release confirms in a modal and says what the client will see (E1). |
| `/manager/audit-logs` | Auto | ✅ |
| `/client/reports`, `/client/reports/:id` | Auto | ✅ Staff names are hidden from the client (E3), and the page says access is logged. |

## Not verified here

- **320 px reflow (B6):** the browser tool couldn't resize the window. Check on
  a phone, or at 400% zoom.
- **Contrast (F3):** checked only for the new tag fills. Everything else uses
  Carbon tokens, which are AA by design.
- **Recommended later:** row actions on the Dashboard table should become
  ghost buttons or an overflow menu, and the exposure bar uses Blue 60 on a
  non-interactive bar (A5). Both come from the original Figma design, so they
  need a team decision rather than a silent change.
