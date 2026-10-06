# B2B End-to-End Flow — Execution Brief

**Track:** Design / Product · **Owner:** Aleeya Ahmad (UX) · **Branch:** `feature/b2b-end-to-end-flow`
**Companion:** [`b2b-end-to-end-flow-spec.md`](b2b-end-to-end-flow-spec.md) (screen-by-screen spec)

This is the standing brief the build is executed against. Read it before touching code, and re-read it before each work package.

---

## 1. Role

Act as a senior product designer and front-end engineer on a regulated trust-and-safety product, working to **real IBM Carbon Design System v11**: real tokens, real components and their documented variants, the 2x Grid and the IBM Plex type scale. Not "Carbon-inspired". Where Carbon and the old Figma disagree, **Carbon wins** (existing project rule, see `sprint2-ui-review-figma-log.md`).

## 2. What we are building

The confirmed main flow, visually and interactively complete, on the existing **mock data layer**:

```
CommunityHub (customer) → Reporter submits → AI pre-screen → wellbeing-aware assignment
→ Auditor protected review → final human decision → automatic result handoff to CommunityHub
→ Manager oversight (exceptions only) → Manager-approved aggregate report
→ CommunityHub authorised user signs in → views / downloads the released report
```

Sources: `RCS_B2B_High_Level_End_to_End_Flow`, `RCS_Sprint3_Extra_Features`, `Sprint3_Full_Plan`, and the Sprint 2 Naresh/Emily meeting notes.

## 3. Scope fences (do not cross)

| In scope | Out of scope (later chat) |
|---|---|
| Customer / integration context (light) | Manager Intelligence Dashboard analytics, trends, evidence drawer |
| Reporter submit, case ID, status with delivery-aware outcome | Manager Copilot |
| Auditor review, Request Support vs SOS, cap states, optional block puzzle | SLA compliance metrics |
| Manager oversight baseline, Deliveries (handoff) and exceptions | Real backend / API wiring |
| Reports: generate, preview, approve and release | Pricing, billing, contracts, sales site |
| Combined Validation & Audit-Log screen | Multi-tenant admin, client user management |
| CommunityHub client sign-in, list, view, download | CommunityHub enforcement UI |

B2B stays **high level and surface level** (Naresh). Do not tear up the existing app. The human stays in the loop.

## 4. Product rules that shape the UI

1. **Wellbeing outranks speed.** Nothing may pressure an Auditor to exceed a cap.
2. **The Auditor is the final moderator.** The Manager never gets an "Approve Auditor decision" button, and never edits a moderation outcome.
3. **Two separate states:** *Moderation status* (COMPLETE) and *Delivery status* (PENDING / RETRYING / SUCCESS / NEEDS ATTENTION). A failed delivery never reopens a case.
4. **Delivery is a Manager concern.** The Auditor and Reporter never see delivery errors. The Reporter is told "CommunityHub has been notified" only when delivery is SUCCESS.
5. **Cooldown never resets the daily exposure total.** Working-day reset is 9:00 AM (Sprint 3 prototype rule, not a client-confirmed fact). Say so where it is shown.
6. **Reports are client communication.** The Manager approves the report, not individual cases. Reports exclude wellbeing records, SOS narratives, counselling details, individual Auditor exposure, raw footage and internal notes.
7. **Client users see released, client-safe, own-organisation data only.** Deny by default; show a clear denied state.
8. **No AI-authored moderation decisions or wellbeing diagnoses anywhere.**
9. **Honest data labelling.** Mock data carries the existing "Demo data" badge. Anything illustrative is labelled illustrative.
10. **Trauma-aware, plain language.** Neutral wording, no persuasive framing, no performance-penalty promises (Marielle Lee).

## 5. Design principles

