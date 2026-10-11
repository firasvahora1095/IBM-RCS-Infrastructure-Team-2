import io
import json
import os
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite://")
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.auth import session_store
from app.db import get_db
from app.main import app
from app.models import AnalysisRun, AuditLog, Auditor, Base, Case, GovernanceLogEntry
from app.governance_recorder import CallContext, GovernanceRecorder, now
from app.watsonx_image import analyse_image
from app.video_analysis import analyse_video, VISION_ANALYSIS_PROMPT

@pytest.fixture
def database(monkeypatch):
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    with sessions() as db:
        db.add(Auditor(auditor_id="reviewer", login_hash="unused", role="auditor"))
        db.add(Case(case_id="CASE-GOV", status="READY_FOR_REVIEW", assigned_auditor_id="reviewer", effective_severity_score=50, watson_severity_score=20, severity_tier="S2"))
        db.commit()
    monkeypatch.setenv("WATSONX_VISION_MODEL_ID", "test-model")
    monkeypatch.setenv("INTERNAL_API_KEY", "test-internal")
    yield sessions
    engine.dispose()

def context(recorder):
    run_id = recorder.start_run("CASE-GOV", "live", "CASE-GOV")
    return CallContext(run_id, "live", "CASE-GOV", "CASE-GOV", "frame-00000", 0.0, "2.0")

def response(content=None):
    return {"choices": [{"message": {"content": content or json.dumps({"tags": [], "watson_severity_score": 50, "reasoning": "Visible people.", "entities": []})}}], "usage": {"prompt_tokens": 12, "completion_tokens": 15}, "id": "provider-request"}

def invoke(recorder, ctx, client, prompt=VISION_ANALYSIS_PROMPT):
    return analyse_image(io.BytesIO(bytes.fromhex("FF D8 FF") + b"test"), "image/jpeg", prompt, client=client, context=ctx, recorder=recorder)

def test_intent_receipt_and_immutable_replay(database):
    recorder = GovernanceRecorder(database)
    ctx = context(recorder)
    class Client:
        def chat(self, **kwargs):
            with database() as db:
                assert db.scalar(select(GovernanceLogEntry)).outcome == "STARTED"
            return response()
    result = invoke(recorder, ctx, Client())
    call = result["call_id"]
    recorder.received(call, response())
    with pytest.raises(ValueError, match="Conflicting"):
        recorder.received(call, {"model_version": "different"})
    with database() as db:
        row = db.get(GovernanceLogEntry, call)
        assert row.outcome == "RECEIVED" and row.validation_status == "NOT_CHECKED"
        assert row.model_version is None and row.tokens_in == 12
        assert row.prompt_leakage_status == "NOT_DETECTED" and row.source_attribution is None

def test_recording_failure_prevents_dispatch_and_timeout_remains_unknown(database, monkeypatch):
    recorder = GovernanceRecorder(database)
    ctx = context(recorder)
    calls = []
    class Client:
        def chat(self, **kwargs):
            calls.append(1)
            raise TimeoutError("Private provider narrative")
    original = recorder.start_call
    monkeypatch.setattr(recorder, "start_call", lambda *args: (_ for _ in ()).throw(RuntimeError("DB unavailable")))
    with pytest.raises(RuntimeError): invoke(recorder, ctx, Client())
    assert calls == []
    monkeypatch.setattr(recorder, "start_call", original)
    with pytest.raises(TimeoutError): invoke(recorder, ctx, Client())
    with database() as db:
        row = db.scalar(select(GovernanceLogEntry))
        assert row.outcome == "OUTCOME_UNKNOWN" and row.success is None
        assert row.error_type == "TimeoutError" and row.reasoning is None

def test_no_applicable_leakage_rule_and_interrupted_reconciliation(database):
    recorder = GovernanceRecorder(database)
    ctx = context(recorder)
    call = recorder.start_call(ctx, "test-model", "short prompt")
    recorder.received(call, response())
    recorder.check_leakage(call, "text", "short prompt")
    with database() as db: assert db.get(GovernanceLogEntry, call).prompt_leakage_status == "NOT_CHECKED"
    pending = recorder.start_call(ctx, "test-model", VISION_ANALYSIS_PROMPT)
    with database() as db:
        db.get(GovernanceLogEntry, pending).at = now() - timedelta(days=2)
        db.get(AnalysisRun, ctx.run_id).started_at = now() - timedelta(days=2)
        db.commit()
    assert recorder.reconcile() == {"calls": 1, "runs": 1}
    with database() as db: assert db.get(GovernanceLogEntry, pending).outcome == "OUTCOME_UNKNOWN"

def test_malformed_provider_envelope_is_received_but_invalid(database):
    recorder = GovernanceRecorder(database)
    class Client:
        def chat(self, **kwargs): return {"choices": []}
    with pytest.raises(RuntimeError): invoke(recorder, context(recorder), Client())
    with database() as db:
        row = db.scalar(select(GovernanceLogEntry))
        assert row.outcome == "RECEIVED" and row.validation_status == "INVALID"

