# RCS Sprint 3 Extra Features
## AI Buddy, Manager & Auditor Experience, Case Assignment, CommunityHub Mock & Client Reporting

> **Updated after Sprint 3 demo feedback from Emily:** the Manager dashboard is treated as core expected functionality; **AI Buddy is the primary HD / wow feature**. CommunityHub is explicitly a simulated Client platform, case-assignment fallback is expanded, and the UI/demo flow is simplified.

---

# HD / Wow Feature — RCS AI Buddy

## Positioning after Sprint 3 demo feedback

The **RCS AI Buddy** is the selected extra HD / wow feature.

The Manager and Auditor dashboards, case oversight, wellbeing controls, CommunityHub handoff and reporting are important parts of the expected end-to-end product. The AI Buddy is the additional feature layered on top of that completed workflow.

For this project, the AI Buddy is intentionally **preliminary and generic**. The goal is to demonstrate a useful conversational companion inside RCS without pretending that the prototype is already a fully trained enterprise assistant.

### Current Sprint 3 pitch

> **AI Buddy gives RCS staff one simple conversational place to ask for guidance while working through a complex and potentially stressful moderation workflow. This Sprint 3 version is deliberately lightweight. The next stage would be to ground/train it further on RCS workflows, policies, case context and verified operational data so it can become a one-stop shop for staff support and navigation.**

This direction fits the current AI-focused product environment while remaining relevant to the RCS client scope.

---

## What the Sprint 3 AI Buddy should do

The first version should be simple and reliable.

It can help staff with questions such as:

```text
What happens if I reach my exposure limit?
How do I request a break?
What is the difference between a wellbeing check-in and SOS?
What happens when I decline a case?
Where can I see my current cooldown?
What does "Ready for Review" mean?
How does CommunityHub handoff work?
Where can I find a Client report?
```

For Managers it may also answer simple workflow/navigation questions such as:

```text
Where do I handle a declined case?
What does Delivery Failed mean?
Where can I see Auditor exposure?
How do I generate a Client Service Report?
```

### Primary value

The AI Buddy reduces the need for staff to remember every workflow rule or click through multiple screens to find basic guidance.

It is especially useful in a moderation environment where users may already be dealing with:

- complex workflow states;
- wellbeing/protection rules;
- case-assignment rules;
- multiple Manager surfaces;
- operational exceptions.

The AI Buddy should provide **calm, short and direct guidance**.

---

## AI Buddy placement

Use a persistent staff-portal entry point so the user does not need to navigate to a separate full page.

Suggested UI:

```text
[AI Buddy]
```

available from the Auditor and Manager interfaces.

Opening it should use a drawer, side panel or compact chat window.

Example:

```text
AI BUDDY

How can I help?

User:
What happens if I hit 120 minutes?

AI Buddy:
You will stop receiving normal harmful-content cases for the rest
of the current working day. If you reach the limit during an active
case, playback stops and the unfinished case goes to the Manager
decision/reassignment path.

[Ask another question]
```

This supports the separate Sprint 3 UX goal of **reducing unnecessary clicking**.

---

## Sprint 3 implementation boundary

The AI Buddy is a **staff companion**, not an autonomous decision-maker.

It may:

- explain RCS workflows;
- explain labels and statuses;
- direct the user to the correct RCS screen/action;
- explain wellbeing options already defined by the product;
- answer simple questions from approved RCS guidance/context;
- provide short navigation help.

It must not:

- make the Auditor's moderation decision;
- choose a final severity/outcome;
- tell the Auditor whether harmful content is acceptable;
- diagnose mental health or distress;
- replace SOS or professional support;
- approve break requests;
- change exposure limits;
- reassign cases;
- remove CommunityHub posts;
- release Client reports;
- override Manager decisions.

### Safe fallback

If the Buddy does not have enough verified information, it should say so and direct the user to the relevant screen or human role rather than inventing an answer.

Example:

```text
I don't have enough verified information to answer that case-specific
question. Open Case Oversight or contact your Manager.
```

---

## Future direction — one-stop shop

The next stage could expand the AI Buddy into a more deeply grounded RCS assistant that can use approved RCS sources such as:

- workflow requirements;
- moderation policy guidance;
- case status/context the current user is authorised to access;
- dashboard metrics;
- audit/evidence references;
- Client/reporting guidance;
- support and wellbeing resources.

Future example:

```text
"What needs my attention today?"
"Explain why this case is in Reassignment."
"Show me the evidence behind this dashboard value."
"Where is RCS-184 in the workflow?"
```

That future version would require stronger retrieval, permissions, evidence grounding and audit controls. It is **not required for the Sprint 3 prototype**.

---

## Why this is the HD extension

The AI Buddy adds a new interaction layer rather than simply expanding the expected dashboard.

The core product already contains the workflow and data. The Buddy makes that product easier to use by giving staff a conversational entry point to RCS guidance.

### Simple HD pitch

> **The dashboards show the information staff need. AI Buddy is the extra layer that lets them ask RCS for help directly. This version is preliminary, but it demonstrates the path toward a one-stop staff assistant grounded in the RCS system.**

---

# 1. Core Manager Experience — Manager Insights Dashboard

## Purpose

The existing Manager Dashboard is a **core expected Sprint 3 capability**. It should provide a clear operational overview for the Manager, but it is no longer positioned as the extra HD / wow feature following Sprint 3 demo feedback.

This is not just a larger menu of links or a bigger `View Details` page. The dashboard must answer the Manager's main operational questions immediately, while keeping evidence and detail available for drill-down.

The Sprint 3 dashboard is therefore a **fixed set of chosen widgets**, not a list of possible metrics.

## Existing baseline

The current Manager Dashboard already shows:

- Auditor;
- exposure against the applicable daily limit;
- exposure/protection state;
- cooldown;
- cases today;
- per-Auditor actions.

Existing Manager navigation already includes:

- Dashboard;
- Case Oversight;
- SOS Inbox;
- Reassignment Queue;
- Validation.

Sprint 3 should enhance this existing Manager experience rather than create an unrelated second dashboard.

## 1.1 Dashboard controls

At the top of the dashboard, provide:

```text
Organisation: [CommunityHub ▼]      Period: [This week ▼]

[Generate Client Service Report]
```

The organisation filter applies only where organisation/customer data is available. The selected period should drive the period-based widgets and the later Client Service Report.

### Demo / placeholder data rule — MR-OV-08 aligned

Any seeded, mock, synthetic or placeholder dashboard value must be visibly labelled and must not be presented as a real operational result.

Use a persistent badge such as:

```text
DEMO / PLACEHOLDER DATA
```

Rules:

- show the badge at page level when the whole dashboard is seeded/mock;
- if real and demo data are mixed, label the affected widget/value itself;
- the existing Validation view remains separate from live operational oversight under `MR-OV-08`;
- synthetic/staged ground-truth Validation statistics must be labelled as validation/demo data until real validated results exist;
- do not let operational AI-versus-Auditor disagreement metrics masquerade as ground-truth model accuracy.

### Dashboard data-contract note

The current repository already contains core `cases`, `auditors` and `audit_logs` fields used by several widgets. Sprint 3 will need additional persisted fields/tables for features that do not exist yet, especially `organisation_id`, CommunityHub delivery records, completion-validation state and frozen report versions.

Where this document names `delivery.*`, `organisation_id`, `completion_validation` or report-snapshot fields, those are **Sprint 3 data-contract requirements to implement**, not claims that the current database already contains them.

---

## 1.2 Chosen dashboard widgets

### Top-level KPI strip — Operations at a glance

The current dashboard is strong at showing exceptions and Auditor wellbeing state, but the Manager also needs an immediate answer to a basic operational question: **how much work is coming in, how much has been completed, how much is still open, and how much specifically needs Manager action?** These figures should appear as a fixed KPI strip at the top of the dashboard before the detailed widgets. This gives the Manager a five-second service-level picture before they drill into SOS, reassignment, delivery or individual Auditor detail.

Use four primary KPI cards:

```text
TOTAL CASES        COMPLETED        OPEN CASES        NEEDS MANAGER ACTION
    186               142               44                    4
Selected period    Selected period    Current backlog       Current exceptions
```

**Definitions:**

- **Total Cases** = cases received/created during the selected reporting period;
- **Completed** = cases that reached `COMPLETE` during the selected reporting period;
- **Open Cases** = current cases for the selected organisation that have not yet reached `COMPLETE`;
- **Needs Manager Action** = current items that require an actual Manager decision or follow-up, such as unresolved SOS, declined/cap-interrupted cases awaiting reassignment decision, failed CommunityHub handoffs after retries, or approved low-key break requests waiting for action.

