# Sprint 2 Accessibility Baseline (Task 99)

**Track:** Design / Product · **Sprint:** Sprint 2 · **Owner:** Aleeya Ahmad (UX) · **Date:** 18 Sep 2026
**Branch:** `feature/frontend` · **Related:** [UI review against Figma (Task 57)](sprint2-ui-review-figma-log.md) · [Microcopy audit (Task 100)](sprint2-microcopy-audit.md)

**AC:** each flow is checked with keyboard-only navigation and measured contrast values.

---

## 1. Scope and standard

- **Standard:** WCAG 2.1 Level AA, plus axe-core best-practice rules.
- **Requirement:** UR-NFR-01 (accessible, plain-language interface; colour is never the only signal).
- **Flows:** Normal User (upload by video, link or screenshot; Case ID confirmation; status lookup; add information), staff login, Auditor (queue, content warning, decline, AI summary, Review Workspace, wellbeing check-in, severity & comment, submission, cooldown, SOS, session expiry, connection loss), Manager (all 11 routes and their edge states).
- **Data:** synthetic mock data only.

## 2. Method

| Layer | Tool | Where | What it proves |
|---|---|---|---|
| Automated, every commit | jest-axe | `src/pages/normal-user/NormalUserPages.a11y.test.tsx`, `src/pages/staff/StaffPages.a11y.test.tsx` | No detectable WCAG violations in each page and state (jsdom can't compute contrast) |
| Real browser | axe-core 4.13 in Chrome (WCAG 2.0/2.1 A + AA + best-practice) | Every route and edge state, 1280×900 | Violations, **measured contrast** for every text node, tab stops |
| Keyboard, repeatable | `@testing-library/user-event` (Tab, arrows, Space, Enter, Escape only) | `src/test/KeyboardNavigation.test.tsx` (9 flows) | Every control in each flow is reachable and operable without a pointer |
| Keyboard, manual | Chrome focus checks | Header, Toggle, Slider, OverflowMenu, Accordion, dialog focus on open | A visible focus indicator, and focus moving into dialogs (CSS transitions jsdom can't run) |
| Token contrast | `@carbon/themes` values, WCAG formula | Every text/background token pair the app uses | Contrast holds for every state, not only the ones seeded |

Real-keyboard automation in the browser proved unreliable (key presses go astray when the automated window loses focus), so the keyboard walkthrough is a test file that runs in CI. Focus behaviour that depends on CSS transitions was confirmed in Chrome.

## 3. Keyboard-only results per flow

All 9 walkthrough tests pass (`KeyboardNavigation.test.tsx`).

| # | Flow | Steps driven by keyboard | Result |
|---|---|---|---|
| 1 | Upload | Tab to the evidence switcher → ArrowRight to "Paste a link instead" → Enter → type link → Enter on Submit shows the consent error → Space ticks consent → Enter submits → confirmation page | Pass |
| 2 | Case ID confirmation | Tab reaches Copy case ID, Email, Phone, "Check case status" → Enter opens status lookup | Pass |
| 3 | Status lookup | Type ID + Enter → **focus moves to the result heading** → Tab to "Add more information" → Enter → **focus lands in the details field** → Escape closes | Pass (after `ba7ec36`) |
| 4 | Staff login | Tab/type Staff ID and password → Enter → Auditor queue | Pass |
| 5 | Auditor review | Gate opens with **focus on the consent checkbox** → Space → Tab to Proceed (stays in the dialog) → Enter → Continue to review → blur slider ArrowLeft lowers the value → Play, Grayscale (Space toggles), Mute, SOS reachable → Continue → Space selects an outcome → Enter submits → "This case has been marked Complete." | Pass (after `04c0140`) |
| 6 | Decline | Tab to Decline → Enter → **focus on the first reason, none selected** → arrows select Personal Trigger → Enter on Submit decline → confirmation | Pass (after `9f35a43`) |
| 7 | Cooldown | Talk to my manager, the break toggle and Stop my shift are reachable | Pass |
| 8 | Manager | TopNav tab order Dashboard → Case Oversight → SOS Inbox → Reassignment Queue → Validation; SOS Inbox Acknowledge (Enter) → Acknowledge → follow-up notes, outcome (Space), Log outcome (Enter) → resolved | Pass |
| 9 | Manager reassignment | Dropdown opens with Enter, ArrowDown + Enter selects Jordan Lee, Enter confirms → "Reassignment confirmed" | Pass |

### Manual Chrome spot checks (visible focus)

| Control | Focus indicator measured | Result |
|---|---|---|
| Header logo link (dark header) | 2px solid `#ffffff` border on `#161616` | Pass |
| Header Help and Demo scenarios OverflowMenu | 2px white outline + inset ring | Pass |
| Carbon Toggle (Grayscale, break request) | 2px `#0f62fe` outline on the switch | Pass |
| Slider thumbs (scrubber, blur, CVI) | Thumb turns `#0f62fe`, scales 1.43×, with an inset ring | Pass |
| Accordion headers (evidence rail) | `#0f62fe` inset top and bottom rules | Pass |
| Read-only progress steps (status page) | `focus` token ring, added in `2abb25c` | Pass |
| Dialogs on open | Content warning → consent checkbox; add information → details field; decline → first reason; session expired → password field | Pass (after `04c0140`, `ba7ec36`, `9f35a43`) |

The automated focus heuristic flagged the header logo link and Carbon Toggle as possibly lacking focus. Both were checked by hand: the indicator is drawn by a border or pseudo-element the heuristic doesn't read.

## 4. Measured contrast

### 4.1 axe-core in Chrome: 0 violations in every state

Earlier sweep (before 18 Sep):

| State | Text nodes checked | Lowest measured pairs |
|---|---|---|
| Upload — video / link / screenshot / validation errors | 23–24 | 4.54:1 `#0f62fe` on `#f4f4f4` (14px); 4.55:1 `#0f62fe` on `#edf5ff`; 5.02:1 `#6f6f6f` on `#fff` (12px) |
| Status — not found | 10 | 5.0:1 `#da1e28` on `#fff` (12px); 5.0:1 `#fff` on `#0f62fe` |
| Status — Being Reviewed | 7 | 5.85:1 `#e8daff` on `#6929c4` (demo badge); 7.81:1 `#525252` on `#fff` |
| Status — add-information modal | 40 | 4.54:1 `#0f62fe` on `#f4f4f4` |
| Staff login — default / error / locked out | 9 | 7.81:1 `#525252` on `#fff`; 16.45:1 `#161616` on `#f4f4f4` |
| Auditor queue | 32 | 4.56:1 `#6f6f6f` on `#f4f4f4` (12px); 5.0:1 `#fff` on `#da1e28` |
| Auditor content warning; decline modal | 21 | 5.0:1 `#0f62fe` on `#fff`; 5.85:1 demo badge |
| Auditor AI summary | 42 | 4.56:1 `#6f6f6f` on `#f4f4f4` |
| Auditor Review Workspace | 34 | 5.0:1 `#0f62fe` on `#fff`; 5.0:1 `#fff` on `#0f62fe` |
| Auditor wellbeing check-in | 15 | 4.54:1 `#0f62fe` on `#f4f4f4` |
| Auditor severity & comment | 27 | 4.56:1 `#6f6f6f` on `#f4f4f4` |

This sweep (18 Sep 2026):

| State | Text nodes checked | Lowest measured pair | Violations |
|---|---|---|---|
| Case ID confirmation | 23 | 5.0:1 `#fff` on `#0f62fe`; 5.85:1 demo badge | 0 |
| Auditor AI-failure gate (`AR-2026-00421`) | 18 | 4.56:1 `#6f6f6f` on `#f4f4f4` (12px) | 0 |
| Auditor AI-failure workspace | 29 | 5.0:1 `#0f62fe` on `#fff` | 0 |
| Connection-lost banner | 32 | 5.0:1 `#0f62fe` on `#fff` | 0 |
| SOS confirmation | 14 | 4.54:1 `#0f62fe` on `#f4f4f4` | 0 |
| Cooldown page (SOS) | 18 | 4.54:1 `#0f62fe` on `#f4f4f4` | 0 |
| Queue — cooldown-active banner | 30 | 4.55:1 `#0f62fe` on `#edf5ff` | 0 |
| Queue — exposure-limit banner | 32 | 4.56:1 `#6f6f6f` on `#f4f4f4` | 0 |
| Submission fails | 29 | 4.56:1 `#6f6f6f` on `#f4f4f4` | 0 (see §6, transient) |
| Confirmation with cooldown (S4) | 20 | 5.0:1 `#fff` on `#da1e28` | 0 |
| Auditor session-expired modal | 32 | 4.54:1 `#0f62fe` on `#f4f4f4` | 0 (after `21a9fa4`) |
| Manager Oversight Dashboard | 44 | 5.0:1 `#fff` on `#da1e28` (SOS banner) | 0 |
| Manager Auditor Detail | 28 | 5.0:1 `#fff` on `#da1e28` | 0 |
| Manager Case Oversight | 108 | 5.0:1 `#0f62fe` on `#fff` | 0 |
| Manager Case Review Detail | 29 | 5.0:1 `#0f62fe` on `#fff` | 0 |
| Manager Reassignment decision | 34 | 5.0:1 `#0f62fe` on `#fff` | 0 |
| Manager SOS Inbox | 30 | 5.0:1 `#fff` on `#0f62fe` | 0 |
| Manager SOS Alert Detail | 25 | 5.0:1 `#0f62fe` on `#fff` | 0 |
| Manager SOS Follow-up | 19 | 5.85:1 demo badge | 0 |
| Manager Declined queue | 40 | 5.0:1 `#0f62fe` on `#fff` (12px) | 0 |
| Manager Validation | 32 | 5.85:1 demo badge | 0 |
| Manager raw access gate / summary / workspace | 21 / 25 / 31 | 5.0:1 `#0f62fe` on `#fff` | 0 |
| Manager follow-up success | 14 | 5.0:1 `#0f62fe` on `#fff` | 0 |
| Manager limit save failed / saved | 46 / 46 | 5.0:1 `#fff` on `#da1e28` | 0 |
| Manager break approved | 43 | — | 0 |
| Manager no reassignment confirmed | 20 | — | 0 |

The lowest pair anywhere is **4.54:1** (`#0f62fe` link text on `#f4f4f4`), above the 4.5:1 AA minimum for normal text.

### 4.2 Carbon token pairs (computed)

| Theme | Foreground | Background | Ratio | Result |
|---|---|---|---|---|
| White | `textPrimary` #161616 | `background` #ffffff | 18.1:1 | Pass AA |
| White | `textSecondary` #525252 | `background` #ffffff | 7.81:1 | Pass AA |
| White | `textHelper` #6f6f6f | `background` #ffffff | 5.02:1 | Pass AA |
| White | `textPrimary` #161616 | `layer01` #f4f4f4 | 16.45:1 | Pass AA |
| White | `textSecondary` #525252 | `layer01` #f4f4f4 | 7.1:1 | Pass AA |
| White | `textHelper` #6f6f6f | `layer01` #f4f4f4 | 4.57:1 | Pass AA |
| White | `textError` #da1e28 | `background` #ffffff | 5:1 | Pass AA |
| White | `linkPrimary` #0f62fe | `background` #ffffff | 5:1 | Pass AA |
| White | `linkPrimary` #0f62fe | `layer01` #f4f4f4 | 4.55:1 | Pass AA |
| White | `linkPrimary` #0f62fe | `notificationBackgroundInfo` #edf5ff | 4.55:1 | Pass AA |
| White | `textPrimary` #161616 | `notificationBackgroundInfo` #edf5ff | 16.46:1 | Pass AA |
| White | `textPrimary` #161616 | `notificationBackgroundError` #fff1f1 | 16.46:1 | Pass AA |
| White | `textPrimary` #161616 | `notificationBackgroundWarning` #fcf4d6 | 16.42:1 | Pass AA |
| White | `textPrimary` #161616 | `notificationBackgroundSuccess` #defbe6 | 16.41:1 | Pass AA |
| White | `textOnColor` #ffffff | `buttonPrimary` #0f62fe | 5:1 | Pass AA |
| White | `textOnColor` #ffffff | `buttonSecondary` #393939 | 11.55:1 | Pass AA |
| White | `textOnColor` #ffffff | `supportError` #da1e28 (S4 tag) | 5:1 | Pass AA |
| White | `textPrimary` #161616 | `supportCautionMinor` #f1c21b (S2 tag) | 10.75:1 | Pass AA |
| White | `textPrimary` #161616 | `supportCautionMajor` #ff832b (S3 tag) | 7.35:1 | Pass AA |
| White | `tagColorGray` #161616 | `tagBackgroundGray` #e0e0e0 (S1 tag) | 13.71:1 | Pass AA |
| White | `tagColorRed` #a2191f | `tagBackgroundRed` #ffd7d9 | 5.93:1 | Pass AA |
| White | `textPrimary` #161616 | `highlight` #d0e2ff | 13.79:1 | Pass AA |
| White | `textInverse` #ffffff | `backgroundInverse` #393939 | 11.55:1 | Pass AA |
| White | `iconPrimary` #161616 | `background` #ffffff | 18.1:1 | Pass (non-text ≥3:1) |
| White | `supportSuccess` #24a148 | `background` #ffffff | 3.35:1 | Pass (non-text ≥3:1) |
| White | `focus` #0f62fe | `background` #ffffff | 5:1 | Pass (non-text ≥3:1) |
| Gray 100 | `textPrimary` #f4f4f4 | `background` #161616 | 16.45:1 | Pass AA |
| Gray 100 | `textSecondary` #c6c6c6 | `background` #161616 | 10.59:1 | Pass AA |
| Gray 100 | `tagColorPurple` #e8daff | `tagBackgroundPurple` #6929c4 (Demo data badge) | 5.86:1 | Pass AA |
| Gray 100 | `tagColorRed` #ffd7d9 | `tagBackgroundRed` #a2191f | 5.93:1 | Pass AA |
| Gray 100 | `focus` #ffffff | `background` #161616 | 18.1:1 | Pass (non-text ≥3:1) |
| Gray 100 | `interactive` #4589ff | `layerAccent01` #393939 (exposure bar) | 3.45:1 | Pass (non-text ≥3:1) |
| Gray 100 | `supportWarning` #f1c21b | `layerAccent01` #393939 (exposure bar at limit) | 6.86:1 | Pass (non-text ≥3:1) |

Figma's Gray 50 secondary text (`#8d8d8d` on white, 3.32:1) was replaced by Carbon `textHelper` (5.02:1). The 60–70% opacity on disabled queue rows (3.39:1) was replaced by muted text.

## 5. Status never relies on colour alone (UR-NFR-01)

| Status | How it's conveyed besides colour |
|---|---|
| Severity S1–S4 | Tag text "S3 · High", on every screen |
| Public case status | Progress steps pair a distinct icon shape with a text label; the current-stage panel has a heading |
| Queue rows | Status text ("Ready for review", "AI analysis in progress", "Locked during cooldown"); only ready rows are links |
| Exposure | Minutes written out ("62 / 120 min today"); the bar is a `progressbar` with `aria-valuetext` |
| Manager exposure state | Tag text "Under", "Approaching", "At limit" |
| SOS alerts | Unacknowledged rows are bold, with an "Acknowledge" button instead of status text; the header and banner give the count in words |
| Flags in Case Oversight | "SOS" / "Declined" tag text |
| Incident timeline | Each marker has its timestamp and tag name as text |
| Exposure counter | "● Counting" / "○ Paused" symbol plus word |
| Validation chart | Series differ by striped pattern and legend text, with a full text equivalent |
| Notifications | Icon + "Error:" / "Success:" title text |
| Required fields | "*" plus the word "required" in the label |
| Complete status (public) | Checkmark icon + "Complete" heading |

## 6. Findings and fixes

| # | Finding | WCAG | Fix |
|---|---|---|---|
| 1 | Status page lost keyboard focus to `<body>` after a lookup | 2.4.3 | Focus moves to the result heading — `2abb25c` |
| 2 | Read-only progress steps were focusable with no visible focus | 2.4.7 | Focus-visible ring on the Carbon focus token — `2abb25c` |
| 3 | SOS banner outside any landmark | axe `region` | Banner inside a landmark — `2abb25c` |
| 4 | Content warning opened with focus on the close button, whose tooltip covered the flag reason | 2.4.3 / 1.4.13 | Initial focus on the consent checkbox — `04c0140` |
| 5 | Review Workspace controls (blur, Continue, Back) unreachable on laptop-height screens | 2.1.1 / 1.4.10 | Pinned column capped at viewport height and scrollable — `e0b8d42` |
| 6 | Auditor session-expired modal's focus sentinels outside any landmark | axe `region` | Modal rendered inside a named region — `21a9fa4` |
| 7 | "Add more information" dialog left focus on the button behind it | 2.4.3 | `useFocusOnOpen` moves focus to the details field — `ba7ec36` |
| 8 | Decline reason dialog left focus on the hidden gate's checkbox | 2.4.3 | Focus to the first reason, none pre-selected — `9f35a43` |
| 9 | Staff header overflowed narrow windows; tables wrapped IDs mid-word | 1.4.10 Reflow | Responsive header and scrollable tables — `a94588c` |

**Not a defect:** axe twice reported a contrast failure on a primary button ("Retry submit", and "Continue to submit" behind the session dialog). Both were captured during Carbon's 70ms colour transition. Re-measured once settled, both pass at 5.0:1 (`#fff` on `#0f62fe`).

## 7. Known limitations and open items

| # | Item | Owner |
|---|---|---|
| 1 | jsdom can't compute contrast or run CSS transitions, so contrast and initial dialog focus are verified in Chrome; the keyboard tests assert what jsdom can | — |
| 2 | Screen-reader testing (NVDA / VoiceOver) has not been done; recommended before the Sprint 3 usability sessions | Aleeya |
| 3 | The whole sweep ran on the local build; re-run axe on the deployed build once Task 104 is done (with Task 101) | Firas / Aleeya |
| 4 | Only the mock data source was swept; re-check api-mode screens once real data flows (longer names, empty states) | Firas |
| 5 | The Review Workspace's pinned column scrolls within itself on short screens — usable by keyboard and wheel, but worth watching in usability testing | Aleeya |
| 6 | Staff ID is hidden in the staff header below 1024px wide, to keep the header on one line | Aleeya (confirm) |
