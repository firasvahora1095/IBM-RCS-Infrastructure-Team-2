#!/bin/bash
set -e

DB_NAME="rcs_infra"
DB_USER="rcs_app"
DB_PASSWORD="rcs_demo_password"
PG_VERSION=$(ls /usr/lib/postgresql/)

echo "==> Starting PostgreSQL..."
su -c "/usr/lib/postgresql/$PG_VERSION/bin/pg_ctl -D /var/lib/postgresql/$PG_VERSION/main start -w" postgres

echo "==> Setting up database..."
su -c "psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\"" postgres 2>/dev/null || true
su -c "psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\"" postgres 2>/dev/null || true
su -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;\"" postgres 2>/dev/null || true
su -c "psql -U $DB_USER -d $DB_NAME -f /app/schemas/db_schema.sql" postgres 2>/dev/null || true

echo "==> Running seed..."
cd /app && python -m scripts.seed_demo

echo "==> Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8080
