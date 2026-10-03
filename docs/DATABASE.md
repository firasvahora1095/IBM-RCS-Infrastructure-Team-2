# Database Provisioning and Core Schema

This document describes local PostgreSQL provisioning and the three core
tables used by the backend:

- `auditors`
- `cases`
- `audit_logs`

## Prerequisites

- Docker with Docker Compose support
- Python 3.10 or newer
- The Python packages listed in `backend/requirements.txt`  

## Environment configuration

Copy `.env.example` to `.env` if a local environment file does not already exist:

```dotenv
POSTGRES_DB=rcs_infra
POSTGRES_USER=rcs_app
POSTGRES_PASSWORD=change-me-local-only
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg2://rcs_app:change-me-local-only@localhost:5432/rcs_infra
```

Replace the example password in `.env` with a local value. The values in `.env.example` are development placeholders
only.

`DATABASE_URL` is read by `backend/app/db.py`. A later deployment can point this
variable at a different PostgreSQL host without changing the application code.

## Start the database

From the repository root, run:

```bash
docker compose up -d postgres
```

Check that the container is running and healthy:

```bash
docker compose ps
```

The Compose configuration:

- runs PostgreSQL 16;
- exposes it locally on `POSTGRES_PORT`, which defaults to `5432`;
- stores data in the named `rcs_postgres_data` volume;
- applies `backend/schemas/db_schema.sql` when creating a fresh database volume;
- includes a PostgreSQL readiness health check.

## Core schema

### `auditors`

Stores staff-account, assignment, exposure, and cooldown data:

- `auditor_id` — primary key
- `login_hash` — password hash; plaintext passwords must never be stored
- `role` — constrained to `auditor` or `manager`
- `active_case_count` — active case count used for assignment weighting
- `exposure_minutes` — accumulated exposure time in minutes
- `exposure_limit_minutes` — individual exposure limit; defaults to 120 minutes
- `last_assigned_at` — nullable timestamp of the latest assignment
- `cooldown_ends_at` — nullable timestamp when the cooldown ends
- `cooldown_trigger` — nullable reason for the cooldown
- `cooldown_check_in_done` — Manager check-in completion flag; defaults to 0
- `created_at` — staff-account creation timestamp

### `cases`

Stores each submitted case, AI analysis, and review decision:

- `case_id` — non-sequential primary key
- `status` — internal workflow state
- `assigned_auditor_id` — nullable foreign key to `auditors.auditor_id`
- `video_storage_path` — nullable source-video storage reference
- `watson_severity_score` — nullable original Watson severity score
- `effective_severity_score` — nullable AI severity score after severity rules
- `severity_tier` — nullable severity tier derived from the effective AI score
- `narrative_summary` — nullable AI-generated case summary
- `incident_timeline` — nullable JSONB incident timeline
- `flagged_entities` — nullable JSONB entity labels and time spans
- `transcript` — nullable JSONB speech transcript
- `audio_intensity` — nullable JSONB timestamped audio-intensity data
- `video_duration_seconds` — nullable source-video duration in seconds
- `analysis_output_path` — nullable internal analysis-output storage reference
- `ai_failure` — nullable AI-processing failure state
- `auditor_severity_score` — nullable Auditor-submitted severity score
- `auditor_comment` — nullable Auditor comment; required for a severity override
- `final_outcome` — nullable final case decision
- `manager_flag` — nullable SOS or Decline flag requiring Manager action
- `created_at` — case creation timestamp
- `completed_at` — nullable case completion timestamp

Allowed internal statuses are:

```text
SUBMITTED
AI_PROCESSING
READY_FOR_REVIEW
AUDITOR_REVIEW
COMPLETE
DECLINED
SOS_FLAGGED
```

Allowed database final outcomes are:

```text
NO_VIOLATION_FOUND
POLICY_VIOLATION_FOUND
CLOSED_NO_REASSIGNMENT
```

The first two outcomes are the only `RT-01` values accepted from an Auditor by
the standard resolution endpoint. `CLOSED_NO_REASSIGNMENT` is reserved for the
Manager's declined-case closure path; it is deliberately not part of the
Auditor request enum.

AI and Auditor severity values are constrained to integers from 0 through 100.
Severity tiers are constrained to `S1`, `S2`, `S3`, or `S4`.
AI failures are constrained to `vision` or `speech_to_text`; null means no
known processing failure.

