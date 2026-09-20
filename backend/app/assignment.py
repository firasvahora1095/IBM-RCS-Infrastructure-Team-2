"""Sprint 2 weighted auditor selection used by watsonx Orchestrate.

The backend owns the deterministic scoring rule. In a deployed environment,
watsonx Orchestrate calls the protected selection endpoint and returns the
chosen Auditor to the case-creation workflow.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog, Auditor, Case


DAILY_EXPOSURE_REFERENCE_MINUTES = 120
CASE_COUNT_REFERENCE = 10


class NoEligibleAuditorError(RuntimeError):
    """Raised when there is no Auditor account available for assignment."""


@dataclass(frozen=True)
class AuditorCandidate:
    auditor_id: str
    active_case_count: int
    exposure_minutes: int
    score: float
    last_assigned_at: datetime | None
    last_assignment_sequence: int | None


def calculate_assignment_score(
    *,
    active_case_count: int,
    exposure_minutes: int = 0,
) -> float:
    """Return the approved weighted assignment score.

    Exposure is deliberately passed as zero during Sprint 2 because exposure
    tracking and cooldown eligibility belong to Sprint 3.
    """
    exposure_ratio = exposure_minutes / DAILY_EXPOSURE_REFERENCE_MINUTES
    case_ratio = active_case_count / CASE_COUNT_REFERENCE
    return (0.6 * exposure_ratio) + (0.4 * case_ratio)


def _latest_assignment_events(db: Session) -> dict[str, tuple[datetime, int]]:
    latest: dict[str, tuple[datetime, int]] = {}
    assignment_events = db.execute(
        select(
            AuditLog.after_value,
            AuditLog.created_at,
            AuditLog.audit_log_id,
        )
        .where(AuditLog.action == "CASE_ASSIGNED")
        .order_by(AuditLog.audit_log_id)
    ).all()

    for after_value, created_at, sequence in assignment_events:
        if not isinstance(after_value, dict):
            continue
        auditor_id = after_value.get("assigned_auditor_id")
        if not isinstance(auditor_id, str):
            continue
        # Iteration is ordered, so replacing the entry retains the newest
        # assignment even on databases with coarse timestamp resolution.
        latest[auditor_id] = (created_at, int(sequence))

    return latest


def list_assignment_candidates(db: Session) -> list[AuditorCandidate]:
    """Build candidates from authoritative case and audit data.

    Active counts are derived rather than cached, which keeps this Week 1
    implementation schema-compatible and avoids counters drifting out of sync.
    """
    auditors = db.scalars(
        select(Auditor)
        .where(Auditor.role == "auditor")
        .order_by(Auditor.auditor_id)
    ).all()

    active_counts = dict(
        db.execute(
            select(Case.assigned_auditor_id, func.count(Case.case_id))
            .where(
                Case.assigned_auditor_id.is_not(None),
                Case.status != "COMPLETE",
            )
            .group_by(Case.assigned_auditor_id)
        ).all()
    )
    latest_assignments = _latest_assignment_events(db)

    return [
        AuditorCandidate(
            auditor_id=auditor.auditor_id,
            active_case_count=int(active_counts.get(auditor.auditor_id, 0)),
            exposure_minutes=0,
            score=calculate_assignment_score(
                active_case_count=int(active_counts.get(auditor.auditor_id, 0)),
                exposure_minutes=0,
            ),
            last_assigned_at=(
                latest_assignments[auditor.auditor_id][0]
                if auditor.auditor_id in latest_assignments
                else None
            ),
            last_assignment_sequence=(
                latest_assignments[auditor.auditor_id][1]
                if auditor.auditor_id in latest_assignments
                else None
            ),
        )
        for auditor in auditors
    ]


def select_auditor(db: Session) -> AuditorCandidate:
    """Select the lowest-score Auditor, then the least recently assigned."""
    candidates = list_assignment_candidates(db)
    if not candidates:
        raise NoEligibleAuditorError("No eligible Auditors are available")

    return min(
        candidates,
        key=lambda candidate: (
            candidate.score,
            candidate.last_assignment_sequence is not None,
            candidate.last_assignment_sequence or -1,
            candidate.auditor_id,
        ),
    )
