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

Stores the minimum staff-account data needed by later authentication and case
assignment work:

- `auditor_id` — primary key
- `login_hash` — password hash; plaintext passwords must never be stored
- `role` — constrained to `auditor` or `manager`
- `created_at`

### `cases`

Stores each submitted case and the fields filled during later Sprint 2 stages:

- non-sequential `case_id` primary key
- internal workflow `status`
- nullable `assigned_auditor_id` foreign key
- video storage reference
- nullable AI severity, tier, summary, and incident-timeline fields
- source duration, internal analysis-output reference, and explicit AI-failure state
- nullable Auditor-adjusted severity, comment, and final-outcome fields
- creation and completion timestamps

Allowed internal statuses are:

```text
SUBMITTED
AI_PROCESSING
READY_FOR_REVIEW
AUDITOR_REVIEW
COMPLETE
```

Allowed Sprint 2 final outcomes are:

```text
NO_VIOLATION_FOUND
POLICY_VIOLATION_FOUND
```

AI and Auditor severity values are constrained to integers from 0 through 100.
Severity tiers are constrained to `S1`, `S2`, `S3`, or `S4`.
AI failures are constrained to `vision` or `speech_to_text`; null means no
known processing failure.

### `audit_logs`

Stores timestamped workflow events and case-analysis metadata:

- generated `audit_log_id` primary key
- `case_id` foreign key
- `actor`
- `action`
- nullable JSONB `before_value` and `after_value`
- `created_at`

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
versioned database migrations rather than deleting the volume. Sprint 3 statuses
or outcome values may require such a migration to expand the current constraints.

## Stopping the local database

Stop the container without deleting its data:

```bash
docker compose down
```
