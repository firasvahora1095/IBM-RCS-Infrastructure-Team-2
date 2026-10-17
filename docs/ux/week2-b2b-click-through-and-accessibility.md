# Sprint 3, Week 2 (UX): B2B click-through and accessibility pass

**Owner:** Aleeya Ahmad (UX) · **Branch:** `feat/week2-b2b-a11y`
**Plan tasks:** `[FULL USER FLOW]` the non-functional B2B click-through; `[QUALITY ASSURANCE]` the final accessibility pass on Week 2 builds; `[EXTRA FEATURE]` the AI Buddy frontend (see [`ai-buddy-handoff.md`](ai-buddy-handoff.md)).
**Where it was run:** the local build on the mock data source (`localhost`), signed in with the seed's test accounts. **The deployed site has not been crawled by hand**; see section 5.

## 1. B2B click-through: every touchpoint is clickable, with no dead links

Acceptance criteria: *every marked touchpoint included and clickable; flows end to end without dead links.*

| # | Touchpoint | Route | Person | On the `/flow` guide | Links checked |
|---|---|---|---|---|---|
| 01 | CommunityHub chooses RCS | `/rcs` | Organisation | Yes | Yes |
| 02 | Organisation set-up | `/rcs/get-started` | Organisation | Yes | Yes |
| 03 | Report button on CommunityHub | `/communityhub` | Public | Yes | Yes |
| 04 | Report and case ID | `/` → `/case-confirmation` | Reporter | Yes | Yes |
| 05 | Check case status | `/status` | Reporter | Yes | Yes |
| 06 | AI pre-screen and protected review | `/auditor`, `/auditor/cooldown`, `/auditor/cases/:id` | Auditor | Yes | Yes |
| 07 | Result delivered to CommunityHub | `/manager/deliveries` | Manager | Yes | Yes |
| 07b | CommunityHub acts on the result | `/communityhub/moderation` | CommunityHub Trust & Safety | Yes | Yes |
| 08 | Manager oversight | `/manager` (+ `/manager/cases`, `/sos`, `/reassignment`, `/validation`) | Manager | Yes | Yes |
| 09 | Service report review and release | `/manager/reports` | Manager | Yes | Yes |
| 10 | CommunityHub views the report | `/client/reports` | CommunityHub Client | Yes | Yes |
| 11 | Contact RCS | `/client/messages`, `/manager/messages` | Client / Manager | linked from the Client header | Yes |

**Proof (automated, runs in CI):**
- `FlowHubPage.test.tsx`: a stage for every touchpoint; each stage opens its own screen for the right person.
- `services/mock/b2bJourney.test.ts`: the hand-offs between people carry the data across.
- **New:** `test/linkIntegrity.test.tsx`: renders 24 screens across the four journeys (public, Auditor, Manager, CommunityHub Client) as the person who uses each, and checks that every link leads to a route that exists in `App.tsx`. A guard test makes sure the route list was read, so it can't pass by checking nothing.

**What the check found and fixed:** the staff and Client sign-in pages had **no links at all**, so the only way out was the browser's Back button. Both now have "Back to RCS".

**By design:** the hops between different people (Reporter → Auditor → Manager → Client) are not links, because they are different people on different devices. `/flow` is the guide that bridges them.

## 2. Accessibility pass (measured, not eyeballed)

Acceptance criteria: *fully navigable keyboard-only; no status conveyed by colour alone; contrast measured.*

**Method:** Lighthouse accessibility audit in Chrome (it measures colour contrast on the rendered page, which the jsdom tests cannot), plus the repo's automated suites (axe on every screen and state, keyboard-only walkthroughs), plus a reflow check by emulating a 320px phone.

### 2.1 Results: 15 screens, accessibility score 100 on every one

| Screen | Score | Notes |
|---|---|---|
| `/rcs` (new problem and team sections) | 100 | |
| `/rcs/get-started` | 100 | |
| `/communityhub` (new simulation notice) | 100 | label-in-name issue found and fixed, see 2.2 |
| `/communityhub/moderation` | 100 | |
| `/` report form · `/status` · `/flow` | 100 · 100 · 100 | flow guide: label-in-name fixed |
| `/staff/login` · `/client/login` | 100 · 100 | |
| `/auditor` with the Super Admin's fallback queue | 100 | |
| **AI Buddy panel open, with an answer, live caption and link** | 100 | |
| `/manager` | 100 | label-in-name and table-header issues fixed |
| `/manager/cases` (new Availability column) | 100 | |
| `/manager/validation` (combined Validation & Audit log) · `/manager/reports` | 100 · 100 | |

