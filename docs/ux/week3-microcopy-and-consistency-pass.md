# Sprint 3, Week 3 (UX): microcopy and consistency pass on the final build

**Owner:** Aleeya Ahmad (UX), with Janataarah Begum (BA) for the open wording decision · **Branch:** `docs/week3-ux-final-qa`
**Plan task:** `[QUALITY ASSURANCE]` Microcopy & Consistency Pass on Final Build (45 min).
**Acceptance criteria:** no contradictory terminology across screens.
**Where it was run:** the local build on the mock data source, plus the source code and the backend seed. Not the deployed site.

## Result in short

- Every term below is now spelled **one way on every screen, with one exception**: the person who reviews video is called a **Reviewer** on the public site and the sign-in page, and an **Auditor** everywhere after they sign in (section 3). That contradiction was the acceptance criterion. It is now resolved: "Auditor" everywhere (section 3).
- About **35 strings in 21 files were corrected**: role names that were in lower case, "customer" where RCS says Client, "All clients", three Client messages that began in lower case, and two different ways of writing a time of day. A test now stops each of them coming back.
- Two further checks (tone and emoji) came back clean.

## 1. Method

| Pass | What it read | Covered |
|---|---|---|
| Rendered text | The visible text of each screen in the running app, counted against a list of about 20 terms and their variants | 33 screens: 13 public and Client, 17 Manager, 3 Reviewer |
| Source | Every quoted string and every line of screen text in the app's code, for lower-case role names, banned words and sentence starts | The whole `frontend/src`, plus the backend seed and messages |
| Tone | Exclamation marks and emoji in screen text | The whole `frontend/src` |

The rendered pass finds what a person sees. The source pass finds text that only appears in a state the pass did not visit (an error, a dialog, an empty list). Between them, the second pass found the lower-case "your manager" in an error message that no screen scan had reached.

## 2. Terms that are consistent

Counted on all 33 screens. Zero means the wrong variant was not found anywhere.

| Term | Spelling in use | Wrong variants found |
|---|---|---|
| The simulated platform | CommunityHub (one word) | "Community Hub": 0 |
| Signing in and out | Sign in · Sign out | "Log in", "Login", "Log out": 0 |
| The wellbeing step | check-in (hyphenated) | "check in" as a noun: 0 |
| The viewing break | cooldown (one word) | "cool-down": 0 |
| The emergency button | SOS alert (lower-case "alert") | "SOS Alert": 0 |
| The case identifier | Case ID | "case id": 0 |
| The assistant | AI Buddy | "AI buddy": 0 |

## 3. Reviewer or Auditor: decided, Auditor

**Decision (24 Oct 2026): option B, "Auditor" on every screen.** The recommendation below was A. It changed once the final slides and the handover document were written: both use "Auditor", as do the BA requirements (every AR-* ID), every client session since Sprint 1 and most of the app. The client brief says "reviewer" only as a job description, never as a role name. Option B is also the smaller change, and it keeps requirement traceability. It is applied in `fix/copy-auditor-role-name`, and `copyConsistency.test.ts` now fails if "Reviewer" returns to screen text. The fallback role is "Super Auditor" everywhere.

The analysis that led to the decision is kept below.

The same person is called two things. Counted on the rendered screens:

