# Sprint 2 Integrated UI Review Against Figma (Tasks 57, 81) + Manager Honesty Checklist (Task 96)

**Track:** Design / Product · **Sprint:** Sprint 2 · **Owner:** Aleeya Ahmad (UX) · **Date:** 18 Sep 2026
**Branch reviewed:** `feature/frontend` · **Related:** [Build-scope handoff (Task 54)](sprint2-build-scope-handoff.md) · [Microcopy audit (Task 100)](sprint2-microcopy-audit.md) · [Accessibility baseline (Task 99)](sprint2-accessibility-baseline.md)

---

## 1. Method

| | |
|---|---|
| Build | Local Vite dev build of `feature/frontend` (no deployed build exists yet — see §6) |
| Data source | `VITE_DATA_SOURCE=mock` for the screen comparison; `api` for the honesty check in §7 |
| Browser | Chrome (DevTools protocol), 1280 × 900 viewport for the comparison |
| Figma files | Normal User `WVsLoKZU9y4v75xWWSUNCv`, Auditor `QGPZWRZRFeKxkl0NApc35D`, Manager `0qMhTLDlozGkcdqcgbwyse` |
| Requirements | `docs/ba/ba-requirements-sprint2-final.md` (RT-01, RT-02, AR-DF-03), `docs/ba/severity-scale.md` |

Each frame was exported from Figma and compared with the running app in the same state. Edge states were reached with the Demo scenarios menu (failed save, target unavailable, expired session, exposure limit, cooldowns). Copy was compared line by line; layout, hierarchy and component choice were compared visually.

**Classes**

- **P0 blocker:** breaks or misleads a P0 flow. Fixed immediately.
- **P2 cosmetic:** a visible difference that doesn't change what the user can do. Fixed where quick, otherwise logged in §4.
- **Deliberate — keep:** a known, reasoned difference (Task 81 wording: "deliberate, keep").

A responsive layout sweep was added during the review after the team reported that pages didn't fit their screens. It covered every route at 1280×720, 1366×768, 1440×900, 1920×1080 and 2560×1440, plus 768 and 375 wide. Results are in §2 and §3.

---

## 2. Per-screen results

### Normal User

| Screen | Figma | Route / state | Difference | Class | Status | Reason |
|---|---|---|---|---|---|---|
| Upload — video | 5:2 | `/` | Content switcher selected segment is Carbon's dark fill, not blue | Deliberate | Keep | Stock Carbon `ContentSwitcher` (Carbon over Figma) |
| Upload — video | 5:2 | `/` | "Submit report" is disabled until evidence (and name + email, if identified) is present; Figma shows it enabled | P2 | Open (§4) | The consent error (73:29) is still explicit; needs a UX decision on disabled vs error-on-submit |
| Upload — video | 5:2 | `/` | Reporting-choice helper text sits under the radios | Deliberate | Keep | Carbon `RadioButtonGroup` helper position |
| Upload — link | 72:28 | `/` → Paste a link | App keeps the details and reporting-choice fields that the trimmed Figma variant omits | Deliberate | Keep | One form for all three evidence types |
| Upload — link | 72:28 | `/` → Paste a link | Consent label says "my video" for a link — **matches Figma** | — | Needs sign-off | Logged in the Task 100 audit |
| Upload — screenshot | 72:58 | `/` → Add a screenshot | No difference beyond the switcher | — | — | — |
| Upload — identified | 418:72 | `/` → Include my name & email | Name/email fields spanned the full card; Figma sizes them to about half | P2 | Fixed `18b6242` | — |
| Consent error | 73:29 | `/` submit without consent | No difference | — | — | — |
| Processing failed | 73:41 | Demo: fail next submission | No difference | — | — | — |
| Case ID confirmation | 6:2 | `/case-confirmation` | Warning text renders semibold (Carbon notification title) | Deliberate | Keep | Carbon `InlineNotification` |
| Status — lookup / not found | 7:15, 7:41 | `/status` | The white card stretched to the bottom of the viewport on short pages | P2 | Fixed `3817eef` | — |
| Status — Being Reviewed | 7:16 | `/status` → `RCS-7Q3M-K91X` | Progress uses Carbon `ProgressIndicator` | Deliberate | Keep | Icon + label per step (UR-NFR-01) |
| Outcome preview / Complete | 145:75 | `/status` → `RCS-4H8P-2DXC` | The outcome sat **below** Case details; Figma leads with "Complete" and the outcome | P2 | Fixed `18b6242` | RT-01 heading and message stay separate elements |
| Add more information | 80:31 | `/status` → Add more information | Carbon modal chrome (close button, footer) | Deliberate | Keep | Carbon `Modal` |

