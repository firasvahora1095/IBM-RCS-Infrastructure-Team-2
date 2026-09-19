# Database Provisioning and Core Schema

This document covers the Sprint 2 T20 database task only. It provisions a local
PostgreSQL database and defines the three core tables used by later backend work:

- `auditors`
- `cases`
- `audit_logs`

API routes, authentication behaviour, assignment logic, uploads, AI processing,
and Auditor resolution behaviour are implemented in later tasks.

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
- nullable placeholder AI severity, tier, summary, and incident-timeline fields
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

### `audit_logs`

Provides timestamped change records for later workflow stages:

- generated `audit_log_id` primary key
- `case_id` foreign key
- `actor`
- `action`
- nullable JSONB `before_value` and `after_value`
- `created_at`

Later AI/governance work can place decision and model metadata in the JSONB
values while retaining the actor, action, case, and timestamp as queryable fields.

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