def test_pipeline_preserves_run_artifacts_and_case_score(database, tmp_path, monkeypatch):
    recorder = GovernanceRecorder(database)
    frame = SimpleNamespace(frame_num=0, timestamp=0.0, source_duration_seconds=1.0, content_type="image/jpeg", as_file=lambda: io.BytesIO(bytes.fromhex("FF D8 FF") + b"test"))
    monkeypatch.setattr("app.video_analysis.iter_frames_from_storage", lambda *a, **kw: iter([frame]))
    class Client:
        def chat(self, **kwargs): return response()
    runs = [analyse_video("CASE-GOV", str(tmp_path / "video.mp4"), client=Client(), recorder=recorder, context="live", persisted_case_id="CASE-GOV") for _ in range(2)]
    assert all(run.status == "completed" for run in runs)
    assert runs[0].output_reference != runs[1].output_reference
    with database() as db:
        assert [r.accumulated_score for r in db.scalars(select(AnalysisRun)).all()] == [50, 50]
        calls = db.scalars(select(GovernanceLogEntry)).all()
        assert len(calls) == 2 and all(c.validation_status == "VALID" for c in calls)
        assert calls[0].source_attribution != calls[1].source_attribution

@pytest.fixture
def client(database):
    def override():
        with database() as db: yield db
    app.dependency_overrides[get_db] = override
    with TestClient(app) as client: yield client
    app.dependency_overrides.clear()
    session_store.clear()

def test_ingestion_auth_validation_and_safe_manager_projection(database, client):
    headers = {"X-Internal-API-Key": "test-internal"}
    run_id, call_id = str(uuid4()), str(uuid4())
    body = {"run_id": run_id, "case_id": "CASE-GOV"}
    assert client.post("/api/internal/governance/runs", json=body).status_code == 401
    assert client.post("/api/internal/governance/runs", json=body, headers=headers).status_code == 200
    assert client.post("/api/internal/governance/runs", json=body, headers=headers).status_code == 200
    payload = {"entry_id": call_id, "run_id": run_id, "frame_num": "frame-00000", "timestamp": 0.0}
    assert client.post("/api/internal/governance/calls", json={**payload, "accumulated_score": 100}, headers=headers).status_code == 422
    assert client.post("/api/internal/governance/calls", json=payload, headers=headers).status_code == 200
    assert client.post(f"/api/internal/governance/calls/{call_id}/receipt", json={"event": "RECEIVED", "content": "private non-JSON response"}, headers=headers).status_code == 200
    assert client.get("/api/manager/governance").status_code == 401
    token, _ = session_store.create("manager", "manager")
    manager = {"Authorization": f"Bearer {token}"}
    data = client.get("/api/manager/governance", headers=manager)
    assert data.headers["Cache-Control"] == "no-store"
    assert data.json()["rows"][0]["validation_status"] == "INVALID"
    assert "private non-JSON" not in data.text
    with database() as db:
        db.add(AuditLog(case_id="CASE-GOV", actor="reviewer", action="WELLBEING_SUPPORT_REQUESTED", after_value={"reason": "private wellbeing narrative"}))
        db.commit()
    history = client.get("/api/manager/audit-logs?case_id=CASE-GOV&governance_only=true", headers=manager)
    assert "wellbeing" not in history.text.lower()
    assert client.post("/api/admin/reseed").status_code == 404

def test_same_tier_override_preserves_raw_and_effective_scores(database, client):
    token, _ = session_store.create("reviewer", "auditor")
    result = client.post("/api/auditor/cases/CASE-GOV/resolve", json={"final_outcome": "POLICY_VIOLATION_FOUND", "auditor_severity_score": 60, "auditor_comment": "Additional visible evidence."}, headers={"Authorization": f"Bearer {token}"})
    assert result.status_code == 200, result.text
    with database() as db:
        comparison = db.get(Case, "CASE-GOV").ai_auditor_comparison
        assert comparison["override"] is True and comparison["score_delta"] == 10
        assert comparison["ai_score"] == 50 and comparison["watson_severity_score"] == 20
        assert comparison["auditor_tier"] == comparison["ai_tier"] == "S2"

def test_receipt_replay_and_naive_date_rejection(database, client):
    recorder = GovernanceRecorder(database)
    ctx = context(recorder)
    call = recorder.start_call(ctx, "test-model", VISION_ANALYSIS_PROMPT)
    headers = {"X-Internal-API-Key": "test-internal"}
    path = f"/api/internal/governance/calls/{call}/receipt"
    payload = {"event": "RECEIVED", "content": "same bounded output"}
    assert client.post(path, headers=headers, json=payload).status_code == 200
    assert client.post(path, headers=headers, json=payload).status_code == 200
    assert client.post(path, headers=headers, json={**payload, "content": "changed"}).status_code == 409
    token, _ = session_store.create("manager", "manager")
    assert client.get("/api/manager/governance?from_at=2026-10-01T00:00:00", headers={"Authorization": f"Bearer {token}"}).status_code == 422


def test_stale_reviewed_run_cannot_resolve_replacement(database, client):
    recorder = GovernanceRecorder(database)
    ctx = context(recorder)
    with database() as db:
        db.get(Case, "CASE-GOV").analysis_run_id = ctx.run_id
        db.commit()
    token, _ = session_store.create("reviewer", "auditor")
    payload = {"final_outcome": "NO_VIOLATION_FOUND", "analysis_run_id": str(uuid4())}
    headers = {"Authorization": f"Bearer {token}"}
    assert client.post("/api/auditor/cases/CASE-GOV/resolve", headers=headers, json=payload).status_code == 409
    payload["analysis_run_id"] = ctx.run_id
    assert client.post("/api/auditor/cases/CASE-GOV/resolve", headers=headers, json=payload).status_code == 200