### Auditor

| Screen | Figma | Route / state | Difference | Class | Status | Reason |
|---|---|---|---|---|---|---|
| Login / error / locked out | 8:2, 8:22, 36:129 | `/staff/login` | "RCS — Staff" eyebrow; Staff ID field. Figma 36:129 says "work email" while 8:2 says "Staff ID" | Deliberate | Needs sign-off | One login for both roles; backend contract uses staff ID |
| Queue | 10:6 | `/auditor` | "Assigned" header was left-aligned over right-aligned values | P2 | Fixed `8d4ae31` | Carbon's unlayered table styles beat Tailwind's `text-right` |
| Queue | 10:6 | `/auditor` | Rows sorted by assignment time; completed rows (e.g. `AR-2026-00402`) are listed | Deliberate | Keep | Matches the page's own copy ("in the order the system assigned them") and the cooldown notice ("past case metadata") |
| Queue | 10:6 | `/auditor` | Header table band is Carbon grey; Figma has no band | Deliberate | Keep | Carbon `DataTable` |
| Queue | 10:6 | `/auditor` | Disabled rows use muted text, not 60–70% opacity | Deliberate | Keep | Opacity measured 3.39:1 (fails AA) |
| Queue — AI failure row | — | `AR-2026-00421` | Severity cell is blank | P2 | Open (§4) | Consider "Unknown" text; no Figma frame for this row |
| Empty / cooldown active / exposure limit | 36:146, 36:189, 34:121 | Demo scenarios | Copy matches | — | — | — |
| Content warning | 16:19 | `/auditor/cases/AR-2026-00417` | Focus opened on the close button, whose tooltip covered the flag reason | P2 | Fixed `04c0140` | Focus now starts on the consent checkbox |
| Content warning | 16:19 | same | "This case was flagged for:" was not bold | P2 | Fixed `04c0140` | — |
| Content warning | 16:19 | same | Proceed/Decline are both Carbon `secondary` in the modal footer; the note sits above them | Deliberate | Keep | Equal weight (AR-PV-02); Carbon `ComposedModal` chrome |
| Content warning | 16:19 | same | Four visual tags, not two | Deliberate | Keep | Seed data carries the full S3 sample timeline |
| AI/STT failure gate | 25:212 | `AR-2026-00421` | Footnote had been shortened | P2 | Fixed `04c0140` | Restored the full Figma sentence |
| Decline reason / confirmation | 25:137, 25:353 | Decline | Copy matches AR-DF-03 order | — | — | — |
| AI Analysis Summary | 18:26 | Proceed | Timeline markers are coloured by tag tier, with text labels | Deliberate | Keep | Tagged timeline restored from Figma; colour never the only signal |
| Review Workspace | 20:35 | Continue to review | On laptop-height windows the pinned video column was taller than the screen: the blur slider, **Continue** and **Back** could not be reached and the page seemed not to scroll | **P0** | Fixed `e0b8d42` | Column is capped at viewport height and scrolls within itself |
| Review Workspace | 20:35 | same | Evidence rail text squeezed and entity tags stacked one per line (Carbon Accordion 25% end padding) | P2 | Fixed `e0b8d42` | — |
| Review Workspace | 20:35 | same | Synthetic test pattern instead of footage; local-file preview in mock mode | Deliberate | Keep | Synthetic content only |
| Review Workspace | 20:35 | same | "AI-suggested reference: 70%" line instead of a marker on the blur track; Carbon Slider with number input | Deliberate | Keep | S3 = 70% from Figma; other tiers are placeholders (sign-off) |
| Review Workspace | 20:35 | same | Flagged-moment markers sit under the scrubber and are clickable | Deliberate | Keep | Keyboard-reachable jump targets |
| Wellbeing check-in | 31:188 | Talk to your manager | Designer annotation paragraphs omitted | Deliberate | Keep | Annotations aren't UI |
| Severity & comment | 25:53 | Continue to severity | Carbon Slider + number input; submit disabled with a reason line | Deliberate | Keep | Carbon over Figma; reason always shown |
| Submission fails | 42:405 | Demo: fail next submission | Copy matches | — | — | — |
| Submission confirmation | 25:280 | Submit | Figma says cooldowns "ship in Sprint 3 — this build does not yet trigger one"; the build does trigger AR-WB-12 cooldowns, so the line states the cooldown instead | Deliberate | Keep | Full shell includes Sprint 3 behaviour |
| Cooldown | 31:99 | `/auditor/cooldown` | Check-in note is worded for S4 and SOS generally; wellbeing check-in shown inline | Deliberate | Keep | 31:188 annotation places the check-in inline here |
| SOS confirmation | 31:257 | SOS | Copy matches | — | — | — |
| AI/STT failure mid-review (AR-AI-11) | 25:212 annotation → 31:257 | Demo: Fail AI analysis mid-review (open case) | No frame of its own. Built as the SOS path, as the 25:212 annotation says: content hidden at once, Manager notified, S4-equivalent cooldown. One added line, "AI analysis for this case failed during your review.", so the Auditor knows why the case paused without pressing SOS. Checked at 1280×720, 1920×1080 and 375 wide (18 Sep 2026) | Deliberate | Keep (copy needs sign-off, microcopy audit §4) | The Auditor did not press SOS, so the pause needs a reason |
| Session expired | 36:235 | Demo: expire session | Staff ID shown in place of "J. Doe" | Deliberate | Keep | The API has no display name |
| Connection lost | 42:352 | Demo: drop connection | Copy matches | — | — | — |
| Header (all) | — | all staff routes | Header items ran off the edge on narrow windows; content stretched edge to edge on wide monitors | P2 | Fixed `a94588c` | Responsive header, table scrolling, 1584px centred body |