### 2.2 Failures that did not change the score but are real, and are fixed

Lighthouse's score weights only some checks. These failed anyway and matter to real users:

| Issue (WCAG) | Where | Fix |
|---|---|---|
| **Label in name** (2.5.3): the accessible name didn't contain the visible text, so a voice-control user saying what they see would fail | CommunityHub brand link; header SOS badge; the SOS banner; 5 Manager "needs attention" rows; 11 flow-guide stage tiles; the "Make available" button | Removed the overriding `aria-label` where the visible text already says it, so the name is the visible text. For "Make available" the case ID now follows the visible words |
| **Table cells without headers** (1.3.1) | The AI-versus-Auditor severity matrix: its corner cell was a `td` | Made it a header cell with a hidden description |
| **No page description** | All pages | Added a meta description |
| **Green tags had dark text** (a design preference to use white). White on Carbon's success green (Green 50, `#24a148`) is only 3.3:1, which fails AA at tag size | Every success tag, e.g. "Available", "Delivered", "Released" | White text on Carbon's Green 60 (`#198038`), about 5:1, taken from `@carbon/colors`. A test measures both pairs |

### 2.3 Reflow and fit

- **320px phone:** no sideways scrolling on `/rcs`, `/communityhub`, `/manager/cases`. The AI Buddy panel takes the full width and is fully usable.
- **Header at 320px (demo mode only):** the badge, demo menu, exposure bar, Buddy button and Sign out did not fit, so they overlapped. The badge is now "Demo" on phones (its full wording stays in the tooltip and accessible name) and the demo-only scenarios menu is hidden there. The real, non-demo header has fewer items and was fine.
- **Laptop sizes:** 30 route/width combinations (1280, 1100 and 1024px wide) show no sideways overflow. At 1366×768 the Auditor dashboard, Review Workspace and content-warning dialog fit. With the AI Buddy open on a ~1100px-wide window the page is squeezed to about 685px: it does not overflow but the stat tiles get tall.

### 2.4 What the automated suites already prove

- axe on every screen and every state, in CI (`B2bPages.a11y.test.tsx`, per-page tests, 20+ for the Buddy and fallback queue).
- Keyboard-only walkthroughs of the review, decline, SOS and Manager flows (`KeyboardNavigation.test.tsx`), and for the Buddy: open, ask, follow a link, Escape closes and focus returns.
- Status is always text as well as colour: every tag, delivery state, severity and exposure state carries words.

## 3. Emily's feedback (8 Oct), status

| Ask | Status |
|---|---|
| Landing page: a very clear problem statement | **Done.** "The problem" section straight after the hero |
| Landing page: "Meet the team" | **Done.** "The team" section, five names and roles |
| State clearly and professionally that CommunityHub is a mock | **Done.** A notice under the CommunityHub header on the feed and the moderation queue |
| Super admin auditor + a way to make cases visible to lower-level Auditors | **Done**, with automatic placement (PR #89) |
| Generic AI chatbot ("AI buddy"), preliminary | **Done** (PRs #87, #88) |
| Always use an uppercase "Client" | **Done** on the 7 visible strings found |
| Delete the HD part from `/flow` | Already done (verified) |
| Rewrite every UI tag: short, clear, professional | **Not done.** Needs the BA's wording standard applied screen by screen |
| Reduce clicking | **Not done.** Clicks per core path not yet measured |
| Two demo videos | **Not done** |
| Cited research for the cooldown puzzle | **Not done** |

## 4. Not covered and why

| Item | Why |
|---|---|
| **NVDA screen-reader pass** | Needs a person with NVDA. Live-region behaviour in the Buddy is the part automated tools can't judge |
| `/manager/validation` layout shift (0.48) | The page jumps as data loads. Not a WCAG failure but noticeable. Not yet fixed |
| `robots.txt` / `llms.txt` | SEO checks, not accessibility. Left alone |

## 5. Limits of this evidence

- Run on the **local mock build**, not the deployed site. I don't type passwords into hosted sites, so the deployed sign-in flows still need a hand crawl by a team member with the demo accounts.
- Lighthouse was run at desktop size for the contrast measurements, and the phone width was checked for overflow, not re-scored.