`Open Cases` is a **current backlog** figure and may include cases created before the selected period, so it must not automatically be calculated as `Total Cases - Completed` unless both values are deliberately scoped to the same case cohort.

Clicking `Open Cases` should reveal where the current backlog sits:

```text
OPEN CASES — 44

Submitted / waiting          5
AI Processing                7
Ready for Review             9
Auditor Review              17
Manager action required      6
```

The top-level KPI strip answers **“How are operations going?”**. The `Needs Attention` widget directly below answers **“What specifically needs me right now?”**. The Auditor table then answers **“Who is available/protected and what work are they carrying?”**.

---

### Widget 1 — Needs Attention

**Manager question:**

> What genuinely needs my action right now?

**Metrics / items:**

- open SOS events;
- cases awaiting a Manager reassignment decision;
- cases paused because an Auditor reached the daily exposure cap mid-review;
- CommunityHub handoffs still failed after automatic retries;
- completion/handoff records blocked by invalid required fields;
- other confirmed stuck operational exceptions.

**Source fields:**

- `cases.case_id`;
- `cases.status`;
- `cases.manager_flag`;
- `cases.assigned_auditor_id`;
- `cases.created_at`;
- `audit_logs.action` / `audit_logs.created_at` for `SOS_TRIGGERED`, `CASE_DECLINED` and reassignment events;
- Sprint 3 handoff fields: `delivery.status`, `delivery.attempt_count`, `delivery.last_attempt_at`;
- Sprint 3 completion-validation state where required.

**Visual:** priority cards plus a drill-down queue.

```text
NEEDS ATTENTION

🔴 Open SOS                              1
🟠 Reassignment decisions               3
🟠 Exposure-cap interrupted cases       1
🟠 Failed CommunityHub handoffs         2
🟡 Completion blocked by invalid data   1

[Open attention queue]
```

The queue shows only items that require Manager action. Routine wellbeing check-ins must **not** appear here unless the Auditor explicitly requested a break that requires the low-key Manager `Approve` action under `MR-SOS-07`.

---

### Widget 2 — Operations Snapshot & Case Flow

**Manager question:**

> Are we keeping up with incoming reports, and where is work building up?

**Metrics:**

- total cases received in the selected period;
- completed cases in the selected period;
- currently open cases / current backlog;
- current items needing Manager action;
- cases awaiting Manager reassignment;
- oldest unresolved case age;
- median report-to-final-decision time;
- case count by current workflow state.

**Source fields:**

- `cases.case_id`;
- `cases.status`;
- `cases.created_at`;
- `cases.completed_at`;
- `cases.manager_flag`;
- `organisation_id` where organisation filtering is implemented.

**Calculation examples:**

```text
Total Cases = count(cases.created_at inside selected period)
Completed = count(status == COMPLETE and completed_at inside selected period)
Open Cases = count(current cases where status != COMPLETE)
Needs Manager Action = count(current unresolved Manager-action exceptions)
Median decision time = median(completed_at - created_at) for completed cases
```

**Visual:** the fixed top-level KPI strip is followed by a horizontal stacked bar showing cases by workflow state and a secondary timing indicator.

```text
TOTAL CASES      COMPLETED      OPEN CASES      NEEDS MANAGER ACTION
    184              165             19                   4

Median decision time: 42 min

CASE FLOW
Submitted        ███  4
AI Processing    ██   3
Ready for Review ████ 6
Auditor Review   ███  4
Manager Decision ██   2
```

Clicking a segment opens the filtered Case Oversight list.

---

### Widget 3 — Auditor Protection & Availability

**Manager question:**

> Who is currently available for harmful-content work, and who is protected by a cap or cooldown?

**Metrics per Auditor:**

- accumulated exposure today / applicable daily limit;
- current exposure state: below / approaching / at limit;
- current cooldown state and time remaining;
- current assignment availability;
- active case count.

**Source fields:**

- `auditors.auditor_id`;
- `auditors.exposure_minutes`;
- `auditors.exposure_limit_minutes`;
- `auditors.cooldown_ends_at`;
- `auditors.cooldown_trigger`;
- `auditors.active_case_count`.

**Visual:** sortable operational table, ordered by protection need / exposure ratio rather than productivity.

```text
AUDITOR PROTECTION & AVAILABILITY

Auditor   Exposure      State          Cooldown      Active cases   Availability
A         94 / 120 min  Approaching    None          1              Available
B        120 / 120 min  At limit       —             0              No new cases
C         48 / 90 min   Below limit    12 min left   0              Cooldown

[View Details]
```

**Wellbeing privacy rule — MR-SOS-07:**

- do **not** show a per-Auditor check-in count;
- do **not** show a per-Auditor support-request tally;
- do **not** show recent cooldown frequency as a per-Auditor behavioural metric;
- routine wellbeing check-ins remain a chronological log inside that Auditor's `View Details` only;
- any trend visual about cooldown/protection must be aggregate across the selected team/period, without ranking or scoring individual Auditors.

The `View Details` wellbeing log may show the individual events required by `MR-SOS-07`, including a low-key break-request marker and `Approve` action where applicable.

---

### Widget 4 — AI–Auditor Decision Comparison

**Manager question:**

> Where are AI and final human moderation decisions differing?

**Metrics:**

- completed cases with an AI-to-Auditor severity override;
- override rate for eligible completed cases;
- distribution of AI severity → final Auditor severity changes;
- most common severity transition, for example `S2 → S3`.

**Source fields:**

- `cases.severity_tier` / original effective AI severity tier;
- `cases.effective_severity_score`;
- `cases.auditor_severity_score`;
- stored/derived final Auditor severity tier;
- `cases.completed_at`;
- `audit_logs.after_value.is_override` from `CASE_RESOLVED` where used;
- `organisation_id` where implemented.

**Visual:** override KPI plus a small severity-transition matrix/heatmap.

```text
AI–AUDITOR COMPARISON

Override rate: 13.4%   [View Evidence]

          FINAL AUDITOR
AI        S1   S2   S3   S4
S1        31    4    1    0
S2         2   42    8    1
S3         0    3   39    5
S4         0    0    2   28
```

This widget is **operational disagreement evidence**, not the `MR-OV-08` ground-truth model-validation result. The Manager interprets the evidence; RCS must not label the AI or Auditor as automatically wrong.

---

### Widget 5 — Client Outcome Summary

**Manager question:**

> What moderation outcomes are we producing for this customer during the selected period?

**Metrics:**

- completed cases;
- `POLICY_VIOLATION_FOUND` count and proportion;
- `NO_VIOLATION_FOUND` count and proportion;
- final Auditor severity distribution S1–S4;
- client-relevant unresolved case count.

**Source fields:**

- `cases.final_outcome`;
- `cases.completed_at`;
- final Auditor severity tier / `auditor_severity_score` mapping;
- `cases.status`;
- `organisation_id`.

**Visual:** outcome split plus horizontal severity distribution.

```text
CLIENT OUTCOME SUMMARY — COMMUNITYHUB

Policy Violation Found     61%  ████████████
No Violation Found         39%  ████████

FINAL SEVERITY
S1  22   ███
S2  61   ████████
S3  55   ███████
S4  27   ████
```

These are RCS moderation outcomes. Do not describe them as CommunityHub enforcement actions.

---

### Widget 6 — CommunityHub Delivery Health

**Manager question:**

> Are completed case results successfully reaching CommunityHub?

**Metrics:**

- successful deliveries;
- currently pending deliveries;
- retrying deliveries;
- failed / needs-attention deliveries;
- delivery success rate;
- most recent failed delivery time.

**Source fields:**

Sprint 3 delivery records should include at minimum:

- `delivery.delivery_id`;
- `delivery.case_id`;
- `delivery.organisation_id`;
- `delivery.status`;
- `delivery.attempt_count`;
- `delivery.last_attempt_at`;
- `delivery.delivered_at`;
- `delivery.last_http_status`;
- `delivery.response_delivery_id`.

**Visual:** delivery-status KPI cards plus a compact failed-delivery list.

```text
COMMUNITYHUB DELIVERY HEALTH

Successful     94
Pending         2
Retrying        1
Needs Attention 1
Success rate   95.9%

RCS-184   FAILED   3 attempts   Endpoint unavailable   [View]
```

CommunityHub delivery failure is a **Manager operational concern** and must not appear as an Auditor responsibility/status.

---

