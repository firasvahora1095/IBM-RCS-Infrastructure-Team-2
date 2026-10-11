"""Auditor support requests and the "today" figures the Manager sees.

Mirrors frontend/src/services/mock (requestWellbeingSupport, withdraw, follow
up, getAuditorDetail) so both data sources behave the same:

- A support request is private and separate from SOS. The reason is optional.
- The Auditor can withdraw an OPEN request; the Manager approves a break or
  marks a talk request as followed up. A withdrawn request can't be acted on.
- "Cases today" always counts cases completed since midnight (UTC), the same
  records the Auditor detail lists.
"""

import secrets
from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import StaffSession, session_store
from app.db import get_db
from app.models import AuditLog, Auditor, Case, WellbeingRequest

MAX_REASON_LENGTH = 500
KINDS = {"TALK_TO_MANAGER", "BREAK_REQUEST"}

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


def _utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _iso(value: datetime | None) -> str | None:
    value = _utc(value)
    return value.isoformat() if value else None


def start_of_today(now: datetime | None = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    return datetime.combine(now.date(), time.min, tzinfo=timezone.utc)


def _require(role: str):
    async def dependency(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> StaffSession:
        if credentials is None or credentials.scheme.lower() != "bearer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        session = session_store.get(credentials.credentials)
        if session is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        if session.role != role:
            raise HTTPException(status_code=403, detail=f"{role.capitalize()} access required")
        return session

    return dependency


require_auditor = _require("auditor")
require_manager = _require("manager")


# ---- Shared figures ----------------------------------------------------------


def completed_today(db: Session, auditor_id: str, now: datetime | None = None) -> list[Case]:
    """The Auditor's cases completed today, newest first."""
    since = start_of_today(now)
    cases = db.scalars(
        select(Case).where(
            Case.assigned_auditor_id == auditor_id,
            Case.status == "COMPLETE",
            Case.completed_at.is_not(None),
        )
    ).all()
    today = [c for c in cases if _utc(c.completed_at) >= since]
    return sorted(today, key=lambda c: _utc(c.completed_at), reverse=True)


def request_payload(r: WellbeingRequest) -> dict:
    return {
        "id": r.request_id,
        "kind": r.kind,
        "case_id": r.case_id,
        "created_at": _iso(r.created_at),
        "status": r.status,
        "reason": r.reason,
    }


def requests_for(db: Session, auditor_id: str, since: datetime | None = None) -> list[dict]:
    rows = db.scalars(select(WellbeingRequest).where(WellbeingRequest.auditor_id == auditor_id)).all()
    if since is not None:
        rows = [r for r in rows if _utc(r.created_at) >= since]
    rows = sorted(rows, key=lambda r: _utc(r.created_at), reverse=True)
    return [request_payload(r) for r in rows]


def open_request_counts(db: Session, auditor_id: str) -> dict:
    """Support requests still waiting for the Manager, for the dashboard row."""
    rows = db.scalars(
        select(WellbeingRequest).where(WellbeingRequest.auditor_id == auditor_id, WellbeingRequest.status == "OPEN")
    ).all()
    return {
        "break_requests": sum(1 for r in rows if r.kind == "BREAK_REQUEST"),
        "talk_requests": sum(1 for r in rows if r.kind == "TALK_TO_MANAGER"),
    }


def unresolved_sos_auditors(db: Session) -> list[Auditor]:
    """Auditors whose SOS is still open: it stays open until the Manager's check-in, newest first."""
    return list(
        db.scalars(
            select(Auditor)
            .where(
                Auditor.cooldown_trigger == "SOS",
                Auditor.cooldown_check_in_done == 0,
                Auditor.cooldown_ends_at.is_not(None),
            )
            .order_by(Auditor.cooldown_ends_at.desc())
        ).all()
    )


def open_support_request_counts(db: Session) -> dict:
    """Support requests still waiting for the Manager across all Auditors: breaks to
    approve and requests to talk to follow up. Counted only; never attributed here."""
    rows = db.scalars(select(WellbeingRequest).where(WellbeingRequest.status == "OPEN")).all()
    return {
        "break_requests": sum(1 for r in rows if r.kind == "BREAK_REQUEST"),
        "talk_requests": sum(1 for r in rows if r.kind == "TALK_TO_MANAGER"),
    }


def active_case_counts(db: Session) -> dict[str, int]:
    """Open cases each Auditor is carrying; cases handed to the Manager aren't theirs to work on."""
    counts: dict[str, int] = {}
    for case in db.scalars(
        select(Case).where(
            Case.assigned_auditor_id.is_not(None),
            Case.status != "COMPLETE",
            Case.manager_flag.is_(None),
        )
    ).all():
        counts[case.assigned_auditor_id] = counts.get(case.assigned_auditor_id, 0) + 1
    return counts


def sos_history(db: Session, auditor_id: str, now: datetime | None = None) -> list[dict]:
    """SOS raised in the last 7 days, newest first."""
    since = (now or datetime.now(timezone.utc)) - timedelta(days=7)
    logs = db.scalars(
        select(AuditLog)
        .where(AuditLog.action == "SOS_TRIGGERED", AuditLog.actor == auditor_id)
        .order_by(AuditLog.audit_log_id.desc())
    ).all()
    history = []
    for log in logs:
        if _utc(log.created_at) < since:
            continue
        after = log.after_value or {}
        state = "RESOLVED" if after.get("resolved") else "IN_PROGRESS" if after.get("acknowledged") else "UNACKNOWLEDGED"
        history.append({"id": str(log.audit_log_id), "triggered_at": _iso(log.created_at), "status": state})
    return history


# Earlier clients sent these spellings; they mean the same two requests.
KIND_ALIASES = {"REQUEST_BREAK": "BREAK_REQUEST", "TALK": "TALK_TO_MANAGER"}


def create_request(db: Session, auditor_id: str, kind: str, case_id: str | None, reason: str | None) -> WellbeingRequest:
    kind = KIND_ALIASES.get(kind, kind)
    if kind not in KINDS:
        raise HTTPException(status_code=400, detail="Choose what would help.")
    text = (reason or "").strip()
    if len(text) > MAX_REASON_LENGTH:
        raise HTTPException(status_code=400, detail=f"Keep it under {MAX_REASON_LENGTH} characters.")
    request = WellbeingRequest(
        request_id=f"WB-{secrets.token_hex(4)}",
        auditor_id=auditor_id,
        case_id=case_id,
        kind=kind,
        reason=text or None,
        status="OPEN",
        created_at=datetime.now(timezone.utc),
    )
    db.add(request)
    return request


def _find(db: Session, request_id: str) -> WellbeingRequest:
    request = db.get(WellbeingRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


def resolve_request(db: Session, request_id: str, kind: str, new_status: str) -> None:
    """Manager action: approve a break, or mark a talk request as followed up."""
    request = _find(db, request_id)
    if request.kind != kind:
        raise HTTPException(status_code=404, detail="Request not found")
    if request.status == "WITHDRAWN":
        raise HTTPException(status_code=409, detail="The Auditor withdrew this request.")
    if request.status == "OPEN":
        request.status = new_status
        request.resolved_at = datetime.now(timezone.utc)
    db.commit()


# ---- Endpoints ---------------------------------------------------------------


@router.post("/api/auditor/wellbeing-requests/{request_id}/withdraw")
async def withdraw_request(
    request_id: str,
    auditor: StaffSession = Depends(require_auditor),
    db: Session = Depends(get_db),
):
    request = _find(db, request_id)
    if request.auditor_id != auditor.staff_id:
        raise HTTPException(status_code=404, detail="Request not found")
    if request.status != "OPEN":
        raise HTTPException(status_code=409, detail="Your manager has already responded to this request.")
    request.status = "WITHDRAWN"
    request.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return {"withdrawn": True}


@router.post("/api/manager/wellbeing-requests/{request_id}/follow-up")
async def follow_up_request(
    request_id: str,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    resolve_request(db, request_id, "TALK_TO_MANAGER", "FOLLOWED_UP")
    return {"followed_up": True}


def auditor_exists(db: Session, auditor_id: str) -> Auditor:
    row = db.get(Auditor, auditor_id)
    if row is None or row.role != "auditor":
        raise HTTPException(status_code=404, detail="Auditor not found")
    return row
