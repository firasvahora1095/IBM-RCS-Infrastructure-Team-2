"""B2B flow: customer integration, case result handoff and client reports.

docs/ux/b2b-end-to-end-flow-spec.md. The rules match the frontend mock
(frontend/src/services/mock/b2b.ts) so both data sources tell the same story:

- Every standard completed case gets exactly one delivery, created when the
  Auditor submits the final decision. The Manager never approves it.
- Delivery status is separate from moderation status. A failed delivery never
  reopens the case; after the automatic attempts it waits for a Manager.
- Reports are aggregate only, calculated from stored records, and a client
  sees one only after a Manager releases it.
- Client access is deny-by-default. Every view or download is logged,
  including refusals, and a refusal looks the same as "not found".

CommunityHub is a simulated customer, so delivery attempts run against a
simulated endpoint. Attempts that have fallen due run whenever deliveries are
read, so progress is visible without a background worker.
"""

import random
import re
import statistics
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api_schemas import StaffRole
from app.auth import DUMMY_PASSWORD_HASH, SessionStore, StaffSession, session_store, verify_password
from app.db import get_db
from app.models import (
    Case,
    CaseHistory,
    CaseSource,
    ClientUser,
    Delivery,
    GovernanceLogEntry,
    Organisation,
    ReportAccess,
    ServiceReport,
)
from app.rate_limit import InvalidLookupRateLimiter
from app.severity import get_severity_tier


COMMUNITYHUB_ID = "COMMUNITYHUB"
COMMUNITYHUB_NAME = "CommunityHub"

FIRST_ATTEMPT_DELAY = timedelta(seconds=4)
RETRY_GAP = timedelta(seconds=6)
MAX_AUTO_ATTEMPTS = 3
TIMEOUT_REASON = "CommunityHub's endpoint didn't respond (timeout)"
UNAVAILABLE_REASON = "CommunityHub's endpoint was unavailable (503)"

MAX_NOTE_LENGTH = 600
# Below this many completed cases a median timing isn't stated.
MIN_CASES_FOR_MEDIAN = 3

DECIDED_OUTCOMES = {"POLICY_VIOLATION_FOUND", "NO_VIOLATION_FOUND"}
DELIVERY_RANK = {"NEEDS_ATTENTION": 0, "RETRYING": 1, "PENDING": 2, "SUCCESS": 3}
TIERS = ("S1", "S2", "S3", "S4")

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)

# Client sessions live in their own store, so a staff token never works on a
# client endpoint and a client token never works on a staff one.
client_session_store = SessionStore()
client_login_limiter = InvalidLookupRateLimiter()


# ---- Time helpers ---------------------------------------------------------


def utc(value: datetime | None) -> datetime | None:
    """SQLite drops tzinfo; every stored time is UTC."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def iso(value: datetime | None) -> str | None:
    value = utc(value)
    return value.isoformat().replace("+00:00", "Z") if value else None


def period_bounds(period_start: str, period_end: str) -> tuple[datetime, datetime]:
    """UTC bounds for an inclusive yyyy-mm-dd period."""
    start = datetime.combine(date.fromisoformat(period_start), time.min, tzinfo=timezone.utc)
    end = datetime.combine(date.fromisoformat(period_end), time.max, tzinfo=timezone.utc)
    return start, end


def report_id_for(period_start: str, period_end: str, version: int) -> str:
    """RPT-CH-2026-09 for a whole month; otherwise both dates."""
    start = date.fromisoformat(period_start)
    end = date.fromisoformat(period_end)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    whole_month = start.day == 1 and end == next_month - timedelta(days=1)
    base = (
        f"RPT-CH-{start.year}-{start.month:02d}"
        if whole_month
        else f"RPT-CH-{period_start.replace('-', '')}-{period_end.replace('-', '')}"
    )
    return f"{base}-v{version}" if version > 1 else base


# ---- Auth -----------------------------------------------------------------


def _not_authenticated() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_manager(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> StaffSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _not_authenticated()
    session = session_store.get(credentials.credentials)
    if session is None:
        raise _not_authenticated()
    if session.role != StaffRole.MANAGER.value:
        raise HTTPException(status_code=403, detail="Manager access required")
    return session


async def require_client(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> ClientUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _not_authenticated()
    session = client_session_store.get(credentials.credentials)
    if session is None:
        raise _not_authenticated()
    user = db.get(ClientUser, session.staff_id)
    if user is None:
        raise _not_authenticated()
    return user


# ---- Case result handoff --------------------------------------------------


def final_tier_of(case: Case) -> str | None:
    """The final human severity: the Auditor's rating, else the AI tier they confirmed."""
    if case.auditor_severity_score is not None:
        return get_severity_tier(case.auditor_severity_score)
    return case.severity_tier


