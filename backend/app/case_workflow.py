"""Small, explicit seams between case creation and later workflow tasks."""

from sqlalchemy.orm import Session

from app.models import AuditLog, Case
from app.orchestrate import AssignmentDecision


def record_case_assignment(
    db: Session,
    case: Case,
    decision: AssignmentDecision,
) -> None:
    """Persist assignment and transition the case to AI_PROCESSING (T22/AR-AS-02)."""
    before = {
        "status": case.status,
        "assigned_auditor_id": case.assigned_auditor_id,
    }
    case.assigned_auditor_id = decision.auditor_id
    case.status = "AI_PROCESSING"
    db.add(
        AuditLog(
            case_id=case.case_id,
            actor=decision.audit_actor,
            action="CASE_ASSIGNED",
            before_value=before,
            after_value={
                "status": case.status,
                "assigned_auditor_id": case.assigned_auditor_id,
            },
        )
    )
