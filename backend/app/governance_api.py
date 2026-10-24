"""Trusted ingestion and safe manager projections for the fallback call log."""
import os
import json
from hashlib import sha256
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker
from app.db import get_db
from app.models import AnalysisRun, Case, GovernanceLogEntry
from app.governance_recorder import CallContext, GovernanceRecorder

router = APIRouter()


def manager_dependency():
    from app.main import get_current_manager
    return get_current_manager


def iso(value):
    if value is None:
        return None
    return value.replace(tzinfo=value.tzinfo or timezone.utc).isoformat()


def call_payload(row, run=None):
    return {"entry_id": row.entry_id, "case_id": row.case_id, "run_id": row.run_id,
            "at": iso(row.at), "received_at": iso(row.received_at), "finished_at": iso(row.finished_at),
            "context": row.context, "schema_version": row.schema_version,
            "model_id": row.model_id, "model_version": row.model_version,
            "prompt_version": row.prompt_version, "outcome": row.outcome,
            "validation_status": row.validation_status, "success": bool(row.success) if row.success is not None else None,
            "prompt_leakage_status": row.prompt_leakage_status, "checked_at": iso(row.checked_at),
            "leakage_rule_version": row.leakage_rule_version,
            "prompt_leakage_evidence": row.prompt_leakage_evidence,
            "source_attribution": row.source_attribution or [],
            "accumulated_score": run.accumulated_score if run else None,
            "tokens_in": row.tokens_in, "tokens_out": row.tokens_out,
            "error_type": row.error_type, "frame_num": row.frame_num,
            "source_timestamp": row.source_timestamp}


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class RunInput(StrictInput):
    run_id: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
    case_id: str = Field(min_length=1, max_length=20, pattern=r"^[A-Za-z0-9_-]+$")


class CallInput(StrictInput):
    entry_id: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
    run_id: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
    frame_num: str = Field(pattern=r"^frame-[0-9]{5,}$", max_length=50)
    timestamp: float = Field(ge=0, allow_inf_nan=False)


class ReceiptInput(StrictInput):
    event: Literal["RECEIVED", "OUTCOME_UNKNOWN"]
    # Only provider-owned metadata and content; no client-supplied BA verdicts.
    model_version: str | None = Field(default=None, max_length=100)
    returned_model_id: str | None = Field(default=None, max_length=100)
    provider_request_id: str | None = Field(default=None, max_length=200)
    tokens_in: int | None = Field(default=None, ge=0, le=2147483647)
    tokens_out: int | None = Field(default=None, ge=0, le=2147483647)
    content: str | None = Field(default=None, max_length=64000)


