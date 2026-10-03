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

echo "==> Setting up database..."
su -c "psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\"" postgres 2>/dev/null || true
su -c "psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\"" postgres 2>/dev/null || true
su -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\"" postgres 2>/dev/null || true
su -c "psql -U $DB_USER -d $DB_NAME -f /app/schemas/db_schema.sql" postgres 2>/dev/null || true

echo "==> Running seed..."
cd /app && python3 -m scripts.seed_demo || echo "Seed failed, continuing anyway..."

echo "==> Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8080