def create_delivery_for_case(db: Session, case: Case, now: datetime) -> Delivery | None:
    """Queue the result handoff for a case the Auditor just completed.

    Idempotent: one delivery per case, whose ID is reused on every retry so the
    customer never processes the same result twice.
    """
    if case.final_outcome not in DECIDED_OUTCOMES:
        return None
    existing = db.scalars(select(Delivery).where(Delivery.case_id == case.case_id)).first()
    if existing is not None:
        return existing
    source = db.get(CaseSource, case.case_id)
    delivery = Delivery(
        delivery_id=f"DEL-{case.case_id}",
        case_id=case.case_id,
        organisation_id=COMMUNITYHUB_ID,
        outcome=case.final_outcome,
        final_severity=final_tier_of(case) or "S1",
        completed_at=case.completed_at or now,
        delivery_status="PENDING",
        attempts=[],
        next_attempt_at=now + FIRST_ATTEMPT_DELAY,
        source_url=source.source_url if source else None,
        simulate_failure=0,
    )
    db.add(delivery)
    return delivery


def _endpoint_available(db: Session, delivery: Delivery) -> bool:
    org = db.get(Organisation, delivery.organisation_id)
    return org is None or org.status == "READY"


def advance_delivery(db: Session, delivery: Delivery, now: datetime) -> None:
    """Run every automatic attempt that has fallen due."""
    attempts = list(delivery.attempts or [])
    changed = False
    while (
        delivery.delivery_status in {"PENDING", "RETRYING"}
        and delivery.next_attempt_at is not None
        and utc(delivery.next_attempt_at) <= now
    ):
        at = utc(delivery.next_attempt_at)
        fails = bool(delivery.simulate_failure) or not _endpoint_available(db, delivery)
        reason = TIMEOUT_REASON if delivery.simulate_failure else UNAVAILABLE_REASON
        attempts.append({
            "attempt": len(attempts) + 1,
            "at": iso(at),
            "result": "FAILED" if fails else "SUCCESS",
            "reason": reason if fails else None,
            "manual": False,
        })
        changed = True
        automatic = sum(1 for a in attempts if not a["manual"])
        if not fails:
            delivery.delivery_status = "SUCCESS"
            delivery.next_attempt_at = None
            delivery.failure_reason = None
        elif automatic >= MAX_AUTO_ATTEMPTS:
            delivery.delivery_status = "NEEDS_ATTENTION"
            delivery.next_attempt_at = None
            delivery.failure_reason = reason
        else:
            delivery.delivery_status = "RETRYING"
            delivery.next_attempt_at = at + RETRY_GAP
            delivery.failure_reason = reason
    if changed:
        # Reassign so the JSON column is marked dirty.
        delivery.attempts = attempts


def advance_deliveries(db: Session, now: datetime) -> list[Delivery]:
    deliveries = db.scalars(select(Delivery)).all()
    for delivery in deliveries:
        advance_delivery(db, delivery, now)
    return list(deliveries)


def public_delivery_confirmed(db: Session, case_id: str) -> bool:
    """The one delivery fact allowed across the public boundary."""
    delivery = db.scalars(select(Delivery).where(Delivery.case_id == case_id)).first()
    if delivery is None:
        return False
    advance_delivery(db, delivery, datetime.now(timezone.utc))
    return delivery.delivery_status == "SUCCESS"


def delivery_health(deliveries: list[Delivery]) -> dict:
    counts = {"success": 0, "pending": 0, "retrying": 0, "needs_attention": 0}
    for d in deliveries:
        counts[d.delivery_status.lower()] += 1
    return counts


def _delivery_payload(d: Delivery, live_case_ids: set[str]) -> dict:
    return {
        "delivery_id": d.delivery_id,
        "case_id": d.case_id,
        "organisation_id": d.organisation_id,
        "outcome": d.outcome,
        "final_severity": d.final_severity,
        "completed_at": iso(d.completed_at),
        "moderation_status": "COMPLETE",
        "delivery_status": d.delivery_status,
        "attempts": list(d.attempts or []),
        "failure_reason": d.failure_reason,
        "next_attempt_at": iso(d.next_attempt_at),
        "escalated_at": iso(d.escalated_at),
        "source_url": d.source_url,
        "case_available": d.case_id in live_case_ids,
    }


