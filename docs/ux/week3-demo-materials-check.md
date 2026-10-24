# Sprint 3, Week 3 (UX): demo materials polish and placeholder check

**Owner:** Aleeya Ahmad (UX) · **Branch:** `docs/week3-ux-final-qa`
**Plan task:** `[PRESENTATION PREP]` Polish Demo Materials for Live Presentation (60 min).
**Acceptance criteria:** no placeholder content left visible.
**Where it was run:** the local build on the mock data source, plus the backend's own demo seed run against a throwaway SQLite file, to see what the **live** demo will show. The deployed site was not tested.

## Result in short

- **The screens are clean.** No filler text, no `undefined` or `NaN`, no broken images, no missing alt text, no marking or "HD" wording on any of the screens checked. The Validation page's placeholder labels exist only on the local mock data source, where they are deliberate (section 2).
- **Three things need a person, and are not code:**
  1. The team page shows **five initials tiles instead of photos**. It needs five photos (section 3).
  2. **Both demo videos are dated 28 September**, before the redesign. They show an older product (section 3).
  3. **The live demo's data needs three small steps** before presenting, or the Technical log will be empty (section 3).
- Fixed in this pass: the landing page's Manager screenshot still said "All clients"; an empty Technical log gave a misleading message.

## 1. Placeholder checks and results

| Check | Where | Result |
|---|---|---|
| Filler text: lorem, TBD, TODO, "coming soon", dummy names and emails | All of `frontend/src`, not comments | **None.** The only `example.com` strings are standard hints inside email fields |
| Broken values on screen: `undefined`, `NaN`, `[object` | Rendered text of 28 screens (16 Manager, 12 public) | **None** |
| Images | 12 images on the 12 public screens, scrolled so lazy images load | **All load, all have alt text** |
| "HD", "pitch", "rubric", "marker", "assessment" wording (Emily, 8 Oct: the HD section must not be shown) | Rendered text of 16 screens, including the demo guide | **None.** The demo guide has just its four journey phases, the sign-in table and the closing section |
| Page icon and title | `index.html`, every screen | The favicon is the RCS mark. Each screen has its own tab title (see the accessibility doc) |
| Team photos | `/rcs/team` | **Initials tiles.** The photo files are not in `public/team/` (section 3) |
| Product tour screenshots on the landing page | The three images | Current. The Manager screenshot was **retaken**: it said "All clients" and an old time format |

## 2. Placeholder wording that is on purpose

The local build runs on invented (mock) data, so it labels itself, on every screen, with the **Demo data** badge. Two more labels appear on the Validation & Audit page there:

| Label | When it appears | Why |
|---|---|---|
| "Illustrative" beside the AI accuracy figure (82%), and "All values illustrative placeholder data" | Mock data source only | The accuracy figure is invented there, so the screen says so. On the live backend the figure is computed from the labelled test videos and the label does not appear |
| "Legacy demo · Not recorded" on the 10 Technical log rows | Mock data source, and the live backend only if "Data source" is switched to "Legacy demo" | Old-format sample rows, marked as such |

If the presentation is given from the **local mock build**, these are visible. Present from the **deployed build**, where they are not.

## 3. What the live demo will show, and what needs doing

The backend's own demo seed (`scripts/seed_demo.py`) was run against a throwaway SQLite file, and the Manager endpoints were asked what the Validation page would read:

| Page / view | What the seeded backend returns | Placeholder? |
|---|---|---|
| Validation, AI accuracy | 10 labelled test videos, **80% match** | No |
| Validation, Reviewer overrides | 173 comparisons, **all with scores**; 20 overrides, **all with a reason** | No |
| Validation, Technical log, default view ("Live calls") | **0 rows** until a real AI call is made | An empty state, not a placeholder |
| Technical log, "Legacy demo" source | 24 sample rows, labelled | Only if someone picks it |

### To do before the live presentation

