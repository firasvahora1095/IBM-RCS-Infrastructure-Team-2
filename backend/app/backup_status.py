"""Operational backup status, containing no credentials or database URLs."""
import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path


def status_path():
    return Path(os.getenv("BACKUP_STATUS_PATH", "/tmp/rcs-database-backup-status.json"))


def read_status():
    if os.getenv("RCS_DAILY_BACKUP_ENABLED") != "1":
        return {"enabled": False, "status": "DISABLED"}
    try:
        result = json.loads(status_path().read_text())
        if not isinstance(result, dict):
            raise ValueError("Invalid status")
    except (FileNotFoundError, ValueError, OSError):
        return {"enabled": True, "status": "UNKNOWN", "worker_running": False, "last_success_at": None}
    # Explicit projection; a corrupt/edited file must not leak arbitrary content.
    result = {k: result.get(k) for k in ("last_success_at", "last_failure_at", "last_error_type", "worker_pid")}
    try:
        os.kill(int(result.get("worker_pid") or 0), 0)
        running = bool(result.get("worker_pid"))
    except (ValueError, OSError, TypeError):
        running = False
    try:
        success = datetime.fromisoformat(result["last_success_at"]) if result.get("last_success_at") else None
        failure_time = datetime.fromisoformat(result["last_failure_at"]) if result.get("last_failure_at") else None
        if success and success.tzinfo is None or failure_time and failure_time.tzinfo is None:
            raise ValueError("Naive status timestamp")
    except (ValueError, TypeError):
        return {"enabled": True, "status": "UNKNOWN", "worker_running": running, "last_success_at": None}
    overdue = success is None or datetime.now(timezone.utc) - success > timedelta(hours=24)
    failed_latest = failure_time is not None and (success is None or failure_time > success)
    result.pop("worker_pid", None)
    return {**result, "enabled": True, "worker_running": running,
            "status": "DEGRADED" if not running or overdue or failed_latest else "OK"}


def write_status(**values):
    path = status_path()
    try:
        previous = json.loads(path.read_text())
    except (FileNotFoundError, ValueError):
        previous = {}
    previous.update(values)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(previous))
    temporary.replace(path)