## 1.3 Simple dashboard layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Manager Insights Dashboard                                      │
│ Organisation [CommunityHub ▼]   Period [This week ▼]   [Generate]  │
│ [DEMO / PLACEHOLDER DATA] when applicable                           │
├──────────────────────────────────────────────────────────────────────┤
│ OPERATIONS KPI STRIP                                                │
│ Total cases | Completed | Open cases | Needs Manager action         │
├──────────────────────────────────────────────────────────────────────┤
│ NEEDS ATTENTION                                                     │
│ SOS | Reassignment | Cap-interrupted | Failed handoff | Invalid    │
├──────────────────────────────────────────────────────────────────────┤
│ CASE FLOW + TIMING                                                  │
│ Workflow-state bar | Median decision time | Oldest unresolved       │
├──────────────────────────────────────┬───────────────────────────────┤
│ AUDITOR PROTECTION & AVAILABILITY    │ CLIENT OUTCOME SUMMARY        │
│ exposure / cap / cooldown / active   │ outcomes + severity           │
│ cases / availability                 │                               │
├──────────────────────────────────────┼───────────────────────────────┤
│ AI–AUDITOR DECISION COMPARISON       │ COMMUNITYHUB DELIVERY HEALTH  │
│ override KPI + transition matrix     │ success/pending/retry/fail    │
└──────────────────────────────────────┴───────────────────────────────┘
```

This is the **chosen core Sprint 3 Manager operational experience**. `View Details`, Case Oversight, SOS Inbox, Reassignment Queue and Validation remain the deeper operational screens behind it.

---

## 1.4 Evidence / source button for dashboard metrics

Every major dashboard card, chart or reportable metric should provide:

```text
[View Evidence]
```

or:

```text
[How is this calculated?]
```

The evidence view should explain where the value came from instead of presenting unexplained analytics.

Example:

```text
Completed Cases — 184

Organisation: CommunityHub
Period: 1–30 September 2026

Definition:
Cases with final status COMPLETE during the selected period.

Source fields:
- cases.status
- cases.completed_at
- organisation_id

Records included: 184
Last calculated: 2 Oct 2026, 10:41 AM

[View contributing case IDs]
```

Example for an override metric:

```text
AI–Auditor Override Rate — 13.4%

Calculation:
Eligible completed cases where final Auditor severity differs
from the original AI severity ÷ all eligible completed cases.

Source:
- original AI severity
- final Auditor severity
- completion timestamp

Included: 23 / 172 eligible completed cases
```

### Core rule

> **Dashboard analytics summarise verified RCS records; they do not replace the underlying evidence.**

This same evidence model should later feed the Client Service Report so report values do not appear to come “from thin air”.

---

## 1.5 Auditor Dashboard — Current Case Queue + Protection Status

The current Auditor dashboard is already sufficient as the main Auditor home/workspace and should **not** be overloaded with additional analytics just to match the Manager dashboard.

The Auditor role is narrower than the Manager role. The Auditor dashboard should therefore stay focused on:

1. **my assigned work;**
2. **what can be reviewed now;**
3. **my current exposure/cooldown state;**
4. **access to a low-friction wellbeing check-in;**
5. **what I have completed today.**

The existing design already provides the right structure:

```text
CASE QUEUE

Exposure left today | Completed today | Cooldown | Wellbeing check-in

Assigned cases
- Case ID
- Severity
- Status
- Open/Review action

Completed today
- Case ID
- Severity
- Status
```

This should remain the chosen Sprint 3 Auditor dashboard design.

### Current dashboard functions to retain

#### Exposure left today

Show the Auditor's remaining exposure allowance and the current accumulated total against their applicable daily limit.

Example:

```text
Exposure left today

75 min

45 of 120 min watched
```

This is based on the existing `AR-WB-01` / `AR-WB-02` exposure model.

#### Completed today

Show the number of cases the Auditor has completed during the current working day.

Example:

```text
Completed today

1

Listed below your open cases
```

`Completed today` is for simple personal orientation only. It must **not** become a quota, target, productivity score, peer comparison or performance ranking.

#### Cooldown

Show the Auditor's current cooldown state.

Normal state:

```text
Cooldown

None

Starts after qualifying S2 exposure, S3/S4 cases,
or SOS according to the existing wellbeing rules.
```

When a cooldown is active, the same card should become the active protection surface:

```text
Cooldown

12:34 remaining

No new harmful-content case will be assigned
while cooldown is active.

[Play Block Puzzle]
[Optional Wellbeing Check-in]
```

The cooldown card should update dynamically rather than adding a separate new dashboard section.

#### Wellbeing check-in

Replace generic wording such as:

```text
Need support?
[Request support]
```

with BA-aligned wording:

```text
Wellbeing check-in

Had a difficult case?
You can ask to talk to your Manager or request a break.
This is separate from SOS.

[Wellbeing check-in]
```

This must remain aligned with `AR-WB-16` / `MR-SOS-07`:

- low-key;
- optional;
- non-urgent;
- separate from SOS;
- routine check-ins are logged only;
- a break request receives the low-key Manager `Approve` path;
- no per-Auditor wellbeing tally or score is created.

### Case queue

The existing queue should remain the main work area.

Example:

```text
Case queue

3 open cases · 3 ready for review

Case ID        Severity        Status
RCS-184        S1 · Low        Ready for review
RCS-191        S2 · Moderate   Ready for review
RCS-205        S3 · High       Ready for review
```

The dashboard should continue to:

- show only cases assigned to the logged-in Auditor;
- avoid harmful thumbnails;
- open each review through the existing content-warning flow;
- prevent cases still undergoing AI processing from being opened for normal review;
- preserve current review progress where an Auditor returns to an in-progress case.

A small inline summary such as:

```text
3 open cases · 3 ready for review
```

is enough. Do **not** add separate large KPI cards for `My Open Cases` and `Ready to Review` unless UX later needs them.

### Open next case

Retain the existing:

```text
[Open next case]
```

action where it opens the next eligible assigned case.

The action must respect:

- AI-processing readiness;
- cooldown;
- daily exposure cap;
- assignment protection;
- any other existing wellbeing/protection rule.

If the Auditor is not currently eligible to continue, the button must be disabled or replaced with the relevant protection message.

### Completed today list

Keep the current completed-cases table beneath the active queue.

Example:

```text
Completed today

Case ID        Severity        Status
RCS-173        S2 · Moderate   Complete
```

This gives the Auditor a simple record of what they have finished that day without creating productivity pressure.

### Daily exposure limit state

When the applicable daily cap is reached, the dashboard should clearly replace the normal available state with:

```text
Daily exposure limit reached

120 / 120 min