| # | What | Who | Why |
|---|---|---|---|
| 1 | **Add five team photos** to `frontend/public/team/` as `hyuna-bae.jpg`, `janataarah-begum.jpg`, `aleeya-ahmad.jpg`, `firas-vahora.jpg`, `aiden-brundell.jpg`: square, 600×600 px, face in the middle third, under about 200 KB. No code change is needed. Check each person is happy to be shown | Team | The team page is the page Emily asked for ("who is on the project"). Initials are a stand-in |
| 2 | **Re-record the two demo videos** (the long one and the 45-second one) **after the final deploy**. The existing files are dated 28 Sep. They predate the five-tab Manager navigation (18 Oct), the "Needs you" inbox, the new headers (19 Oct), the landing rebuild, the redesigned Validation page, the Client and delivery pages, and the S4 check-in (23 Oct). Emily asked for two videos on 8 Oct, after those were made | Whole team | A video that shows a different product from the live demo is the first thing someone will notice |
| 3 | **Reseed the deployed demo** after the last deploy | Dev | So Validation shows the scores and reasons, and the report definitions and Client messages use the corrected wording |
| 4 | **Make at least one real AI call** (upload a video, let the analysis run) | Dev (Aiden's "Final Audit-Log & Demo Data Check") | Otherwise the Technical log reads "No AI requests have been recorded yet", which is accurate but is the empty page the audience sees |
| 5 | **Leave the Technical log's data source on "Live calls"** | Presenter | "Legacy demo" shows sample rows |
| 6 | **Hand-check the deployed URL** against the run sheet below | Dev (Final Deploy check) and one other person | Everything here was checked on a local build |

One practical note for whoever reseeds on Windows: `scripts/seed_demo.py` prints an arrow character and stops with a `UnicodeEncodeError` on Windows' default text encoding, **after** the data is written. Run it with `PYTHONUTF8=1` to avoid the error. It is not a problem on the Linux deployment.

## 4. Live-demo run sheet (about 10 minutes)

Sign-in IDs are those the demo guide shows on the deployed site (password `test123`). The mock build uses `auditor-1`, `manager-1` and so on.

| Step | Where | Sign in as | What the audience should see | Watch for |
|---|---|---|---|---|
| 1. The problem | `/` | none | "Every harmful-video report lands on a human. Nothing protects them." Then the **Try it** card: content warning, tick the box, Proceed, drag the blur | Footage opens fully blurred, in colour |
| 2. A Reporter reports | `/report` then `/report/status` | none | The form, the case ID, then its status | The logo leads to the landing page |
| 3. The Reviewer | `/staff/login` | `auditor-01` | Case queue, open a case, **content warning** (what was flagged, severity, CVI score), Decline or Proceed, blurred footage with the slider, severity and comment, submit | After an S3 or S4 case, a **cooldown** starts |
| 4. The check-in | Reviewer, then Manager | `auditor-02` finishes the seed's open **S4 case**, then `manager-01` | The Manager's Overview gets a **Check-in** row, "Can't take cases", with **Log check-in** | Needs that S4 case: the seed has one for `auditor-02`. Do this step in order, or skip it |
| 5. The Manager | `/manager` | `manager-01` | **Needs you** (SOS, requests, reassignments, failed deliveries), Cases, **Deliveries** (a failed result and Retry), **Client connections**, Reports | Time of day reads "10:02 PM", capitals |
| 6. Can you trust the AI | `/manager/validation` | `manager-01` | **Reviewer overrides** (AI score, final score, reason), **AI accuracy** (80% from 10 test videos), Audit history | No "Illustrative" tag; Technical log has a real row (to-do 4) |
| 7. The Client | `/client/login`, and `/communityhub/moderation` for Trust & Safety | `ch-user-17`, `ch-mod-04` | Case results, a service report, messages; the moderation queue with the action CommunityHub took | The CommunityHub pages carry the notice that the platform is a simulation, and why |
| 8. The map | `/flow` | none | The four journey phases, with a sign-in row for every role | The HD section is gone |

Emily's guidance for the story: link every screen back to the problem, and be clear on the dashboard's purpose.
