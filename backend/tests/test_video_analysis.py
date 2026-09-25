import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.analysis_service import process_case_analysis
from app.analysis_storage import (
    LocalAnalysisOutputStore,
    create_analysis_output_store,
)
from app.models import AuditLog, Base, Case
from app.video_analysis import (
    _build_case_analysis,
    analyse_video,
    parse_watsonx_frame_output,
)


def create_synthetic_video(path: Path, duration_seconds: int, fps: float = 1.0) -> None:
    """Create a tiny harmless AVI whose timeline has a real requested duration."""

    writer = cv2.VideoWriter(
        str(path),
        cv2.VideoWriter_fourcc(*"MJPG"),
        fps,
        (32, 24),
    )
    assert writer.isOpened()
    try:
        for frame_number in range(round(duration_seconds * fps)):
            value = frame_number % 255
            writer.write(np.full((24, 32, 3), value, dtype=np.uint8))
    finally:
        writer.release()


def fake_response(call_number: int, *, tagged: bool = False) -> dict[str, Any]:
    model_output = {
        "tags": ["physical_violence"] if tagged else [],
        "watson_severity_score": 70 + call_number if tagged else 10,
        "reasoning": (
            "Two people appear to be involved in a physical confrontation."
            if tagged
            else "No listed visual harm indicator is visible in this frame."
        ),
        "entities": ["person on the left", "person on the right"] if tagged else [],
    }
    raw_response = {
        "id": f"response-{call_number}",
        "model_version": "test-version",
        "choices": [
            {
                "message": {
                    "content": json.dumps(model_output),
                }
            }
        ],
    }
    return {
        "model": "test-vision-model",
        "analysis": f"```json\n{json.dumps(model_output)}\n```",
        "raw_response": raw_response,
    }


class MemoryOutputStore:
    reference = "memory://analysis-output"

    def __init__(self) -> None:
        self.documents: dict[str, Any] = {}

    def write_json(self, filename: str, payload: Any) -> str:
        self.documents[filename] = payload
        return f"{self.reference}/{filename}"


def test_real_frame_tags_scores_and_raw_responses_are_persisted(tmp_path: Path) -> None:
    video_path = tmp_path / "twelve-seconds.avi"
    create_synthetic_video(video_path, 12, fps=2.0)
    output_store = LocalAnalysisOutputStore(tmp_path / "analysis-output")
    calls = 0

    def fake_analyser(image_file, content_type, prompt, client=None):
        nonlocal calls
        del image_file, content_type, prompt, client
        calls += 1
        return fake_response(calls, tagged=calls >= 2)

    run = analyse_video(
        "CASE-PIPELINE-001",
        str(video_path),
        interval_seconds=5,
        output_store=output_store,
        client=object(),
        analyse_frame=fake_analyser,
    )

    assert run.status == "completed"
    assert calls == 3
    assert run.frames_completed == 3
    assert [frame["frame_num"] for frame in run.frame_results] == [
        "frame-00000",
        "frame-00001",
        "frame-00002",
    ]
    assert run.frame_results[1]["tags"] == ["physical_violence"]
    assert run.frame_results[1]["watson_severity_score"] == 72
    assert run.case_analysis["watson_severity_score"] == 73
    assert run.case_analysis["effective_severity_score"] == 73
    assert run.case_analysis["narrative_summary"] == (
        "AI flagged an S3 visual indicator between 5s and 10s. "
        "AI frame descriptions: At 10s: Two people appear to be involved "
        "in a physical confrontation."
    )
    assert run.case_analysis["flagged_entities"] == [
        {"label": "person on the left", "start": 5.0, "end": 10.0},
        {"label": "person on the right", "start": 5.0, "end": 10.0},
    ]
    assert run.case_analysis["incident_timeline"] == [
        {
            "start": 5.0,
            "end": 10.0,
            "severity_tier": "S3",
            "tag": "physical_violence",
        }
    ]

    raw = json.loads((tmp_path / "analysis-output/frame-00001.raw.json").read_text())
    normalized = json.loads(
        (tmp_path / "analysis-output/frame-00001.analysis.json").read_text()
    )
    saved_case_analysis = json.loads(
        (tmp_path / "analysis-output/case-analysis.json").read_text()
    )
    manifest = json.loads((tmp_path / "analysis-output/manifest.json").read_text())
    assert raw["id"] == "response-2"
    assert "raw_response" not in raw
    assert normalized["tags"] == ["physical_violence"]
    assert normalized["watson_severity_score"] == 72
    assert saved_case_analysis["narrative_summary"] == run.case_analysis["narrative_summary"]
    assert manifest["status"] == "completed"
    assert manifest["frames_completed"] == 3


