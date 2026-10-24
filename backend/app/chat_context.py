"""Context, authorisation and deterministic guardrails for the AI Buddy.

The Buddy is read-only. Everything it may state as fact is gathered here, per
role, before the model is called (docs/ux/ai-buddy-handoff.md):

* Level 2: a handful of small live values for the signed-in person.
* Level 3: one compact case summary, only when a case ID is in the message and
  only if the role may see that case.

Anything the model cannot be told safely (an unknown or unauthorised case, a
message about distress) is handled here, with fixed wording, rather than left
to the model.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Auditor, Case, Delivery
from app.severity import get_severity_tier

# Staff-facing labels, kept in step with frontend/src/design-tokens/statusLabels.ts
# (RT-02). A declined, SOS or cap-reached case still open is shown as Manager Review,
# the same derivation the Manager screens use.
_STAFF_STATUS = {
    "SUBMITTED": "Submitted",
    "AI_PROCESSING": "AI Processing",
    "READY_FOR_REVIEW": "Ready for Review",
    "AUDITOR_REVIEW": "Auditor Review",
    "COMPLETE": "Complete",
    "DECLINED": "Manager Review",
    "SOS_FLAGGED": "Manager Review",
}

_OUTCOME_LABEL = {
    "NO_VIOLATION_FOUND": "No Violation Found",
    "POLICY_VIOLATION_FOUND": "Violation Found",
    "CLOSED_NO_REASSIGNMENT": "Closed without reassignment",
}

NO_VERIFIED_INFO_AUDITOR = (
    "I don't have enough verified information to answer that case-specific question. "
    "Open the case from your queue or contact your Manager."
)
NO_VERIFIED_INFO_MANAGER = (
    "I don't have enough verified information to answer that case-specific question. "
    "Open Case Oversight or check the case ID."
)

# Safety wording is fixed. The Buddy never diagnoses and never replaces SOS.
DISTRESS_NOTE_AUDITOR = (
    "If something you saw is affecting you right now, you can pause and use SOS for unexpected "
    "harmful exposure, or the Wellbeing check-in to ask for a break or to talk to your Manager."
)
CRISIS_NOTE = (
    "If you are in immediate danger, call 000. For urgent emotional support in Australia, "
    "Lifeline is on 13 11 14."
)

_CASE_ID_CANDIDATE = re.compile(r"\b[A-Za-z0-9][A-Za-z0-9-]{5,19}\b")
_DISTRESS = re.compile(
    r"\b(distress\w*|traumati[sz]\w*|can'?t cope|cannot cope|panic\w*|overwhelm\w*|"
    r"want to quit|not okay|struggling|anxious|upset|can'?t stop (seeing|thinking))\b",
    re.IGNORECASE,
)
_CRISIS = re.compile(
    r"\b(suicid\w*|kill myself|end my life|self[- ]?harm\w*|hurt myself|hurting myself)\b",
    re.IGNORECASE,
)


@dataclass
class ChatContext:
    live: dict[str, str | int] = field(default_factory=dict)
    case: dict | None = None
    case_requested: bool = False
    distress: bool = False
    crisis: bool = False
    live_as_of: str = ""
    links: list[dict[str, str]] = field(default_factory=list)

    @property
    def case_unavailable(self) -> bool:
        return self.case_requested and self.case is None


def _utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _final_tier(case: Case) -> str | None:
    if case.auditor_severity_score is not None:
        try:
            return get_severity_tier(int(case.auditor_severity_score))
        except (ValueError, TypeError):
            return None
    # An Auditor who confirms the AI's rating stores no score of their own; the final tier is then the AI's, as on
    # every other screen. Before completion there is no final tier yet.
    if case.status == "COMPLETE":
        return case.severity_tier
    return None


def staff_status(case: Case) -> str:
    if case.manager_flag and case.status != "COMPLETE":
        return "Manager Review"
    return _STAFF_STATUS.get(case.status, case.status)


def find_case_ids(message: str) -> list[str]:
    """Tokens that look like case IDs. Plain words never contain a digit, so they are skipped."""
    seen: list[str] = []
    for token in _CASE_ID_CANDIDATE.findall(message):
        if not any(ch.isdigit() for ch in token):
            continue
        candidate = token.upper()
        if candidate not in seen:
            seen.append(candidate)
    return seen[:3]


def lookup_case(db: Session, role: str, staff_id: str, case_id: str) -> dict | None:
    """Compact case summary for this role, or None when it can't be shown.

    None is returned both for a case that does not exist and for one an Auditor
    isn't assigned to, so the reply never reveals which it was.
    """
    case = db.get(Case, case_id)
    if case is None:
        return None
    if role == "auditor":
        if case.assigned_auditor_id != staff_id:
            return None
        return {
            "case_id": case.case_id,
            "status": staff_status(case),
            "ai_severity": case.severity_tier,
            "final_auditor_severity": _final_tier(case),
            "final_outcome": _OUTCOME_LABEL.get(case.final_outcome or "", None),
        }
    delivery = db.scalar(select(Delivery).where(Delivery.case_id == case.case_id))
    return {
        "case_id": case.case_id,
        "status": staff_status(case),
        "ai_severity": case.severity_tier,
        "final_auditor_severity": _final_tier(case),
        # A case with the Manager (declined, SOS, cap reached) never names who it came from: no
        # per-Auditor scrutiny (MR-CR-04). The status already says it is with the Manager.
        "assigned_auditor": None if case.manager_flag else case.assigned_auditor_id,
        "final_outcome": _OUTCOME_LABEL.get(case.final_outcome or "", None),
        "delivery_status": delivery.delivery_status if delivery else None,
    }


def _auditor_live(db: Session, staff_id: str, now: datetime) -> dict[str, str | int]:
    auditor = db.get(Auditor, staff_id)
    if auditor is None:
        return {}
    limit = auditor.exposure_limit_minutes or 120
    used = round(auditor.exposure_minutes or 0)
    cases = db.scalars(
        select(Case).where(
            Case.assigned_auditor_id == staff_id,
            Case.status.in_(["READY_FOR_REVIEW", "AUDITOR_REVIEW"]),
            Case.manager_flag.is_(None),
        )
    ).all()
    cooldown_end = _utc(auditor.cooldown_ends_at)
    if cooldown_end and cooldown_end > now:
        minutes = max(1, round((cooldown_end - now).total_seconds() / 60))
        cooldown = f"active, about {minutes} min left"
    else:
        cooldown = "none"
    return {
        "your exposure today": f"{used} of {limit} min",
        "your exposure remaining": f"{max(0, limit - used)} min",
        "your daily limit reached": "yes" if used >= limit else "no",
        "your open cases": len(cases),
        "your cases ready for review": sum(1 for c in cases if c.status == "READY_FOR_REVIEW"),
        "your cooldown": cooldown,
    }


def _manager_live(db: Session, now: datetime) -> dict[str, str | int]:
    from app.support import open_support_request_counts, unresolved_sos_auditors

    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    auditors = db.scalars(select(Auditor).where(Auditor.role == "auditor")).all()
    support = open_support_request_counts(db)
    return {
        "open cases": db.scalar(select(func.count()).select_from(Case).where(Case.status != "COMPLETE")) or 0,
        "completed today": db.scalar(
            select(func.count()).select_from(Case).where(Case.status == "COMPLETE", Case.completed_at >= start)
        )
        or 0,
        "cases awaiting reassignment": db.scalar(
            select(func.count()).select_from(Case).where(
                Case.manager_flag.in_(["DECLINED", "CAP_REACHED"]), Case.status != "COMPLETE"
            )
        )
        or 0,
        "open SOS alerts": len(unresolved_sos_auditors(db)),
        "failed deliveries": db.scalar(
            select(func.count()).select_from(Delivery).where(Delivery.delivery_status == "NEEDS_ATTENTION")
        )
        or 0,
        "open break requests": support["break_requests"],
        "open requests to talk": support["talk_requests"],
        "auditors at exposure limit": sum(
            1 for a in auditors if (a.exposure_minutes or 0) >= (a.exposure_limit_minutes or 120)
        ),
    }


def suggest_links(role: str, message: str, case: dict | None) -> list[dict[str, str]]:
    """Where to go next, chosen by fixed rules. The model never writes a URL."""
    text = message.lower()
    links: list[dict[str, str]] = []

    def add(label: str, to: str) -> None:
        if all(link["to"] != to for link in links):
            links.append({"label": label, "to": to})

    if case:
        if role == "manager":
            add("Open case review", f"/manager/cases/{case['case_id']}/review")
        else:
            add("Open case", f"/auditor/cases/{case['case_id']}")
    if role == "manager":
        if re.search(r"reassign|declin", text):
            add("Open Reassignment", "/manager/reassignment")
        if "sos" in text:
            add("Open SOS Inbox", "/manager/sos")
        if re.search(r"deliver|retry|handoff", text):
            add("Open Deliveries", "/manager/deliveries")
        if "report" in text:
            add("Open Reports", "/manager/reports")
        if re.search(r"message|client", text):
            add("Open Client messages", "/manager/messages")
        if re.search(r"exposure|auditor|attention", text):
            add("Open Oversight Dashboard", "/manager")
    else:
        if "cooldown" in text:
            add("Open my cooldown", "/auditor/cooldown")
        if re.search(r"exposure|limit|queue|case|break|check-in|check in|talk", text):
            add("Open my queue", "/auditor")
    return links[:2]


def build_context(db: Session, role: str, staff_id: str, message: str, now: datetime | None = None) -> ChatContext:
    now = now or datetime.now(timezone.utc)
    ctx = ChatContext(live_as_of=now.isoformat(timespec="seconds"))
    ctx.live = _manager_live(db, now) if role == "manager" else _auditor_live(db, staff_id, now)

    ids = find_case_ids(message)
    for case_id in ids:
        summary = lookup_case(db, role, staff_id, case_id)
        if summary:
            ctx.case = summary
            break
    # A message that names something case-ID-shaped but matches no visible case gets the fixed fallback.
    ctx.case_requested = bool(ids)
    ctx.crisis = bool(_CRISIS.search(message))
    ctx.distress = bool(_DISTRESS.search(message)) or ctx.crisis
    ctx.links = suggest_links(role, message, ctx.case)
    return ctx


def no_verified_info(role: str) -> str:
    return NO_VERIFIED_INFO_MANAGER if role == "manager" else NO_VERIFIED_INFO_AUDITOR


def safety_addendum(role: str, ctx: ChatContext) -> str:
    """Fixed wording appended after the model's reply, so it can't be reworded or dropped."""
    parts: list[str] = []
    if ctx.distress and role == "auditor":
        parts.append(DISTRESS_NOTE_AUDITOR)
    if ctx.crisis:
        parts.append(CRISIS_NOTE)
    return "\n\n".join(parts)


def model_context(ctx: ChatContext) -> dict:
    """What the model is shown: live values plus the compact case summary, with gaps spelled out."""
    shown: dict = dict(ctx.live)
    if ctx.case:
        shown["case lookup"] = {k: ("not yet set" if v is None else v) for k, v in ctx.case.items()}
    return shown