No new harmful-content cases will be assigned today.
```

Any `Open next case` / review-start action must be unavailable.

If an unfinished active case was interrupted by reaching the cap, that case follows the Manager decision/reassignment path defined later in this document.

### Auditor dashboard rule

The Auditor dashboard is a **personal case-queue and protection workspace**, not an analytics or performance dashboard.

Do **not** add:

- cases-per-hour targets;
- average review-speed targets;
- team comparisons;
- peer rankings;
- "fastest Auditor" metrics;
- decline-rate scoring;
- wellbeing-check-in counts;
- SOS counts;
- cooldown-frequency scoring.

The Auditor does not need the same volume of analytics as the Manager. The current dashboard is intentionally simpler because its purpose is to help the Auditor understand **their work and their protection state**, while the Manager dashboard handles service-level analytics and oversight.


# 1.6 Case Assignment Fallback — Super Admin Auditor & Visibility

## Purpose

Sprint 3 demo feedback requires a clear fallback when normal case assignment cannot place work safely or conveniently.

Add a **Super Admin Auditor** role/access level that always has visibility of all cases and can act as the fallback reviewer.

This is an additional Sprint 3 assignment design decision and should not silently replace the existing weighted assignment logic for normal Auditors.

---

## Normal assignment remains the default

Normal cases should still use the existing eligibility and weighted-assignment rules.

```text
New case
↓
Eligible standard Auditors evaluated
↓
Weighted assignment
↓
Primary assigned Auditor
```

The Super Admin Auditor exists as a fallback/oversight path rather than making the normal weighted assignment meaningless.

---

## Super Admin Auditor behaviour

For the Sprint 3 demo, **“the Super Admin Auditor always receives all cases” means every new case appears in the Super Admin Auditor's queue/oversight list as a fallback copy of the work item. This does not automatically replace the normal primary assignment or give the case two primary owners.**

The Super Admin Auditor:

- can see every case in the moderation queue;
- can access cases that cannot currently be placed with a normal eligible Auditor;
- can take over / be assigned a case as a fallback;
- can see cases waiting to be made available to standard/lower-level Auditors.

To avoid duplicate ownership, separate:

```text
case visibility
```

from:

```text
primary assigned Auditor
```

A case may be visible to the Super Admin without changing the existing `assigned_auditor_id` until the case is actually taken/reassigned.

---

## Making a case visible to lower-level / standard Auditors

Add a controlled action such as:

```text
[Make Available to Auditors]
```

This expands the case's **queue visibility**, but does not expose raw harmful content to everyone automatically.

Suggested flow:

```text
Case is Super Admin / Manager visible
↓
Super Admin or authorised Manager selects:
[Make Available to Auditors]
↓
Eligible standard Auditors can see limited queue metadata
↓
Case is assigned/claimed through the approved assignment path
↓
Only the assigned Auditor can open the full review
```

Visible queue metadata may include:

- Case ID;
- severity tier;
- processing/readiness status;
- assignment availability.

Do not expose:

- raw harmful thumbnail/video;
- private Reporter information;
- internal notes not needed for assignment.

This keeps the existing wellbeing and role-access model intact while adding the fallback requested in the Sprint 3 feedback.

---

## Suggested data fields

Where needed, add:

```text
case_visibility
fallback_available
assigned_auditor_id
```

Possible visibility values:

```text
SUPER_ADMIN_ONLY
AVAILABLE_TO_AUDITORS
ASSIGNED_ONLY
```

Exact enum/column names are implementation details.

---

## Fallback rule

If no normal Auditor is currently eligible:

```text
Case remains visible to Super Admin Auditor
↓
Super Admin can take it
OR
authorised user can make it available to eligible standard Auditors later
```

Do not silently assign a case to an Auditor who is:

- in cooldown;
- at the daily exposure cap;
- otherwise protected/unavailable.

---

# 2. Prototype Working Day & Daily Exposure Cap

## Confirmed exposure model

The existing BA baseline already resolves the meaning of the `120 min` value.

For Sprint 3, the default exposure limit is a **daily cumulative exposure cap**, not a recoverable exposure-block threshold.

Project evidence:

- `AR-WB-01` — RCS tracks each Auditor's **accumulated exposure time for the working day** and displays progress against the applicable limit;
- `AR-WB-02` — the default testing cap is **120 minutes per day**, client-confirmed;
- `AR-WB-03` — an Auditor who reaches the applicable exposure limit **shall not receive further normal case assignments**;
- `AR-AS-02` — Auditors at their **daily exposure cap are excluded from assignment before scoring**;
- Auditor persona/UX documentation describes exposure as **cumulative across the shift/day, capped rather than reset per case**.

Therefore Sprint 3 must not reset an Auditor's cumulative daily exposure after a cooldown.

---

## What counts toward daily exposure

Use the existing BA counting rule from `AR-WB-01`:

- exposure accrues while the raw/source video is actively playing;
- playback still counts when blur, grayscale or audio mute are enabled;
- paused/stopped video does not count;
- AI-only analysis does not count;
- replaying raw/source video counts again.

The dashboard should display the Auditor's current accumulated exposure against their applicable limit, for example:

```text
Today's harmful-content exposure
94 / 120 min

Status: Approaching daily limit
Remaining exposure allowance: 26 min
```

The existing Manager rule may also visually distinguish:

- below limit;
- approaching limit — from 75% of the applicable cap;
- at limit — 100%.

Where the default 120-minute cap applies, “approaching” therefore begins at 90 minutes.

---

## Daily limit behaviour

When an Auditor reaches their applicable daily exposure cap:

```text
Daily exposure cap reached
↓
Auditor becomes unavailable for further normal harmful-content assignments
↓
Assignment engine excludes that Auditor
↓
Manager dashboard shows AT DAILY LIMIT
↓
No new normal cases are assigned for the remainder of that working day
```

Suggested Auditor message:

```text
You've reached today's exposure limit.
No new harmful-content cases will be assigned today.
```

Suggested Manager status:

```text
Exposure: 120 / 120 min
State: At daily limit
Assignment eligibility: Unavailable
```

### After the Auditor reaches the daily cap

Once the applicable daily exposure cap is reached, RCS marks the Auditor **unavailable for further normal harmful-content work for the rest of that working day**.

RCS does not schedule the person's remaining employment duties. They may perform non-exposure work such as administration, training or other duties according to the organisation's workplace arrangements, but no further normal harmful-content case may be assigned through RCS that day.

This keeps the product boundary clear: RCS controls harmful-content assignment eligibility; the employer controls non-RCS staffing duties.

---

## Cooldown is separate from the daily cap

Cooldown protects the Auditor after qualifying exposure but **does not reset accumulated daily exposure**.

Example:

```text
Auditor has accumulated 88 min today
↓
Completes an S3 case
↓
15-minute mandatory cooldown
↓
Cooldown completes
↓
Daily exposure remains 88 min
↓
Auditor may return only if otherwise eligible
```

After S3/S4 cooldown, the existing wellbeing rules still apply, including the rule that the next assigned case must not immediately be another S3/S4 case.

An SOS event continues to use the S4-equivalent protection path defined in the BA baseline.

---

## Individual exposure limits

The default testing cap is 120 minutes, but the BA requirements also state that a Manager may set or adjust an individual Auditor's applicable exposure limit (`MR-OV-04`).

The dashboard and assignment engine must therefore use:

```text
applicable Auditor exposure limit
```

rather than assuming every Auditor is always fixed at exactly 120 minutes.

For example:

```text
Auditor A: 94 / 120 min
Auditor B: 76 / 90 min
```

Changing an individual limit should be treated as a Manager-controlled wellbeing/operational action and should be auditable.

---

## Working-day reset rule for the Sprint 3 prototype

For Sprint 3, use the following working-day rule:

```text
9:00 AM – 5:00 PM
Organisation local time
```

> **Accumulated exposure for the current working day resets at 9:00 AM at the start of the next configured workday.**

It must not reset because of:

- login/logout;
- browser refresh;
- midnight;
- case completion;
- cooldown completion.

Historical exposure records remain stored for Manager oversight/audit.

The 9:00 AM reset is the Sprint 3 prototype rule used consistently by exposure tracking, assignment eligibility and the Manager dashboard.

---

## Active case reaches the cap — Sprint 3 rule

Sprint 3 uses the following rule, aligned with the existing decline-routing rule `AR-DF-02` / `CV-07`: **the system must not automatically reassign the case. The Manager decides whether reassignment is appropriate.**

Flow:

```text
Auditor reaches applicable daily cap during raw review
↓
Stop further raw/source playback
↓
Preserve entered review progress
↓
Case is routed to the Manager / Reassignment Queue
with reason: EXPOSURE_CAP_REACHED
↓
Manager reviews the available case context
↓
Manager decides whether to reassign / otherwise resolve the case
↓
Auditor receives no further normal harmful-content cases that day
```

The Auditor should not be encouraged to exceed the wellbeing cap simply to finish a case.

Once the cap is reached, the Auditor must not continue the harmful-content review. The unfinished case follows the Manager decision path above. This keeps the hard daily cap enforceable and remains consistent with `AR-DF-02` / `CV-07`, where reassignment is a Manager decision rather than an automatic system action.


# 3. Optional Visuospatial Cooldown Activity

## What it is

Add an optional built-in visuospatial block puzzle to the Auditor cooldown/break screen.

Example:

```text
Cooldown in progress
14:22 remaining

[Play Block Puzzle]

[Optional Wellbeing Check-in]
[Stop My Shift]
```

## Rules

- optional;
- does not shorten mandatory cooldown;
- does not cancel S4/SOS follow-up;
- does not replace Manager/support/counselling processes;
- no diagnosis;
- no stress/trauma score;
- no claim that RCS is providing treatment.

## Evidence-based rationale

The feature is informed by experimental research on visuospatial tasks following distressing visual experiences.

A randomized controlled proof-of-concept study by Iyadurai et al. tested a specific intervention involving a trauma-memory reminder followed by visuospatial Tetris play and found fewer intrusive memories during the following week compared with a control condition.

This evidence does **not** mean RCS should claim that a block puzzle prevents or treats trauma. The Sprint 3 feature should therefore be described only as an optional, research-informed visuospatial cooldown activity.

Research on content moderation also reports a dose-response relationship between more frequent exposure to distressing content and psychological distress / secondary trauma, supporting the broader product goal of limiting prolonged harmful-content exposure and providing recovery/support mechanisms.

## Implementation decision

Use a **generic RCS-built block puzzle** rather than:

- using the Tetris trademark/branding;
- embedding an uncontrolled external website;
- presenting the game as a medical intervention.

---

# 4. CommunityHub Case Result Handoff

## Purpose

When an Auditor completes a normal case, RCS sends the **final human moderation result for that one case** to CommunityHub.

This is the **Case Result Handoff**. It is separate from the Manager-approved aggregate Client Service Report.

## CommunityHub demo status — simulated Client platform

For the Sprint 3 demonstration, **CommunityHub is a mock / simulated Client platform** representing the type of external community platform RCS could integrate with in practice, such as Reddit.

The team could not obtain the required external platform API access/key within the project timeframe, so the integration is simulated rather than presented as a live Reddit or production-platform integration.

The demo should state this clearly and professionally:

> **CommunityHub is a simulated Client platform used to demonstrate the RCS handoff and enforcement flow. It represents how RCS could integrate with a real platform such as Reddit; the project uses a mock because live external API access was not available for the prototype.**

The simulation should still use a realistic structured API-style handoff so the product story remains technically meaningful.

### CommunityHub Admin demo action

The simulated CommunityHub side should include a **CommunityHub Admin** who receives the completed RCS moderation outcome.

Example:

```text
COMMUNITYHUB ADMIN

