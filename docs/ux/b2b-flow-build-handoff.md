# B2B End-to-End Flow — Build Handoff

**Track:** Design / Product · **Owner:** Aleeya Ahmad (UX) · **Branch:** `feature/b2b-end-to-end-flow`
**Spec:** [`b2b-end-to-end-flow-spec.md`](b2b-end-to-end-flow-spec.md) · **Brief:** [`b2b-flow-build-brief.md`](b2b-flow-build-brief.md)

Frontend only, on the mock data source (`VITE_DATA_SOURCE=mock`). In `api` mode every new operation shows the existing "This feature isn't connected to the backend yet." notice. Synthetic data only; the "Demo data" badge stays on every screen.

---

## 1. Every touchpoint and its screen

| # | Touchpoint | Route | Who |
|---|---|---|---|
| 01 | RCS product page (CommunityHub chooses RCS) | `/rcs` | Organisation |
| 02 | Organisation set-up: organisation, results endpoint, report button, review → workspace ready | `/rcs/get-started` | Organisation |
| 03 | CommunityHub post → Report → handoff explanation | `/communityhub` (simulated, labelled) | Public |
| 04 | Report form with the post link attached, case ID | `/?from=communityhub&source=…` → `/case-confirmation` | Reporter |
| 05 | Case status, delivery-aware outcome | `/status` | Reporter |
| 06 | Content warning → AI summary → protected review → decision; Request Support vs SOS; daily cap mid-case; cooldown + optional puzzle | `/auditor`, `/auditor/cases/:id`, `/auditor/cooldown` | Auditor |
| 07 | Automatic result delivery; exception queue, retry, escalate | `/manager/deliveries`, `/manager/deliveries/:id` | Manager |
| 07a | CommunityHub connection and payload | `/manager/customers/communityhub` | Manager |
| 08 | Oversight with the at-a-glance strip | `/manager` | Manager |
| 08a | Validation & audit log (combined) | `/manager/validation` | Manager |
| 09 | Generate, review and release a service report | `/manager/reports`, `/manager/reports/:id` | Manager |
| 10 | CommunityHub user signs in, views and downloads the released report; denied state | `/client/login`, `/client/reports`, `/client/reports/:id` | CommunityHub client |
| — | Demo flow guide linking all ten stages | `/flow` | Presenter |

Demo accounts (mock): `auditor-1` to `auditor-5`, `manager-1`, `ch-user-17`, password `testpassword123`.

## 2. Ten-minute demo

1. `/flow` → stage 01 `/rcs` → **Bring RCS to your platform** → complete the four set-up steps.
2. **See the report button on CommunityHub** → open a post's **Report** → **Continue to report**. The post link is already attached.
3. Upload a video, submit, copy the case ID; check `/status`.
4. Demo menu (gear, staff header) → **Fail the next CommunityHub delivery** if you want to show the exception path.
5. Sign in as `auditor-1`, review `AR-2026-00417`: request support, then complete it. Show the cooldown and the optional puzzle.
6. Sign in as `manager-1`: the dashboard strip shows the failed handoff → Deliveries → **Retry delivery**.
7. Reports → open the September draft → add a service note → **Approve and release**.
8. `/client/login` as `ch-user-17` → open the report → **Download PDF**; open a draft's URL to show the denied state.
9. Back on `/status`, a delivered "Policy Violation Found" case now also says CommunityHub has been notified.

## 3. Deliberate differences from the spec

Changed during the build to stay consistent with the existing, Figma-reconciled screens (user direction: match the current components and IBM colours, no new visual language):

| Spec said | Built | Why |
|---|---|---|
| Status tags with icons; coloured tile top rules; grey-filled cards; uppercase eyebrows | Text-only grey Carbon tags (red only for "Needs attention"), white panels with a 1px border, the SOS Inbox's 3px red accent, sentence-case labels | Matches `ExposureStateTag`, `Panel`, `Figure` and the SOS Inbox. Carbon also hides tag icons at small size, which made them inconsistent. |
| Toggletip "How is this calculated?" icons on report figures | Plain one-sentence definition under each section | Same information, no floating icons, prints cleanly. |
| Dark split-screen client sign-in | Same card as the staff login | One product, two separate sessions. |
| Three-step stepper on the report form | Existing single form + context line + optional post-link field | Keeps the tested, reconciled form; the stepper added length without new information. |
| Client role inside `useAuth` | Separate `useClientAuth`, `ClientRoute`, storage keys | A client session can never open a staff page, and the staff session can't open the client surface. |
| Tabs on Deliveries | ContentSwitcher | Tabs without panels failed axe (`aria-valid-attr-value`); ContentSwitcher is Carbon's component for views of the same content. |
| New route for the RCS front door at `/` | `/rcs`, with `/` still the report form | Existing links, tests and the deployed build keep working. |

## 4. Rules the build enforces

- The Manager never approves or edits an Auditor's moderation decision; only delivery and reports.
- Moderation status (Complete) and delivery status are always shown separately.
- The Reporter is told CommunityHub was notified only after delivery succeeded, and never sees delivery errors.
- Reports are computed from stored case records, are aggregate only, and list what is never included.
- Client access is deny-by-default and logged; unreleased, other-organisation and missing reports look identical.
- The daily cap never resets on cooldown; reaching it mid-review stops playback, keeps progress and returns the case to the Manager. The 9:00 AM reset is labelled as a Sprint 3 prototype rule.

## 5. Tests

- `services/mock/b2b.test.ts`: handoff, retries, idempotency, reports, client access and denial logging, the daily-cap return, governance log.
- `design-tokens/b2bLabels.test.ts`, `pages/normal-user/StatusDeliveryOutcome.test.tsx`, `components/wellbeing/BlockPuzzle.test.tsx`.
- `pages/B2bPages.a11y.test.tsx`: axe on every new screen and state.
- TopNav and keyboard-order tests updated to seven Manager sections.

**Failing on `main` before this branch, not changed here:** `IncidentTimeline` proportional positions, Manager exposure-limit save (MR-OV-04), and the Auditor case-review axe test (an unlabelled element in the review workspace). Everything else passes.

## 6. Open points for the team

1. 9:00 AM working-day reset: prototype rule; BA baseline still lists it open.
2. Handoff payload: minimal five fields; confirm with Naresh.
3. RT-01 should note the "CommunityHub has been notified" sentence (shown only on delivered violation outcomes).
4. Sprint 3 plan mentions "daily/weekly reset"; the extras doc defines daily only.
5. Not built (later HD pass): Manager Intelligence Dashboard analytics and evidence drill-down, Manager Copilot.
