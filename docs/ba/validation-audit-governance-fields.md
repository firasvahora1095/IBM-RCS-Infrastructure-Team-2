# RCS Validation / Audit Governance Fields and Combined-Screen Scope

## Purpose

Define the governance fields requested for Sprint 3 — **Prompt Leakage, Source Attribution, Accumulated Score, and AI-vs-Auditor Comparison** — and define the scope of the combined **Validation / Audit** Manager screen.

The existing BA baseline already requires:

- AI output and Auditor-adjusted results to be stored separately;
- Auditor override comments to be retained;
- a timestamped audit history of AI results, overrides, comments and case-status changes;
- Manager access to AI-versus-ground-truth validation results;
- placeholder/mock validation values to be clearly labelled.

The exact schema for the four governance fields is not currently defined in the repository. The field names, allowed values and storage structures below are therefore **proposed Sprint 3 implementation definitions**, not existing database fields or client-confirmed schema. Dev should map them to the implemented backend schema while preserving the business meaning defined here. These definitions are designed to fit the existing RCS data model without changing the approved moderation workflow.

---

# 1. Governance Field Definitions

## 1.1 Prompt Leakage

### Field

`prompt_leakage_status`

### Purpose

Records whether an AI response appears to expose internal RCS prompt text, system instructions, hidden implementation instructions, or other prompt content that should not appear in a user- or staff-facing AI result.

### Proposed allowed values

These are **Sprint 3 proposed enum values** for implementation:

- `NOT_CHECKED`
- `NOT_DETECTED`
- `DETECTED`

If Dev uses different database enum/value names, the same three business states must still be represented clearly.

### Supporting fields

- `prompt_leakage_evidence` — optional short reference to the detected output segment or validation rule that triggered the flag;
- `prompt_version` — the prompt version used for the AI result;
- `checked_at` — timestamp of the leakage check.

### Recording rule

The field is recorded after AI output is received and before the result is treated as a normal validated AI response.

A detected leakage event does **not** alter the Auditor's final moderation decision automatically. It is an AI-governance issue for Manager review.

### Manager display

Example:

```text
Prompt leakage
Status: DETECTED
Prompt version: 2.0
Checked: 07 Oct 2026, 2:12 PM
[View evidence]
```

---

## 1.2 Source Attribution

### Field

`source_attribution`

### Purpose

Provides traceability between an AI finding and the source evidence from which that finding was produced.

For RCS, source attribution refers to the **case evidence used by the AI**, not the identity of the public Reporter.

### Proposed stored structure

A source-attribution entry should contain the following **only where the AI pipeline actually produces and persists the data**:

- `source_type` — for example `VIDEO_FRAME`, `TRANSCRIPT_SEGMENT`, or `AUDIO_ANALYSIS`;
- `frame_num` — frame identifier where applicable;
- `start_timestamp` / `end_timestamp` — location in the submitted video;
- `analysis_output_reference` — stored analysis/result reference where available;
- `model_id`;
- `model_version`;
- `prompt_version`.

Fields such as `frame_num`, `model_version` and `prompt_version` must not be fabricated by the frontend. If the current pipeline does not persist one of these values, the UI should omit it or display it as unavailable rather than inventing a value.

Example:

```json
[
  {
    "source_type": "VIDEO_FRAME",
    "frame_num": "frame-00024",
    "start_timestamp": 48.0,
    "end_timestamp": 48.0,
    "model_id": "model-name",
    "model_version": "version",
    "prompt_version": "2.0"
  }
]
```

### Recording rule

Attribution should be attached to the AI result or finding it supports so a Manager can trace a result back to the underlying analysed evidence.

It must not imply that the AI result is correct simply because a source reference exists.

### Manager display

Example:

```text
Source attribution
• Video frame frame-00024 — 00:48
• Video frame frame-00027 — 00:54
• Transcript segment — 00:46–00:57

[View source references]
```