Post: CH-4721
RCS Case: RCS-184

RCS Outcome:
Policy Violation Found

Final Severity:
S3

[Remove Post]
```

Important responsibility rule:

```text
RCS determines the moderation outcome
↓
CommunityHub Admin receives the outcome
↓
CommunityHub Admin decides whether to enforce
↓
[Remove Post] updates the simulated CommunityHub post state
```

RCS must **not** automatically remove the post.

For the mock, the action can update:

```text
post_status = REMOVED
removed_at = timestamp
removed_by = CommunityHub Admin
```

and display:

```text
Post removed
```

This demonstrates the separation between:

- **RCS moderation decision**; and
- **Client platform enforcement**.

---

## 4.1 Normal case flow — no Manager approval

```text
Reporter submits case
↓
AI pre-screen
↓
Auditor reviews
↓
Auditor submits FINAL decision
↓
RCS validates required completion/handoff fields
↓
Valid?
├─ No  → completion blocked; case remains in pre-COMPLETE workflow
│        and no delivery record is sent
└─ Yes → Case = COMPLETE
          ↓
          Delivery = PENDING
          ↓
          RCS sends structured result
          ↓
          SUCCESS / RETRYING / FAILED
          ↓
          CommunityHub decides platform enforcement
```

### Core responsibility split

- **Auditor:** makes the final RCS moderation decision;
- **Manager:** handles operational exceptions, reassignment decisions, wellbeing and quality workflows;
- **CommunityHub:** decides platform enforcement/action.

The Manager does **not** approve every normal Auditor decision before CommunityHub receives it.

---

## 4.2 What the automatic result contains

The automatic case handoff should contain **structured factual fields**, not an AI-written persuasive narrative.

Sprint 3 handoff payload:

```json
{
  "delivery_id": "DEL-RCS-184",
  "case_id": "RCS-184",
  "outcome": "POLICY_VIOLATION_FOUND",
  "final_severity": "S3",
  "completed_at": "2026-10-05T14:22:00+11:00"
}
```

Where source/context information exists, it may also be included if it is part of the agreed CommunityHub interface.

### Source information is optional

Reporter source information is **not a mandatory condition for case completion or CommunityHub handoff**.

For the Sprint 3 demo, assume the Reporter uploads a video directly from their device. The uploaded video is the primary submitted evidence. Optional source/context information may still be captured where available.

A missing optional `source_url`, username, group or source description must **not** block an otherwise valid completed case from being handed off.

---

## 4.3 Required handoff validation and invalid records

Validate only fields that are genuinely required by the agreed handoff contract, for example:

- delivery ID;
- case ID;
- final Auditor outcome;
- final Auditor severity, if severity is required by the interface;
- completion timestamp;
- organisation/destination identity needed to route the result.

### Status rule for an invalid record

Because validation occurs **before** `COMPLETE`, an invalid required completion/handoff field must not produce a completed case with a fake `FAILED` delivery.

Use this rule:

```text
Required completion/handoff fields invalid
↓
Case stays in the existing pre-COMPLETE workflow state
(e.g. AUDITOR_REVIEW until corrected)
↓
Completion validation = BLOCKED_INVALID
↓
No CommunityHub delivery is created/sent
↓
Correction path runs
↓
Validation passes
↓
Case = COMPLETE
↓
Delivery = PENDING
```

`BLOCKED_INVALID` is therefore a **completion-validation state/reason**, not a CommunityHub delivery failure and not proof that the Auditor's moderation judgement was wrong.

If the problem is a technical/non-moderation field, the Manager/technical workflow may resolve it. If the missing field is part of the Auditor's moderation decision, the Manager must not invent that decision; return it to the appropriate correction workflow.

---

## 4.4 Delivery SUCCESS definition

For the Sprint 3 prototype, a CommunityHub handoff is `SUCCESS` only when RCS receives a verifiable acknowledgement:

1. CommunityHub returns an HTTP `2xx` response; **and**
2. the response echoes the same `delivery_id` that RCS sent.

Example acknowledgement:

```json
{
  "delivery_id": "DEL-RCS-184",
  "status": "accepted"
}
```

RCS then stores:

```text
delivery.status = SUCCESS
delivery.delivered_at = acknowledgement timestamp
delivery.response_delivery_id = DEL-RCS-184
```

The case view should show:

```text
CommunityHub delivery
Delivered at 2:22 PM
Delivery ID: DEL-RCS-184
```

A `2xx` response with no matching `delivery_id` is not a confirmed success for this prototype; treat it as an unverifiable response and retry/escalate according to the delivery rules.

Use a stable `delivery_id` / idempotency identity on retries so CommunityHub can avoid duplicate downstream processing.

---

## 4.5 Delivery retry and Manager exception handling

A temporary CommunityHub delivery failure should first be handled automatically.

```text
Case COMPLETE
↓
Delivery attempt
↓
Temporary/unverifiable failure
↓
Automatic retry
↓
Automatic retry
↓
Still failing
↓
Delivery = NEEDS_ATTENTION / FAILED
↓
Manager Handoff Exception Queue
```

### Manager sees

```text
Case:               RCS-184
Moderation status:  COMPLETE
Outcome:             POLICY_VIOLATION_FOUND
Severity:            S3
Delivery status:     FAILED
Attempts:            3
Last attempt:        2:41 PM
Failure reason:      CommunityHub endpoint unavailable

[Retry Delivery]
[View Technical Details]
[Escalate Issue]
```

### Manager handles the operational problem, not the moderation decision

The Manager may:

- retry a failed handoff;
- inspect failure details;
- escalate an integration/authentication issue;
- resolve routing/configuration problems;
- return an invalid pre-completion record to the appropriate correction workflow.

The normal case screen should not contain an `Approve Auditor Decision` button because the Auditor already owns the final normal moderation decision.

---

## 4.6 Decline, cap-reached and SOS routing

### Auditor decline — AR-DF-02 / CV-07

```text
Auditor declines
↓
Case routes directly to Manager
↓
Manager reviews decline reason + available context
↓
Manager decides whether reassignment is appropriate
↓
If reassigned, another eligible Auditor reviews
↓
Final result completed
↓
Normal automatic handoff
```

The system must **not automatically reassign** a declined case.

### Auditor reaches daily cap mid-case — Sprint 3 rule

```text
Daily cap reached during unfinished review
↓
Stop further raw playback
↓
Preserve progress
↓
Route case to Manager / Reassignment Queue
Reason: EXPOSURE_CAP_REACHED
↓
Manager decides whether reassignment is appropriate
```

Again, the system does not automatically choose the replacement Auditor.

### SOS interrupts an unfinished case

```text
Unexpected exposure → Auditor triggers SOS
↓
Protect Auditor / stop harmful review
↓
Urgent SOS event reaches Manager SOS surface
↓
Manager completes SOS follow-up
↓
Unfinished case is handled through the appropriate Manager decision/reassignment path
↓
Another Auditor completes it if reassigned
↓
Normal automatic handoff
```

The Manager manages the exception around the workflow/person; they do not become the routine final moderator.

# 5. Manager Dashboard — CommunityHub Delivery Health

CommunityHub delivery health is one of the **fixed Manager Insights Dashboard widgets defined in Section 1**.

Delivery status belongs on the Manager operational surface, not the Auditor interface.

A delivery failure does **not** reopen a completed moderation case. Keep the states separate:

```text
Moderation status: COMPLETE
Delivery status:   FAILED / NEEDS_ATTENTION
```

On successful acknowledgement, show:

```text
Moderation status: COMPLETE
Delivery status:   SUCCESS
Delivered at:      2:22 PM
Delivery ID:       DEL-RCS-184
```

This makes it clear that the Auditor's work can be complete even if the downstream integration later needs Manager/technical attention.

# 6. CommunityHub Client Service Report

## What it is

The Client Service Report is a **Manager-reviewed aggregate report covering many cases over a selected period**.

It is different from the automatic one-case Case Result Handoff.

The report is formal client-facing communication, so **Manager review and approval is required before release**.

---

## 6.1 Report comes from the chosen dashboard widgets

```text
Manager selects organisation + reporting period
↓
Dashboard displays the chosen reportable widgets/metrics
↓
Manager can inspect [View Evidence] for each major value
↓
[Generate Client Service Report]
↓
RCS SNAPSHOTS the current report figures + evidence metadata
↓
Report draft/version is created
↓
Manager reviews
↓
Approve / Release
↓
CommunityHub Authorised User can access that released version
```

The Manager is approving **client communication**, not re-approving individual Auditor decisions.

---

## 6.2 Freeze / snapshot rule

Report figures must be **snapshotted at generation time**.

Store with the report version:

- report ID;
- report version;
- organisation ID;
- selected reporting period;
- generated timestamp;
- each metric's frozen value;
- metric definition/calculation used;
- evidence/source metadata and contributing record IDs where appropriate;
- Manager-approved note, if any;
- release status and released timestamp.

Once a report is `RELEASED`, its figures must not change just because the live dashboard later changes.

If the Manager wants newer figures, they generate a **new draft/version** rather than mutating the released report.

```text
Report CH-SEP-2026 v1
Generated: 2 Oct 2026 10:41 AM
Status: RELEASED

