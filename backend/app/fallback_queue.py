"""Fallback queue: the Super Auditor and "Make available to Auditors".

Sprint 3 feedback (extra-features 1.6): a case must never be lost because no
standard Auditor can take it right now, and a fallback reviewer must be able to
see every open case. The rules, kept in one place:

* Visibility is not ownership. `cases.case_visibility` says who may see a case
  in a queue; `cases.assigned_auditor_id` says who owns it. A case can be
  visible to the Super Auditor without changing its owner.
* Normal weighted assignment is unchanged and never picks the Super Auditor.
* If no standard Auditor is eligible, the case is kept (not rejected), left
  unassigned and visible to the Super Auditor only.
* The Super Auditor or a Manager can release an unassigned case to standard
  Auditors, who then see queue metadata only and claim it if they are eligible.
* Only the owner can open the full review, so raw content is never exposed by
  visibility alone.
* The Super Auditor is still an Auditor for wellbeing: nobody, including them, is
  given a case while in cooldown, at the exposure limit or with an open SOS.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import StaffSession
from app.assignment import list_assignment_candidates, maybe_reset_daily_exposure, pick_best
from app.breaks import break_ends_at, minutes_left
from app.db import get_db
from app.models import AuditLog, Auditor, Case

ASSIGNED_ONLY = "ASSIGNED_ONLY"
SUPER_ADMIN_ONLY = "SUPER_ADMIN_ONLY"
AVAILABLE_TO_AUDITORS = "AVAILABLE_TO_AUDITORS"

# ---- rules (no HTTP) -------------------------------------------------------


def unavailable_reason(db: Session, auditor: Auditor, now: datetime | None = None) -> str | None:
    """Why this Auditor can't be given a case now, or None. Same rules as Manager reassignment, plus an approved break."""
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
    if _has_open_sos(db, auditor.auditor_id):
        return "You have an open SOS alert."
    ends = break_ends_at(db, auditor.auditor_id, now)
    if ends is not None:
        left = minutes_left(ends, now)
        return f"You are on a break for another {left} minute{'' if left == 1 else 's'}."
    return None


def fallback_hold_minutes() -> int:
    """How long a parked case waits for the Super Auditor before the system places it.

    The team decided on 0: no delay that nobody specified. A case waits safely and is visible to the
    Super Auditor at once; the moment a standard Auditor is eligible it is placed by the weighted rule,
    unless the Super Auditor has already taken it. FALLBACK_HOLD_MINUTES can add a delay if a client
    ever asks for the Super Auditor to have a first look of a stated length.
    """
    try:
        return max(0, int(os.getenv("FALLBACK_HOLD_MINUTES", "0")))
    except ValueError:
        return 0


def _has_open_sos(db: Session, auditor_id: str) -> bool:
    return (
        db.scalar(select(Case.case_id).where(Case.assigned_auditor_id == auditor_id, Case.manager_flag == "SOS").limit(1))
        is not None
    )


def auto_release_at(case: Case) -> datetime | None:
    """When the system will place this case by itself, or None if it never will."""
    if case.fallback_queued_at is None or case.case_visibility != SUPER_ADMIN_ONLY:
        return None
    queued = case.fallback_queued_at
    if queued.tzinfo is None:
        queued = queued.replace(tzinfo=timezone.utc)
    return queued + timedelta(minutes=fallback_hold_minutes())


def release_waiting_cases(db: Session, now: datetime | None = None) -> list[tuple[str, str]]:
    """Place parked cases automatically, so nobody has to click Make available.

    A case the system parked (no standard Auditor was eligible) is placed once its hold has passed
    and a standard Auditor is eligible, using the same ordering and the same wellbeing blocks as
    normal assignment: not in cooldown, under the exposure limit, no open SOS. The Super Auditor is
    never chosen. A case with the Manager, released for claiming, or without a queued time is left
    alone. Returns (case_id, auditor_id) for each case placed; the caller commits.
    """
    now = now or datetime.now(timezone.utc)
    waiting = db.scalars(
        select(Case)
        .where(
            Case.case_visibility == SUPER_ADMIN_ONLY,
            Case.assigned_auditor_id.is_(None),
            Case.manager_flag.is_(None),
            Case.status != "COMPLETE",
            Case.fallback_queued_at.is_not(None),
        )
        .order_by(Case.fallback_queued_at.asc())
        .with_for_update()
    ).all()
    placed: list[tuple[str, str]] = []
    for case in waiting:
        due = auto_release_at(case)
        if due is None or due > now:
            continue
        # Recomputed for every case: each placement changes who is lightest loaded.
        candidates = [c for c in list_assignment_candidates(db) if not _has_open_sos(db, c.auditor_id)]
        if not candidates:
            break
        best = pick_best(candidates)
        auditor = db.get(Auditor, best.auditor_id)
        _assign(db, case, auditor, "system", "AUTO_RELEASE")
        db.flush()
        placed.append((case.case_id, auditor.auditor_id))
    return placed