Raw harmful footage should not automatically open when a Manager selects a source reference.

---

## 1.3 Accumulated Score

### Field

`accumulated_score`

### Purpose

Stores the case-level AI severity score after RCS has processed the available analysed evidence and applied the project's deterministic severity rules.

### Sprint 3 team-defined prototype definition

The existing BA baseline requires an **Accumulated Score** governance field but does not define its exact calculation semantics. The following is therefore a **team-defined Sprint 3 implementation rule**, not a client-confirmed formula.

For the current RCS prototype, **Accumulated Score is not the sum of every frame score**. Summing frame scores would make longer videos automatically produce larger values and would conflict with the existing severity model.

Use:

> `accumulated_score` = the highest effective severity score reached by the analysed evidence for the case after deterministic severity-floor rules are applied.

This choice is intended to keep the governance field consistent with the current **worst-tier-wins** case-severity approach. If the AI pipeline later exposes a separately defined accumulated-score value, that pipeline value should replace this prototype mapping and the BA definition should be updated.

### Range

`0–100`

### Relationship to existing fields

- `watson_severity_score` = original model-owned severity score;
- `effective_severity_score` = score after deterministic RCS severity rules are applied;
- `accumulated_score` = auditable case-level score retained for the governance/validation view;
- `severity_tier` = S1–S4 tier derived from the effective case score.

Under this **Sprint 3 prototype mapping**, `accumulated_score` may therefore equal the final case-level `effective_severity_score`. This equivalence is an implementation choice for the prototype, not a statement that the two concepts must always be identical in a future production design.

### Manager display

Example:

```text
Accumulated score: 82 / 100
Final AI tier: S3
Highest contributing evidence: frame-00024 at 00:48
```

---

## 1.4 AI-vs-Auditor Comparison

### Field / derived record

`ai_auditor_comparison`

### Purpose

Shows how the original AI assessment compares with the Auditor's final human assessment for the same case.

This is a **traceability and quality-review field**. It must not automatically label the AI or Auditor as correct or incorrect.

### Required values

- `ai_score`;
- `ai_tier`;
- `auditor_score`;
- `auditor_tier`;
- `override` — `true` when the Auditor changed the AI severity result;
- `score_delta` — `auditor_score - ai_score`;
- `override_reason` — Auditor comment required when the AI severity is changed;
- `compared_at` — timestamp of the submitted Auditor decision.

Example:

```json
{
  "ai_score": 58,
  "ai_tier": "S2",
  "auditor_score": 72,
  "auditor_tier": "S3",
  "override": true,
  "score_delta": 14,
  "override_reason": "Weapon use became visible later in the footage.",
  "compared_at": "2026-10-07T14:22:00+11:00"
}
```

### Important distinction

**AI-vs-Auditor Comparison is not the same as the MR-OV-08 Validation result.**

- **AI-vs-Auditor** compares live case AI output with the Auditor's final assessment.
- **Validation** compares AI output with manually labelled ground-truth values from the project's synthetic/staged validation set.

The screen must label these separately so Auditor overrides are not presented as model-accuracy ground truth.

---

# 2. Combined Validation / Audit Screen

## Screen name

**Validation & Audit**

## Role access

Manager only.

The screen is an internal quality, governance and traceability function. It is not visible to Reporters, Auditors, or CommunityHub client users.

---

# 3. Screen Layout

## A. Validation Overview

### Purpose

Show the client-required AI-versus-ground-truth validation view.

### Content

- validation-set size;
- AI-predicted S1–S4 distribution;
- manually labelled ground-truth S1–S4 distribution;
- match rate / agreed validation statistics;
- validation methodology summary.

### Visual

Paired severity-distribution chart, consistent with the existing Manager Validation page.

### Rule

Any seeded, mock or placeholder values must display:

> **Placeholder / mock data — not real validation results.**

This section must remain visibly distinct from live AI-vs-Auditor comparisons.

