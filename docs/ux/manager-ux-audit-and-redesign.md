# Manager UX: audit, ideal design and redesign

**Owner:** Aleeya Ahmad (UX) · **Branch:** `feat/manager-ux-flow`
**Why:** the Manager screens feel chaotic and not cohesive, with too much clicking for the normal flow. Emily asked for fewer clicks and clearer tags (8 Oct). BA standard: [`docs/ba/extra-features.md` §11.1](../ba/extra-features.md).
**Goal:** the normal (happy) path has the least friction. When nothing is wrong, the Manager sees that in one glance and can do the next useful thing in one click.

## 1. What good looks like (research)

| Pattern | Source | What we take from it |
|---|---|---|
| One focused view per role, with exceptions surfaced | [Process Street, form dashboards](https://www.process.st/form-dashboard/); [ServiceNow audit workspace](https://appstoreprod.service-now.com/store/app/efa923621b246a50a85b16db234bcb90) | The Manager gets one place to see what needs them, not a universal screen |
| Main signals first, then the table, then detail on demand. Colour only for exceptions and actions | Process Street | A calm page where colour means something |
| A work queue shows due date, status, owner and offers actions in place | [Healthicity, My Work Queue](https://support.healthicity.com/hc/en-us/articles/37441322671259-My-Work-Queue) | Each queue row carries its own action |
| Approvers approve, reject or open detail in one inbox view | [ClickTime, Approval Inbox](https://support.clicktime.com/hc/en-us/articles/38992734646541-Company-Dashboard-and-Approval-Inbox-Overview) | "Needs you" is an inbox, not a set of links to other pages |
| Avoid status indicators when no action is needed; more than 5–6 overwhelm | [Carbon, status indicators](https://carbondesignsystem.com/patterns/status-indicator-pattern/) | Neutral text for fine, colour for action |
| Cap dashboards at about 5–7 widgets; hide secondary data behind progressive disclosure | [Easy BI, dashboard UX](https://easy.bi/blog/dashboard-ux-optimization) | Move analytics off the Overview |
| Moderation tools keep wellbeing controls out of the queue and give reviewers context | [Moderation API, wellness](https://docs.moderationapi.com/review-queues/wellness); [TSPA](https://www.tspa.org/?p=25138) | Keep the deliberate steps that protect people (SOS) |

The research is mostly vendor documentation and blog posts, not formal studies. It supports the direction; it doesn't prove numbers.

## 2. Audit of the current UI

Screens reviewed on the local build: Overview, Case Oversight, SOS Inbox, Reassignment Queue, reassignment decision, Auditor detail.

| # | Finding | Evidence |
|---|---|---|
| 1 | **One signal, said five times.** An open SOS appears as the header badge, a full-width red banner, a red primary button ("Follow up 3 SOS alerts"), the Needs-attention row, and "SOS protection" on three Auditors | Overview screenshot |
| 2 | **Red overload.** The banner is solid red on every Manager page. A banner that is always there becomes wallpaper | All Manager screens |
| 3 | **Three layers of chrome** (dark header, red banner, tab bar) before any content | All |
| 4 | **Eight flat tabs** mixing work queues, analytics and admin: Dashboard, Case Oversight, SOS Inbox, Reassignment Queue, Deliveries, Reports, Client messages, Validation | `managerSections.ts` |
| 5 | **The Overview does too many jobs:** 4 tiles, 7 widgets, about 2,000px of scroll. "Needs manager action 11" repeats the Needs-attention panel beside it; "Open cases" repeats Case flow | Overview |
| 6 | **Repeated link text:** "View evidence" six times, plus "See where it sits" and "See what needs you" | Overview |
| 7 | **Every task leaves the Overview and comes back:** Overview → queue page → decision page → confirmation page → back | Flows below |
| 8 | **No shared page header.** The Overview has a title, tag, description and actions; list pages have a bare title; detail pages have a breadcrumb. Page widths differ too (the decision page is 760px, the rest full width) | Screens |
| 9 | **Mixed controls for the same job:** red filled "Acknowledge", outline "Reassign", link-styled status text, an outline "Approve break" next to a filled "Save limit". The more important action is the quieter one | SOS Inbox, Auditor detail |
| 10 | **The reassignment decision shows the candidates twice:** as a read-only list, then again in a dropdown to choose from. The "no reassignment" note box sits in the same card as the main choice | Reassignment decision |
| 11 | **Wording drifts from the BA standard.** "Open SOS", "Exposure-cap interrupted cases", "Failed CommunityHub handoffs", "Approaching", "Successful", "Manager Intelligence Dashboard" | §5 below |

## 3. Clicks to get a normal task done, before

Counted by walking the current screens. "Back" is the click to return to the Overview.

| Task | Clicks to do it | Plus back | Pages visited |
|---|---|---|---|
| Approve a break request | 2 (support row → Approve) | 3 | 2 |
| Mark a "talk" request followed up | 2 | 3 | 2 |
| Retry a failed CommunityHub delivery | 3 (row → open delivery → Retry) | 4 | 3 |
| Reassign a declined case | 5 (row → Reassign → open list → pick → Confirm) | 6 | 4 |
| Acknowledge and follow up an SOS | 3 (Follow up → Acknowledge → submit), plus typing | 4 | 4 |
| Generate and release a Client report | 3 (Generate → Release → confirm) | 3 | 2 |

## 4. The ideal

### Principles

1. **One screen, one job.** The Overview is the Manager's inbox. Analytics live elsewhere.
2. **Act where you decide** (BA §11.1). Low-risk actions happen in the row, with no page change.
3. **Say it once.** Each signal appears in one place that you can act on. The header badge and banner are the one persistent SOS signal; nothing else on the page repeats it.
4. **Colour is for exceptions.** Fine is plain text. Red is reserved for what needs a person now.
5. **Keep the deliberate steps.** SOS acknowledgement opens the alert's context before anything is recorded (Figma 103:151). That is there to protect the Manager's judgement, so it stays.
6. **One header pattern, one button hierarchy,** on every page. One primary action per screen (per the team's UI rule).

### Information architecture: 8 tabs become 5

| New tab | Contains | Notes |
|---|---|---|
| **Overview** | The inbox ("Needs you"), a quiet figures strip, the Auditors table | Also the home for SOS Inbox and Reassignment Queue, reached from the inbox |
| **Cases** | Case Oversight | Unchanged |
| **Deliveries** | Deliveries, connection | "Client messages" link in its header |
| **Reports** | Client Reports | |
| **Insights** | Case flow, AI and Auditor decisions, Client outcomes, Delivery health, link to Validation | The analytics moved off the Overview. The BA's own demo flow already calls this "Manager Insights Dashboard" |

Routes do not change, so links and bookmarks keep working. SOS Inbox and Reassignment Queue remain full pages, reached from "View all" in the inbox; the nav highlights the tab they belong to.

### The Overview, top to bottom

```text
Overview                                          [ Period: This week ▾ ]
CommunityHub                          ( Generate Report )   ← the one primary when nothing needs you

Open cases 15      Completed 31      Delivery success 93%        ← quiet figures, no links

Needs you · 11                                                    ← or "Nothing needs you" + a tick
  SOS Alert          Marcus Webb · 6 min ago                [ Open alert ]
  Break Request      Reese Patel · 10:32 PM                 [ Approve ]
  Reassignment       AR-…398 · Priya Shah declined          [ Reassign to Jordan Lee ]  Choose someone else
  Delivery Failed    AR-…00404 · CommunityHub timed out     [ Retry ]
  View all …

Auditors                                                          ← the existing table, calmer
  Reese Patel   94/120 min   Approaching Limit   Cooldown   …
```

Eleven blocks become four. Every action that is safe to do in the row is in the row.

### Clicks, after (target)

| Task | Before | After |
|---|---|---|
| Approve a break request | 2 | **1** |
| Mark a "talk" request followed up | 2 | **1** |
| Retry a failed delivery | 3 | **1** |
| Reassign a declined case | 5 | **1** (to the suggested Auditor); 3 to choose someone else |
| SOS | 3 | 3, deliberately: context first, then acknowledge |
| Return to the Overview afterwards | 1 | **0** (you never left) |

## 5. Wording: current against the BA standard (§11.1)

Locked requirements are **not** changed: RT-01 outcome labels and RT-02 status labels are signed-off BA requirements with tests. §11.1 proposes different case-status labels (Processing, In Review, Needs Reassignment, Blocked). That conflicts with RT-02, so **it is left for the BA to decide**.

| Where | Now | Standard (§11.1) | Change |
|---|---|---|---|
| Attention row | Open SOS | SOS Alert | yes |
| Attention row | Support requests | Break Request (and a talk request) | yes |
| Attention row | Reassignment decisions | Reassignment | yes |
| Attention row | Exposure-cap interrupted cases | Exposure Limit | yes |
| Attention row | Failed CommunityHub handoffs | Delivery Failed | yes |
| Row status tags | Act now · Waiting for you · Decision needed · Retry or escalate | none: the action button says it | removed |
| Exposure state | Under · Approaching · At limit | Under Limit · Approaching Limit · At Limit | yes (the label test cites Figma 78:69, updated with this source) |
| Availability | In cooldown · No new cases today · SOS protection | Cooldown · Unavailable · Unavailable | yes |
| Delivery | Successful · Needs attention | Delivered · Failed | yes |
| Reports | Generate a Client report · Generate Client Service Report | Generate Report | yes |
| AI comparison | Override rate · AI–Auditor decision comparison | AI Override · AI Match | yes |
| Page title | Manager Intelligence Dashboard | Overview | yes |
| Section titles | Needs attention · Case flow and timing · Auditor protection & availability · Client outcome summary — CommunityHub · CommunityHub delivery health | Needs you · Case flow · Auditors · Client outcomes · Delivery Health | yes |
| Repeated links | View evidence ×6 · See where it sits · See what needs you | Evidence (one per section) | yes |
| Case status | Submitted · AI Processing · Ready for Review · Auditor Review | RT-02 (locked) vs §11.1 (differs) | **BA to decide** |
| Break and talk requests | one row, "1 break · 1 talk" | §11.1 says keep routine talk requests out of the dashboard | **kept visible**: team decision D2, 7 Oct |

## 6. Build plan

| Step | What | Risk |
|---|---|---|
| 1 | Shared page header; calm SOS banner; one button hierarchy | Low |
| 2 | Nav 8 → 5, Insights page, Overview slimmed to four blocks | Medium: moves widgets; routes unchanged |
| 3 | "Needs you" inbox with in-row actions | Medium: new data loading on the Overview |
| 4 | Reassignment decision: suggested Auditor in one click, one list instead of two | Medium |
| 5 | Apply the wording (the table above) | Low, many files; tests updated with their source cited |
| 6 | Re-measure: clicks, Lighthouse accessibility, screenshots | |

Not changing: the SOS deliberate step; RT-01 and RT-02 labels; the Auditor and public screens; any backend.

## 7. After (built)

Measured on the local build (mock data source), 1440×900.

| Task | Before | After | How |
|---|---|---|---|
| Approve a break request | 2 | **1** | "Approve" in the Overview row |
| Mark a talk request followed up | 2 | **1** | "Mark followed up" in the row |
| Retry a failed delivery | 3 | **1** | "Retry" in the row; if it fails again the row stays and says so |
| Reassign a declined case | 5 | **1** (suggested Auditor); **3** for someone else | "Reassign to <name>" in the row; the decision page preselects the same Auditor |
| SOS | 3 | 3, kept on purpose | Open alert → Acknowledge → log follow-up |
| Return to the Overview | 1 | **0** | actions stay on the page; the decision page returns with an inline confirmation instead of an interstitial |

What changed:

- **One header and one button hierarchy.** Every Manager page uses the shared `PageHeader`. The Overview has one primary button, and only when nothing is waiting (Generate Report).
- **Calm SOS banner.** A tinted one-liner with a red edge and an icon, not a solid red bar. The link text is unchanged.
- **Five tabs:** Overview · Cases · Deliveries · Reports · Insights. Sub-pages keep their owning tab highlighted. Routes are unchanged; `/manager/insights` is new.
- **Overview in four blocks:** header, three quiet figures, "Needs you" inbox, Auditors table. The seven widgets moved to Insights. One "Evidence" control per section replaces six "View evidence" links.
- **Reassignment decision:** one list (not a list plus a dropdown). The suggested Auditor is the first available one, so the fallback reviewer is last, as agreed.
- **Wording:** BA §11.1 applied to attention rows, exposure states, availability, delivery states, AI Override, "Generate Report" and section titles. RT-01/RT-02 are untouched.

Checks: Lighthouse accessibility 100 on `/manager` and `/manager/insights`; axe and keyboard tests cover the inbox actions and the reassignment list.

Still open: §11.1's case-status labels conflict with RT-02 and are left for the BA. Three Auditors show "Unavailable (SOS)" next to the banner and inbox rows; that is the one remaining repeat of an SOS and is deliberate, because it is the only place that shows which Auditors are protected.

### Where things sit, and why

Each placement follows one rule, so a control is in the same place on every Manager page.

| Element | Position | Reason |
|---|---|---|
| Page title, then one-line subtitle | Top left | Readers start at the top left and scan down; the title says where they are |
| Page controls (Period) and the page's primary button | Top right of the page header, primary last, all on one bottom edge | Design systems put a header's actions in a dedicated top-right slot ([Avonni](https://docs.avonnicomponents.com/dynamic-components/components/card), [ServiceNow Horizon](https://horizon.servicenow.com/patterns/cards/card-patterns)); the most important action is the last, nearest the edge the eye ends on |
| One primary button per page | Generate Report (Overview) | A filled button means "the main thing"; two compete. Inbox row actions are secondary (outline) |
| Section title and its "Evidence" control | Title left, Evidence far right of the same row | A control for a section belongs to its header, in the same corner every time, so it is found without searching |
| Evidence on a figure tile | Top right corner of the tile | Same corner rule, applied to the smaller container |
| Section description | Under the title row, full width | Proximity: it explains the title, and it must not push the control onto another line |
| Figures | One grid, label above value, columns shared across rows | Values that start on the same line compare at a glance |
| Row action in the inbox | Far right of its row; the secondary link (Open Auditor, Choose someone else) after it | The row reads left to right: what, who, then what to do |

The sources are design-system documentation (card header action slots), not eye-tracking studies, so this supports the convention but does not prove it. The consistency rule is the reason that matters most.
