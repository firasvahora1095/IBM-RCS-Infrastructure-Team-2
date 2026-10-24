"""Approved breaks: how long they last, and who is on one right now.

An Auditor asks for a break (a wellbeing request, AR-WB-16). When the Manager approves it, the break starts at that
moment and lasts BREAK_MINUTES, then ends by itself. While it runs the Auditor is given no new cases: not by weighted
assignment, not by claiming or taking a case, and not by Manager reassignment. A case they already hold stays with
them. The length matches the S3 cooldown, the shortest protective pause the product already has. It lives here, and
in frontend/src/design-tokens/breakRules.ts, so the BA can change it in one place each.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import WellbeingRequest

BREAK_MINUTES = 15


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def breaks_in_progress(db: Session, now: datetime | None = None) -> dict[str, datetime]:
    """Auditor id -> when their break ends, for every break still running."""
    now = now or datetime.now(timezone.utc)
    rows = db.scalars(
        select(WellbeingRequest).where(
            WellbeingRequest.kind == "BREAK_REQUEST",
            WellbeingRequest.status == "APPROVED",
            WellbeingRequest.resolved_at.is_not(None),
        )
    ).all()
    running: dict[str, datetime] = {}
    for row in rows:
        ends = _utc(row.resolved_at) + timedelta(minutes=BREAK_MINUTES)
        if ends > now and (row.auditor_id not in running or ends > running[row.auditor_id]):
            running[row.auditor_id] = ends
    return running


def break_ends_at(db: Session, auditor_id: str, now: datetime | None = None) -> datetime | None:
    """When this Auditor's break ends, or None if they are not on one."""
    return breaks_in_progress(db, now).get(auditor_id)


def minutes_left(ends_at: datetime, now: datetime | None = None) -> int:
    """Whole minutes left, rounded up, so "1 minute" shows until the very end."""
    now = now or datetime.now(timezone.utc)
    seconds = max(0.0, (ends_at - now).total_seconds())
    return max(1, int(-(-seconds // 60))) if seconds > 0 else 0
