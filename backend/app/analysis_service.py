"""Database integration for the watsonx frame-analysis pipeline."""

from __future__ import annotations

import io
import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog, Case
from app.video_analysis import VideoAnalysisRun, analyse_video

log = logging.getLogger(__name__)


class CaseAnalysisError(RuntimeError):
    """Raised when a case cannot be submitted to the analysis pipeline."""


def process_case_analysis(
    db: Session,
    case_id: str,
    **analysis_options: Any,
) -> VideoAnalysisRun:
    """Run vision analysis and persist either success or safe fallback state."""

    case = db.get(Case, case_id)
    if case is None:
        raise CaseAnalysisError("Case not found")
    if case.status == "COMPLETE":
        raise CaseAnalysisError("Completed cases cannot be analysed")
    if not case.video_storage_path:
        raise CaseAnalysisError("Case has no stored source video")

    before = {
        "status": case.status,
        "effective_severity_score": case.effective_severity_score,
        "severity_tier": case.severity_tier,
        "ai_failure": case.ai_failure,
    }
    case.status = "AI_PROCESSING"
    case.ai_failure = None
    case.watson_severity_score = None
    case.effective_severity_score = None
    case.severity_tier = None
    case.narrative_summary = None
    case.incident_timeline = None
    case.flagged_entities = None
    case.transcript = None
    case.audio_intensity = None
    case.video_duration_seconds = None
    case.analysis_output_path = None
    db.commit()

    run = analyse_video(
        case.case_id,
        case.video_storage_path,
        **analysis_options,
    )

    case.analysis_output_path = run.output_reference
    case.video_duration_seconds = run.video_duration_seconds

    # Run STT — best-effort; a failure marks ai_failure="speech_to_text" but
    # does not block the vision results from being saved.
    try:
        from app.storage import download_video_bytes
        from app.speech_to_text import transcribe, parse_transcript_lines, extract_audio_intensity, extract_audio_wav
        video_bytes, _media_type = download_video_bytes(case.video_storage_path)
        wav_bytes = extract_audio_wav(video_bytes)
        stt_result = transcribe(io.BytesIO(wav_bytes), "audio/wav")
        stt_results = stt_result.get("results", [])
        speaker_labels = stt_result.get("speaker_labels", [])
        case.transcript = parse_transcript_lines(stt_results, speaker_labels) or None
        case.audio_intensity = extract_audio_intensity(wav_bytes) or None
        stt_failed = False
    except Exception as exc:
        log.warning("STT failed for case %s: %s", case.case_id, exc)
        case.transcript = None
        case.audio_intensity = None
        stt_failed = True

    if run.status == "completed" and run.case_analysis is not None:
        result = run.case_analysis
        case.watson_severity_score = result["watson_severity_score"]
        case.effective_severity_score = result["effective_severity_score"]
        case.severity_tier = result["severity_tier"]
        case.narrative_summary = result["narrative_summary"]
        case.incident_timeline = result["incident_timeline"]
        case.flagged_entities = result["flagged_entities"]
        case.ai_failure = "speech_to_text" if stt_failed else None
        action = "AI_ANALYSIS_COMPLETED"
        audit_detail = {
            "frames_completed": run.frames_completed,
            "analysis_output_path": run.output_reference,
        }
    else:
        # Do not manufacture an AI score from a partial run. The explicit
        # failure flag activates the frontend's maximum-protection flow and
        # still leaves the case available for deliberate human review.
        case.watson_severity_score = None
        case.effective_severity_score = None
        case.severity_tier = None
        case.narrative_summary = None
        case.incident_timeline = None
        case.flagged_entities = None
        case.ai_failure = "vision"
        action = "AI_ANALYSIS_FAILED"
        audit_detail = {
            "failure_stage": run.failure_stage,
            "failed_frame": run.failed_frame,
            "error_type": run.error_type,
            "frames_completed": run.frames_completed,
            "analysis_output_path": run.output_reference,
        }

    case.status = "READY_FOR_REVIEW"
    db.add(
        AuditLog(
            case_id=case.case_id,
            actor="watsonx-vision",
            action=action,
            before_value=before,
            after_value={
                "status": case.status,
                "effective_severity_score": case.effective_severity_score,
                "severity_tier": case.severity_tier,
                "ai_failure": case.ai_failure,
                **audit_detail,
            },
        )
    )
    db.commit()
    return run
