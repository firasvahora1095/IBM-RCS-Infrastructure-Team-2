"""
Seed the database with demo accounts and dummy cases for deployment testing.

Run once after the schema is applied:
    python -m scripts.seed_demo

Safe to re-run — skips rows that already exist.
"""

import sys
from datetime import datetime, timezone

from app.auth import hash_password
from app.db import database_session
from app.models import Auditor, Case


AUDITORS = [
    {"auditor_id": "auditor-01", "role": "auditor", "password": "demo-pass-01"},
    {"auditor_id": "auditor-02", "role": "auditor", "password": "demo-pass-02"},
    {"auditor_id": "auditor-03", "role": "auditor", "password": "demo-pass-03"},
    {"auditor_id": "manager-01", "role": "manager", "password": "demo-mgr-01"},
]

CASES = [
    {
        "case_id": "CASE-DEMO-001",
        "status": "READY_FOR_REVIEW",
        "severity_tier": "S1",
        "watson_severity_score": 20,
        "effective_severity_score": 20,
        "narrative_summary": "Low-severity incident. No significant concerns identified.",
    },
    {
        "case_id": "CASE-DEMO-002",
        "status": "READY_FOR_REVIEW",
        "severity_tier": "S2",
        "watson_severity_score": 45,
        "effective_severity_score": 45,
        "narrative_summary": "Moderate-severity incident requiring standard review.",
    },
    {
        "case_id": "CASE-DEMO-003",
        "status": "READY_FOR_REVIEW",
        "severity_tier": "S3",
        "watson_severity_score": 70,
        "effective_severity_score": 70,
        "narrative_summary": "High-severity incident. Careful review required.",
    },
    {
        "case_id": "CASE-DEMO-004",
        "status": "READY_FOR_REVIEW",
        "severity_tier": "S4",
        "watson_severity_score": 92,
        "effective_severity_score": 92,
        "narrative_summary": "Critical-severity incident. Manager oversight recommended.",
    },
    {
        "case_id": "CASE-DEMO-005",
        "status": "READY_FOR_REVIEW",
        "severity_tier": "S1",
        "watson_severity_score": 15,
        "effective_severity_score": 15,
        "narrative_summary": "Routine review. No escalation needed.",
    },
]


def main() -> None:
    created_auditors = 0
    created_cases = 0

    with database_session() as db:
        for a in AUDITORS:
            if db.get(Auditor, a["auditor_id"]) is None:
                db.add(
                    Auditor(
                        auditor_id=a["auditor_id"],
                        login_hash=hash_password(a["password"]),
                        role=a["role"],
                    )
                )
                created_auditors += 1
            else:
                print(f"  skip (exists): {a['auditor_id']}")

        for c in CASES:
            if db.get(Case, c["case_id"]) is None:
                db.add(
                    Case(
                        case_id=c["case_id"],
                        status=c["status"],
                        severity_tier=c["severity_tier"],
                        watson_severity_score=c["watson_severity_score"],
                        effective_severity_score=c["effective_severity_score"],
                        narrative_summary=c["narrative_summary"],
                        created_at=datetime.now(timezone.utc),
                    )
                )
                created_cases += 1
            else:
                print(f"  skip (exists): {c['case_id']}")

    print(f"\nSeed complete — {created_auditors} auditors, {created_cases} cases created.")
    print("\nDemo accounts:")
    for a in AUDITORS:
        print(f"  {a['auditor_id']} / {a['password']}  ({a['role']})")


if __name__ == "__main__":
    main()
