"""The deployed Super Auditor account moves from `superadmin-01` to `superauditor-01` without losing anything."""
import os
from datetime import datetime, timezone

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.migrations import NEW_SUPER_AUDITOR_ID, OLD_SUPER_AUDITOR_ID, rename_super_auditor
from app.models import AuditLog, Auditor, Base, Case, WellbeingRequest


def make_db():
    engine = create_engine("sqlite+pysqlite://")
    Base.metadata.create_all(engine)
    return engine


def seed(db: Session):
    db.add(Auditor(auditor_id=OLD_SUPER_AUDITOR_ID, login_hash="hash", role="auditor", is_super_admin=True, exposure_minutes=12.5))
    db.add(Auditor(auditor_id="auditor-01", login_hash="hash2", role="auditor"))
    db.add(Case(case_id="OWNED1", status="READY_FOR_REVIEW", assigned_auditor_id=OLD_SUPER_AUDITOR_ID))
    db.add(AuditLog(case_id="OWNED1", actor=OLD_SUPER_AUDITOR_ID, action="CASE_ASSIGNED"))
    db.commit()


def test_renames_the_account_and_keeps_what_it_owns():
    engine = make_db()
    with Session(engine) as db:
        seed(db)
    with engine.begin() as conn:
        assert rename_super_auditor(conn) is True
    with Session(engine) as db:
        assert db.get(Auditor, OLD_SUPER_AUDITOR_ID) is None
        account = db.get(Auditor, NEW_SUPER_AUDITOR_ID)
        assert account.is_super_admin and account.login_hash == "hash" and account.exposure_minutes == 12.5
        assert db.get(Case, "OWNED1").assigned_auditor_id == NEW_SUPER_AUDITOR_ID
        # History is left as written: it records who acted at the time.
        assert db.scalar(select(AuditLog.actor)) == OLD_SUPER_AUDITOR_ID
        assert db.get(Auditor, "auditor-01") is not None


def test_does_nothing_twice_or_when_the_old_account_is_absent():
    engine = make_db()
    with engine.begin() as conn:
        assert rename_super_auditor(conn) is False
    with Session(engine) as db:
        seed(db)
    with engine.begin() as conn:
        assert rename_super_auditor(conn) is True
    with engine.begin() as conn:
        assert rename_super_auditor(conn) is False
