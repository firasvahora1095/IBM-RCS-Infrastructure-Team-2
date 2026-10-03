"""Frame-by-frame watsonx vision pipeline for stored case videos."""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from jsonschema import Draft202012Validator, FormatChecker

from app.analysis_storage import (
    AnalysisOutputStore,
    create_analysis_output_store,
)
from app.frame_extraction import (
    DEFAULT_FRAME_INTERVAL_SECONDS,
    iter_frames_from_storage,
)
from app.severity import build_frame_analysis, calculate_case_severity
from app.watsonx_image import analyse_image, create_watsonx_image_client


logger = logging.getLogger("ibm_rcs.video_analysis")

PROMPT_VERSION = "2.0"
VISION_ANALYSIS_PROMPT = """
Analyse only the visible evidence in this single video frame. Return one JSON
object and no prose or Markdown. It must contain exactly these fields:

{
  "tags": [],
  "watson_severity_score": 0,
  "reasoning": "A concise, neutral description of the visible evidence.",
  "entities": []
}

tags must contain only zero or more unique values from: physical_violence,
weapon_present, weapon_use, visible_injury, multi_person_conflict.
watson_severity_score must be an integer from 0 to 100 representing visual
content severity. Use weapon_use only when the frame visibly supports active
use, not merely the presence of an object. entities must be short strings for
relevant visible people or objects. Do not infer audio, identity, intent,
guilt, criminality, medical conclusions, or facts outside this frame. Use
uncertainty-aware language where the image is ambiguous.
""".strip()

# Ordered by the concern to surface first within a frame. These describe
# existing tags cautiously; they do not translate or change the severity tier.
_SUMMARY_FINDINGS = {
    "weapon_use": "Possible weapon use",
    "visible_injury": "Possible visible injury",
    "physical_violence": "Potential physical violence",
    "multi_person_conflict": "Possible group confrontation",
    "weapon_present": "Possible weapons",
}
_HUMAN_REVIEW_STATEMENT = (
    "Human review is required to confirm the context and final severity."
)

_SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schemas" / "frame-analysis.schema.json"
_FRAME_SCHEMA = json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))
_FRAME_VALIDATOR = Draft202012Validator(
    _FRAME_SCHEMA,
    format_checker=FormatChecker(),
)
_FENCED_JSON = re.compile(
    r"^\s*```(?:json)?\s*(\{.*\})\s*```\s*$",
    flags=re.IGNORECASE | re.DOTALL,
)


class WatsonxOutputError(ValueError):
    """Raised when watsonx returns content that violates the frame contract."""


@dataclass
class VideoAnalysisRun:
    case_id: str
    status: str
    output_reference: str | None
    started_at: str
    completed_at: str
    elapsed_seconds: float
    frame_interval_seconds: float
    video_duration_seconds: float | None
    frames_attempted: int
    frames_completed: int
    frame_results: list[dict[str, Any]] = field(default_factory=list)
    raw_response_files: list[str] = field(default_factory=list)
    normalized_analysis_files: list[str] = field(default_factory=list)
    case_analysis: dict[str, Any] | None = None
    failure_stage: str | None = None
    failed_frame: str | None = None
    error_type: str | None = None
    error_message: str | None = None

    def manifest(self) -> dict[str, Any]:
        manifest = asdict(self)
        # Frame records have their own files. Keeping only their references in
        # the manifest avoids duplicating the complete per-frame data set.
        manifest.pop("frame_results", None)
        manifest["prompt_version"] = PROMPT_VERSION
        return manifest


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_watsonx_frame_output(content: Any) -> dict[str, Any]:
    """Parse and minimally type-check the model-owned JSON fields."""

    if isinstance(content, dict):
        parsed = content
    else:
        if isinstance(content, list):
            text_parts = [
                item.get("text", "")
                for item in content
                if isinstance(item, dict) and item.get("type") == "text"
            ]
            content = "".join(text_parts)
        if not isinstance(content, str) or not content.strip():
            raise WatsonxOutputError("watsonx analysis was not a JSON object")
        candidate = content.strip()
        fenced = _FENCED_JSON.match(candidate)
        if fenced:
            candidate = fenced.group(1)
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError as error:
            raise WatsonxOutputError("watsonx analysis was not valid JSON") from error

    if not isinstance(parsed, dict):
        raise WatsonxOutputError("watsonx analysis JSON must be an object")

    required = {"tags", "watson_severity_score", "reasoning", "entities"}
    missing = sorted(required.difference(parsed))
    if missing:
        raise WatsonxOutputError(
            f"watsonx analysis omitted required fields: {', '.join(missing)}"
        )
    return parsed