- **Hierarchy first:** one clear page title, one primary action per screen, secondary actions quieter.
- **Progressive disclosure:** summary first, detail on demand.
- **Status is never colour alone:** every status pairs an icon with a text label (UR-NFR-01).
- **Calm by default, loud only for danger:** reserve red and urgency for SOS and failures that need action.
- **Distinctive but disciplined:** Carbon expressive type for headings and hero bands, productive type for dense data. Use whitespace, a dark Gray 100 band for the entry and client surfaces, and tile-based layout to make it feel like a real enterprise product, not a form wizard.
- **Empty, loading, error and edge states are designed, not left blank.**

## 6. Carbon rules

- Layout: `Grid` / `Column` on the 2x grid (16 columns at max), 32px gutters on large breakpoints. Tailwind remains **layout-only**; it never overrides Carbon component styling.
- Components: `Tile`, `ClickableTile`, `Tabs`, `DataTable` (sort and search toolbar), `StructuredList`, `Tag`, `ProgressIndicator`, `InlineNotification`, `Modal`, `Breadcrumb`, `OverflowMenu`, `Toggletip`, `Accordion`, `Layer`.
- Colour: `--cds-*` tokens only. No hex literals. Severity colours come from `design-tokens/severity.ts`.
- Type: IBM Plex Sans; Plex Mono for IDs, timestamps and payload. Use Carbon's `heading-0x` / `body-0x` / `label-01` ramp, expressive headings only on hero bands.
- Motion: Carbon motion tokens (`productive`, `expressive`), and a `prefers-reduced-motion` override that removes non-essential movement.
- Icons: `@carbon/icons-react` only. No new dependencies.
- Charts: hand-built from tokens with a text equivalent and legend (existing pattern in `ManagerValidationPage`).

## 7. Accessibility (WCAG 2.1 AA floor)

Visible focus on every control; keyboard-only completion of every flow; focus moves sensibly on route change and modal open; `aria-live` for async results; contrast **measured, not eyeballed**; touch targets at least 40px for primary actions; tables have captions or labels; charts have text equivalents; the puzzle is fully optional, pausable and keyboard-operable.

## 8. Working agreement

- Frontend only, on branch `feature/b2b-end-to-end-flow`, off the latest `main`.
- Conventional commits (`feat`, `docs`, `chore`, `test`, `refactor`, `fix`, `style`), small and scoped. No attribution trailers. No push or PR until asked.
- Reuse before building: see the reuse list in the spec §3.
- Every new `DataService` operation: types → `services/index.ts` delegate → mock → api `notConnected` → test. Bump `MOCK_DB_VERSION` when the seed shape changes.
- Update shared-label tests (`design-tokens/*.test.ts`) whenever labels change.

## 9. Definition of done

- `npm run lint`, `npm run build`, `npm test` all green.
- Every screen in the spec has a route, mock data, designed states, a jest-axe case and (for flows) a keyboard walkthrough.
- Full journey walkable from `/flow` with demo accounts, no dead ends.
- Screenshots reviewed at 1440, 1280, 768 and 375 widths: no overflow, no clipped text, focus visible.
- Spec and build agree; deviations are recorded in the handoff note.

## 10. Known baseline (main at `581f56d`, before this branch)

`npm run lint` and `npm run build` pass. `npm test` has **3 failures that pre-date this work**; do not "fix" them silently, and do not let new failures hide behind them:

| Test | File |
|---|---|
| IncidentTimeline positions each segment proportionally | `components/severity/IncidentTimeline.test.tsx` |
| Manager saves an exposure limit and keeps the value on failure (MR-OV-04) | `pages/manager/ManagerPages.test.tsx` |
| Auditor case review has no detectable axe violations (unlabelled element in the review workspace) | `pages/staff/StaffPages.a11y.test.tsx` |

The Manager page change merged in `a85e69f` (separate View Details / Adjust Exposure Limit pages) is the likely cause of the second; the third is a real accessibility finding worth a separate `fix(frontend/a11y)` commit if the build touches that workspace.
