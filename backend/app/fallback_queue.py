"""Fallback queue: the Super Admin Auditor and "Make available to Auditors".

Sprint 3 feedback (extra-features 1.6): a case must never be lost because no
standard Auditor can take it right now, and a fallback reviewer must be able to
see every open case. The rules, kept in one place:

* Visibility is not ownership. `cases.case_visibility` says who may see a case
  in a queue; `cases.assigned_auditor_id` says who owns it. A case can be
  visible to the Super Admin without changing its owner.
* Normal weighted assignment is unchanged and never picks the Super Admin.
* If no standard Auditor is eligible, the case is kept (not rejected), left
  unassigned and visible to the Super Admin only.
* The Super Admin or a Manager can release an unassigned case to standard
  Auditors, who then see queue metadata only and claim it if they are eligible.
* Only the owner can open the full review, so raw content is never exposed by
  visibility alone.
* The Super Admin is still an Auditor for wellbeing: nobody, including them, is
  given a case while in cooldown, at the exposure limit or with an open SOS.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import StaffSession
from app.assignment import maybe_reset_daily_exposure
from app.db import get_db
from app.models import AuditLog, Auditor, Case

ASSIGNED_ONLY = "ASSIGNED_ONLY"
SUPER_ADMIN_ONLY = "SUPER_ADMIN_ONLY"
AVAILABLE_TO_AUDITORS = "AVAILABLE_TO_AUDITORS"

# ---- rules (no HTTP) -------------------------------------------------------


def unavailable_reason(db: Session, auditor: Auditor, now: datetime | None = None) -> str | None:
    """Why this Auditor can't be given a case now, or None. Same three rules as Manager reassignment."""
    now = now or datetime.now(timezone.utc)
    maybe_reset_daily_exposure(db, auditor)
    if float(auditor.exposure_minutes or 0) >= int(auditor.exposure_limit_minutes or 120):
        return "You have reached your daily exposure limit."
    ends_at = auditor.cooldown_ends_at
    if ends_at is not None:
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        if ends_at > now:
            return "You are in a mandatory cooldown."
    open_sos = db.scalar(
        select(Case.case_id).where(Case.assigned_auditor_id == auditor.auditor_id, Case.manager_flag == "SOS").limit(1)
    )
    if open_sos is not None:
        return "You have an open SOS alert."
    return None


def mark_fallback(db: Session, case: Case) -> None:
    """No standard Auditor could take this case: keep it, unowned, visible to the Super Admin only."""
    case.assigned_auditor_id = None
    case.status = "AI_PROCESSING"
    case.case_visibility = SUPER_ADMIN_ONLY
    db.add(
        AuditLog(
            case_id=case.case_id,
            actor="system",
            action="CASE_FALLBACK_QUEUED",
            before_value={"status": "SUBMITTED"},
            after_value={"status": case.status, "case_visibility": SUPER_ADMIN_ONLY, "reason": "no eligible Auditor"},
        )
    )


def queue_row(case: Case) -> dict:
    """Queue metadata only: no thumbnail, narrative, reporter detail or notes."""
    from app.main import _final_severity_tier

    return {
        "case_id": case.case_id,
        "status": case.status,
        "severity_tier": case.severity_tier,
        "final_severity_tier": _final_severity_tier(case),
        "assigned_auditor_id": case.assigned_auditor_id,
        "case_visibility": case.case_visibility,
        "manager_flag": case.manager_flag,
    }


def _get_case(db: Session, case_id: str, *, for_update: bool = False) -> Case:
    from app.main import _case_id_for_lookup

    statement = select(Case).where(Case.case_id == _case_id_for_lookup(case_id))
    if for_update:
        statement = statement.with_for_update()
    case = db.scalar(statement)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


def _assign(db: Session, case: Case, auditor: Auditor, actor: str, via: str) -> None:
    """Give an unowned case to an Auditor. One CASE_ASSIGNED entry, which the weighted selector also reads
    to find who waited longest; `via` records how it was assigned."""
    before = {"assigned_auditor_id": case.assigned_auditor_id, "case_visibility": case.case_visibility, "status": case.status}
    case.assigned_auditor_id = auditor.auditor_id
    case.case_visibility = ASSIGNED_ONLY
    db.add(
        AuditLog(
            case_id=case.case_id,
            actor=actor,
            action="CASE_ASSIGNED",
            before_value=before,
            after_value={
                "assigned_auditor_id": auditor.auditor_id,
                "case_visibility": ASSIGNED_ONLY,
                "status": case.status,
                "via": via,
            },
        )
    )


# ---- endpoints -------------------------------------------------------------


def _require_auditor(session: StaffSession, db: Session) -> Auditor:
    if session.role != "auditor":
        raise HTTPException(status_code=403, detail="Auditor access required")
    auditor = db.get(Auditor, session.staff_id)
    if auditor is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return auditor