def _validate_frame_analysis(frame_analysis: dict[str, Any]) -> None:
    errors = sorted(
        _FRAME_VALIDATOR.iter_errors(frame_analysis),
        key=lambda error: list(error.absolute_path),
    )
    if errors:
        first = errors[0]
        path = ".".join(str(part) for part in first.absolute_path) or "result"
        raise WatsonxOutputError(
            f"watsonx frame output failed validation at {path}: {first.message}"
        )


def _tier_rank(tier: str) -> int:
    return {"S1": 1, "S2": 2, "S3": 3, "S4": 4}[tier]


def _build_incident_timeline(
    frame_results: list[dict[str, Any]],
    interval_seconds: float,
) -> list[dict[str, Any]]:
    """Merge adjacent detections while preserving isolated point incidents."""

    open_segments: dict[str, dict[str, Any]] = {}
    completed: list[dict[str, Any]] = []
    adjacency_limit = interval_seconds * 1.25

    for frame in sorted(frame_results, key=lambda item: item["timestamp"]):
        timestamp = float(frame["timestamp"])
        active_tags = set(frame["tags"])

        for tag in list(open_segments):
            if tag not in active_tags:
                completed.append(open_segments.pop(tag))

        for tag in active_tags:
            existing = open_segments.get(tag)
            if existing is None or timestamp - existing["end"] > adjacency_limit:
                if existing is not None:
                    completed.append(existing)
                open_segments[tag] = {
                    "start": timestamp,
                    "end": timestamp,
                    "severity_tier": frame["severity_tier"],
                    "tag": tag,
                }
                continue

            existing["end"] = timestamp
            if _tier_rank(frame["severity_tier"]) > _tier_rank(existing["severity_tier"]):
                existing["severity_tier"] = frame["severity_tier"]

    completed.extend(open_segments.values())
    return sorted(completed, key=lambda item: (item["start"], item["tag"]))


def _format_summary_time(start: float, end: float) -> str:
    """Round only the narrative's timestamps; retain precise timeline data."""

    rounded_start = int(float(start) + 0.5)
    rounded_end = int(float(end) + 0.5)
    if rounded_start == rounded_end:
        return f"at approximately {rounded_start} seconds"
    return f"around {rounded_start}–{rounded_end} seconds"