def test_multiple_tags_produce_worst_tier_timeline_and_template_summary() -> None:
    samples = [
        (0.0, [], 10, "S1", [], "No listed visual indicator is visible."),
        (
            5.0,
            ["physical_violence", "multi_person_conflict"],
            70,
            "S3",
            ["Person on the left", "person on the right"],
            "Two people appear to be in contact.",
        ),
        (
            10.0,
            ["physical_violence"],
            50,
            "S2",
            ["person on the left"],
            "A person appears to move away.",
        ),
        (
            15.0,
            ["weapon_use"],
            90,
            "S4",
            ["knife-like object"],
            "A person appears to hold an object resembling a weapon.",
        ),
        (
            20.0,
            ["weapon_use"],
            70,
            "S3",
            ["Knife-like object"],
            "The object is still visible near a person.",
        ),
    ]
    frames = [
        {
            "case_id": "CASE-AGGREGATION-001",
            "frame_num": f"frame-{index:05d}",
            "timestamp": timestamp,
            "tags": tags,
            "watson_severity_score": score,
            "effective_severity_score": score,
            "severity_tier": tier,
            "reasoning": reasoning,
            "entities": entities,
        }
        for index, (timestamp, tags, score, tier, entities, reasoning) in enumerate(samples)
    ]

    result = _build_case_analysis("CASE-AGGREGATION-001", frames, 5)

    assert result["effective_severity_score"] == 90
    assert result["severity_tier"] == "S4"
    assert result["highest_frame"] == "frame-00003"
    assert result["incident_timeline"] == [
        {"start": 5.0, "end": 5.0, "severity_tier": "S3", "tag": "multi_person_conflict"},
        {"start": 5.0, "end": 10.0, "severity_tier": "S3", "tag": "physical_violence"},
        {"start": 15.0, "end": 20.0, "severity_tier": "S4", "tag": "weapon_use"},
    ]
    assert result["narrative_summary"] == (
        "AI flagged an S4 visual indicator between 15s and 20s. "
        "AI frame descriptions: At 5s: Two people appear to be in contact. "
        "At 15s: A person appears to hold an object resembling a weapon. "
        "At 20s: The object is still visible near a person."
    )
    assert result["flagged_entities"] == [
        {"label": "Person on the left", "start": 5.0, "end": 10.0},
        {"label": "person on the right", "start": 5.0, "end": 5.0},
        {"label": "knife-like object", "start": 15.0, "end": 20.0},
    ]


def test_tagless_high_score_uses_summary_without_inventing_incident() -> None:
    frame = {
        "case_id": "CASE-NO-TAGS-001",
        "frame_num": "frame-00000",
        "timestamp": 2.5,
        "tags": [],
        "watson_severity_score": 86,
        "effective_severity_score": 86,
        "severity_tier": "S4",
        "reasoning": "Model prose is not the template.",
        "entities": [],
    }

    result = _build_case_analysis("CASE-NO-TAGS-001", [frame], 5)

    assert result["severity_tier"] == "S4"
    assert result["incident_timeline"] == []
    assert result["narrative_summary"] == (
        "AI assigned S4 severity at 2.5s without a listed visual tag. "
        "AI frame descriptions: At 2.5s: Model prose is not the template."
    )
    assert result["flagged_entities"] == []


def test_model_failure_returns_handled_state_and_database_fallback(tmp_path: Path) -> None:
    video_path = tmp_path / "failed-run.avi"
    create_synthetic_video(video_path, 8)
    output_store = LocalAnalysisOutputStore(tmp_path / "failed-output")

    def failed_analyser(image_file, content_type, prompt, client=None):
        del image_file, content_type, prompt, client
        raise RuntimeError("simulated watsonx outage")

    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    with Session() as db:
        db.add(
            Case(
                case_id="CASE-FAILURE-001",
                status="AI_PROCESSING",
                video_storage_path=str(video_path),
            )
        )
        db.commit()

        run = process_case_analysis(
            db,
            "CASE-FAILURE-001",
            output_store=output_store,
            client=object(),
            analyse_frame=failed_analyser,
        )

        stored = db.get(Case, "CASE-FAILURE-001")
        audit = db.scalar(
            select(AuditLog).where(AuditLog.case_id == "CASE-FAILURE-001")
        )
        assert run.status == "failed"
        assert run.failure_stage == "watsonx_call"
        assert run.error_type == "RuntimeError"
        assert stored.status == "READY_FOR_REVIEW"
        assert stored.ai_failure == "vision"
        assert stored.watson_severity_score is None
        assert stored.effective_severity_score is None
        assert stored.severity_tier is None
        assert stored.flagged_entities is None
        assert audit.action == "AI_ANALYSIS_FAILED"

    manifest = json.loads((tmp_path / "failed-output/manifest.json").read_text())
    assert manifest["status"] == "failed"
    assert manifest["failure_stage"] == "watsonx_call"
    assert manifest["failed_frame"] == "frame-00000"


