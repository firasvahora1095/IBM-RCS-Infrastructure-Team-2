"""A break the Manager approved today shows on that Auditor's overview row as on_break."""
import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Auditor, Base, WellbeingRequest
from app.support import open_request_counts


def session():
    engine = create_engine("sqlite+pysqlite://")
    Base.metadata.create_all(engine)
    db = Session(engine)
    db.add(Auditor(auditor_id="auditor-1", login_hash="x", role="auditor"))
    db.commit()
    return db


def request(request_id, kind, status, resolved_at):
    return WellbeingRequest(
        request_id=request_id, auditor_id="auditor-1", kind=kind, status=status,
        created_at=datetime.now(timezone.utc), resolved_at=resolved_at,
    )


def test_an_approved_break_today_is_on_break():
    db = session()
    db.add(request("R1", "BREAK_REQUEST", "APPROVED", datetime.now(timezone.utc)))
    db.commit()
    assert open_request_counts(db, "auditor-1")["on_break"] is True


def test_open_withdrawn_old_and_talk_requests_are_not_a_break():
    db = session()
    db.add_all([
        request("R1", "BREAK_REQUEST", "OPEN", None),
        request("R2", "BREAK_REQUEST", "WITHDRAWN", datetime.now(timezone.utc)),
        request("R3", "BREAK_REQUEST", "APPROVED", datetime.now(timezone.utc) - timedelta(days=2)),
        request("R4", "TALK_TO_MANAGER", "FOLLOWED_UP", datetime.now(timezone.utc)),
    ])
    db.commit()
    counts = open_request_counts(db, "auditor-1")
    assert counts["on_break"] is False
    assert counts["break_requests"] == 1
