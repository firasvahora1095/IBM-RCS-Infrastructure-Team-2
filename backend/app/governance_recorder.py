"""Durable invocation intent/receipt recording, independent of case transactions.

A committed intent cannot prove a request was sent, nor whether an interrupted
request completed at IBM. Unknown outcomes remain unknown; no exactly-once claim.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import math
from uuid import uuid4
from sqlalchemy import select
from app.models import AnalysisRun, AuditLog, GovernanceLogEntry
from app.governance_checks import evaluate_prompt_leakage


def now():
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class CallContext:
    run_id: str
    context: str
    subject_reference: str
    case_id: str | None = None
    frame_num: str | None = None
    timestamp: float | None = None
    prompt_version: str = "custom-unversioned"


class GovernanceRecorder:
    def __init__(self, session_factory=None):
        if session_factory is None:
            from app.db import SessionLocal
            session_factory = SessionLocal
        self.sessions = session_factory

    def start_run(self, subject, context="live", case_id=None, run_id=None):
        if context not in {"live", "test"} or (context == "live" and not case_id):
            raise ValueError("Live analysis requires a case; test calls require explicit test context")
        run_id = run_id or str(uuid4())
        with self.sessions() as db:
            db.add(AnalysisRun(run_id=run_id, case_id=case_id, context=context,
                               subject_reference=subject, started_at=now(), status="STARTED"))
            if case_id:
                db.add(AuditLog(case_id=case_id, actor="watsonx-vision", action="AI_ANALYSIS_STARTED",
                                after_value={"analysis_run_id": run_id}))
            db.commit()
        return run_id

    def start_call(self, context: CallContext, model_id, prompt, entry_id=None):
        call_id = entry_id or str(uuid4())
        with self.sessions() as db:
            run = db.get(AnalysisRun, context.run_id)
            if run is None or run.status != "STARTED":
                raise ValueError("Call requires an active persisted analysis run")
            if (run.context, run.case_id, run.subject_reference) != (context.context, context.case_id, context.subject_reference):
                raise ValueError("Call context does not match its analysis run")
            if context.timestamp is not None and context.timestamp < 0:
                raise ValueError("Source timestamp cannot be negative")
            if db.get(GovernanceLogEntry, call_id):
                raise ValueError("Call identity already exists; a retry requires a new call ID")
            db.add(GovernanceLogEntry(entry_id=call_id, case_id=context.case_id, run_id=context.run_id,
                schema_version=2, context=context.context, at=now(), model_id=model_id,
                prompt_version=context.prompt_version, prompt_hash=sha256(prompt.strip().encode()).hexdigest(),
                frame_num=context.frame_num, source_timestamp=context.timestamp,
                outcome="STARTED", validation_status="NOT_CHECKED", prompt_leakage_status="NOT_CHECKED"))
            db.commit()  # Fail closed here: IBM has not been called yet.
        return call_id

    def received(self, call_id, response, receipt_digest=None):
        raw = response if isinstance(response, dict) else {}
        usage = raw.get("usage") if isinstance(raw.get("usage"), dict) else {}
        values = {"received_at": now(), "outcome": "RECEIVED", "success": 1,
                  "model_version": raw.get("model_version"), "returned_model_id": raw.get("model_id") or raw.get("model"),
                  "provider_request_id": raw.get("id")}
        # Direct SDK callers need the same replay protection as HTTP ingestion.
        # Bind the entire provider envelope, including content, without storing it.
        values["receipt_digest"] = receipt_digest or sha256(
            json.dumps(response, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()
        ).hexdigest()
        for field, key in (("tokens_in", "prompt_tokens"), ("tokens_out", "completion_tokens")):
            value = usage.get(key)
            values[field] = value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None
        self._update(call_id, **values)

    def failed(self, call_id, error, receipt_digest=None):
        # Network exceptions (including timeouts) cannot establish remote outcome.
        response = getattr(error, "response", None)
        status_code = getattr(response, "status_code", None)
        known_failure = isinstance(status_code, int) and 400 <= status_code <= 599
        self._update(call_id, outcome="FAILED" if known_failure else "OUTCOME_UNKNOWN", success=0 if known_failure else None,
                     finished_at=now(), error_type=type(error).__name__, receipt_digest=receipt_digest)

    def check_leakage(self, call_id, content, prompt):
        result = evaluate_prompt_leakage(content, prompt)
        self._update(call_id,
                     _expected_prompt_hash=sha256(prompt.strip().encode()).hexdigest(),
                     prompt_leakage_status=result.status,
                     checked_at=now() if result.status != "NOT_CHECKED" else None,
                     leakage_rule_version=result.rule_version,
                     prompt_leakage_evidence=result.evidence)

    def validated(self, call_id, source):
        self._update(call_id, _verify_source=True, validation_status="VALID",
                     source_attribution=[source], finished_at=now())

    def invalid(self, call_id, error):
        self._update(call_id, validation_status="INVALID", error_type=type(error).__name__, finished_at=now())

    def storage_failed(self, call_id, error):
        self._update(call_id, validation_status="STORAGE_FAILED", error_type=type(error).__name__, finished_at=now())

    def _update(self, call_id, *, _expected_prompt_hash=None, _verify_source=False, **values):
        with self.sessions() as db:
            row = db.scalar(select(GovernanceLogEntry).where(GovernanceLogEntry.entry_id == call_id).with_for_update())
            if row is None:
                raise ValueError("Unknown invocation")
            if _expected_prompt_hash is not None and row.prompt_hash != _expected_prompt_hash:
                raise ValueError("Leakage check prompt does not match the dispatched prompt")
            if _verify_source:
                self._verify_source(row, values["source_attribution"][0])
            event_outcome = values.get("outcome")
            if event_outcome is not None and row.outcome != "STARTED":
                substantive = {k: v for k, v in values.items() if k not in {"received_at", "finished_at"}}
                if all(getattr(row, key) == value for key, value in substantive.items()):
                    return  # Exact replay: retain original receipt timestamps and metadata.
                raise ValueError("Conflicting invocation outcome replay")
            if row.outcome not in {"STARTED", "RECEIVED"} and event_outcome is None:
                raise ValueError("Invocation has no received response to evaluate")
            if event_outcome is None and row.outcome != "RECEIVED":
                raise ValueError("Response evaluation requires a received response")
            if "checked_at" in values and row.checked_at is not None:
                substantive = {k: v for k, v in values.items() if k != "checked_at"}
                if all(getattr(row, key) == value for key, value in substantive.items()):
                    return
                raise ValueError("Conflicting leakage check replay")
            if "validation_status" in values and row.validation_status != "NOT_CHECKED":
                substantive = {k: v for k, v in values.items() if k != "finished_at"}
                if all(getattr(row, key) == value for key, value in substantive.items()):
                    return
                raise ValueError("Conflicting validation replay")
            governed = {k: values[k] for k in ("prompt_leakage_status", "validation_status") if k in values}
            before = {k: getattr(row, k) for k in governed}
            for key, value in values.items():
                setattr(row, key, value)
            if governed and row.case_id:
                db.add(AuditLog(case_id=row.case_id, actor="watsonx-vision", action="GOVERNANCE_UPDATED",
                    before_value=before, after_value={"entry_id": row.entry_id, "analysis_run_id": row.run_id, **governed}))
            db.commit()

    @staticmethod
    def _verify_source(row, source):
        """Verify linkage, not whether the model's visual claims are true."""
        if not isinstance(source, dict) or source.get("source_type") != "VIDEO_FRAME":
            raise ValueError("Source must identify a video frame")
        expected = {"frame_num": row.frame_num, "model_id": row.model_id,
                    "model_version": row.model_version, "prompt_version": row.prompt_version}
        if any(source.get(key) != value for key, value in expected.items()):
            raise ValueError("Source does not match invocation frame/model/prompt")
        if row.source_timestamp is None or row.frame_num is None:
            raise ValueError("Source requires a recorded frame and timestamp")
        for key in ("start_timestamp", "end_timestamp"):
            value = source.get(key)
            if (not isinstance(value, (int, float)) or isinstance(value, bool)
                    or not math.isfinite(value) or value != row.source_timestamp):
                raise ValueError("Source timestamp does not match invocation")
        reference = source.get("analysis_output_reference")
        if not isinstance(reference, str) or not reference.strip():
            raise ValueError("Source requires a persisted analysis output reference")

    def finish_run(self, run_id, run):
        with self.sessions() as db:
            row = db.get(AnalysisRun, run_id)
            if row is None or row.status != "STARTED":
                raise ValueError("Run is missing or already completed")
            row.status = run.status.upper()
            row.completed_at = now()
            row.output_reference = run.output_reference
            row.failure_stage = run.failure_stage
            row.error_type = run.error_type
            row.assessment = run.case_analysis
            row.accumulated_score = run.case_analysis["effective_severity_score"] if run.status == "completed" and run.case_analysis else None
            db.commit()

    def reconcile(self, older_than_hours=24):
        """Called explicitly by operations after verifying the worker is absent."""
        with self.sessions() as db:
            cutoff = now() - timedelta(hours=older_than_hours)
            calls = db.scalars(select(GovernanceLogEntry).where(GovernanceLogEntry.outcome == "STARTED", GovernanceLogEntry.at < cutoff)).all()
            for row in calls:
                row.outcome = "OUTCOME_UNKNOWN"
                row.error_type = "InterruptedInvocation"
                row.finished_at = now()
            runs = db.scalars(select(AnalysisRun).where(AnalysisRun.status == "STARTED", AnalysisRun.started_at < cutoff)).all()
            for row in runs:
                row.status = "INTERRUPTED"
                row.completed_at = now()
            db.commit()
            return {"calls": len(calls), "runs": len(runs)}
