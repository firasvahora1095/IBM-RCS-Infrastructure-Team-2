"""Manager governance projections exclude raw payloads and wellbeing narratives."""
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import func, select
from app.models import AnalysisRun, GovernanceLogEntry
from app.governance_api import call_payload

SAFE_ACTIONS = {"CASE_CREATED", "CASE_ASSIGNED", "CASE_REASSIGNED", "CASE_RESOLVED",
                "REVIEW_STARTED", "AI_ANALYSIS_STARTED", "AI_ANALYSIS_COMPLETED", "AI_ANALYSIS_FAILED",
                "GOVERNANCE_UPDATED", "CASE_CLOSED_BY_MANAGER", "CASE_DECLINED", "EXCEPTIONAL_ACCESS_RECORDED"}
SAFE_FIELDS = {"status", "assigned_auditor_id", "effective_severity_score", "watson_severity_score",
               "severity_tier", "auditor_severity_score", "auditor_comment", "final_outcome",
               "analysis_run_id", "failure_stage", "failed_frame", "error_type", "frames_completed",
               "frames_received", "model_id", "model_version", "prompt_version", "decision_timestamp",
               "is_override", "ai_auditor_comparison", "entry_id", "prompt_leakage_status", "validation_status"}


def safe_audit_value(value):
    return {k: v for k, v in value.items() if k in SAFE_FIELDS} if isinstance(value, dict) else None


def summary(db, comparisons, *, case_id=None, context="live", leakage=None, from_at=None,
            to_at=None, before=None, limit=25, ai_tier=None, auditor_tier=None, override=None,
            comparison_offset=0):
    query = select(GovernanceLogEntry).where(GovernanceLogEntry.context == context)
    if case_id:
        query = query.where(GovernanceLogEntry.case_id == case_id)
    if leakage:
        query = query.where(GovernanceLogEntry.prompt_leakage_status == leakage)
    if from_at:
        query = query.where(GovernanceLogEntry.at >= from_at)
    if to_at:
        query = query.where(GovernanceLogEntry.at <= to_at)
    if from_at and to_at and from_at > to_at:
        raise HTTPException(422, "Start date must precede end date")
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    failed = db.scalar(select(func.count()).select_from(query.where(GovernanceLogEntry.outcome == "FAILED").subquery()))
    unknown = db.scalar(select(func.count()).select_from(query.where(GovernanceLogEntry.outcome.in_(["STARTED", "OUTCOME_UNKNOWN"])).subquery()))
    if before:
        cursor = db.get(GovernanceLogEntry, before)
        if cursor is None:
            raise HTTPException(422, "Unknown pagination cursor")
        query = query.where((GovernanceLogEntry.at < cursor.at) | ((GovernanceLogEntry.at == cursor.at) & (GovernanceLogEntry.entry_id < cursor.entry_id)))
    found = db.scalars(query.order_by(GovernanceLogEntry.at.desc(), GovernanceLogEntry.entry_id.desc()).limit(limit + 1)).all()
    runs = {r.run_id: r for r in db.scalars(select(AnalysisRun).where(AnalysisRun.run_id.in_([c.run_id for c in found if c.run_id]))).all()}
    compared = []
    for row in comparisons:
        if case_id and row["case_id"] != case_id:
            continue
        if ai_tier and row["ai_tier"] != ai_tier:
            continue
        if auditor_tier and row["final_tier"] != auditor_tier:
            continue
        if override is not None and row["override"] != override:
            continue
        decided = datetime.fromisoformat(row["decided_at"].replace("Z", "+00:00")) if row.get("decided_at") else None
        if from_at and (not decided or decided < from_at):
            continue
        if to_at and (not decided or decided > to_at):
            continue
        compared.append(row)
    patterns = {}
    for row in compared:
        if row["override"]:
            key = (row["ai_tier"], row["final_tier"])
            patterns[key] = patterns.get(key, 0) + 1
    return {"is_placeholder": context == "demo", "context": context,
            "rows": [call_payload(r, runs.get(r.run_id)) for r in found[:limit]],
            "next_before": found[limit - 1].entry_id if len(found) > limit else None,
            "total_calls": total, "failed_calls": failed, "unknown_calls": unknown,
            "averages": {"prompt_leakage": None, "source_attribution": None, "accumulated_score": None},
            "override_patterns": [{"from": k[0], "to": k[1], "count": v} for k, v in sorted(patterns.items(), key=lambda item: -item[1])],
            "legacy_comparisons": sum(r.get("provenance") != "live" for r in compared),
            "compared_cases": len(compared), "comparisons": compared[comparison_offset:comparison_offset + 200],
            "next_comparison_offset": comparison_offset + 200 if len(compared) > comparison_offset + 200 else None}
