# Verify Audit-Log Accuracy Against Client Requirements

## Purpose

Confirm that the combined **Validation & Audit** screen records and displays accurate data for real/live cases and includes the client-required governance fields.

## Real Cases Verified

| Case ID | Test Content | AI Result | Final Auditor Result | Comparison Result | Score Change | Provenance |
|---|---|---|---|---|---:|---|
| `C4T1B43BK072LJ4Z` | Cooking video | S1 Low — 20/100 | S1 Low — 10/100 | AI Override | -10 | Recorded live run |
| `DQAN8Z6TM3GIP97F` | Sports altercations | S3 High — 75/100 | S3 High — 75/100 | AI Match | 0 | Recorded live run |
| `X235T7ZUJZXKG71M` | Archery instruction | S1 Low — 20/100 | S1 Low — 20/100 | AI Match | 0 | Recorded live run |

## Comparison Accuracy Verification

### Case 1 — `C4T1B43BK072LJ4Z`

The AI recorded **S1 / 20** and the Auditor submitted **S1 / 10**.

The Validation & Audit screen correctly displayed:

- AI severity: S1 Low
- AI score: 20
- Final Auditor severity: S1 Low
- Final Auditor score: 10
- Result: AI Override
- Score change: -10
- Override reason retained
- Provenance: Recorded live run

The stored `CASE_RESOLVED` audit values also matched the comparison screen, including `ai_score`, `auditor_score`, `override`, `score_delta`, and the override reason.

### Case 2 — `DQAN8Z6TM3GIP97F`

The AI recorded **S3 / 75** and the Auditor submitted **S3 / 75**.

The Validation & Audit screen correctly displayed:

- AI severity: S3 High
- AI score: 75
- Final Auditor severity: S3 High
- Final Auditor score: 75
- Result: AI Match
- Score change: 0
- Provenance: Recorded live run

### Case 3 — `X235T7ZUJZXKG71M`

The AI recorded **S1 / 20** and the Auditor submitted **S1 / 20**.

The Validation & Audit screen correctly displayed:

- AI severity: S1 Low
- AI score: 20
- Final Auditor severity: S1 Low
- Final Auditor score: 20
- Result: AI Match
- Score change: 0
- Provenance: Recorded live run

## Required Governance Fields Verified

The three required governance fields were confirmed using real/live model-call data.

### 1. Prompt Leakage

Verified on live records as:

`NOT_DETECTED`

The audit history also showed the stored prompt-leakage status changing from `NOT_CHECKED` to `NOT_DETECTED`.

### 2. Source Attribution

Verified on live records with stored evidence references.

The expanded reference details included:

- analysis run ID
- AI response timestamp
- leakage-check timestamp
- check rule
- referenced video frame
- frame timestamp
- stored COS analysis-output path

This confirms that the displayed source-attribution count links to stored analysis evidence.

### 3. Accumulated Score

Verified on live records and matched the effective case severity score.

Examples:

- Cooking case: `20 / 100`
- Sports altercation case: `75 / 100`
- Archery case: `20 / 100`

## Result

The Validation & Audit screen successfully recorded and displayed the required governance data for real/live cases.

The three tested cases confirmed that:

- AI and Auditor comparison values were displayed accurately
- score changes were calculated correctly
- same-tier score changes were recorded as overrides where applicable
- override reasons were retained
- live provenance was clearly identified
- Prompt Leakage was recorded
- Source Attribution linked to stored evidence
- Accumulated Score was recorded and displayed

## Master Document Update

### Validation & Audit — Real Data Verification

The combined Validation & Audit screen was verified against three completed live cases. AI-versus-Auditor comparison values matched the recorded case data, including AI severity/score, final Auditor severity/score, match or override result, score change, and override reason where applicable.

The three client-required governance fields were also confirmed on live model-call data:

- **Prompt Leakage** — recorded and displayed as a checked status such as `NOT_DETECTED`
- **Source Attribution** — linked to stored analysis evidence, including the relevant video frame and analysis-output reference
- **Accumulated Score** — recorded as the case's highest effective severity score on the 0–100 scale

Tested live cases:

- `C4T1B43BK072LJ4Z` — AI 20 / Auditor 10 — AI Override
- `DQAN8Z6TM3GIP97F` — AI 75 / Auditor 75 — AI Match
- `X235T7ZUJZXKG71M` — AI 20 / Auditor 20 — AI Match

No mismatch was found between the tested live comparison values and the stored audit data.
