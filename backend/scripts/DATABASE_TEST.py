"""Verify the core schema and direct backend read/write access.

The test transaction is rolled back, so no test records remain.
"""

from uuid import uuid4

from sqlalchemy import inspect, select

from app.case_ids import generate_case_id
from app.db import SessionLocal, engine
from app.models import AuditLog, Auditor, Case


EXPECTED_TABLES = {"auditors", "cases", "audit_logs"}


def verify_tables_exist() -> None:
    found_tables = set(inspect(engine).get_table_names(schema="public"))
    missing_tables = EXPECTED_TABLES - found_tables

    if missing_tables:
        missing = ", ".join(sorted(missing_tables))
        raise AssertionError(f"Missing expected tables: {missing}")


def verify_read_write() -> None:
    suffix = uuid4().hex[:12]
    auditor_id = f"smoke-auditor-{suffix}"
    case_id = generate_case_id()

    session = SessionLocal()
    transaction = session.begin()

    try:
        auditor = Auditor(
            auditor_id=auditor_id,
            login_hash="smoke-test-only-not-a-real-password-hash",
            role="auditor",
        )
        session.add(auditor)
        session.flush()

        session.expire_all()
        stored_auditor = session.get(Auditor, auditor_id)
        assert stored_auditor is not None
        assert stored_auditor.role == "auditor"

        case = Case(
            case_id=case_id,
            status="SUBMITTED",
            assigned_auditor_id=auditor_id,
        )
        session.add(case)
        session.flush()

        case.watson_severity_score = 72
        case.effective_severity_score = 72
        case.severity_tier = "S3"
        case.narrative_summary = "Smoke-test placeholder AI summary"
        case.incident_timeline = [
            {"start": 12, "end": 20, "severity_tier": "S3"}
        ]
        case.auditor_severity_score = 72
        case.final_outcome = "NO_VIOLATION_FOUND"
        session.flush()

        session.expire_all()
        stored_case = session.get(Case, case_id)
        assert stored_case is not None
        assert stored_case.assigned_auditor_id == auditor_id
        assert stored_case.watson_severity_score == 72
        assert stored_case.final_outcome == "NO_VIOLATION_FOUND"

        audit_log = AuditLog(
            case_id=case_id,
            actor=auditor_id,
            action="SMOKE_TEST_UPDATE",
            before_value={"status": "SUBMITTED"},
            after_value={"final_outcome": "NO_VIOLATION_FOUND"},
        )
        session.add(audit_log)
        session.flush()

        session.expire_all()
        stored_audit_log = session.execute(
            select(AuditLog).where(
                AuditLog.case_id == case_id,
                AuditLog.action == "SMOKE_TEST_UPDATE",
            )
        ).scalar_one()
        assert stored_audit_log.actor == auditor_id
        assert stored_audit_log.after_value == {
            "final_outcome": "NO_VIOLATION_FOUND"
        }
    finally:
        transaction.rollback()
        session.close()


def main() -> None:
    verify_tables_exist()
    verify_read_write()
    print("PASSED - core tables exist and support direct backend reads/writes")


if __name__ == "__main__":
    main()