### `audit_logs`

Provides timestamped workflow change records:

- `audit_log_id` — generated primary key
- `case_id` — foreign key to `cases.case_id`
- `actor` — staff ID or service responsible for the event
- `action` — recorded workflow event type
- `before_value` — nullable JSONB values before the change
- `after_value` — nullable JSONB values after the change
- `created_at` — audit-event creation timestamp

Each handled case-analysis run creates one `AI_ANALYSIS_COMPLETED` or
`AI_ANALYSIS_FAILED` event. Its `after_value` contains the run ID and model
metadata alongside the existing workflow details.

### Manager audit-history viewer

The manager dashboard's **View audit history** button opens `/manager/audit-logs`.
It reads the existing `audit_logs` table through the backend's database connection,
so the database does not need to be reachable from the manager's browser.

`GET /api/manager/audit-logs` requires the existing manager Bearer token and
returns `entries` plus `next_before_id`. Each entry includes the stored ID, case,
actor, action, timestamp, `before_value`, and `after_value`. The endpoint only
reads records and sends `Cache-Control: no-store`.

Optional query parameters are `case_id`, `action` (exact matches), `before_id`
(for older entries), and `limit` (default 25, maximum 100). Entries are ordered
by descending audit ID. The viewer provides filters, refresh, older-entry paging,
and expandable JSON values, including `null` when no value was stored.

Deploy both the updated backend and a rebuilt frontend. Build the frontend with
`VITE_DATA_SOURCE=api` and `VITE_API_BASE_URL` set to the deployed backend's URL;
these Vite variables are resolved at build time. The existing `DATABASE_URL`
stays in the backend environment. Demo mode reports that audit history requires
a backend connection instead of displaying synthetic database records.

This viewer reads the values already saved in `audit_logs`. It does not backfill
model metadata into workflow events. Production verification is complete only
after querying the deployed backend and inspecting a known case's saved rows.

### One audit event per case analysis run

`process_case_analysis` saves one `AuditLog` event when a vision run completes or
returns a handled failure. It uses the case's `case_id`, actor `watsonx-vision`,
and the existing action `AI_ANALYSIS_COMPLETED` or `AI_ANALYSIS_FAILED`.
`before_value` keeps the case's state before the run; `after_value` contains the
resulting state and these metadata fields:

| JSON field | Purpose |
| --- | --- |
| `analysis_run_id` | New UUID for each invocation, including reanalysis |
| `model_id` | Model ID shared by the responses received in this run |
| `model_version` | IBM-provided revision; JSON `null` if unavailable or varying |
| `prompt_version` | Prompt version shared by the received responses |
| `decision_timestamp` | Last model response received for the run, as an ISO 8601 UTC timestamp |
| `frames_received` | Number of responses received, including ones that later failed validation |
| `frames_completed` | Number of frames successfully validated and stored |

The watsonx client captures each receipt timestamp immediately after the IBM
call. The pipeline retains the last timestamp for the run, while individual
frame JSON files retain their own timestamps. `created_at` separately records
when the database inserts the completed/failed run's audit event.

If a run fails after receiving some responses, its failure event retains the
metadata gathered so far, together with the failure stage and failed frame.
If no response was received, all four model metadata fields are `null` and
`frames_received` is zero. A run that receives an invalid response can therefore
have more received frames than completed frames.

If model ID, revision, or prompt version differs within a run, the field that
varies becomes `null` and `model_configurations` lists every distinct combination
observed. Shared fields retain their value. This avoids attributing the whole
case to just the final response's configuration.

Reanalysis appends a new event with a new run ID; earlier run events remain
available. The case result and its audit event are committed together after
processing. An interrupted process or database commit failure before that final
transaction completes cannot produce a completed/failed run event.

The run's manifest also includes this audit summary. Standalone `analyse_video`
calls return and store the summary; `process_case_analysis` persists it in the
existing `audit_logs` table. No extra columns or table are required.

In the manager history page, filter by case ID, then expand **View stored
values** and inspect **After**. Filter by `AI_ANALYSIS_COMPLETED` or
`AI_ANALYSIS_FAILED` to select an outcome.

To inspect the same fields in `psql`, set a case-ID variable with
`\set case_id YOUR_CASE_ID` and run:

```sql
SELECT audit_log_id, case_id, action,
       after_value->>'analysis_run_id' AS analysis_run_id,
       after_value->>'model_id' AS model_id,
       after_value->>'model_version' AS model_version,
       after_value->>'prompt_version' AS prompt_version,
       after_value->>'decision_timestamp' AS decision_timestamp,
       after_value->>'frames_received' AS frames_received,
       after_value->>'frames_completed' AS frames_completed,
       after_value->'model_configurations' AS model_configurations,
       created_at
FROM audit_logs
WHERE case_id = :'case_id'
  AND action IN ('AI_ANALYSIS_COMPLETED', 'AI_ANALYSIS_FAILED')
ORDER BY audit_log_id;
```

For `CASE_RESOLVED`, the audit values include the raw Watson score, effective
AI score, Auditor score/comment, final outcome, status, and whether the score
was overridden. This implements the traceability required by BA `AR-AI-12`.

## PostgreSQL and COS persistence boundary

The current executable adapters—not older storage diagrams—define this split:

- `cases.video_storage_path` stores a reference such as
  `cos://<bucket>/cases/<case_id>/source.mp4`; the video bytes are in COS.
- `cases.analysis_output_path` points to
  `cos://<bucket>/cases/<case_id>/analysis-output`; frame-analysis and related
  provider JSON artefacts are stored below that COS prefix.
- AI fields needed by the UI and workflow are promoted into structured columns
  on `cases`.
- Auditor overrides, comments, final outcomes, status, completion time, and
  workflow audit events remain in PostgreSQL. No additional COS object is
  created when an Auditor resolves a case.

Keeping the review decision in PostgreSQL satisfies BA `AR-AI-08` (AI and human
inputs stored with the case) and `AR-AI-12` (timestamped, actor-attributed change
history), while avoiding two competing copies of the final decision.

## Case ID generation

`backend/app/case_ids.py` generates 16-character uppercase-alphanumeric IDs
using Python's `secrets` module. This uses the operating system's
cryptographically secure random source rather than a counter, timestamp, or
predictable pseudo-random generator.

The `cases.case_id` primary key provides the database uniqueness constraint.

Run the case-ID checks from the `backend` directory:

```bash
python -m scripts.DATABASE_ID_TEST
```

The checks confirm that consecutive IDs differ, match the expected format, and
do not collide in a sample of 10,000 generated IDs.

## Database read/write verification

With PostgreSQL running, execute the smoke test from the `backend` directory:

```bash
python -m scripts.DATABASE_TEST
```

The existing smoke test covers the original workflow tables:

1. `auditors`, `cases`, and `audit_logs` exist;
2. an Auditor can be inserted and read;
3. an assigned case can be inserted, updated, and read;
4. the placeholder AI and final-outcome fields accept valid values;
5. an audit-log entry can be inserted and read.

The test performs these operations inside a transaction and rolls it back, so it
does not leave records in the database.

A successful run prints:

```text
PASSED - core tables exist and support direct backend reads/writes
```

## Persistence and schema changes

The PostgreSQL data directory is stored in a named Docker volume, so restarting
the container does not erase the database.

The initialization SQL runs only when PostgreSQL creates a fresh data directory.
Editing `db_schema.sql` does not update an already-initialized database.

For the watsonx video-pipeline columns, safely reapply the idempotent schema to
an existing local development database (adjust user/database names if your
`.env` differs):

```bash
docker compose exec postgres psql \
  -U rcs_app \
  -d rcs_infra \
  -f /docker-entrypoint-initdb.d/001-core-schema.sql
```

This preserves existing rows and adds the missing pipeline columns and
constraints. Case-analysis audit events use the existing `audit_logs` table, so this
logging update requires no new database schema migration.

Previously processed cases are not backfilled automatically. New analysis runs
begin including model metadata after the updated backend is deployed; reanalysing
an existing case also creates a new event with this metadata.

During disposable local development, a fresh database can be created with:

```bash
docker compose down --volumes
docker compose up -d postgres
```

Warning: `docker compose down --volumes` permanently deletes the local database
volume. Do not use it for an environment containing data that must be retained.

Once the schema contains data that must be preserved, apply future changes with
versioned database migrations rather than deleting the volume. The current
application also applies idempotent PostgreSQL additions for newer Sprint 2/3
columns at startup, but a versioned migration remains the required approach for
constraint changes in a persistent Code Engine database.

## Stopping the local database

Stop the container without deleting its data:

```bash
docker compose down
```