### Manager

| Screen | Figma | Route / state | Difference | Class | Status | Reason |
|---|---|---|---|---|---|---|
| Login / error / locked out | 1:342, 1:355, 1:1170 | `/staff/login` | Shared staff login | Deliberate | Keep | One login redirects by role |
| Oversight Dashboard | 78:69 | `/manager` | Seed IDs `AR-2026-…` instead of `MR-2026-…`; header shows staff ID not "Reese" | Deliberate | Keep | One dataset across roles; no display name in the API |
| Auditor Detail | 86:94 | `/manager/auditors/auditor-2` | Carbon `NumberInput` for the limit | Deliberate | Keep | Carbon over Figma |
| Limit saved | 356:364 | Save limit | Message read "Exposure limit saved: … daily limit is now 90 minutes." | P2 | Fixed `b4250b9` | Now "Success: Exposure limit updated to 90 min." |
| Limit saved | 356:364 | same | No "← Back to Auditor Detail" button | Deliberate | Keep | The confirmation shows in place on the Auditor Detail page |
| Break approved / save fails | 357:314, 197:309 | Approve / Demo: fail next save | Copy matches | — | — | — |
| Case Oversight | 86:198 | `/manager/cases` | Status labels are RT-02 ("Complete", "Auditor Review", "Ready for Review") rather than Figma's "Completed", "Under Review", "Submitted" | Deliberate | Keep | RT-02 is the single status source; "Manager Review" pending BA (see Task 54 open items) |
| SOS banner | 103:294 | Section pages | Copy matches | — | — | — |
| SOS Inbox | 103:151 | `/manager/sos` | Times read "2:07 am — 4 min ago" and "9:31 pm — 1 day ago" | P2 | Fixed `18e6dfa` | Now "9:14 AM — 4 min ago" and "Yesterday, 4:32 PM" |
| SOS Inbox | 103:151 | same | Relative time "1h 8m ago" vs Figma "1 hr 8 min ago" | Deliberate | Keep | One relative format across the app, taken from Auditor 34:121 ("4h 10m ago") |
| SOS Alert Detail / Follow-up | 103:197, 103:228 | `/manager/sos/SOS-demo0001` | Narrative summaries prefixed "Mock:" | Deliberate | Keep | Task 96 honesty labelling |
| SOS Alert Detail | 103:197 | an alert raised by AR-AI-11 | Extra "Raised by" figure: "Auditor SOS" or "AI failure mid-review" | Deliberate | Keep | AR-AI-11 alerts share the SOS inbox; the Manager should know the Auditor did not press SOS |
| Case Review Detail | 118:198 | `/manager/cases/AR-2026-00398/review` | Copy matches | — | — | — |
| Declined queue | 119:289 | `/manager/reassignment` | "Time declined" showed a full date and time on every row | P2 | Fixed `18e6dfa` | Now "9:40 AM" / "Yesterday, 2:15 PM" / "2 days ago" |
| Reassignment | 119:405 | `/manager/cases/AR-2026-00398/reassign` | Cooling-down candidates are marked "Unavailable" and listed; Figma shows "Limited headroom" only | Deliberate | Keep | Re-validation rule (cooldown = not assignable); seed puts Auditors 3–5 in cooldowns |
| No reassignment / confirmed / target unavailable | 344:282, 357:397, 197:321 | Confirm / Demo: target unavailable | Copy matches; unavailable state reuses the decision form with the error | Deliberate | Keep | Same page, error inline |
| Raw access gate / summary / workspace | 1:454, 1:512, 1:612 | `/manager/cases/…/raw?from=reassign` | Summary uses the shared graphical timeline instead of chips | Deliberate | Keep | One component for Auditor and Manager |
| Validation | 136:257 | `/manager/validation` | Placeholder banner is a Carbon notification; chart series use a striped pattern + legend text | Deliberate | Keep | Carbon over Figma; series don't rely on colour |
| Session expired | 1:1231 | Demo: expire session | Copy matches | — | — | — |

