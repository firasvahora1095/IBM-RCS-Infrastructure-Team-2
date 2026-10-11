#!/bin/bash
set -e

DB_NAME="${POSTGRES_DB:-rcs_infra}"
DB_USER="${POSTGRES_USER:-rcs_app}"
DB_PASSWORD="${POSTGRES_PASSWORD:-rcs_demo_password}"

echo "==> Initializing PostgreSQL data directory..."
if [ ! -s "$PGDATA/PG_VERSION" ]; then
    su -c "initdb -D $PGDATA --username=postgres" postgres
fi

echo "==> Configuring PostgreSQL port..."
sed -i "s/#port = 5432/port = 5432/" $PGDATA/postgresql.conf 2>/dev/null || true
sed -i "s/port = 5433/port = 5432/" $PGDATA/postgresql.conf 2>/dev/null || true

echo "==> Starting PostgreSQL..."
su -c "pg_ctl -D $PGDATA -l /tmp/postgres.log start -w" postgres

shutdown() {
    trap - EXIT TERM INT
    [ -z "${BACKUP_PID:-}" ] || kill "$BACKUP_PID" 2>/dev/null || true
    [ -z "${API_PID:-}" ] || kill "$API_PID" 2>/dev/null || true
    [ -z "${API_PID:-}" ] || wait "$API_PID" 2>/dev/null || true
    su -c "pg_ctl -D $PGDATA stop -m fast -w" postgres || true
}
trap shutdown EXIT
trap 'exit 0' TERM INT

echo "==> Setting up database..."
su -c "psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\"" postgres 2>/dev/null || true
su -c "psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\"" postgres 2>/dev/null || true
su -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\"" postgres 2>/dev/null || true
cd /app
# Explicit recovery revision: never auto-select a backup or overwrite existing data.
if [ -n "${RCS_RESTORE_MANIFEST:-}" ]; then
    BACKUP_RESTORE_DATABASE_URL="$DATABASE_URL" python3 -m scripts.database_backup --restore "$RCS_RESTORE_MANIFEST" --confirm-empty-target
fi

echo "==> Applying versioned database migrations..."
python3 -m app.migrations

if [ "${RCS_ALLOW_DESTRUCTIVE_SEED:-0}" = "1" ]; then
    python3 -m scripts.seed_demo
fi

# A successful backup every 24h permits up to one day of data loss.
# Activation requires explicit COS backup configuration; failures are visible.
if [ "${RCS_DAILY_BACKUP_ENABLED:-0}" = "1" ]; then
    python3 -m scripts.database_backup --validate
    python3 -m scripts.database_backup --daily &
    BACKUP_PID=$!
fi

echo "==> Starting API..."
uvicorn app.main:app --host 0.0.0.0 --port 8080 &
API_PID=$!
wait "$API_PID"
