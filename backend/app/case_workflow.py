"""Small, explicit seams between case creation and later workflow tasks."""

from sqlalchemy.orm import Session

from app.models import AuditLog, Case
from app.orchestrate import AssignmentDecision


def record_case_assignment(
    db: Session,
    case: Case,
    decision: AssignmentDecision,
) -> None:
    """Persist assignment without introducing an ``ASSIGNED`` case state.

    The next task can trigger AI processing immediately after this function and
    then set ``case.status`` to ``AI_PROCESSING``. For this task, the status is
    intentionally left unchanged as ``SUBMITTED``.
    """
    before = {
        "status": case.status,
        "assigned_auditor_id": case.assigned_auditor_id,
    }
    case.assigned_auditor_id = decision.auditor_id
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