def _require_super_admin(session: StaffSession, db: Session) -> Auditor:
    auditor = _require_auditor(session, db)
    if not auditor.is_super_admin:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return auditor




def install_routes(app: FastAPI, get_current_session) -> None:
    """Register the fallback-queue endpoints. `get_current_session` is main's sign-in dependency,
    passed in so this module never imports main at load time."""

    @app.get("/api/auditor/all-cases")
    async def list_all_open_cases(
        session: StaffSession = Depends(get_current_session),
        db: Session = Depends(get_db),
    ):
        """Every open case, for the Super Admin: queue metadata and who owns each one."""
        _require_super_admin(session, db)
        cases = db.scalars(select(Case).where(Case.status != "COMPLETE").order_by(Case.created_at.desc())).all()
        return [queue_row(c) for c in cases]


    @app.get("/api/auditor/available-cases")
    async def list_available_cases(
        session: StaffSession = Depends(get_current_session),
        db: Session = Depends(get_db),
    ):
        """Cases released to standard Auditors to claim, with whether this Auditor can claim now."""
        auditor = _require_auditor(session, db)
        cases = db.scalars(
            select(Case)
            .where(Case.case_visibility == AVAILABLE_TO_AUDITORS, Case.assigned_auditor_id.is_(None), Case.status != "COMPLETE")
            .order_by(Case.created_at.asc())
        ).all()
        reason = unavailable_reason(db, auditor)
        db.commit()  # the daily reset may have been applied
        return {
            "can_claim": reason is None,
            "reason": reason,
            # Metadata only, as the spec requires: no thumbnail, reporter detail or notes.
            "cases": [
                {
                    "case_id": c.case_id,
                    "severity_tier": c.severity_tier,
                    "status": c.status,
                    "ready": c.status == "READY_FOR_REVIEW",
                }
                for c in cases
            ],
        }


    @app.post("/api/auditor/cases/{case_id}/take")
    async def take_case(
        case_id: str,
        session: StaffSession = Depends(get_current_session),
        db: Session = Depends(get_db),
    ):
        """Super Admin takes a case no one owns. A case a standard Auditor already owns goes through the Manager."""
        admin = _require_super_admin(session, db)
        case = _get_case(db, case_id, for_update=True)
        if case.assigned_auditor_id is not None:
            raise HTTPException(status_code=409, detail="This case already has an Auditor. A Manager can reassign it.")
        if case.status == "COMPLETE":
            raise HTTPException(status_code=409, detail="This case is already complete.")
        reason = unavailable_reason(db, admin)
        if reason:
            raise HTTPException(status_code=409, detail=reason)
        _assign(db, case, admin, admin.auditor_id, "CASE_TAKEN_BY_SUPER_ADMIN")
        db.commit()
        return {"taken": True, "case_id": case.case_id}


    @app.post("/api/auditor/cases/{case_id}/claim")
    async def claim_case(
        case_id: str,
        session: StaffSession = Depends(get_current_session),
        db: Session = Depends(get_db),
    ):
        """A standard Auditor claims a case that was made available, if they are eligible right now."""
        auditor = _require_auditor(session, db)
        case = _get_case(db, case_id, for_update=True)
        if case.case_visibility != AVAILABLE_TO_AUDITORS or case.assigned_auditor_id is not None:
            # A claimed, taken or never-released case looks the same, so the answer reveals nothing extra.
            raise HTTPException(status_code=404, detail="Case not found")
        reason = unavailable_reason(db, auditor)
        if reason:
            raise HTTPException(status_code=409, detail=reason)
        _assign(db, case, auditor, auditor.auditor_id, "CASE_CLAIMED")
        db.commit()
        return {"claimed": True, "case_id": case.case_id}


    @app.post("/api/cases/{case_id}/make-available")
    async def make_available(
        case_id: str,
        session: StaffSession = Depends(get_current_session),
        db: Session = Depends(get_db),
    ):
        """Release an unowned case to eligible standard Auditors. Super Admin or Manager only."""
        if session.role == "manager":
            actor = session.staff_id
        else:
            actor = _require_super_admin(session, db).auditor_id
        case = _get_case(db, case_id, for_update=True)
        if case.assigned_auditor_id is not None:
            raise HTTPException(status_code=409, detail="This case already has an Auditor.")
        if case.status == "COMPLETE":
            raise HTTPException(status_code=409, detail="This case is already complete.")
        if case.case_visibility == AVAILABLE_TO_AUDITORS:
            return {"available": True, "case_id": case.case_id}
        before = {"case_visibility": case.case_visibility}
        case.case_visibility = AVAILABLE_TO_AUDITORS
        db.add(
            AuditLog(
                case_id=case.case_id,
                actor=actor,
                action="CASE_MADE_AVAILABLE",
                before_value=before,
                after_value={"case_visibility": AVAILABLE_TO_AUDITORS},
            )
        )
        db.commit()
        return {"available": True, "case_id": case.case_id}
