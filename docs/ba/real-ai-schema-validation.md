# Validate Real AI Output Against Agreed Schema

## Objective

Confirm that a real watsonx frame-analysis output produced by the project pipeline matches the JSON shape agreed at the start of the sprint.

## Evidence reviewed

A real frame-analysis output from a test run was supplied by the development team and compared against:

`backend/schemas/frame-analysis.schema.json`

The supplied output contained the following fields:

- `audit`
- `case_id`
- `effective_severity_score`
- `entities`
- `frame_num`
- `reasoning`
- `severity_tier`
- `tags`
- `timestamp`
- `watson_severity_score`

## Field-by-field validation

| Field | Expected | Observed | Result |
|---|---|---|---|
| `case_id` | string | `"74D0QS1VLLOIYIJD"` | Pass |
| `frame_num` | string | `"frame-00004"` | Pass |
| `timestamp` | number | `20.02` | Pass |
| `tags` | array | `["multi_person_conflict"]` | Pass |
| `watson_severity_score` | integer | `10` | Pass |
| `effective_severity_score` | integer | `10` | Pass |
| `severity_tier` | allowed severity-tier string | `"S1"` | Pass |
| `reasoning` | non-empty string | populated descriptive text | Pass |
| `entities` | array of strings | `["people", "horses", "rifles", "trees", "costumes"]` | Pass |
| `audit` | object | present with required metadata | Pass |

## Audit object validation

The nested `audit` object contained:

| Field | Observed value | Result |
|---|---|---|
| `decision_timestamp` | `"2026-09-25T09:30:25.734384+00:00"` | Pass |
| `model_id` | `"mistralai/mistral-small-3-1-24b-instruct-2503"` | Pass |
| `model_version` | `"1.0.0"` | Pass |
| `prompt_version` | `"2.0"` | Pass |

## Validation result

**PASS**

The real watsonx frame-analysis output matched the agreed application JSON contract for the reviewed sample. All expected fields were present and their observed value types matched the schema.

No schema mismatch was identified in the reviewed response, so no correction was required.

