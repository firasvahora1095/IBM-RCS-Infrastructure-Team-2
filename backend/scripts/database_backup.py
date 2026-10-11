"""Full PostgreSQL backups to COS and explicit empty-target restores.

No credentials are passed in argv or logs. No retention deletion is performed.
Run --help for the required opt-in daily worker and explicit restore options.
"""
import argparse
import hashlib
import json
import logging
import os
from pathlib import Path
import subprocess
import tempfile
import time
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url

log = logging.getLogger("rcs.database_backup")


def required(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required variable: {name}")
    return value


def pg_environment(database_url):
    url = make_url(database_url)
    if url.get_backend_name() != "postgresql":
        raise ValueError("Backup/restore requires PostgreSQL")
    result = os.environ.copy()
    for key, value in {"PGHOST": url.host or "127.0.0.1", "PGPORT": str(url.port or 5432),
                       "PGDATABASE": url.database, "PGUSER": url.username, "PGPASSWORD": url.password}.items():
        if value is not None:
            result[key] = value
    if "sslmode" in url.query:
        result["PGSSLMODE"] = url.query["sslmode"]
    return result


def cos_configuration():
    if not required("COS_ENDPOINT").startswith("https://"):
        raise ValueError("Backup transport requires an HTTPS COS endpoint")
    bucket = required("COS_BACKUP_BUCKET")
    prefix = os.getenv("COS_BACKUP_PREFIX", "rcs-postgres-backups").strip("/")
    if not prefix or ".." in prefix.split("/"):
        raise ValueError("Invalid backup prefix")
    from app.storage import create_cos_client
    return create_cos_client(), bucket, prefix


def run_pg(arguments, database_url):
    result = subprocess.run(arguments, env=pg_environment(database_url), capture_output=True)
    if result.returncode:
        # Provider errors and environment details may contain credentials.
        raise RuntimeError(f"{arguments[0]} failed with exit code {result.returncode}; inspect the database configuration securely")
    return result.stdout


def backup():
    database_url = required("DATABASE_URL")
    client, bucket, prefix = cos_configuration()
    started = datetime.now(timezone.utc)
    key = f"{prefix}/{started:%Y/%m/%d}/{started:%H%M%S}-{uuid4()}"
    with tempfile.TemporaryDirectory(prefix="rcs-db-backup-") as temporary:
        dump_path = Path(temporary) / "database.dump"
        run_pg(["pg_dump", "--format=custom", "--no-owner", "--no-privileges", "--file", str(dump_path)], database_url)
        digest = hashlib.sha256(dump_path.read_bytes()).hexdigest()
        client.upload_file(str(dump_path), bucket, f"{key}/database.dump")
        manifest = {"format_version": 1, "scope": "full-postgresql-database",
                    "started_at": started.isoformat(), "completed_at": datetime.now(timezone.utc).isoformat(),
                    "dump_key": f"{key}/database.dump", "sha256": digest,
                    "bytes": dump_path.stat().st_size,
                    "note": "Includes credentials/hashes, cases, runs, calls, audit and evidence references. COS evidence objects require their own retention."}
        client.put_object(Bucket=bucket, Key=f"{key}/manifest.json", Body=json.dumps(manifest).encode(), ContentType="application/json")
    log.info("Full database backup completed; manifest %s/manifest.json", key)
    return f"{key}/manifest.json"


def restore(manifest_key, confirm_empty):
    if not confirm_empty:
        raise ValueError("Restore requires --confirm-empty-target")
    target = required("BACKUP_RESTORE_DATABASE_URL")
    client, bucket, prefix = cos_configuration()
    if not manifest_key.startswith(prefix + "/") or not manifest_key.endswith("/manifest.json"):
        raise ValueError("Manifest must belong to the configured backup prefix")
    engine = create_engine(target)
    with engine.connect() as connection:
        if any(inspect(connection).get_table_names(schema=s) for s in inspect(connection).get_schema_names() if s not in {"pg_catalog", "information_schema"} and not s.startswith("pg_toast")):
            raise ValueError("Restore refused: target contains tables; use an empty recovery database")
    engine.dispose()
    manifest = json.loads(client.get_object(Bucket=bucket, Key=manifest_key)["Body"].read())
    dump_key = manifest["dump_key"]
    if manifest.get("format_version") != 1 or dump_key != manifest_key.removesuffix("manifest.json") + "database.dump":
        raise ValueError("Invalid backup manifest")
    with tempfile.TemporaryDirectory(prefix="rcs-db-restore-") as temporary:
        dump_path = Path(temporary) / "database.dump"
        client.download_file(bucket, dump_key, str(dump_path))
        if hashlib.sha256(dump_path.read_bytes()).hexdigest() != manifest["sha256"]:
            raise ValueError("Backup checksum mismatch")
        run_pg(["pg_restore", "--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges", "--dbname", make_url(target).database, str(dump_path)], target)
    engine = create_engine(target)
    with engine.connect() as connection:
        tables = set(inspect(connection).get_table_names())
        if not {"cases", "audit_logs", "analysis_runs", "governance_log"} <= tables:
            raise RuntimeError("Restore is missing required application tables")
    engine.dispose()
    log.info("Database restore completed; verify row counts, account access and COS references before starting API")


def validate_configuration():
    required("DATABASE_URL")
    for name in ("IBM_CLOUD_API_KEY", "COS_INSTANCE_CRN", "COS_ENDPOINT", "COS_BACKUP_BUCKET"):
        required(name)
    if not required("COS_ENDPOINT").startswith("https://"):
        raise ValueError("Backup transport requires HTTPS")
    hour = int(os.getenv("BACKUP_UTC_HOUR", "0"))
    if not 0 <= hour <= 23:
        raise ValueError("BACKUP_UTC_HOUR must be 0–23")
    return hour


def main():
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate", action="store_true", help="Validate required settings without contacting COS")
    parser.add_argument("--daily", action="store_true", help="Immediate backup then daily at BACKUP_UTC_HOUR (default 0). Requires always-running single instance.")
    parser.add_argument("--restore", metavar="MANIFEST_KEY")
    parser.add_argument("--confirm-empty-target", action="store_true")
    arguments = parser.parse_args()
    if arguments.validate:
        try:
            validate_configuration()
        except (ValueError, RuntimeError) as error:
            raise SystemExit(str(error)) from None
        return
    if arguments.restore:
        restore(arguments.restore, arguments.confirm_empty_target)
        return
    if arguments.daily and os.getenv("RCS_DAILY_BACKUP_ENABLED") != "1":
        raise SystemExit("Daily worker requires RCS_DAILY_BACKUP_ENABLED=1")
    from app.backup_status import write_status
    hour = validate_configuration()
    if arguments.daily:
        write_status(worker_pid=os.getpid())
    while True:
        try:
            backup()
            if arguments.daily:
                write_status(last_success_at=datetime.now(timezone.utc).isoformat(), last_error_type=None)
        except Exception as error:
            log.error("Database backup failed (%s). Recovery point is older until a backup succeeds.", type(error).__name__)
            if arguments.daily:
                write_status(last_failure_at=datetime.now(timezone.utc).isoformat(), last_error_type=type(error).__name__)
                time.sleep(300)  # Retry in five minutes, rather than waiting another day.
                continue
            raise SystemExit(1) from None
        if not arguments.daily:
            return
        current = datetime.now(timezone.utc)
        next_time = current.replace(hour=hour, minute=0, second=0, microsecond=0)
        if next_time <= current:
            next_time += timedelta(days=1)
        time.sleep((next_time - current).total_seconds())


if __name__ == "__main__":
    main()
