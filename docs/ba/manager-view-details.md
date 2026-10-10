# RCS Manager View Details — Auditor Data, Exposure Trigger & Reset Rules

## Purpose

Define the data shown in the Manager **View Details** panel for an individual Auditor and document the exact rules for:

- exposure minutes;
- active case count;
- assigned case list;
- SOS history;
- cooldown frequency/history;
- AI-vs-Auditor override trends;
- the 120-minute daily exposure limit;
- cooldown behaviour;
- daily reset;
- weekly reporting reset.

This specification is written as the **pre-implementation requirement** for the View Details panel.

---

# 1. View Details Panel Purpose

The Manager View Details panel should answer:

```text
How much harmful-content exposure has this Auditor had today?

How many cases are currently assigned to them?

Which cases are assigned?

Have they recently used SOS?

Are they currently in cooldown?

How often have cooldowns occurred?

Are there recurring AI-vs-Auditor override patterns?
```

The panel is for operational oversight, Auditor protection and workload visibility.

It must not become a productivity leaderboard, wellbeing score or performance ranking.

---

# 2. Exposure Minutes

## Display

```text
Exposure Today
110 / 120 min
```

Optional percentage:

```text
92% of today's limit
```

## Definition

`exposure_minutes_today` is the Auditor's cumulative harmful-content exposure for the current configured working day.

Exposure counts only while harmful source video is actively playing.

### Counts as exposure

Count time when raw/source harmful video is actively playing, including when:

- blur is enabled;
- grayscale is enabled;
- audio is muted.

### Does not count as exposure

Do not count time when:

- video is paused or stopped;
- the Auditor is viewing AI summary only;
- the Auditor is reading transcript only;
- the Auditor is on the dashboard;
- the Auditor is in cooldown;
- a wellbeing check-in is open and playback is stopped.

Replaying harmful source footage counts again.

## DB source

Primary source:

```text
auditor_daily_exposure.exposure_minutes
```

Supporting fields:

```text
auditor_daily_exposure.auditor_id
auditor_daily_exposure.workday_date
auditor_daily_exposure.exposure_minutes
auditors.exposure_limit_minutes
```

If the current implementation stores exposure directly on the Auditor record, map to:

```text
auditors.exposure_minutes
auditors.exposure_limit_minutes
```

The frontend must use the persisted backend value and must not estimate exposure independently.

---

# 3. Exposure Status

Use:

```text
Under Limit
Approaching Limit
At Limit
```

## Under Limit

Exact condition:

```text
exposure_minutes_today < (0.75 × applicable_exposure_limit_minutes)
```

For the default 120-minute cap:

```text
0–89 minutes
```

## Approaching Limit

Exact condition:

```text
exposure_minutes_today >= (0.75 × applicable_exposure_limit_minutes)
AND
exposure_minutes_today < applicable_exposure_limit_minutes
```

For the default 120-minute cap:

```text
90–119 minutes
```

## At Limit

Exact condition:

```text
exposure_minutes_today >= applicable_exposure_limit_minutes
```

For the default 120-minute cap:

```text
exposure_minutes_today >= 120
```

---

# 4. Exact 120-Minute Trigger Condition

The exposure-cap trigger is not a range.

The exact trigger is:

```text
WHEN exposure_minutes_today >= applicable_exposure_limit_minutes
```

Default:

```text
applicable_exposure_limit_minutes = 120
```

Therefore:

```text
WHEN exposure_minutes_today >= 120
```

the Auditor is considered **At Limit**.

## Trigger action

When the trigger condition becomes true:

1. stop/pause harmful source playback immediately;
2. preserve the Auditor's current case progress;
3. prevent further normal harmful-content assignments for the remainder of the current working day;
4. mark the Auditor unavailable for normal harmful-content assignment;
5. if an active case is unfinished, route it to the Manager decision/reassignment path;
6. do not automatically reassign the case without Manager control.

Suggested system reason:

```text
EXPOSURE_CAP_REACHED
```

---

# 5. Applicable Exposure Limit

Default:

```text
120 minutes per working day
```