---

## B. AI-vs-Auditor Comparison

### Manager question

> Where are the AI result and the Auditor's final assessment different?

### Content

For each completed reviewed case:

- Case ID;
- AI score and tier;
- final Auditor score and tier;
- override yes/no;
- score delta;
- override reason;
- decision timestamp.

### Visual

Summary at the top:

```text
Cases compared        126
Overrides               18
Override rate         14.3%
Most common change    S2 → S3
```

Below this, display a filterable comparison table.

### Actions

- `View Case Evidence`
- `View Audit Trail`

### Rule

Do not display labels such as:

- `AI WRONG`;
- `AUDITOR WRONG`;
- `POOR AUDITOR PERFORMANCE`.

The Manager interprets the comparison together with evidence and, where applicable, ground-truth validation results.

---

## C. Governance Fields

### Manager question

> Can I trace how this AI result was produced and identify governance issues?

For the selected case, show:

```text
Prompt Leakage
NOT_DETECTED

Accumulated Score
82 / 100 — S3

Source Attribution
3 evidence references
[View references]

Model
<model_id>

Model Version
<model_version>

Prompt Version
2.0

AI Decision Time
<timestamp>
```

This section may also show the existing model/run metadata already retained by the RCS analysis pipeline.

---

## D. Audit Timeline

### Manager question

> What happened to this case, who or what caused the change, and when?

### Content

Use the existing audit-log structure:

- timestamp;
- actor;
- action;
- before value;
- after value.

Relevant events include, where available:

- report submitted;
- AI processing started;
- AI analysis completed or failed;
- assignment/reassignment;
- review started;
- Auditor severity override;
- Auditor comment recorded;
- final Auditor outcome;
- case completed;
- governance-field update.

### Visual

Chronological timeline or expandable audit table.

The current `AuditLog` structure (`case_id`, `actor`, `action`, `before_value`, `after_value`, `created_at`) is sufficient for the base timeline.

---

# 4. Filters

The combined screen should support:

- Case ID;
- date/time range;
- AI severity tier;
- Auditor final severity tier;
- override yes/no;
- audit action;
- prompt-leakage status.

Validation-set filters should remain separate from live-case filters where necessary.

---

# 5. Data and Storage Rules

1. Governance fields must be persisted in backend/database records or audit records and must not exist only in temporary frontend state.
2. Original AI values must remain stored even when an Auditor overrides the severity.
3. Auditor final values and override reason must remain stored separately from the AI result.
4. Model ID, model version, prompt version and decision timestamp should be retained with the applicable AI analysis record.
5. Source attribution should reference stored evidence rather than copying raw harmful footage into the governance record.
6. A prompt-leakage flag must not remove or rewrite historical audit evidence.
7. Validation results based on ground truth must remain distinguishable from live AI-vs-Auditor comparison data.

---

# 6. Privacy / Scope Boundaries

The Validation & Audit screen must not become a wellbeing-monitoring screen.

Do not include by default:

- private wellbeing check-in details;
- SOS narratives;
- counselling/support information;
- per-Auditor wellbeing tallies;
- raw harmful footage.

If exceptional raw-content access is required, the existing Manager content-warning and exposure-protection rules still apply.

---

# 7. Acceptance Criteria

The task is complete when:

- Prompt Leakage is defined with status, purpose, recording rule and Manager visibility;
- Source Attribution is defined and links AI findings to case evidence references;
- Accumulated Score is defined consistently with the current worst-tier-wins severity model;
- AI-vs-Auditor Comparison stores/displays both AI and final human values without declaring either one correct;
- the combined Validation & Audit screen clearly separates ground-truth validation from live AI-vs-Auditor comparison;
- Managers can inspect governance fields and the audit history for a selected case;
- mock validation data is clearly labelled as placeholder;
- governance fields are persisted rather than held only in frontend state;
- private Auditor wellbeing information is excluded from this screen.