def _summary_observation(frame: dict[str, Any], word_limit: int) -> str:
    """Keep short source observations intact, including their qualifications."""

    reasoning = re.sub(r"\s+", " ", frame["reasoning"]).strip()
    reasoning = re.sub(r"\bindividuals\b", "people", reasoning, flags=re.IGNORECASE)
    reasoning = re.sub(
        r"\b(?:the image depicts|this frame shows)\b",
        "the footage shows",
        reasoning,
        flags=re.IGNORECASE,
    )
    reasoning = re.sub(
        r"\bin this frame\b", "in the footage", reasoning, flags=re.IGNORECASE,
    )
    reasoning = re.sub(
        r"\bvisual (?:harm )?indicator\b", "visual concern", reasoning,
        flags=re.IGNORECASE,
    )

    clauses = [
        clause.rstrip(".!?")
        for clause in re.split(r"(?<=[.!?])\s+", reasoning)
        if clause.rstrip(".!?").strip()
    ]
    if len(reasoning.split()) > word_limit:
        # Prefer a complete, relevant sentence with the source's uncertainty.
        # Never truncate a sentence before a qualification or negation.
        uncertainty = re.compile(
            r"\b(?:appears?|possible|possibly|could|may|might|unclear|"
            r"not|no|suggests?|suggesting)\b",
            flags=re.IGNORECASE,
        )
        relevant = re.compile(
            r"\b(?:weapons?|firearms?|rifles?|guns?|knives|knife|objects?|"
            r"violence|violent|conflict|confrontation|injur\w*|falling|ground)\b",
            flags=re.IGNORECASE,
        )
        concise = [
            clause for clause in clauses
            if len(clause.split()) <= word_limit
            and relevant.search(clause)
            and (not uncertainty.search(reasoning) or uncertainty.search(clause))
        ]
        clauses = (
            [max(concise, key=lambda clause: len(uncertainty.findall(clause)))]
            if concise else []
        )

    if not clauses:
        # A cautious description of existing tags is safer than a partial quote.
        findings = [
            label.lower()
            for tag, label in _SUMMARY_FINDINGS.items()
            if tag in frame["tags"]
        ]
        if not findings:
            return "the context and the reason for the suggested severity need review"
        concerns = (
            ", ".join(findings[:-1]) + " and " + findings[-1]
            if len(findings) > 1 else findings[0]
        )
        return f"the footage suggests {concerns}"

    # Combine short observations into a single chronological sentence without
    # deleting uncertainty or adding facts beyond the source description.
    observations = []
    for clause in clauses:
        first_word = clause.split(maxsplit=1)[0]
        if first_word.lower() in {
            "a", "an", "the", "this", "there", "it", "they", "some", "several",
            "multiple", "two", "three", "no", "people", "smoke", "active",
            "however", "although", "but",
        }:
            clause = clause[0].lower() + clause[1:]
        observations.append(clause)
    return "; ".join(observations)


def _build_narrative_summary(
    severity_tier: str,
    highest_frame: dict[str, Any],
    incident_timeline: list[dict[str, Any]],
    frame_results: list[dict[str, Any]],
) -> str:
    """Refine the case template into concise, uncertainty-aware review wording."""

    timestamp = float(highest_frame["timestamp"])
    primary_tag = next(
        (tag for tag in _SUMMARY_FINDINGS if tag in highest_frame["tags"]),
        None,
    )
    finding = _SUMMARY_FINDINGS.get(primary_tag, "Context and severity require review")
    matching_incident = next(
        (
            incident
            for incident in incident_timeline
            if incident["tag"] == primary_tag
            and incident["start"] <= timestamp <= incident["end"]
        ),
        None,
    )
    when = _format_summary_time(
        matching_incident["start"] if matching_incident else timestamp,
        matching_incident["end"] if matching_incident else timestamp,
    )

    # Retain the existing highest / early / late selection, with repeated
    # descriptions omitted so the narrative is not a per-frame log.
    seen = {re.sub(r"\s+", " ", highest_frame["reasoning"]).strip().casefold()}
    candidates = []
    for frame in sorted(frame_results, key=lambda item: item["timestamp"]):
        reasoning = re.sub(r"\s+", " ", frame["reasoning"]).strip()
        if frame is highest_frame or not frame["tags"] or not reasoning:
            continue
        if reasoning.casefold() in seen:
            continue
        candidates.append(frame)
        seen.add(reasoning.casefold())

    selected = [highest_frame]
    if candidates:
        selected.append(candidates[0])
    if len(candidates) > 1:
        selected.append(candidates[-1])

    # Reserve more of the word budget for the strongest evidence. Select the
    # highest frame first so deduplication cannot drop its useful timestamp.
    observations = []
    seen_observations = set()
    for frame in selected:
        observation = _summary_observation(frame, 44 if frame is highest_frame else 22)
        if observation.casefold() in seen_observations:
            continue
        seen_observations.add(observation.casefold())
        if frame is highest_frame:
            introduction = when[0].upper() + when[1:]
        elif frame["timestamp"] < timestamp:
            introduction = "Earlier in the video"
        else:
            introduction = "Later in the video"
        observations.append((frame["timestamp"], f"{introduction}, {observation}."))
    narrative = " ".join(sentence for _, sentence in sorted(observations))

    evidence = []
    seen_tags = set()
    for frame in sorted(
        frame_results,
        key=lambda item: (-item["effective_severity_score"], item["timestamp"]),
    ):
        for tag, label in _SUMMARY_FINDINGS.items():
            if tag not in frame["tags"] or tag in seen_tags:
                continue
            seen_tags.add(tag)
            incident = next(
                (
                    item
                    for item in incident_timeline
                    if item["tag"] == tag
                    and item["start"] <= frame["timestamp"] <= item["end"]
                ),
                None,
            )
            location = _format_summary_time(
                incident["start"] if incident else frame["timestamp"],
                incident["end"] if incident else frame["timestamp"],
            )
            evidence.append(f"• {label} {location}")
            if len(evidence) == 3:
                break
        if len(evidence) == 3:
            break
    if not evidence:
        evidence.append("• No listed visual concerns were detected in the reviewed footage.")

    key_evidence = "\n".join(evidence)
    return (
        f"{severity_tier} — {finding}\n\n"
        f"{narrative}\n\n"
        f"Key evidence:\n{key_evidence}\n\n"
        f"{_HUMAN_REVIEW_STATEMENT}"
    )


