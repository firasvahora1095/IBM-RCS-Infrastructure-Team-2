"""Synthetic B2B demo data for the deployed demo database.

Mirrors frontend/src/services/mock/b2bSeed.ts: the CommunityHub customer, about
two months of older completed cases (figures only), one delivery per completed
case, a released and a draft service report, the client user and the
simplified governance call log. A fixed random seed keeps every reset the same;
dates are relative to "now" so the demo always looks current.

Everything here is synthetic. Nothing describes a real person, case or
organisation.
"""

import random
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.b2b import (
    COMMUNITYHUB_ID,
    COMMUNITYHUB_NAME,
    TIMEOUT_REASON,
    UNAVAILABLE_REASON,
    compute_metrics,
    final_tier_of,
    iso,
    report_id_for,
)
from app.models import (
    Case,
    CaseHistory,
    CaseSource,
    ClientMessage,
    ClientUser,
    Delivery,
    GovernanceLogEntry,
    Organisation,
    ReportAccess,
    ServiceReport,
    WellbeingRequest,
)

ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
TIERS = ["S1", "S2", "S3", "S4"]
CLIENT_USER_ID = "ch-user-17"


def _pick(rng: random.Random, weighted: list[tuple]) -> object:
    values, weights = zip(*weighted)
    return rng.choices(values, weights=weights, k=1)[0]