---

## 3. P0 blocker list

| # | Blocker | Fix |
|---|---|---|
| 1 | Review Workspace controls unreachable on laptop-height screens (the page appeared not to scroll) | `e0b8d42` |

**Open P0 blockers: none.**

## 4. P2 backlog (open)

| # | Item | Owner |
|---|---|---|
| 1 | Upload "Submit report" disabled until evidence exists — keep, or enable and validate on submit as in Figma 5:2 | Aleeya |
| 2 | AI-failure row in the Auditor queue has a blank severity cell — add "Unknown" text? | Aleeya |
| 3 | Rounded corners (8px) on the public card, staff login card and TrustBanner, where Carbon is square — does "Carbon over Figma" extend to radius? | Aleeya |

## 5. Deliberate — keep (summary)

- All colours are Carbon theme tokens rather than Figma hex. Figma Gray 50 secondary text became Carbon `text-helper`, because Gray 50 fails AA.
- Disabled queue rows use muted text instead of opacity (opacity measured 3.39:1).
- Severity tags are Carbon Tags on Carbon status tokens; S3 = `support-caution-major`.
- Proceed and Decline are both Carbon `secondary` (equal weight, AR-PV-02); SOS is Carbon `secondary`.
- The Review Workspace shows a synthetic test pattern; the local-file preview is mock-mode only.
- The blur reference is a text line rather than a marker on the track (S3 = 70% from Figma; the other tiers are placeholders).
- The evidence rail uses Carbon Accordion; Carbon Modal/ComposedModal chrome replaces the custom Figma modal frames.
- The Validation chart adds stripes and legend text so series don't rely on colour.
- Seed case IDs are `AR-2026-…` in every role (one dataset); the header shows the staff ID (no display name in the API).
- The login eyebrow is "RCS — Staff" and the field is Staff ID rather than work email (sign-off pending, Task 100 audit).
- The Demo data badge and Demo scenarios menu appear in mock mode only.
- The wellbeing check-in page omits the 31:188 designer annotations.
- RT-02 status labels are used everywhere instead of Figma's variants, and the Auditor's relative-time format is used in both staff apps.