Live dashboard changes on 3 Oct
↓
CH-SEP-2026 v1 stays unchanged
↓
Manager may generate CH-SEP-2026 v2 if a corrected/new report is required
```

---

## 6.3 Chosen report content

### Report metadata

- report ID and version;
- customer organisation;
- reporting period;
- generated timestamp;
- release status / released timestamp.

### Case operations

- cases received;
- completed cases;
- open cases at period end;
- median report-to-final-decision time;
- oldest/client-relevant unresolved item where appropriate.

### Moderation outcomes

- `POLICY_VIOLATION_FOUND` count and proportion;
- `NO_VIOLATION_FOUND` count and proportion;
- final Auditor severity distribution S1–S4.

### Quality / AI-human comparison

- aggregate AI-versus-Auditor override count;
- override rate;
- high-level severity-transition pattern where appropriate.

Do not convert this into an individual Auditor performance ranking.

### Workflow exceptions

- declined/reassigned case count;
- relevant processing failures;
- client-relevant unresolved items.

### Delivery health

- successful case-result deliveries;
- pending/retrying deliveries;
- failed/needs-attention deliveries.

### Manager-approved note

The Manager may add a short factual service note that contains **no Auditor names, wellbeing details or private support/SOS information**.

Acceptable example:

> Two delivery failures occurred during the reporting period because the client endpoint was temporarily unavailable; both were successfully retried.

Unacceptable examples include notes naming an Auditor, describing an Auditor's distress/check-in/SOS, or including private internal wellbeing information.

---

## 6.4 What must not appear in the client report

Exclude by default:

- individual Auditor wellbeing/check-in records;
- SOS narratives;
- counselling/support details;
- individual Auditor exposure history;
- raw harmful footage;
- private internal Manager notes;
- sensitive internal Validation commentary;
- internal technical details that do not need to be disclosed to the client.

---

## 6.5 Evidence / provenance in the report

The report should preserve how each major value was calculated.

Report evidence UI:

```text
Completed Cases: 184                    [View Evidence]

Definition:
Cases with status COMPLETE during 1–30 September 2026
for organisation CommunityHub.

Source fields:
- cases.status
- cases.completed_at
- organisation_id

Frozen value in report v1: 184
Contributing records: 184 case IDs
```

This is the same evidence model used by the live dashboard, but the released report stores a **frozen snapshot** of the value and its evidence metadata.

# 7. CommunityHub Admin / Authorised Client User

## Role

For the Sprint 3 simulated Client platform, use:

```text
COMMUNITYHUB_ADMIN
```

This is a **limited external Client role inside the simulated CommunityHub experience**, not an RCS staff role and not a full multi-tenant administration system.

CommunityHub is a customer of the RCS moderation service. The external user receives only the customer-facing information RCS has deliberately released to their organisation.

---

## 7.1 Sign-in model

CommunityHub users should have their **own authorised identities**, linked to their organisation.

Example:

```text
user_id: CH-USER-17
organisation_id: COMMUNITYHUB
role: COMMUNITYHUB_ADMIN
```

Avoid one shared CommunityHub username/password.

For Sprint 3, each external client user must have a unique identity linked to `organisation_id`; shared CommunityHub credentials are not allowed. The external client path must not rely on the current in-memory single-instance staff session mechanism. A production deployment should use a proper external identity provider such as organisation SSO/OIDC with MFA.

---

## 7.2 Can

A `COMMUNITYHUB_ADMIN` can:

- sign in through the external/Client access surface;
- view RCS case-result handoffs delivered to CommunityHub;
- use the simulated `Remove Post` enforcement action where appropriate;
- view reports released to their own organisation;
- view client-safe report metadata;
- view the released report in RCS;
- download an approved/released report if download is enabled;
- see only client-safe information deliberately released by RCS.

## Cannot

A `COMMUNITYHUB_ADMIN` cannot:

- access raw harmful footage;
- access the Manager Dashboard;
- access Case Oversight;
- access individual Auditor wellbeing/exposure information;
- access SOS/support records;
- access Validation controls;
- access Reassignment controls;
- edit moderation decisions;
- view another organisation's reports;
- release reports themselves.

---

# 8. Secure CommunityHub Report Access

## Access flow

```text
Manager approves report
↓
Report status = RELEASED
↓
Released report is bound to organisation_id
↓
COMMUNITYHUB_ADMIN signs in
↓
RCS authenticates user
↓
RCS authorises this user for this organisation + this report
↓
CommunityHub Reports page
↓
View / Download if permitted
↓
Access event logged
```

---

## 8.1 Security principles

Use:

- least privilege;
- deny-by-default access rules;
- server-side authorisation on every report request;
- organisation/tenant check on every report access;
- released-report status check;
- encrypted transport;
- access logging;
- appropriate session expiry / re-authentication for sensitive access;
- no access to internal RCS data simply because the user is authenticated.

Authentication answers:

> Who is this user?

Authorisation separately answers:

> Is this user allowed to access this specific report/action?

---

## 8.2 View versus download

The safest default experience is to let the authorised client **view the released report inside RCS**.

Download may still be allowed for released reports where required.

If download is enabled:

- only released client-safe reports can be downloaded;
- the request is authorised server-side;
- the event is logged;
- optional watermarking may show organisation/user/report details;
- reports should contain the minimum client information required.

### Important limitation

Once an authorised client legitimately downloads a file, RCS cannot technically guarantee that the recipient will never copy or forward that local file.

The system reduces risk through access control, data minimisation, individual accounts, logging and optional watermarking rather than claiming complete control after download.

---

## 8.3 Report portal is off the moderation path

CommunityHub report access must not become a single point of failure for moderation operations.

```text
Client report-login / report-view outage
        ≠
case moderation outage
        ≠
automatic Case Result Handoff outage
```

A failure of the `COMMUNITYHUB_ADMIN` sign-in/report portal must **not** stop:

- Reporter submission;
- AI pre-screening;
- Auditor review;
- normal case completion;
- automatic one-case CommunityHub result handoff.

The report-access surface is a separate downstream client-reporting path.

If the **CommunityHub handoff endpoint itself** is unavailable, that is handled separately through delivery retries and the Manager Handoff Exception Queue described in Section 4.

---

## 8.4 Access log

Access log fields:

- report ID;
- client user ID;
- organisation ID;
- action;
- timestamp;
- `access_result`;
- optional denial/error reason;
- optional session/request metadata where appropriate.

### `access_result` meaning

Use explicit values such as:

```text
SUCCESS
DENIED
ERROR
```

Examples:

```text
action: VIEW
access_result: SUCCESS
```

```text
action: DOWNLOAD
access_result: DENIED
reason: REPORT_NOT_RELEASED
```

```text
action: DOWNLOAD
access_result: DENIED
reason: WRONG_ORGANISATION
```

```text
action: DOWNLOAD
access_result: ERROR
reason: FILE_GENERATION_FAILED
```

This is clearer than a generic `result` field.

---

# 9. Optional Wellbeing Check-in vs SOS

The BA baseline defines two separate mechanisms and they must remain visually and behaviourally distinct.

## 9.1 Optional wellbeing check-in — AR-WB-16 / MR-SOS-07

The wellbeing check-in is **low-key, optional and non-urgent**.

It exists so an Auditor can:

- flag that a case was difficult;
- ask to talk to their Manager;
- request a break;
- use a calm support path without formal escalation.

It must:

- remain structurally separate from SOS;
- use no alarm/urgent framing;
- be optional to answer/use;
- be available during review and at the relevant cooldown moment;
- appear in the Auditor's normal record/View Details, not in the SOS Inbox.

### Manager behaviour — MR-SOS-07

- a routine check-in is **logged only**; no Manager action is required;
- a flagged break request receives a distinct **low-key** marker with an `Approve` action;
- there is **no aggregated per-Auditor tally** of check-ins;
- do not turn repeated check-ins into an individual wellbeing/performance score;
- the check-in log is visible only in that Auditor's normal `View Details` record.

Example Auditor UI:

```text
Do you want to talk to your manager about this one?