| Where | "Reviewer" | "Auditor" |
|---|---|---|
| Landing page | 25 | 0 |
| Team page | 10 | 0 |
| Sign-in page (panel) | "For RCS **Reviewers** and Managers" | 0 |
| Public policy dialog and Contact page (the Reporter's own pages) | "a trained Reviewer" | 0 |
| Demo guide | 6 | 5 |
| **Reviewer's own screens** (queue, cooldown, case) | **0** | **the header on all 3, and body text on the queue** |
| Manager screens other than Validation: Overview, Cases, Delivery, Insights, SOS inbox, Reassignment, a Reviewer's record, Case review, Audit history (9 of 13) | 0 | 1 to 6 per screen |
| Manager's Validation & Audit, all four views | 4 to 6 | 0, except its Audit history view, which has **both** (3) |

What a person experiences: a Reviewer reads "Reviewers" on the sign-in page, signs in, and the header says "RCS — **Auditor**". The Manager's Overview lists "Auditors", and the Validation page one tab away says "**Reviewer** overrides".

In the code, the screen text splits the same way: roughly 65 lines say "Auditor" in the Manager pages, shared components and wording tokens, about 30 more in the mock data, and the matching backend strings, against about 45 lines of "Reviewer" on the public pages.

**Where "Auditor" is fixed in place and would not change either way:** the demo sign-in IDs (`auditor-1` to `auditor-5`, `superauditor-1`), the database tables and columns, the routes (`/auditor`), and the requirement IDs.

### Options

| | What it means | Effect |
|---|---|---|
| **A. "Reviewer" on every screen** (recommended) | The person is a Reviewer in the header, the Manager's lists, the Validation page and the demo guide. IDs and URLs keep "auditor" | About 65 lines of screen text, about 30 in mock data, the matching backend strings and the tests that name them. One focused change |
| B. "Auditor" on every screen | The landing page, sign-in and the Reporter's pages change to "Auditor" | About 45 lines on the public pages, plus the story changes: the landing page is built around protecting "the Reviewer" |
| C. Keep both, with a rule ("Reviewer" to the public, "Auditor" inside) | Documented, not changed | The same person still has two names. Fails the acceptance criterion |

**Why A.** It is already the word the product uses to the outside world, on the pages a platform's decision-makers and Emily read first. It describes the job, a person who reviews. And "Auditor" collides with the product's own use of "audit": the Manager's tools are named *Validation & Audit*, *Audit history* and *audit log*, which are records about the system, so an "Auditor" reads as the person who reads those, not the person who watches the video.

**Sub-decision.** "Super Auditor" is the name of the fallback account in the header, the queue label ("Super Auditor only") and the demo guide. The app already calls the same role "fallback Reviewer" in three places (the sign-in hint, the demo guide's role label and the reassignment tag), so under A, "Fallback Reviewer" would be the screen name and `superauditor-1` stays the ID.

**Why this has not been applied.** The BA owns the wording standard (Emily's instruction was to define every label with the BA), and the presentation slides must match whatever is chosen. It needs a yes from Janataarah, and a heads-up to Hyuna for the slides. It is not hard to do.

## 4. What was corrected

| Was | Now | Where |
|---|---|---|
| "All clients" (the all-Clients view's name; the Overview and Insights subtitles) | **All Clients** | Backend, mock data, backend test |
| "your manager", "ask your manager" in the Reviewer's video error messages | **Manager** | Review workspace |
| "a trained reviewer", "the trained reviewer assigned to your case" | **Reviewer** | The Reporter's policy dialog and Contact page (public) |
| "Talk to my manager" (wellbeing option), "notify my manager" (SOS button's name) | **Manager** | Wellbeing check-in, review workspace |
| "Needs manager action" (the Overview's evidence title) | **Needs Manager action** | Mock data and backend |
| "declined by one reviewer and decided by another" (a report definition) | **Reviewer** | Backend, mock data, report labels |
| "(manager checked in)" in the demo menu; the "Fallback reviewer" tag | **Manager**; **Fallback Reviewer** | Demo menu, reassignment queue |
| "inside a customer's product" (the CommunityHub simulation notice) | **a Client's product** | CommunityHub header |
| "for this customer" (a report definition, three copies), "Customer organisation" (six seeded descriptions), "Customer not found" (four errors) | **Client** | Backend, mock data, report labels |
| Three seeded Client messages that began in lower case ("our moderation queue...", "no. An override is...") and said "the reviewer's" | Sentences, with **Reviewer's** | Mock data and the backend seed the deployed demo uses |
| `2 Oct 2026, 10:41 am` on delivery, report, audit and Client pages; `9:29 PM` on the Overview | **10:41 AM** everywhere | The short date-time formatter |

**Guard tests** (`copyConsistency.test.ts`, `formatPeriod.test.ts`) fail if any of these return: a lower-case Manager, Reviewer, Auditor or Client in any sentence of screen text; "All clients"; "Community Hub"; "customer"; a seeded message starting in lower case; or a time written with lower-case am/pm. They read comments, routes and IDs as not-screen-text. A first, narrower version of the guard missed the lower-case role names in the Reporter's pages, so the guard was widened until it found them.

**Reports already generated** on the deployed demo keep the definition text stored when they were made ("for this customer", "reviewer"). A reseed, or regenerating a report, picks up the new wording.

## 5. Checked, and left on purpose

| Item | Decision |
|---|---|
| "Copied!" on the Reporter's case-ID confirmation, against "Copied" on the staff and B2B screens | Kept. It is a Sprint 1 design decision for the Reporter's screen (the warmer confirmation was added from team feedback). The staff and B2B screens use a neutral "Copied" |
| "Needs you" (Manager Overview), "Needs attention" (Deliveries filter), "Needs action" (CommunityHub moderation) | Kept. They describe different lists on different screens, and "Needs action" belongs to CommunityHub, the simulated third party. If the team wants one phrase for the Manager's side, "Needs you" is the natural choice |
| "Validation & Audit" in title case | A proper name, matching the page and the tab title |

## 6. Tone: clean

- **Exclamation marks:** none in product text. The only hits are "Copied!" (above), a simulated CommunityHub post ("that last-minute winner!") and a line of a fake video transcript. The simulated content is meant to read like a real platform.
- **Emoji:** none.

## 7. Risk to note

Several sentences exist in three places: the backend, the mock data and a frontend wording file. The report definitions had three copies, and one copy was missed by the first search. The guard test now covers the frontend copies; the backend copy is covered only where a backend test asserts it. A single source for these strings would remove the risk. It is not needed for the demo.