def mark_fallback(db: Session, case: Case) -> None:
    """No standard Auditor could take this case: keep it, unowned, visible to the Super Auditor only."""
    case.assigned_auditor_id = None
    case.status = "AI_PROCESSING"
    case.case_visibility = SUPER_ADMIN_ONLY
    case.fallback_queued_at = datetime.now(timezone.utc)
    db.add(
        AuditLog(
            case_id=case.case_id,
            actor="system",
            action="CASE_FALLBACK_QUEUED",
            before_value={"status": "SUBMITTED"},
            after_value={
                "status": case.status,
                "case_visibility": SUPER_ADMIN_ONLY,
                "reason": "no eligible Auditor",
                "auto_release_after_minutes": fallback_hold_minutes(),
            },
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
        # A declined, SOS or cap-reached case is with the Manager. Who it came from is never shown here
        # (no per-Auditor scrutiny, MR-CR-04), so the owner is blank and manager_flag says why.
        "assigned_auditor_id": None if case.manager_flag else case.assigned_auditor_id,
        "case_visibility": case.case_visibility,
        "manager_flag": case.manager_flag,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        # When the system will place it by itself; the Super Auditor does not need to act before then.
        "auto_release_at": (auto_release_at(case).isoformat() if auto_release_at(case) else None),
    }


WITH_MANAGER = "This case is waiting for a Manager decision."


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
        raise HTTPException(status_code=403, detail="Super Auditor access required")
    return auditor




def install_routes(app: FastAPI, get_current_session) -> None:
    """Register the fallback-queue endpoints. `get_current_session` is main's sign-in dependency,
    passed in so this module never imports main at load time."""

    @app.get("/api/auditor/all-cases")
    async def list_all_open_cases(
        session: StaffSession = Depends(get_current_session),
        db: Session = Depends(get_db),
    ):
        """Every open case, for the Super Auditor: queue metadata and who owns each one."""
        _require_super_admin(session, db)
        release_waiting_cases(db)
        db.commit()
        cases = db.scalars(select(Case).where(Case.status != "COMPLETE").order_by(Case.created_at.desc())).all()
        return [queue_row(c) for c in cases]


    @app.get("/api/auditor/available-cases")
    async def list_available_cases(
        session: StaffSession = Depends(get_current_session),
        db: Session = Depends(get_db),
    ):
        """Cases released to standard Auditors to claim, with whether this Auditor can claim now."""
        auditor = _require_auditor(session, db)
        release_waiting_cases(db)
        cases = db.scalars(
            select(Case)
            .where(
                Case.case_visibility == AVAILABLE_TO_AUDITORS,
                Case.assigned_auditor_id.is_(None),
                Case.manager_flag.is_(None),
                Case.status != "COMPLETE",
            )
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
        """Super Auditor takes a case no one owns. A case a standard Auditor already owns goes through the Manager."""
        admin = _require_super_admin(session, db)
        case = _get_case(db, case_id, for_update=True)
        if case.manager_flag:
            raise HTTPException(status_code=409, detail=WITH_MANAGER)
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
        if case.case_visibility != AVAILABLE_TO_AUDITORS or case.assigned_auditor_id is not None or case.manager_flag:
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
        """Release an unowned case to eligible standard Auditors. Super Auditor or Manager only."""
        if session.role == "manager":
            actor = session.staff_id
        else:
            actor = _require_super_admin(session, db).auditor_id
        case = _get_case(db, case_id, for_update=True)
        if case.manager_flag:
            raise HTTPException(status_code=409, detail=WITH_MANAGER)
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
