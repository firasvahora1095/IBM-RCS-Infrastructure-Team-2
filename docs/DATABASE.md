# Database Provisioning and Core Schema

This document covers the Sprint 2 database schema. It provisions a local
PostgreSQL database and defines the three core tables used by the backend:

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

Later AI/governance work can place decision and model metadata in the JSONB
values while retaining the actor, action, case, and timestamp as queryable fields.

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

The test verifies that:

1. all three required tables exist;
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

This preserves existing rows and adds missing `video_duration_seconds`,
`analysis_output_path`, and `ai_failure` columns plus the failure-value
constraint.

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