def _live_case_ids(db: Session) -> set[str]:
    return set(db.scalars(select(Case.case_id)).all())


def _find_delivery(db: Session, delivery_id: str) -> Delivery:
    delivery = db.get(Delivery, delivery_id)
    if delivery is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return delivery


def _find_organisation(db: Session, organisation_id: str) -> Organisation:
    org = db.get(Organisation, organisation_id.upper())
    if org is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return org


# ---- Report figures -------------------------------------------------------


def _records(db: Session) -> list[dict]:
    history = [
        {
            "created": utc(h.created_at),
            "completed": utc(h.completed_at),
            "ai_tier": h.ai_tier,
            "final_tier": h.final_tier,
            "outcome": h.outcome,
            "declined": bool(h.declined_reassigned),
        }
        for h in db.scalars(select(CaseHistory)).all()
    ]
    live = [
        {
            "created": utc(c.created_at),
            "completed": utc(c.completed_at) if c.status == "COMPLETE" else None,
            "ai_tier": c.severity_tier,
            "final_tier": final_tier_of(c),
            "outcome": c.final_outcome,
            # The live schema records a decline as a manager flag until reassignment.
            "declined": c.manager_flag == "DECLINED",
        }
        for c in db.scalars(select(Case)).all()
    ]
    return history + live


def compute_metrics(db: Session, period_start: str, period_end: str) -> dict:
    """Aggregate figures for one period, calculated only from stored records."""
    start, end = period_bounds(period_start, period_end)
    records = _records(db)

    def in_period(moment: datetime | None) -> bool:
        return moment is not None and start <= moment <= end

    completed = [r for r in records if in_period(r["completed"])]
    decided = [r for r in completed if r["outcome"] in DECIDED_OUTCOMES]
    severity = {tier: 0 for tier in TIERS}
    for r in decided:
        if r["final_tier"] in severity:
            severity[r["final_tier"]] += 1
    comparable = [r for r in decided if r["ai_tier"] and r["final_tier"]]
    overrides = sum(1 for r in comparable if r["ai_tier"] != r["final_tier"])
    minutes = [
        (r["completed"] - r["created"]).total_seconds() / 60
        for r in completed
        if r["created"] is not None and r["completed"] >= r["created"]
    ]
    deliveries = [
        d for d in db.scalars(select(Delivery)).all() if in_period(utc(d.completed_at))
    ]
    return {
        "cases_received": sum(1 for r in records if in_period(r["created"])),
        "cases_completed": len(completed),
        "open_at_end": sum(
            1
            for r in records
            if r["created"] is not None
            and r["created"] <= end
            and (r["completed"] is None or r["completed"] > end)
        ),
        "violation_count": sum(1 for r in decided if r["outcome"] == "POLICY_VIOLATION_FOUND"),
        "no_violation_count": sum(1 for r in decided if r["outcome"] == "NO_VIOLATION_FOUND"),
        "severity_breakdown": severity,
        "median_report_to_decision_minutes": (
            round(statistics.median(minutes)) if len(minutes) >= MIN_CASES_FOR_MEDIAN else None
        ),
        "override_count": overrides,
        "override_rate": overrides / len(comparable) if comparable else 0,
        "declined_reassigned": sum(1 for r in completed if r["declined"]),
        "delivery": delivery_health(deliveries),
    }


def _report_payload(db: Session, report: ServiceReport, *, for_client: bool = False) -> dict:
    org = db.get(Organisation, report.organisation_id)
    return {
        "report_id": report.report_id,
        "organisation_id": report.organisation_id,
        "organisation_name": org.name if org else report.organisation_id,
        "period_start": report.period_start,
        "period_end": report.period_end,
        "status": report.status,
        "version": report.version,
        "generated_at": iso(report.generated_at),
        "released_at": iso(report.released_at),
        # A client never sees staff names.
        "released_by": "RCS" if for_client else report.released_by,
        "manager_note": report.manager_note,
        "metrics": report.metrics,
    }