def install_routes(app, require_manager, require_internal_api_key):
    @router.post("/api/internal/governance/runs", dependencies=[Depends(require_internal_api_key)])
    def ingest_run(payload: RunInput, db: Session = Depends(get_db)):
        _uuid(payload.run_id)
        case = db.get(Case, payload.case_id)
        if case is None:
            raise HTTPException(404, "Case not found")
        existing = db.get(AnalysisRun, payload.run_id)
        if existing:
            if existing.case_id != payload.case_id or existing.context != "live":
                raise HTTPException(409, "Run identity conflict")
            return {"run_id": existing.run_id}
        if case.status == "COMPLETE":
            raise HTTPException(409, "Completed cases cannot be analysed")
        db.rollback()  # Release request read transaction before independent write.
        recorder = GovernanceRecorder(sessionmaker(bind=db.get_bind()))
        recorder.start_run(payload.case_id, "live", payload.case_id, payload.run_id)
        return {"run_id": payload.run_id}

    @router.post("/api/internal/governance/calls", dependencies=[Depends(require_internal_api_key)])
    def ingest_call(payload: CallInput, db: Session = Depends(get_db)):
        _uuid(payload.entry_id)
        _uuid(payload.run_id)
        run = db.get(AnalysisRun, payload.run_id)
        if run is None:
            raise HTTPException(404, "Run not found")
        existing = db.get(GovernanceLogEntry, payload.entry_id)
        if existing:
            if (existing.run_id, existing.frame_num, existing.source_timestamp) != (payload.run_id, payload.frame_num, payload.timestamp):
                raise HTTPException(409, "Call identity conflict")
            return {"entry_id": existing.entry_id, "outcome": existing.outcome}
        from app.video_analysis import VISION_ANALYSIS_PROMPT, PROMPT_VERSION
        model = os.getenv("WATSONX_VISION_MODEL_ID")
        if not model:
            raise HTTPException(503, "Vision model is not configured")
        context = CallContext(run.run_id, run.context, run.subject_reference, run.case_id,
                              payload.frame_num, payload.timestamp, PROMPT_VERSION)
        db.rollback()
        recorder = GovernanceRecorder(sessionmaker(bind=db.get_bind()))
        try:
            recorder.start_call(context, model, VISION_ANALYSIS_PROMPT, payload.entry_id)
        except ValueError as error:
            raise HTTPException(409, str(error)) from error
        return {"entry_id": payload.entry_id, "outcome": "STARTED"}

    @router.post("/api/internal/governance/calls/{entry_id}/receipt", dependencies=[Depends(require_internal_api_key)])
    def ingest_receipt(entry_id: str, payload: ReceiptInput, db: Session = Depends(get_db)):
        _uuid(entry_id)
        row = db.get(GovernanceLogEntry, entry_id)
        if row is None:
            raise HTTPException(404, "Call not found")
        digest = sha256(json.dumps(payload.model_dump(), sort_keys=True).encode()).hexdigest()
        needs_leakage_check = row.checked_at is None and row.leakage_rule_version is None
        needs_validation = row.validation_status == "NOT_CHECKED"
        if row.outcome != "STARTED":
            if row.receipt_digest != digest:
                raise HTTPException(409, "Conflicting receipt replay")
            if row.outcome != "RECEIVED":
                return {"entry_id": entry_id, "outcome": row.outcome}
            if not needs_leakage_check and not needs_validation:
                return {"entry_id": entry_id, "outcome": row.outcome}
            # Receipt and checks use separate transactions. An identical replay
            # must resume missing checks after interruption, retaining receipt time.
        from app.video_analysis import VISION_ANALYSIS_PROMPT, parse_watsonx_frame_output
        db.rollback()
        recorder = GovernanceRecorder(sessionmaker(bind=db.get_bind()))
        if payload.event == "OUTCOME_UNKNOWN":
            if any(value is not None for name, value in payload.model_dump().items() if name != "event"):
                raise HTTPException(422, "Unknown outcomes cannot carry response metadata")
            recorder.failed(entry_id, RuntimeError("RemoteOutcomeUnknown"), receipt_digest=digest)
        else:
            recorder.received(entry_id, {"model_version": payload.model_version,
                "model_id": payload.returned_model_id, "id": payload.provider_request_id,
                "usage": {"prompt_tokens": payload.tokens_in, "completion_tokens": payload.tokens_out}}, receipt_digest=digest)
            if payload.content is not None:
                if needs_leakage_check:
                    try:
                        recorder.check_leakage(entry_id, payload.content, VISION_ANALYSIS_PROMPT)
                    except ValueError as error:
                        raise HTTPException(409, str(error)) from error
                if needs_validation:
                    try:
                        parse_watsonx_frame_output(payload.content)
                    except (ValueError, TypeError, KeyError) as error:
                        recorder.invalid(entry_id, error)
            # Content contract parsing alone does not establish persisted attribution.
        return {"entry_id": entry_id, "outcome": payload.event}

    @router.get("/api/manager/governance/calls/{entry_id}")
    def call_detail(entry_id: str, response: Response, _: object = Depends(require_manager), db: Session = Depends(get_db)):
        row = db.get(GovernanceLogEntry, entry_id)
        if row is None:
            raise HTTPException(404, "Call not found")
        response.headers["Cache-Control"] = "no-store"
        return call_payload(row, db.get(AnalysisRun, row.run_id) if row.run_id else None)

    @router.get("/api/manager/governance/cases/{case_id}")
    def case_detail(case_id: str, response: Response, _: object = Depends(require_manager), db: Session = Depends(get_db)):
        case = db.get(Case, case_id)
        if case is None:
            raise HTTPException(404, "Case not found")
        response.headers["Cache-Control"] = "no-store"
        runs = db.scalars(select(AnalysisRun).where(AnalysisRun.case_id == case_id).order_by(AnalysisRun.started_at.desc()).limit(100)).all()
        return {"case_id": case_id, "comparison": case.ai_auditor_comparison,
                "runs": [{"run_id": r.run_id, "status": r.status, "context": r.context,
                          "started_at": iso(r.started_at), "completed_at": iso(r.completed_at),
                          "accumulated_score": r.accumulated_score,
                          "highest_frame": (r.assessment or {}).get("highest_frame"),
                          "severity_tier": (r.assessment or {}).get("severity_tier"),
                          "failure_stage": r.failure_stage, "error_type": r.error_type} for r in runs]}

    app.include_router(router)


def _uuid(value):
    try:
        UUID(value)
    except ValueError as error:
        raise HTTPException(422, "Invalid UUID") from error