[Talk to my manager]

I'd like to take a break   [No / Yes]
```

### Sprint 3 case and exposure behaviour during a check-in

Use the following Sprint 3 behaviour whenever an optional wellbeing check-in is opened:

**Opening the optional check-in**

```text
Auditor opens wellbeing check-in from review
↓
Raw/source playback pauses
↓
Current playback position + review progress are preserved
↓
Exposure clock pauses because raw/source video is not playing
↓
Case remains assigned to the same Auditor
```

**Routine “Talk to my manager” check-in**

```text
Auditor selects Talk to my manager
↓
Routine check-in is logged in View Details
↓
No urgent SOS state and no Manager approval is required
↓
Auditor may return to the same case when ready
provided no cooldown/cap/protection rule blocks return
```

**Break request**

```text
Auditor requests a break
↓
Low-key break marker appears in Auditor View Details
↓
Manager uses the MR-SOS-07 Approve action
↓
Case remains assigned; progress is preserved
↓
Raw playback remains paused while the Auditor takes the break
↓
Exposure does not accrue during the paused break
↓
Auditor returns to the same case only if otherwise eligible
```

This follows the existing `AR-WB-01` counting rule: exposure accrues while source video is actively playing; paused/stopped video does not count.

The check-in itself does not reduce or reset the Auditor's accumulated daily exposure total and does not automatically route the case to another Auditor.

---

## 9.2 SOS — unexpected exposure

SOS is the **urgent protection path for unexpected harmful exposure**, not a stronger version of the routine check-in.

Trigger:

- unexpectedly severe/disturbing content appears during review and the Auditor needs the harmful-content review stopped and urgently escalated.

Flow:

```text
Unexpected harmful exposure
↓
Auditor triggers SOS
↓
Immediately pause and hide the harmful raw/source review
↓
Create urgent SOS event
↓
Alert Manager through SOS surface
↓
Apply mandatory protection/cooldown + follow-up
↓
Unfinished case handled through Manager decision/reassignment workflow
↓
Auditor returns only when the existing SOS/protection requirements allow
```

SOS retains its urgent framing and dedicated Manager SOS surface. It is not counted or displayed as a routine wellbeing check-in.

---

## 9.3 Difference in one line

> **Wellbeing check-in = optional, calm support/break request without formal escalation.**
>
> **SOS = urgent protection after unexpected harmful exposure.**

`Decline` is separate again:

> **Decline = the Auditor chooses not to continue that case; it routes directly to the Manager, who decides whether reassignment is appropriate.**

# 10. Reporter Final Outcome

When the Reporter returns using the Case ID, keep the final outcome simple and client-safe.

Example after the CommunityHub result delivery has succeeded:

```text
Case RCS-184

Status:
Complete

Outcome:
Policy Violation Found.
CommunityHub has been notified and will determine any action
under its platform policies.
```

If the CommunityHub delivery is still pending or has failed, do **not** falsely state that CommunityHub has already been notified.

The Reporter should not see:

- Auditor identity;
- internal notes;
- Manager notes;
- wellbeing/SOS/support information;
- internal delivery error detail;
- unconfirmed CommunityHub enforcement actions.

---

# 11. AI Buddy — HD Feature Implementation Notes

The RCS AI Buddy is the **primary HD / wow feature** following Sprint 3 demo feedback.

The detailed product positioning is defined at the beginning of this document. This section records the minimum implementation behaviour.

## Minimum Sprint 3 scope

Build a simple generic conversational assistant available from the staff portal.

Minimum capabilities:

- accept a short staff question;
- answer from approved RCS workflow/help context;
- keep answers concise;
- distinguish Auditor and Manager guidance where relevant;
- point users to the correct existing screen/action;
- refuse to make moderation, wellbeing-diagnosis or enforcement decisions.

Suggested current context:

- exposure/cooldown rules;
- wellbeing check-in vs SOS;
- decline/reassignment flow;
- case status meanings;
- basic dashboard/navigation help;
- CommunityHub handoff/report explanation.

## UI

Use a persistent:

```text
[AI Buddy]
```

button that opens a side panel or compact chat drawer.

Avoid sending the user through another multi-page workflow.

## Preliminary-product wording

The demo should say:

> **This is our preliminary AI Buddy. For Sprint 3 it provides lightweight workflow and support guidance. The next stage would be to ground it more deeply in RCS policies, case context and operational data so it can become a one-stop shop for staff.**

Do not claim that the current prototype is already fully trained on all RCS data.

## Core rule

> **AI Buddy guides; authorised humans decide.**

It must not:

- select a case outcome;
- change severity;
- diagnose wellbeing;
- replace SOS;
- reassign cases;
- approve breaks;
- change exposure limits;
- remove Client posts;
- release Client reports.

---

# 11.1 Sprint 3 UI & Demo Standards

## Reduce unnecessary clicking

The demo feedback identified too much navigation/clicking.

Apply these rules where practical:

- make summary cards/rows directly clickable;
- open detail in a drawer/panel where possible instead of forcing a full page change;
- keep common actions on the screen where the decision is made;
- keep `Generate Client Service Report` accessible from the Manager dashboard;
- keep `AI Buddy` persistently accessible from staff screens;
- show CommunityHub outcome and `Remove Post` on the same Admin screen;
- avoid sending users back and forth between separate pages to understand one issue.

The goal is not to remove necessary confirmation steps. It is to remove **unnecessary navigation**.

---

## UI visual direction

Sprint 3 feedback was that the interface currently feels too much like a default IBM-style UI.

Do **not** spend the remaining sprint rebuilding the whole component library.

Instead:

- keep the existing component framework where it saves implementation time;
- apply more neutral **RCS product styling**;
- reduce heavy default IBM visual treatment;
- use cleaner spacing and hierarchy;
- reduce unnecessary borders;
- use status colour only where it communicates meaning;
- keep typography and card treatment consistent;
- keep layouts simple and less crowded.

The goal is for the prototype to feel like **RCS**, not like an untouched component-library demo.

---

## Exact UI wording / tag standard

Use short, professional labels consistently.

### Capitalisation

Use:

```text
Client
```

when referring to the external customer in visible UI copy.

Use exact product/role names consistently:

```text
RCS
CommunityHub
Manager
Auditor
CommunityHub Admin
AI Buddy
```

### Manager attention labels

Use:

```text
SOS Alert
Reassignment
Exposure Limit
Delivery Failed
Data Issue
Break Request
```

Do not use long conversational tags such as:

```text
Answer 2 support requests
Declined cases need a decision
```

Cards can show a label + count:

```text
Break Requests
2

Reassignment
1
```

Routine non-urgent wellbeing/talk requests that require no Manager approval should remain in Auditor `View Details`, not as a noisy top-level action card.

### Delivery labels

Use:

```text
Delivery Health
Pending
Retrying
Delivered
Failed
```

Prefer:

```text
Delivery Health
```

over long labels such as:

```text
CommunityHub delivery-health monitoring
```

### Case-status labels

Use:

```text
Processing
Ready for Review
In Review
Complete
Needs Reassignment
Blocked
```

### Exposure/protection labels

Use:

```text
Under Limit
Approaching Limit
At Limit
Cooldown
Available
Unavailable
```

### Report labels

Use:

```text
Client Reports
Draft
Released
Generate Report
Release Report
```

### AI comparison labels

Use:

```text
AI Match
AI Override
```

Do not use:

```text
AI Wrong
Auditor Wrong
```

---

# 11.2 Demo Story & Pitching Flow

Every screen shown in the demo should connect back to the product story.

## Manager Dashboard purpose

Use one clear sentence:

> **The Manager dashboard gives the Manager one place to understand service workload, Auditor protection and the operational issues that need action.**

Do not pitch it as the extra HD feature. It is the core Manager operational view.

## Auditor Dashboard purpose

> **The Auditor dashboard gives the Auditor one protected place to see their assigned work, exposure, cooldown and wellbeing options before opening a case.**

## CommunityHub purpose

> **CommunityHub is our simulated Client platform. It demonstrates how the final RCS moderation result can be handed back to a real platform, where the Client Admin makes the final enforcement action such as removing a post.**

## AI Buddy purpose

> **AI Buddy is our HD extension: a simple conversational companion that helps staff understand the RCS workflow without hunting through different screens. This is the preliminary version; the next stage is a grounded one-stop shop for RCS guidance and context.**

## Suggested short demo flow

Keep the demo path direct:

```text
1. Auditor Dashboard
   ↓