def _find_report(db: Session, report_id: str) -> ServiceReport:
    report = db.get(ServiceReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


def _report_order(report: ServiceReport) -> tuple:
    return (report.period_start, report.version)


# ---- Request bodies -------------------------------------------------------

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class GenerateReportRequest(BaseModel):
    organisation_id: str = Field(min_length=1, max_length=50)
    period_start: str
    period_end: str


class ClientLoginRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=256)


# ---- Manager: customer integration ---------------------------------------


@router.get("/api/manager/customers/{organisation_id}")
async def get_customer_integration(
    organisation_id: str,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    org = _find_organisation(db, organisation_id)
    deliveries = advance_deliveries(db, datetime.now(timezone.utc))
    db.commit()
    successes = [
        datetime.fromisoformat(a["at"].replace("Z", "+00:00"))
        for d in deliveries
        for a in (d.attempts or [])
        if a["result"] == "SUCCESS"
    ]
    return {
        "organisation_id": org.organisation_id,
        "name": org.name,
        "description": org.description,
        "status": org.status,
        "destination_masked": org.destination_masked,
        "method": "Signed HTTPS callback (JSON)",
        "auth_method": "Shared secret, rotated every 30 days",
        "retry_policy": f"{MAX_AUTO_ATTEMPTS} automatic attempts, then Manager review",
        "idempotency": "One stable delivery ID per case, reused on every retry",
        "last_tested_at": iso(org.last_tested_at),
        "last_delivery_at": iso(max(successes)) if successes else None,
        "health": delivery_health(deliveries),
    }


@router.post("/api/manager/customers/{organisation_id}/test")
async def test_integration(
    organisation_id: str,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    org = _find_organisation(db, organisation_id)
    now = datetime.now(timezone.utc)
    org.last_tested_at = now
    db.commit()
    ok = org.status == "READY"
    return {
        "ok": ok,
        "latency_ms": random.randint(120, 180) if ok else 0,
        "tested_at": iso(now),
        "message": (
            "Test delivery accepted"
            if ok
            else "CommunityHub's endpoint didn't accept the test delivery"
        ),
    }


# ---- Manager: deliveries --------------------------------------------------


@router.get("/api/manager/deliveries")
async def list_deliveries(
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    deliveries = advance_deliveries(db, datetime.now(timezone.utc))
    db.commit()
    live = _live_case_ids(db)
    deliveries.sort(key=lambda d: utc(d.completed_at), reverse=True)
    deliveries.sort(key=lambda d: DELIVERY_RANK[d.delivery_status])
    return [_delivery_payload(d, live) for d in deliveries]


@router.get("/api/manager/deliveries/{delivery_id}")
async def get_delivery(
    delivery_id: str,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    delivery = _find_delivery(db, delivery_id)
    advance_delivery(db, delivery, datetime.now(timezone.utc))
    db.commit()
    return _delivery_payload(delivery, _live_case_ids(db))


@router.post("/api/manager/deliveries/{delivery_id}/retry")
async def retry_delivery(
    delivery_id: str,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    delivery = _find_delivery(db, delivery_id)
    advance_delivery(db, delivery, now)
    # Idempotent: a delivery that already succeeded is never sent twice.
    if delivery.delivery_status != "SUCCESS":
        ok = _endpoint_available(db, delivery)
        attempts = list(delivery.attempts or [])
        attempts.append({
            "attempt": len(attempts) + 1,
            "at": iso(now),
            "result": "SUCCESS" if ok else "FAILED",
            "reason": None if ok else UNAVAILABLE_REASON,
            "manual": True,
        })
        delivery.attempts = attempts
        if ok:
            delivery.delivery_status = "SUCCESS"
            delivery.failure_reason = None
            delivery.next_attempt_at = None
            delivery.simulate_failure = 0
        else:
            delivery.delivery_status = "NEEDS_ATTENTION"
            delivery.failure_reason = UNAVAILABLE_REASON
    db.commit()
    return _delivery_payload(delivery, _live_case_ids(db))


@router.post("/api/manager/deliveries/{delivery_id}/escalate")
async def escalate_delivery(
    delivery_id: str,
    note: str = Body(embed=True, max_length=MAX_NOTE_LENGTH),
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    if not note.strip():
        raise HTTPException(
            status_code=400,
            detail="Add a short note so the integration owner knows what to check.",
        )
    delivery = _find_delivery(db, delivery_id)
    delivery.escalated_at = datetime.now(timezone.utc)
    delivery.escalation_note = note.strip()
    db.commit()
    return {"escalated": True}


# ---- Manager: reports -----------------------------------------------------


@router.get("/api/manager/reports")
async def list_reports(
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    reports = sorted(db.scalars(select(ServiceReport)).all(), key=_report_order, reverse=True)
    return [_report_payload(db, r) for r in reports]


@router.post("/api/manager/reports")
async def generate_report(
    payload: GenerateReportRequest,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    start, end = payload.period_start, payload.period_end
    try:
        valid = bool(
            ISO_DATE.match(start)
            and ISO_DATE.match(end)
            and date.fromisoformat(start) <= date.fromisoformat(end)
        )
    except ValueError:
        valid = False
    if not valid:
        raise HTTPException(status_code=400, detail="Choose a valid reporting period.")
    org = _find_organisation(db, payload.organisation_id)
    now = datetime.now(timezone.utc)
    advance_deliveries(db, now)
    metrics = compute_metrics(db, start, end)
    same_period = db.scalars(
        select(ServiceReport).where(
            ServiceReport.organisation_id == org.organisation_id,
            ServiceReport.period_start == start,
            ServiceReport.period_end == end,
        )
    ).all()
    draft = next((r for r in same_period if r.status == "DRAFT"), None)
    if draft is not None:
        # Regenerating a draft refreshes its figures; the Manager's note stays.
        draft.metrics = metrics
        draft.generated_at = now
        db.commit()
        return _report_payload(db, draft)
    version = max((r.version for r in same_period), default=0) + 1
    report = ServiceReport(
        report_id=report_id_for(start, end, version),
        organisation_id=org.organisation_id,
        period_start=start,
        period_end=end,
        status="DRAFT",
        version=version,
        generated_at=now,
        metrics=metrics,
    )
    db.add(report)
    db.commit()
    return _report_payload(db, report)


@router.get("/api/manager/reports/{report_id}")
async def get_report(
    report_id: str,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    return _report_payload(db, _find_report(db, report_id))


@router.put("/api/manager/reports/{report_id}/note")
async def update_report_note(
    report_id: str,
    note: str = Body(embed=True),
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    if len(note) > MAX_NOTE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Keep the note under {MAX_NOTE_LENGTH} characters.",
        )
    report = _find_report(db, report_id)
    if report.status != "DRAFT":
        raise HTTPException(status_code=409, detail="A released report can't be edited.")
    report.manager_note = note.strip() or None
    db.commit()
    return _report_payload(db, report)


@router.post("/api/manager/reports/{report_id}/release")
async def release_report(
    report_id: str,
    manager: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    report = _find_report(db, report_id)
    if report.status != "RELEASED":
        report.status = "RELEASED"
        report.released_at = datetime.now(timezone.utc)
        report.released_by = manager.staff_id
        db.commit()
    return _report_payload(db, report)


@router.get("/api/manager/reports/{report_id}/access")
async def list_report_access(
    report_id: str,
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    _find_report(db, report_id)
    entries = db.scalars(
        select(ReportAccess)
        .where(ReportAccess.report_id == report_id)
        .order_by(ReportAccess.at.desc(), ReportAccess.access_id.desc())
    ).all()
    return [
        {
            "report_id": e.report_id,
            "user_id": e.user_id,
            "organisation_id": e.organisation_id,
            "action": e.action,
            "access_result": e.access_result,
            "reason": e.reason,
            "at": iso(e.at),
        }
        for e in entries
    ]


# ---- Manager: governance log ---------------------------------------------


def _override_patterns(db: Session) -> tuple[list[dict], int]:
    pairs = [(h.ai_tier, h.final_tier) for h in db.scalars(select(CaseHistory)).all()]
    pairs += [
        (c.severity_tier, final_tier_of(c))
        for c in db.scalars(select(Case).where(Case.status == "COMPLETE")).all()
        if c.severity_tier and final_tier_of(c)
    ]
    pairs = [(a, f) for a, f in pairs if a and f]
    counts: dict[tuple[str, str], int] = {}
    for ai_tier, final_tier in pairs:
        if ai_tier != final_tier:
            counts[(ai_tier, final_tier)] = counts.get((ai_tier, final_tier), 0) + 1
    patterns = [
        {"from": ai_tier, "to": final_tier, "count": count}
        for (ai_tier, final_tier), count in sorted(counts.items(), key=lambda item: -item[1])
    ]
    return patterns, len(pairs)


def _average(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0


@router.get("/api/manager/governance")
async def get_governance_summary(
    _: StaffSession = Depends(require_manager),
    db: Session = Depends(get_db),
):
    rows = db.scalars(select(GovernanceLogEntry).order_by(GovernanceLogEntry.at.desc())).all()
    ok = [r for r in rows if r.success]
    patterns, compared = _override_patterns(db)
    return {
        "is_placeholder": True,
        "rows": [
            {
                "entry_id": r.entry_id,
                "case_id": r.case_id,
                "at": iso(r.at),
                "model_id": r.model_id,
                "model_version": r.model_version,
                "prompt_version": r.prompt_version,
                "success": bool(r.success),
                "prompt_leakage": r.prompt_leakage,
                "source_attribution": r.source_attribution,
                "accumulated_score": r.accumulated_score,
                "tokens_in": r.tokens_in,
                "tokens_out": r.tokens_out,
                "reasoning": r.reasoning,
            }
            for r in rows
        ],
        "averages": {
            "prompt_leakage": _average([r.prompt_leakage for r in ok]),
            "source_attribution": _average([r.source_attribution for r in ok]),
            "accumulated_score": _average([r.accumulated_score for r in ok]),
        },
        "total_calls": len(rows),
        "failed_calls": len(rows) - len(ok),
        "override_patterns": patterns,
        "compared_cases": compared,
    }


# ---- CommunityHub authorised user ----------------------------------------


@router.post("/api/client/login")
async def client_login(payload: ClientLoginRequest, db: Session = Depends(get_db)):
    user_id = payload.user_id.strip().lower()
    key = f"client:{user_id}"
    too_many = HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
    if client_login_limiter.is_locked(key):
        raise too_many
    # A staff account can't sign in here and gets the same answer as a wrong password.
    user = db.get(ClientUser, user_id)
    password_hash = user.login_hash if user is not None else DUMMY_PASSWORD_HASH
    if not verify_password(payload.password, password_hash) or user is None:
        if client_login_limiter.record_failure(key):
            raise too_many
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token, _ = client_session_store.create(user.user_id, "client")
    org = db.get(Organisation, user.organisation_id)
    return {
        "token": token,
        "user_id": user.user_id,
        "display_name": user.display_name,
        "organisation_id": user.organisation_id,
        "organisation_name": org.name if org else user.organisation_id,
    }


@router.get("/api/client/reports")
async def client_list_reports(
    user: ClientUser = Depends(require_client),
    db: Session = Depends(get_db),
):
    reports = db.scalars(
        select(ServiceReport).where(
            ServiceReport.organisation_id == user.organisation_id,
            ServiceReport.status == "RELEASED",
        )
    ).all()
    return [
        _report_payload(db, r, for_client=True)
        for r in sorted(reports, key=_report_order, reverse=True)
    ]


def _authorise_client_report(db: Session, user: ClientUser, report_id: str, action: str) -> ServiceReport:
    """Deny by default: the report must exist, be released and be theirs.

    Every refusal is logged and answered as "not found", so it reveals nothing
    about reports belonging to anyone else.
    """
    report = db.get(ServiceReport, report_id)
    reason = None
    if report is None:
        reason = "REPORT_NOT_FOUND"
    elif report.organisation_id != user.organisation_id:
        reason = "WRONG_ORGANISATION"
    elif report.status != "RELEASED":
        reason = "REPORT_NOT_RELEASED"
    db.add(ReportAccess(
        report_id=report_id[:60],
        user_id=user.user_id,
        organisation_id=user.organisation_id,
        action=action,
        access_result="DENIED" if reason else "SUCCESS",
        reason=reason,
        at=datetime.now(timezone.utc),
    ))
    db.commit()
    if reason:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/api/client/reports/{report_id}")
async def client_get_report(
    report_id: str,
    user: ClientUser = Depends(require_client),
    db: Session = Depends(get_db),
):
    report = _authorise_client_report(db, user, report_id, "VIEW")
    return _report_payload(db, report, for_client=True)


@router.post("/api/client/reports/{report_id}/download")
async def client_record_download(
    report_id: str,
    user: ClientUser = Depends(require_client),
    db: Session = Depends(get_db),
):
    _authorise_client_report(db, user, report_id, "DOWNLOAD")
    return {"recorded": True}