def test_malformed_model_content_keeps_raw_response_for_audit(tmp_path: Path) -> None:
    video_path = tmp_path / "malformed-response.avi"
    create_synthetic_video(video_path, 1)
    output_store = LocalAnalysisOutputStore(tmp_path / "malformed-output")

    def malformed_analyser(image_file, content_type, prompt, client=None):
        del image_file, content_type, prompt, client
        return {
            "model": "test-vision-model",
            "analysis": "This is not JSON.",
            "raw_response": {
                "id": "malformed-response-1",
                "choices": [{"message": {"content": "This is not JSON."}}],
            },
        }

    run = analyse_video(
        "CASE-MALFORMED-001",
        str(video_path),
        output_store=output_store,
        client=object(),
        analyse_frame=malformed_analyser,
    )

    assert run.status == "failed"
    assert run.failure_stage == "response_validation"
    raw = json.loads(
        (tmp_path / "malformed-output/frame-00000.raw.json").read_text()
    )
    assert raw["id"] == "malformed-response-1"
    assert not (tmp_path / "malformed-output/frame-00000.analysis.json").exists()


def test_completed_pipeline_updates_case_and_audit_record(tmp_path: Path) -> None:
    video_path = tmp_path / "completed-case.avi"
    create_synthetic_video(video_path, 6)
    output_store = LocalAnalysisOutputStore(tmp_path / "completed-output")
    calls = 0

    def fake_analyser(image_file, content_type, prompt, client=None):
        nonlocal calls
        del image_file, content_type, prompt, client
        calls += 1
        return fake_response(calls, tagged=True)

    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    with Session() as db:
        db.add(
            Case(
                case_id="CASE-SUCCESS-001",
                status="AI_PROCESSING",
                video_storage_path=str(video_path),
            )
        )
        db.commit()

        run = process_case_analysis(
            db,
            "CASE-SUCCESS-001",
            output_store=output_store,
            client=object(),
            analyse_frame=fake_analyser,
        )

        stored = db.get(Case, "CASE-SUCCESS-001")
        audit = db.scalar(
            select(AuditLog).where(AuditLog.case_id == "CASE-SUCCESS-001")
        )
        assert run.status == "completed"
        assert stored.status == "READY_FOR_REVIEW"
        assert stored.ai_failure is None
        assert stored.watson_severity_score == 72
        assert stored.effective_severity_score == 72
        assert stored.severity_tier == "S3"
        assert stored.video_duration_seconds == pytest.approx(6)
        assert stored.analysis_output_path == str(tmp_path / "completed-output")
        assert stored.incident_timeline[0]["start"] == 0
        assert stored.incident_timeline[0]["end"] == 5
        assert stored.narrative_summary == (
            "AI flagged an S3 visual indicator between 0s and 5s. "
            "AI frame descriptions: At 5s: Two people appear to be involved "
            "in a physical confrontation."
        )
        assert stored.flagged_entities == [
            {"label": "person on the left", "start": 0.0, "end": 5.0},
            {"label": "person on the right", "start": 0.0, "end": 5.0},
        ]
        assert audit.action == "AI_ANALYSIS_COMPLETED"


@pytest.mark.parametrize(
    ("duration_seconds", "expected_frames"),
    [(7, 2), (23, 5), (600, 120)],
)
def test_varying_video_durations_preserve_timeline_sampling(
    tmp_path: Path,
    duration_seconds: int,
    expected_frames: int,
) -> None:
    video_path = tmp_path / f"duration-{duration_seconds}.avi"
    create_synthetic_video(video_path, duration_seconds)
    output_store = MemoryOutputStore()
    calls = 0

    def fake_analyser(image_file, content_type, prompt, client=None):
        nonlocal calls
        del image_file, content_type, prompt, client
        calls += 1
        return fake_response(calls)

    run = analyse_video(
        f"DURATION-{duration_seconds}",
        str(video_path),
        interval_seconds=5,
        output_store=output_store,
        client=object(),
        analyse_frame=fake_analyser,
    )

    assert run.status == "completed"
    assert run.video_duration_seconds == pytest.approx(duration_seconds)
    assert run.frames_completed == expected_frames
    assert calls == expected_frames
    assert run.frame_results[-1]["timestamp"] == (expected_frames - 1) * 5
    assert output_store.documents["manifest.json"]["status"] == "completed"


def test_watsonx_output_parser_rejects_non_json_content() -> None:
    with pytest.raises(ValueError, match="not valid JSON"):
        parse_watsonx_frame_output("The score is probably low.")


def test_cos_analysis_output_uses_case_analysis_path() -> None:
    class FakeCosClient:
        def __init__(self) -> None:
            self.requests: list[dict[str, Any]] = []

        def put_object(self, **request: Any) -> None:
            self.requests.append(request)

    client = FakeCosClient()
    store = create_analysis_output_store(
        "cos://evidence-bucket/cases/CASE-COS-001/source.mp4",
        "CASE-COS-001",
        cos_client=client,
    )

    reference = store.write_json("frame-00000.raw.json", {"id": "response-1"})

    assert store.reference == (
        "cos://evidence-bucket/cases/CASE-COS-001/analysis-output"
    )
    assert reference.endswith(
        "/cases/CASE-COS-001/analysis-output/frame-00000.raw.json"
    )
    assert client.requests[0]["Bucket"] == "evidence-bucket"
    assert client.requests[0]["Key"] == (
        "cases/CASE-COS-001/analysis-output/frame-00000.raw.json"
    )
    assert json.loads(client.requests[0]["Body"])["id"] == "response-1"