def month_period(today: date, offset: int) -> tuple[str, str]:
    """First and last day of the month `offset` months from `today`'s month."""
    month_index = today.year * 12 + (today.month - 1) + offset
    first = date(month_index // 12, month_index % 12 + 1, 1)
    next_index = month_index + 1
    last = date(next_index // 12, next_index % 12 + 1, 1) - timedelta(days=1)
    return first.isoformat(), last.isoformat()


def _historical_cases(now: datetime, rng: random.Random) -> list[CaseHistory]:
    start_month, _ = month_period(now.date(), -2)
    day = datetime.fromisoformat(start_month).replace(tzinfo=timezone.utc)
    rows: list[CaseHistory] = []
    while day < now - timedelta(days=1):
        for _ in range(_pick(rng, [(0, 2), (1, 4), (2, 3), (3, 1)])):
            created = day + timedelta(hours=8 + rng.random() * 9)
            turnaround = _pick(rng, [
                (20 + rng.random() * 40, 5),
                (60 + rng.random() * 120, 4),
                (180 + rng.random() * 420, 2),
            ])
            completed = created + timedelta(minutes=turnaround)
            if completed >= now - timedelta(hours=1):
                continue
            ai_tier = _pick(rng, [("S1", 35), ("S2", 35), ("S3", 22), ("S4", 8)])
            # Most Auditors confirm the AI tier; some move it one step either way.
            shift = _pick(rng, [(0, 85), (1, 10), (-1, 5)])
            final_tier = TIERS[min(3, max(0, TIERS.index(ai_tier) + shift))]
            violation_chance = {"S1": 0.1, "S2": 0.5, "S3": 0.9, "S4": 0.95}[final_tier]
            outcome = "POLICY_VIOLATION_FOUND" if rng.random() < violation_chance else "NO_VIOLATION_FOUND"
            chars = "".join(rng.choice(ID_ALPHABET) for _ in range(8))
            rows.append(CaseHistory(
                case_id=f"RCS-{chars[:4]}-{chars[4:]}",
                organisation_id=COMMUNITYHUB_ID,
                created_at=created,
                completed_at=completed,
                ai_tier=ai_tier,
                final_tier=final_tier,
                outcome=outcome,
                declined_reassigned=1 if rng.random() < 0.05 else 0,
            ))
        day += timedelta(days=1)
    return sorted(rows, key=lambda h: h.completed_at)


def _attempt(n: int, at: datetime, ok: bool, reason: str | None = None) -> dict:
    return {
        "attempt": n,
        "at": iso(at),
        "result": "SUCCESS" if ok else "FAILED",
        "reason": None if ok else reason,
        "manual": False,
    }


def _delivered(case_id: str, outcome: str, tier: str, completed: datetime, retried: bool) -> Delivery:
    """A delivery that reached CommunityHub, sometimes after one automatic retry."""
    attempts = (
        [
            _attempt(1, completed + timedelta(seconds=2), False, TIMEOUT_REASON),
            _attempt(2, completed + timedelta(seconds=8), True),
        ]
        if retried
        else [_attempt(1, completed + timedelta(seconds=2), True)]
    )
    return Delivery(
        delivery_id=f"DEL-{case_id}",
        case_id=case_id,
        organisation_id=COMMUNITYHUB_ID,
        outcome=outcome,
        final_severity=tier,
        completed_at=completed,
        delivery_status="SUCCESS",
        attempts=attempts,
        simulate_failure=0,
    )


def _needs_attention(delivery: Delivery, reason: str) -> None:
    """Three failed automatic attempts, now waiting for the Manager."""
    completed = delivery.completed_at
    delivery.delivery_status = "NEEDS_ATTENTION"
    delivery.attempts = [
        _attempt(n, completed + timedelta(seconds=2, minutes=5 * (n - 1)), False, reason)
        for n in (1, 2, 3)
    ]
    delivery.failure_reason = reason
    delivery.simulate_failure = 1


def _governance_log(now: datetime, case_ids: list[str], rng: random.Random) -> list[GovernanceLogEntry]:
    entries = []
    recent = case_ids[-24:]
    for i, case_id in enumerate(recent):
        success = i not in (7, 18)
        leakage = 0.9 + rng.random() * 0.09
        attribution = 0.72 + rng.random() * 0.24
        entries.append(GovernanceLogEntry(
            entry_id=f"GOV-{1000 + i}",
            case_id=case_id,
            at=now - timedelta(minutes=(len(recent) - i) * 47),
            model_id="watsonx.ai multimodal vision model",
            model_version="2026-09",
            prompt_version="frame-severity v2" if i < 10 else "frame-severity v3",
            success=1 if success else 0,
            prompt_leakage=round(leakage, 2) if success else 0,
            source_attribution=round(attribution, 2) if success else 0,
            accumulated_score=round((leakage + attribution) / 2, 2) if success else 0,
            tokens_in=1800 + round(rng.random() * 1400),
            tokens_out=220 + round(rng.random() * 260) if success else 0,
            reasoning=(
                "Mock: frame-level analysis returned tags and a severity score with a short reasoning string."
                if success
                else "Mock: the model call timed out; the case was flagged for the AI-failure path."
            ),
        ))
    return entries


def wipe_b2b(db: Session) -> None:
    for model in (
        ClientMessage,
        WellbeingRequest,
        ReportAccess,
        ServiceReport,
        Delivery,
        GovernanceLogEntry,
        CaseHistory,
        CaseSource,
        ClientUser,
        Organisation,
    ):
        db.query(model).delete()
    db.commit()


def seed_b2b(db: Session, now: datetime, live_cases: list[Case], client_password: str) -> dict:
    """Insert the B2B demo story. Call after the live cases are committed."""
    rng = random.Random(2026)

    db.add(Organisation(
        organisation_id=COMMUNITYHUB_ID,
        name=COMMUNITYHUB_NAME,
        description="Social platform · Customer organisation",
        status="READY",
        destination_masked="https://api.communityhub.example/••••••/rcs-results",
        last_tested_at=now - timedelta(hours=3),
    ))
    # Least privilege: each CommunityHub account sees only what its job needs.
    client_hash = hash_password(client_password)
    db.add_all([
        ClientUser(user_id=CLIENT_USER_ID, login_hash=client_hash, display_name="Taylor Brooks",
                   organisation_id=COMMUNITYHUB_ID, role="REPORTS"),
        ClientUser(user_id="ch-mod-04", login_hash=client_hash, display_name="Jordan Kim",
                   organisation_id=COMMUNITYHUB_ID, role="TRUST_SAFETY"),
        ClientUser(user_id="ch-admin-01", login_hash=client_hash, display_name="Sam Rivera",
                   organisation_id=COMMUNITYHUB_ID, role="ADMIN"),
    ])

    history = _historical_cases(now, rng)
    db.add_all(history)

    deliveries = [
        _delivered(h.case_id, h.outcome, h.final_tier, h.completed_at, rng.random() < 0.06)
        for h in history
    ]
    # The newest older results show each handoff state the Manager can meet:
    # one waiting for the Manager, one mid-retry and one about to be sent.
    if len(deliveries) >= 3:
        _needs_attention(deliveries[-1], UNAVAILABLE_REASON)
        retrying = deliveries[-2]
        retrying.delivery_status = "RETRYING"
        retrying.attempts = [{**retrying.attempts[0], "result": "FAILED", "reason": TIMEOUT_REASON}]
        retrying.failure_reason = TIMEOUT_REASON
        retrying.next_attempt_at = now + timedelta(seconds=60)
        pending = deliveries[-3]
        pending.delivery_status = "PENDING"
        pending.attempts = []
        pending.next_attempt_at = now + timedelta(seconds=30)

    # Live cases already completed by an Auditor were handed off too.
    for case in live_cases:
        if case.status != "COMPLETE" or case.completed_at is None:
            continue
        if case.final_outcome not in {"POLICY_VIOLATION_FOUND", "NO_VIOLATION_FOUND"}:
            continue
        deliveries.append(_delivered(
            case.case_id, case.final_outcome, final_tier_of(case) or "S1", case.completed_at, False,
        ))
    # Reports came from CommunityHub posts, so each result carries its post link.
    for i, d in enumerate(deliveries):
        d.source_url = d.source_url or f"https://communityhub.example/post/{3100 + i}"
    # CommunityHub's moderators have dealt with everything except the newest few results.
    delivered = sorted((d for d in deliveries if d.delivery_status == "SUCCESS"), key=lambda d: d.completed_at)
    for i, d in enumerate(delivered[:-4]):
        violation = d.outcome == "POLICY_VIOLATION_FOUND"
        d.platform_action = "REMOVED" if violation else "KEPT"
        d.platform_action_note = "Mock: removed and the account warned." if violation and i % 9 == 0 else None
        d.platform_action_at = d.completed_at + timedelta(minutes=25)
        d.platform_action_by = "ch-mod-04"
    db.add_all(deliveries)
    db.flush()

    today = now.date()
    released_start, released_end = month_period(today, -2)
    draft_start, draft_end = month_period(today, -1)
    previous_month_first = date.fromisoformat(draft_start)
    released_at = datetime(previous_month_first.year, previous_month_first.month, 2, 10, 41, tzinfo=timezone.utc)

    released = ServiceReport(
        report_id=report_id_for(released_start, released_end, 1),
        organisation_id=COMMUNITYHUB_ID,
        period_start=released_start,
        period_end=released_end,
        status="RELEASED",
        version=1,
        generated_at=released_at - timedelta(minutes=50),
        released_at=released_at,
        released_by="manager-01",
        manager_note=(
            "Volumes were steady across the month. A small number of results needed an "
            "automatic retry before CommunityHub received them; all were delivered."
        ),
        metrics=compute_metrics(db, released_start, released_end),
    )
    draft = ServiceReport(
        report_id=report_id_for(draft_start, draft_end, 1),
        organisation_id=COMMUNITYHUB_ID,
        period_start=draft_start,
        period_end=draft_end,
        status="DRAFT",
        version=1,
        generated_at=now - timedelta(hours=2),
        metrics=compute_metrics(db, draft_start, draft_end),
    )
    db.add_all([released, draft])
    db.add_all([
        ReportAccess(
            report_id=released.report_id,
            user_id=CLIENT_USER_ID,
            organisation_id=COMMUNITYHUB_ID,
            action=action,
            access_result="SUCCESS",
            at=released_at + timedelta(hours=26, minutes=minutes),
        )
        for action, minutes in (("VIEW", 0), ("DOWNLOAD", 4))
    ])
    db.add_all(_governance_log(now, [h.case_id for h in history], rng))
    db.add_all([
        ClientMessage(
            message_id="MSG-1001",
            organisation_id=COMMUNITYHUB_ID,
            user_id=CLIENT_USER_ID,
            topic="REPORT_QUESTION",
            report_id=released.report_id,
            subject="What counts as an override?",
            body="Mock: the report lists an override rate. Does that mean RCS changed a decision after review?",
            status="ANSWERED",
            created_at=released_at + timedelta(hours=30),
            seen_at=released_at + timedelta(hours=31),
            reply_body=(
                "Mock: no. An override is when the reviewer's final severity differs from the AI's first "
                "estimate. The reviewer's decision is always final; it's never changed afterwards."
            ),
            reply_at=released_at + timedelta(hours=32),
            reply_by="manager-01",
        ),
        ClientMessage(
            message_id="MSG-1002",
            organisation_id=COMMUNITYHUB_ID,
            user_id=CLIENT_USER_ID,
            topic="DELIVERY_ISSUE",
            subject="One result hasn't reached us",
            body="Mock: our moderation queue is missing a result for a post reported yesterday. Can you check whether it was sent?",
            status="SENT",
            created_at=now - timedelta(minutes=40),
        ),
    ])
    # Support requests the Manager can see on Auditor records (distinct from SOS).
    db.add_all([
        WellbeingRequest(
            request_id="WB-demo0001",
            auditor_id="auditor-03",
            kind="TALK_TO_MANAGER",
            reason="Mock: a few of today's cases have stayed with me. I'd like a quick chat.",
            status="OPEN",
            created_at=now - timedelta(minutes=150),
        ),
        WellbeingRequest(
            request_id="WB-demo0002",
            auditor_id="auditor-03",
            kind="BREAK_REQUEST",
            status="OPEN",
            created_at=now - timedelta(minutes=45),
        ),
        WellbeingRequest(
            request_id="WB-demo0003",
            auditor_id="auditor-02",
            kind="BREAK_REQUEST",
            reason="Mock: back-to-back S3 cases this morning.",
            status="APPROVED",
            created_at=now - timedelta(minutes=95),
            resolved_at=now - timedelta(minutes=88),
        ),
    ])
    db.commit()
    return {
        "history": len(history),
        "deliveries": len(deliveries),
        "released_report": released.report_id,
        "draft_report": draft.report_id,
    }