2. Review / protection flow
   ↓
3. Final Auditor outcome
   ↓
4. CommunityHub mock receives result
   ↓
5. CommunityHub Admin selects Remove Post
   ↓
6. Manager Insights Dashboard / Client report
   ↓
7. Show AI Buddy as the HD extension
```

Do not click through every available navigation item.

Show only the screens needed to tell the end-to-end story.

---

# 12. CommunityHub Approval / Responsibility Matrix

| Item | Decision / approval owner |
|---|---|
| AI pre-screen result | AI assistance only; not final |
| Normal final moderation decision | **Auditor** |
| Normal one-case CommunityHub result handoff | **Automatic after valid Auditor completion** |
| Failed handoff after automatic retries | **Manager handles operational exception** |
| Auditor decline / reassignment | **Case routes to Manager; Manager decides whether/how to reassign (AR-DF-02 / CV-07)** |
| Daily cap reached mid-case | **Route to Manager decision/reassignment path; no automatic reassignment (Sprint 3 rule aligned to AR-DF-02 / CV-07)** |
| SOS interruption | **Manager handles SOS/protection; any reassignment is a Manager decision** |
| Correction of missing technical/non-moderation delivery data | **Appropriate Manager/technical workflow** |
| Change to Auditor's actual moderation decision | **Not a routine Manager handoff action** |
| Client Service Report draft | **System calculates from verified dashboard data** |
| Client Service Report release | **Manager approves/releases** |
| CommunityHub platform enforcement / simulated `Remove Post` action | **CommunityHub Admin** |

### Simple rule

> **Normal case = Auditor finalises → automatic handoff.**  
> **Technical/workflow exception = Manager handles the exception.**  
> **Formal aggregate client report = Manager reviews and releases.**  
> **Platform punishment/enforcement = CommunityHub decides.**

---

# 13. Current Sprint 3 Feature Priority

| Feature | Priority / status |
|---|---|
| AI Buddy — preliminary staff companion | **Primary HD / wow feature** |
| Manager Insights Dashboard + evidence drill-down | **Core expected Manager functionality** |
| Manager Operations KPI strip (Total / Completed / Open / Needs Action) | **Core Manager dashboard feature** |
| Auditor Case Queue + Protection dashboard | **Core Auditor workflow / UX improvement** |
| Super Admin Auditor fallback + controlled case visibility | **Sprint 3 demo feedback requirement** |
| Needs Attention / operational exception view | **Core Manager dashboard feature** |
| Daily cumulative exposure cap + working-day reset | **Confirmed exposure model; 9:00 AM reset is Sprint 3 prototype rule** |
| Optional visuospatial block puzzle | **Research-informed wellbeing feature** |
| Simulated CommunityHub Client platform | **Required end-to-end demo integration** |
| CommunityHub Admin `Remove Post` action | **Required simulated Client enforcement step** |
| Automatic normal Case Result Handoff | **Core end-to-end integration flow** |
| Manager handoff-exception handling | **Required for reliable handoff** |
| Dashboard-derived CommunityHub Client Service Report / PDF | **Strong Client-facing feature** |
| Manager approval/release of Client report | **Required** |
| Secure organisation-scoped report access/logging | **Required if external report access is built** |
| Optional wellbeing check-in vs SOS distinction | **Required BA-aligned flow clarification** |
| UI copy consistency + click reduction | **Required Sprint 3 polish** |

---

# 14. Low-Level Product Summary

### Manager Insights Dashboard

Use the existing Manager dashboard as the **core operational view**, not the extra HD feature. It should answer Manager questions across cases, workload, Auditor protection, AI-human quality, Client organisations and delivery health. The top-level operational KPI strip shows **Total Cases, Completed, Open Cases and Needs Manager Action** before the Manager drills into detailed exceptions.

Every major metric should be traceable through `View Evidence` / `How is this calculated?`.

### Auditor Dashboard

Keep the existing Auditor **Case Queue + Protection** workspace as the chosen design. Show **Exposure Left Today, Completed Today, Cooldown and a BA-aligned Wellbeing Check-in**, followed by the Auditor's assigned case queue and completed-today list. Add only a small inline `open cases / ready to review` summary if useful. Keep the dashboard informational and wellbeing-oriented; do not introduce quotas, speed targets, peer rankings or per-Auditor wellbeing scores.

### Case Assignment Fallback

Keep normal weighted assignment, but add a **Super Admin Auditor** with visibility of all cases as the fallback. Allow an authorised Manager/Super Admin to make limited case metadata available to standard/lower-level Auditors without exposing raw content until the case is actually assigned.

### Daily Exposure Cap

Treat the applicable exposure limit as a **cumulative daily cap**. The default testing value is 120 minutes. Cooldowns do not reset the accumulated daily total. Once an Auditor reaches their applicable daily cap, RCS must stop assigning further normal harmful-content cases for the remainder of that working day.

For the Sprint 3 prototype, the working-day exposure counter resets at 9:00 AM at the start of the next configured workday, while historical exposure records remain stored.

### Block Puzzle

Provide an optional built-in visuospatial block activity during cooldown. It is research-informed but is **not** presented as clinical treatment.

### Case Result Handoff

After a valid normal Auditor final decision, automatically send a small structured factual result to the **simulated CommunityHub Client platform**. The CommunityHub Admin then chooses the simulated enforcement action such as `Remove Post`. Optional Reporter source information is not required for completion or handoff.

### Manager Exceptions

Only involve the Manager when an operational/workflow exception actually needs attention, such as repeated delivery failure, a declined/cap-interrupted case awaiting a Manager reassignment decision, SOS interruption, or an invalid required pre-completion record. The system must not automatically reassign declined or cap-interrupted cases.

### Client Service Report

Generate a period-based report from the same verified information already displayed on the Manager dashboard. The Manager reviews and approves the report before release.

### CommunityHub Mock / Admin

Present CommunityHub clearly as a simulated **Client platform** for the demo. The CommunityHub Admin receives RCS outcomes, can perform the simulated `Remove Post` enforcement action, and may access released Client reports where implemented.

### Secure Access

Authorise every report request, deny access by default, use least privilege, log access outcomes and minimise downloadable data.

### AI Buddy

Make the lightweight **AI Buddy** the primary HD extension. For Sprint 3 it provides simple staff workflow/help guidance through a persistent conversational panel. Pitch it as preliminary, with the next stage being a more deeply grounded one-stop RCS assistant.

---

# 15. Research / Design Evidence

## Visuospatial activity

Iyadurai, L., Blackwell, S. E., Meiser-Stedman, R., Watson, P. C., Bonsall, M. B., Geddes, J. R., Nobre, A. C. & Holmes, E. A. (2018), **Preventing intrusive memories after trauma via a brief intervention involving Tetris computer game play in the emergency department: a proof-of-concept randomized controlled trial**, *Molecular Psychiatry*, 23, 674–682. DOI: 10.1038/mp.2017.23.

Relevant design takeaway: a specific visuospatial intervention was associated with fewer intrusive memories in the following week in that study. RCS therefore uses only a cautious, non-clinical, research-informed rationale for an optional visuospatial activity.

## Content-moderator exposure

Spence, R., Bifulco, A., Bradbury, P., Martellozzo, E. & DeMarco, J. (2024), **Content Moderator Mental Health, Secondary Trauma, and Well-being: A Cross-Sectional Study**, *Cyberpsychology, Behavior, and Social Networking*, 27(2), 149–155. DOI: 10.1089/cyber.2023.0298.

Relevant design takeaway: the study reported a dose-response relationship between frequency of exposure to distressing content and psychological distress / secondary trauma. This supports exposure-aware assignment and recovery/support design, but does not establish RCS's exact `120 min` threshold.

## Moderation operations metrics

Trust & Safety Professional Association, **Metrics for Content Moderation**.

Relevant design takeaway: moderation operations commonly monitor measures such as incoming volume, closed/completed volume, response time, review time and quality measures. RCS dashboard/report metrics should still be limited to data actually available and correctly defined in the product.

## Access control

OWASP Cheat Sheet Series, **Authorization Cheat Sheet**.

Relevant design takeaway: use least privilege, deny by default, and validate permissions on every request. RCS should therefore check both the authenticated client identity and their authorisation for the specific organisation/report/action.

---