def _aggregate_flagged_entities(
    frame_results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Associate each unique entity in flagged frames with its observed span."""

    by_name: dict[str, dict[str, Any]] = {}
    for frame in sorted(frame_results, key=lambda item: item["timestamp"]):
        if not frame["tags"]:
            continue
        timestamp = float(frame["timestamp"])
        for raw_name in frame["entities"]:
            name = raw_name.strip()
            if not name:
                continue
            entity = by_name.setdefault(
                name.casefold(),
                {"label": name, "start": timestamp, "end": timestamp},
            )
            entity["start"] = min(entity["start"], timestamp)
            entity["end"] = max(entity["end"], timestamp)
    return list(by_name.values())


def _build_case_analysis(
    case_id: str,
    frame_results: list[dict[str, Any]],
    interval_seconds: float,
) -> dict[str, Any]:
    severity = calculate_case_severity(frame_results)
    highest = next(
        frame
        for frame in frame_results
        if frame["frame_num"] == severity["highest_frame"]
    )
    incident_timeline = _build_incident_timeline(
        frame_results,
        interval_seconds,
    )
    return {
        "case_id": case_id,
        "watson_severity_score": highest["watson_severity_score"],
        "effective_severity_score": severity["severity_score"],
        "severity_tier": severity["severity_tier"],
        "narrative_summary": _build_narrative_summary(
            severity["severity_tier"],
            highest,
            incident_timeline,
            frame_results,
        ),
        "incident_timeline": incident_timeline,
        "flagged_entities": _aggregate_flagged_entities(frame_results),
        "highest_frame": severity["highest_frame"],
    }


FrameAnalyser = Callable[..., dict[str, Any]]
ProgressReporter = Callable[[str, float, int], None]


def analyse_video(
    case_id: str,
    storage_reference: str,
    *,
    interval_seconds: float = DEFAULT_FRAME_INTERVAL_SECONDS,
    output_store: AnalysisOutputStore | None = None,
    client: Any | None = None,
    analyse_frame: FrameAnalyser = analyse_image,
    progress: ProgressReporter | None = None,
) -> VideoAnalysisRun:
    """Analyse every sampled frame and always return a handled run state."""

    started_at = _utc_now()
    started_clock = time.monotonic()
    store: AnalysisOutputStore | None = output_store
    frame_results: list[dict[str, Any]] = []
    raw_files: list[str] = []
    analysis_files: list[str] = []
    attempted = 0
    duration: float | None = None
    failed_frame: str | None = None
    stage = "initialization"

    try:
        if interval_seconds <= 0:
            raise ValueError("Frame interval must be greater than zero")
        if store is None:
            store = create_analysis_output_store(storage_reference, case_id)
        if client is None and analyse_frame is analyse_image:
            client = create_watsonx_image_client()

        stage = "frame_extraction"
        for frame in iter_frames_from_storage(
            storage_reference,
            interval_seconds=interval_seconds,
        ):
            attempted += 1
            frame_id = f"frame-{frame.frame_num:05d}"
            failed_frame = frame_id
            duration = frame.source_duration_seconds or duration

            stage = "watsonx_call"
            response = analyse_frame(
                frame.as_file(),
                frame.content_type,
                VISION_ANALYSIS_PROMPT,
                client=client,
            )

            stage = "raw_response_storage"
            raw_file = store.write_json(
                f"{frame_id}.raw.json",
                response["raw_response"],
            )
            raw_files.append(raw_file)

            stage = "response_validation"
            model_output = parse_watsonx_frame_output(response["analysis"])
            raw_response = response["raw_response"]
            frame_analysis = build_frame_analysis(
                model_output=model_output,
                case_id=case_id,
                frame_num=frame_id,
                timestamp=frame.timestamp,
                model_id=response["model"],
                model_version=(
                    raw_response.get("model_version")
                    if isinstance(raw_response, dict)
                    else None
                ),
                prompt_version=PROMPT_VERSION,
            )
            _validate_frame_analysis(frame_analysis)

            stage = "normalized_analysis_storage"
            analysis_file = store.write_json(
                f"{frame_id}.analysis.json",
                frame_analysis,
            )
            analysis_files.append(analysis_file)
            frame_results.append(frame_analysis)
            if progress is not None:
                try:
                    progress(frame_id, frame.timestamp, len(frame_results))
                except Exception:
                    logger.warning("Analysis progress reporter failed")
            failed_frame = None
            stage = "frame_extraction"

        stage = "case_aggregation"
        case_analysis = _build_case_analysis(
            case_id,
            frame_results,
            interval_seconds,
        )
        case_file = store.write_json("case-analysis.json", case_analysis)
        analysis_files.append(case_file)

        run = VideoAnalysisRun(
            case_id=case_id,
            status="completed",
            output_reference=store.reference,
            started_at=started_at,
            completed_at=_utc_now(),
            elapsed_seconds=round(time.monotonic() - started_clock, 3),
            frame_interval_seconds=interval_seconds,
            video_duration_seconds=duration,
            frames_attempted=attempted,
            frames_completed=len(frame_results),
            frame_results=frame_results,
            raw_response_files=raw_files,
            normalized_analysis_files=analysis_files,
            case_analysis=case_analysis,
        )
        stage = "manifest_storage"
        store.write_json("manifest.json", run.manifest())
        return run

    except Exception as error:
        logger.warning(
            "Video analysis entered fallback at stage %s (%s)",
            stage,
            type(error).__name__,
        )
        run = VideoAnalysisRun(
            case_id=case_id,
            status="failed",
            output_reference=store.reference if store is not None else None,
            started_at=started_at,
            completed_at=_utc_now(),
            elapsed_seconds=round(time.monotonic() - started_clock, 3),
            frame_interval_seconds=interval_seconds,
            video_duration_seconds=duration,
            frames_attempted=attempted,
            frames_completed=len(frame_results),
            frame_results=frame_results,
            raw_response_files=raw_files,
            normalized_analysis_files=analysis_files,
            failure_stage=stage,
            failed_frame=failed_frame,
            error_type=type(error).__name__,
            error_message=str(error),
        )
        if store is not None:
            try:
                store.write_json("manifest.json", run.manifest())
            except Exception:
                logger.warning("Could not persist failed analysis manifest")
        return run