## 6. Task 81 note

Task 81 asks for this review against the **live Week 2 build**. No deployed build exists yet, because the IBM Cloud Code Engine deploy is Task 104. This review ran against the local build of the same branch, and every difference above is already classed as "fix" or "deliberate, keep". **The live-build re-check stays open under Task 101 until Task 104 is done.**

---

## 7. Task 96 — Honesty checklist (Manager scaffold wording)

**AC:** no placeholder section could be mistaken for live data by someone unfamiliar with the build; any validation-view placeholder is explicitly labelled as mock/placeholder and not presented as real model-performance evidence.

Checked 18 Sep 2026 in the browser in both data modes, plus automated tests.

| Screen | Route | Demo badge (mock) | Figures that could read as real | Placeholder wording | api mode | Evidence |
|---|---|---|---|---|---|---|
| Oversight Dashboard | `/manager` | Yes | Exposure minutes, cases today — synthetic seed | Badge on the header; tooltip "Synthetic demo data — not connected to the live backend" | "This feature isn't connected to the backend yet." | `ManagerPages.test.tsx` "Dashboard is reachable, renders without error and is labelled as demo data" |
| Auditor Detail | `/manager/auditors/:id` | Yes | Exposure, recent cases, check-ins | Badge | Not-connected message | Browser check (header text on every route) |
| Case Oversight | `/manager/cases` | Yes | Case list | Badge | Not-connected message | `ManagerPages.test.tsx` "Case Oversight is reachable…" |
| Case Review Detail | `/manager/cases/:id/review` | Yes | AI analysis, Auditor assessment | Narrative prefixed "Mock:" | Not-connected message | Browser check; seed `Mock:` prefixes |
| Reassignment decision | `/manager/cases/:id/reassign` | Yes | Headroom minutes | Badge | Not-connected message | Browser check |
| Exceptional raw access | `/manager/cases/:id/raw` | Yes | AI summary | Synthetic test pattern, never footage | Not-connected message | Browser check |
| SOS Inbox | `/manager/sos` | Yes | Alert times | Badge | Not-connected message | `ManagerPages.test.tsx` "SOS Inbox is reachable…" |
| SOS Alert Detail | `/manager/sos/:id` | Yes | Exposure, CVI | Narrative prefixed "Mock:" | Not-connected message | Browser check |
| SOS Follow-up | `/manager/sos/:id/follow-up` | Yes | — | Badge | Not-connected message | Browser check |
| Declined / Reassignment Queue | `/manager/reassignment` | Yes | Decline list | "Other" reason text prefixed "Mock:" | Not-connected message | `ManagerPages.test.tsx` "Reassignment Queue is reachable…" |
| Validation View | `/manager/validation` | Yes | Match rate, set size, distribution | "Placeholder / mock data — not real validation results.", "Match rate (illustrative)", "All values illustrative placeholder data.", and no pass/fail threshold shown | Not-connected message | `ManagerPages.test.tsx` "labels the validation data as a placeholder everywhere it appears" |
| SOS banner | section pages | Yes | Alert count | Badge on the same header | Hidden (no data) | Browser check |

**Result:** pass. In mock mode, every Manager screen carries the persistent "Demo data" badge, AI narratives in the seed are prefixed "Mock:", and the Validation View is labelled as placeholder in three places without presenting a pass/fail threshold. In api mode the badge and Demo scenarios menu are hidden, the login shows no demo credentials, and every Manager route shows "This feature isn't connected to the backend yet." rather than an empty table that could read as "no data".

The api-mode check also found the Auditor queue and Cooldown page loading forever when the API couldn't answer. Both now show an error (`c058069`).