The Manager may set an authorised individual limit.

## DB source

```text
auditors.exposure_limit_minutes
```

If no individual value exists:

```text
use system default = 120
```

The View Details panel must display the actual value being enforced.

---

# 6. Active Case Count

## Display

```text
Active Cases
3
```

## Definition

Count cases currently assigned to the selected Auditor that have not reached `COMPLETE`.

Exact calculation:

```text
COUNT(cases)
WHERE assigned_auditor_id = selected_auditor_id
AND status != COMPLETE
```

## DB source

```text
cases.case_id
cases.assigned_auditor_id
cases.status
```

Derived value:

```text
active_case_count
```

---

# 7. Assigned Case List

Show the selected Auditor's currently assigned cases.

Recommended columns:

```text
Case ID
Severity
Status
Assigned At
```

Example:

| Case ID | Severity | Status | Assigned At |
|---|---|---|---|
| RCS-104 | S2 | Ready for Review | 9:20 AM |
| RCS-110 | S3 | In Review | 10:05 AM |

## DB source

```text
cases.case_id
cases.assigned_auditor_id
cases.status
cases.severity_tier
cases.assigned_at
```

Scope:

```text
assigned_auditor_id = selected_auditor_id
AND status != COMPLETE
```

Completed cases belong in a separate completed/history section.

---

# 8. SOS History

Show a chronological history of SOS events for the selected Auditor.

Example:

```text
SOS History

08 Oct 2026 — 2:14 PM
Case: RCS-088
Status: Resolved
```

## DB source

Recommended source:

```text
sos_events.sos_id
sos_events.auditor_id
sos_events.case_id
sos_events.created_at
sos_events.status
sos_events.resolved_at
```

If SOS is stored in audit logs, derive from:

```text
audit_logs.actor_id
audit_logs.case_id
audit_logs.action
audit_logs.created_at
```

where:

```text
action = SOS_TRIGGERED
```

## Rule

SOS history is informational.

Do not calculate SOS scores, risk scores or Auditor rankings from SOS usage.

---

# 9. Routine Wellbeing Check-Ins

Routine wellbeing check-ins are separate from SOS.

The View Details panel may show recent check-ins chronologically.

Examples:

```text
Asked for a break
Wants to talk to Manager
```

## DB source

Recommended:

```text
wellbeing_checkins.checkin_id
wellbeing_checkins.auditor_id
wellbeing_checkins.type
wellbeing_checkins.created_at
wellbeing_checkins.status
```

Do not display an aggregated wellbeing score or support-request score.

---

# 10. Current Cooldown

## Display

If no cooldown is active:

```text
Cooldown
None active
```

If active:

```text
Cooldown
12 min remaining
```

Optional reason:

```text
Triggered by S3 review
```

## DB source

```text
auditors.cooldown_started_at
auditors.cooldown_ends_at
auditors.cooldown_trigger
```

or the equivalent persisted cooldown record.

## Active condition

Cooldown is active when:

```text
cooldown_ends_at IS NOT NULL
AND current_time < cooldown_ends_at
```

---

# 11. Cooldown Behaviour

## S1

```text
No mandatory cooldown
```

## S2

Mandatory cooldown:

```text
5 minutes
```

Trigger when:

```text
continuous S2 harmful exposure exceeds approximately 2 minutes in one case
```

OR:

```text
2 or more S2 cases occur within the agreed 45-minute review block
```

The original BA wording uses approximately two minutes for the sustained S2 threshold. Do not present it as more exact unless confirmed.

## S3

Mandatory cooldown:

```text
15 minutes
```

Trigger after an S3 review requiring cooldown.

## S4

Minimum cooldown:

```text
30 minutes
```

Also requires:

```text
Manager/support check-in
```

The Auditor must have the option to stop/reassign remaining work.

## SOS

SOS uses the same minimum protection level as S4:

```text
minimum 30-minute cooldown
+
Manager/support check-in
+
option to stop/reassign remaining work
```

This applies regardless of original case severity.

---

# 12. Cooldown Assignment Behaviour

While cooldown is active:

```text
Auditor must not receive new harmful-content assignments
```

Existing exposure total:

```text
does NOT reset
```

When S3/S4 cooldown ends:

```text
the next assigned case must not be S3 or S4
```

This is a post-cooldown protection rule.

---

# 13. Cooldown History / Frequency

## Display

Example:

```text
Cooldown History — This Week

08 Oct — S3 — 15 min
07 Oct — S2 — 5 min
06 Oct — SOS — 30 min
```

Optional factual count:

```text
Cooldown events this week: 3
```

## DB source

Recommended:

```text
cooldown_events.cooldown_id
cooldown_events.auditor_id
cooldown_events.case_id
cooldown_events.trigger_type
cooldown_events.started_at
cooldown_events.ended_at
cooldown_events.duration_minutes
```

If no dedicated table exists, derive from audit/event records.

## Rule

Cooldown frequency is for operational context only.

Do not use it as an Auditor quality score, ranking, disciplinary indicator or productivity KPI.

---

# 14. AI-vs-Auditor Override Trends

## Display

Example:

```text
AI–Auditor Overrides — This Week

Cases reviewed: 18
Overrides: 3
Override rate: 16.7%

Most common change:
S2 → S3
```

## DB source

```text
cases.case_id
cases.assigned_auditor_id
cases.ai_severity_tier
cases.final_auditor_severity_tier
cases.completed_at
```

Override comment source:

```text
cases.override_reason
```

or the existing audit-log record.

## Override condition

Exact condition:

```text
final_auditor_severity_tier != ai_severity_tier
```

for completed reviewed cases.

## Override rate

```text
override_count / completed_reviewed_case_count × 100
```

Do not label the AI or Auditor as wrong simply because an override occurred.

---

# 15. Behaviour When the Exposure Cap Is Reached Mid-Case

If the Auditor reaches the applicable exposure limit while actively reviewing a case:

```text
Exposure reaches applicable limit
↓
Stop harmful source playback
↓
Preserve case progress
↓
Case remains unfinished
↓
Route case to Manager decision/reassignment
↓
Auditor becomes unavailable for further normal harmful-content assignment that working day
```

Suggested reason:

```text
EXPOSURE_CAP_REACHED
```

The system must not reset the exposure total or automatically continue playback.

---

# 16. Existing Assigned Cases After the Cap

Once the Auditor reaches their daily cap:

- no new normal harmful-content cases should be assigned;
- unfinished cases requiring further harmful-content review should enter the Manager decision/reassignment path;
- unassigned cases remain available to other eligible Auditors;
- completed cases remain completed.

The cap does not erase assignment or audit history.

---

# 17. Daily Reset Rule

The daily exposure cap is a working-day protection rule.

## Sprint 3 prototype working day

Use:

```text
09:00 AM → next configured working-day start
```

For the current prototype:

```text
daily exposure resets at 09:00 AM
```

at the start of the next configured working day.

## Exact reset behaviour

At the new working-day start:

```text
exposure_minutes_today = 0
```

The new day's allowance begins.

## DB source

```text
auditor_daily_exposure.workday_date
auditor_daily_exposure.exposure_minutes
```

or equivalent day-keyed exposure record.

This 09:00 AM boundary is the Sprint 3 prototype implementation rule for the configured working day.

---

# 18. Events That Do NOT Reset Daily Exposure

Exposure must not reset when:

- the Auditor logs out;
- the Auditor logs back in;
- the browser refreshes;
- the application restarts;
- a case is completed;
- a case is declined;
- the Auditor enters cooldown;
- cooldown finishes;
- the Manager changes screens;
- the Auditor opens a wellbeing check-in;
- the Auditor takes a break.

The exposure value must persist for the current working day.

---

# 19. Weekly Reset Rule

There is **no weekly exposure allowance or weekly exposure cap**.

The 120-minute rule remains:

```text
daily cumulative exposure limit
```

The weekly reset applies only to:

```text
weekly reporting / trend aggregation
```

## Sprint 3 weekly reporting window

Use:

```text
Monday 09:00 AM
→
next Monday 09:00 AM
```

in the organisation's local time.

At the new weekly reporting window:

- weekly displayed counts/trends begin a new period;
- historical records are retained;
- daily exposure does not receive an additional weekly allowance;
- previous SOS/cooldown/override records are not deleted.

The Monday 09:00 AM boundary is a **Sprint 3 reporting rule**, not a weekly wellbeing cap.

---

# 20. Daily vs Weekly Reset Summary

| Rule | Daily | Weekly |
|---|---|---|
| Exposure allowance resets | Yes | No |
| Default exposure cap | 120 min | None |
| Reset/start boundary | 09:00 AM next working day | Monday 09:00 AM |
| Exposure minutes reset | Yes | No weekly reset |
| SOS history deleted | No | No |
| Cooldown history deleted | No | No |
| Override history deleted | No | No |
| Reporting counters/trends start new period | Daily values where relevant | Yes |
| Historical records retained | Yes | Yes |

---

# 21. Historical Retention

Resetting a displayed daily or weekly counter must not delete historical records.

Retain:

- exposure history;
- case assignment history;
- SOS events;
- cooldown events;
- override history;
- Manager actions.

Reset means:

```text
start a new calculation window
```

not:

```text
delete previous data
```

---

# 22. Suggested View Details Layout

```text
AUDITOR DETAILS — auditor-03

Status: APPROACHING LIMIT

TODAY
------------------------------------------------
Exposure Today          Active Cases
110 / 120 min           3

Cooldown                Last Active
None active             10:42 AM


ASSIGNED CASES
------------------------------------------------
RCS-104   S2   Ready for Review
RCS-110   S3   In Review
RCS-112   S1   Ready for Review


SOS HISTORY
------------------------------------------------
08 Oct   RCS-088   Resolved
02 Oct   RCS-061   Resolved


COOLDOWN HISTORY — THIS WEEK
------------------------------------------------
08 Oct   S3    15 min
07 Oct   S2     5 min


AI–AUDITOR OVERRIDES — THIS WEEK
------------------------------------------------
Cases reviewed: 18
Overrides: 3
Override rate: 16.7%
Most common: S2 → S3
```

---

# 23. Data Source Summary

| Data Point | DB Source Field(s) | Calculation / Rule |
|---|---|---|
| Exposure minutes | `auditor_daily_exposure.exposure_minutes` | Current working-day cumulative harmful-content playback |
| Exposure limit | `auditors.exposure_limit_minutes` | Auditor-specific value, otherwise default 120 |
| Exposure state | exposure minutes + limit | `<75%`, `>=75% and <100%`, `>=100%` |
| Active case count | `cases.assigned_auditor_id`, `cases.status` | Assigned to selected Auditor and status != COMPLETE |
| Assigned case list | `cases.case_id`, `assigned_auditor_id`, `status`, `severity_tier`, `assigned_at` | Current non-complete assigned cases |
| SOS history | `sos_events.*` or SOS `audit_logs` | Chronological events for selected Auditor |
| Current cooldown | `auditors.cooldown_started_at`, `cooldown_ends_at`, `cooldown_trigger` | Active while current time < cooldown end |
| Cooldown history | `cooldown_events.*` or audit events | Chronological protection events |
| Override trend | AI severity + final Auditor severity + `completed_at` | Override when final human severity != AI severity |
| Override reason | `cases.override_reason` or audit record | Required when severity changed |
| Daily reset | `workday_date`, exposure record | New working day starts at 09:00 AM |
| Weekly reporting reset | event timestamps | New reporting window Monday 09:00 AM |

Exact physical table/column names should be mapped to the current backend schema during implementation. The business source for each displayed value must remain as defined above.

---

# 24. Privacy & Use Boundaries

The View Details panel may support Manager oversight, but it should not create an Auditor performance score from wellbeing/protection data.

Do not add:

- SOS score;
- cooldown score;
- support-request score;
- wellbeing ranking;
- exposure leaderboard;
- Auditor comparison leaderboard.

The panel should show factual operational/protection information only.

---
