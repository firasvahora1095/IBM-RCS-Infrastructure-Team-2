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
from app.severity import build_frame_analysis
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
        "S3 — Potential physical violence\n\n"
        "Around 5–10 seconds, two people appear to be involved "
        "in a physical confrontation.\n\n"
        "Key evidence:\n• Potential physical violence around 5–10 seconds\n\n"
        "Human review is required to confirm the context and final severity."
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
        "S4 — Possible weapon use\n\n"
        "Earlier in the video, two people appear to be in contact. "
        "Around 15–20 seconds, a person appears to hold an object resembling a weapon. "
        "Later in the video, the object is still visible near a person.\n\n"
        "Key evidence:\n"
        "• Possible weapon use around 15–20 seconds\n"
        "• Potential physical violence around 5–10 seconds\n"
        "• Possible group confrontation at approximately 5 seconds\n\n"
        "Human review is required to confirm the context and final severity."
    )
    assert result["flagged_entities"] == [
        {"label": "Person on the left", "start": 5.0, "end": 10.0},
        {"label": "person on the right", "start": 5.0, "end": 5.0},
        {"label": "knife-like object", "start": 15.0, "end": 20.0},
    ]


@pytest.mark.parametrize(("score", "tier"), [(10, "S1"), (50, "S2"), (75, "S3"), (86, "S4")])
def test_tagless_score_uses_summary_without_inventing_incident(score: int, tier: str) -> None:
    frame = {
        "case_id": "CASE-NO-TAGS-001",
        "frame_num": "frame-00000",
        "timestamp": 2.5,
        "tags": [],
        "watson_severity_score": score,
        "effective_severity_score": score,
        "severity_tier": tier,
        "reasoning": "The visible context is unclear.",
        "entities": [],
    }

    result = _build_case_analysis("CASE-NO-TAGS-001", [frame], 5)

    assert result["severity_tier"] == tier
    assert result["incident_timeline"] == []
    assert result["narrative_summary"] == (
        f"{tier} — Context and severity require review\n\n"
        "At approximately 3 seconds, the visible context is unclear.\n\n"
        "Key evidence:\n"
        "• No listed visual concerns were detected in the reviewed footage.\n\n"
        "Human review is required to confirm the context and final severity."
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


def test_completed_pipeline_updates_case_and_audit_record(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    # This test covers vision output persistence. Keep the separate STT service
    # isolated: the harmless synthetic video has no audio track.
    monkeypatch.setattr("app.speech_to_text.extract_audio_wav", lambda data: b"test-audio")
    monkeypatch.setattr("app.speech_to_text.transcribe", lambda audio, media: {"results": []})
    monkeypatch.setattr("app.speech_to_text.extract_audio_intensity", lambda audio: [])
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
            "S3 — Potential physical violence\n\n"
            "Around 0–5 seconds, two people appear to be involved "
            "in a physical confrontation.\n\n"
            "Key evidence:\n• Potential physical violence around 0–5 seconds\n\n"
            "Human review is required to confirm the context and final severity."
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



def summary_frame(
    timestamp: float, tags: list[str], reasoning: str, score: int = 70,
) -> dict[str, Any]:
    return build_frame_analysis(
        model_output={
            "tags": tags,
            "watson_severity_score": score,
            "reasoning": reasoning,
            "entities": [],
        },
        case_id="CASE-SUMMARY",
        frame_num=f"frame-{round(timestamp * 1000):05d}",
        timestamp=timestamp,
        model_id="test-vision-model",
        prompt_version="2.0",
    )


def test_ba_example_keeps_chronology_uncertainty_and_precise_evidence() -> None:
    frames = [
        summary_frame(
            0, ["weapon_present"],
            "Three individuals are seen from behind, dressed in historical military uniforms. "
            "They appear to be carrying rifles, but there is no visible evidence of weapon use or conflict.",
            score=50,
        ),
        summary_frame(
            40.04, ["weapon_use", "physical_violence", "multi_person_conflict"],
            "Multiple individuals appear to be engaged in conflict.",
        ),
        summary_frame(
            50.05, ["weapon_use", "physical_violence", "multi_person_conflict"],
            "The image depicts multiple individuals in historical military attire engaged in a conflict. "
            "Smoke and gunpowder are visible, indicating the use of firearms. "
            "Some individuals appear to be falling or lying on the ground, "
            "suggesting physical violence and potential visible injuries.",
            score=80,
        ),
        summary_frame(
            135.135, ["weapon_present", "multi_person_conflict"],
            "Several individuals are seen in a misty environment, possibly engaged in conflict. "
            "They appear to be holding long objects that could be weapons, but active use is not clearly visible. "
            "The scene suggests a group confrontation.",
            score=50,
        ),
    ]
    originals = json.loads(json.dumps(frames))

    result = _build_case_analysis("CASE-SUMMARY", frames, 10.01)
    summary = result["narrative_summary"]
    narrative = summary.split("\n\n")[1]

    assert summary.startswith("S3 — Possible weapon use\n\n")
    assert "Around 40–50 seconds" in narrative
    assert narrative.index("Earlier in the video") < narrative.index("Around 40–50")
    assert narrative.index("Around 40–50") < narrative.index("Later in the video")
    assert "appear to be carrying rifles" in narrative
    assert "falling or lying on the ground" in narrative
    assert "could be weapons, but active use is not clearly visible" in narrative
    assert 60 <= len(narrative.split()) <= 100
    assert len(narrative.split(". ")) == 3
    assert summary.count("• ") == 3
    assert summary.endswith("Human review is required to confirm the context and final severity.")
    for unwanted in ["40.04", "50.05", "135.135", "frame descriptions", "visual indicator",
                     "reenactment", "props", "staged", "actors", "dead", "AI Confidence"]:
        assert unwanted not in summary
    assert frames == originals
    weapon_incident = next(item for item in result["incident_timeline"] if item["tag"] == "weapon_use")
    assert weapon_incident["start"] == 40.04
    assert weapon_incident["end"] == 50.05


def test_verbose_description_keeps_later_qualification_instead_of_certain_claim() -> None:
    reasoning = (
        "A person is carrying a rifle. "
        + "The background contains several indistinct shapes and areas of shadow " * 10
        + ". The object could be a tool rather than a weapon."
    )
    frame = summary_frame(50.05, ["weapon_present"], reasoning, score=50)

    summary = _build_case_analysis("CASE-SUMMARY", [frame], 5)["narrative_summary"]

    assert summary.startswith("S2 — Possible weapons")
    assert "could be a tool rather than a weapon" in summary
    assert "is carrying a rifle" not in summary
    assert "..." not in summary
    assert "at approximately 50 seconds" in summary


@pytest.mark.parametrize("reasoning", [
    "...",
    "Several people " + "are partly hidden by unclear objects " * 70 + "may be involved in conflict.",
])
def test_unusable_prose_has_concise_cautious_fallback_and_bounded_evidence(reasoning: str) -> None:
    frame = summary_frame(
        40.04,
        ["weapon_present", "weapon_use", "visible_injury", "physical_violence", "multi_person_conflict"],
        reasoning,
    )
    result = _build_case_analysis("CASE-SUMMARY", [frame], 5)
    summary = result["narrative_summary"]
    narrative = summary.split("\n\n")[1]

    assert result["severity_tier"] == "S3"
    assert "suggests possible weapon use" in narrative
    assert len(narrative.split()) < 40
    assert summary.count("• ") == 3
    assert "..." not in summary
    assert "AI Confidence" not in summary
    assert "High" not in summary
