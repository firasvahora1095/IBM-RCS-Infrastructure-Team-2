import json
from datetime import datetime, timezone


def get_severity_tier(score):
    if not isinstance(score, int) or isinstance(score, bool):
        raise ValueError("watson_severity_score must be an integer")

    if score < 0 or score > 100:
        raise ValueError("watson_severity_score must be between 0 and 100")

    if score <= 39:
        return "S1"

    if score <= 64:
        return "S2"

    if score <= 84:
        return "S3"

    return "S4"


def build_frame_analysis(
    model_output,
    case_id,
    frame_num,
    timestamp,
    model_id,
    prompt_version,
    model_version=None,
):
    if isinstance(model_output, str):
        model_output = json.loads(model_output)

    score = model_output["watson_severity_score"]
    tags = model_output["tags"]
    effective_score = max(score, 65) if "weapon_use" in tags else score

    return {
        "case_id": case_id,
        "frame_num": frame_num,
        "timestamp": timestamp,
        "tags": tags,
        "watson_severity_score": score,
        "effective_severity_score": effective_score,
        "severity_tier": get_severity_tier(effective_score),
        "reasoning": model_output["reasoning"],
        "entities": model_output["entities"],
        "audit": {
            "model_id": model_id,
            "model_version": model_version,
            "prompt_version": prompt_version,
            "decision_timestamp": datetime.now(
                timezone.utc
            ).isoformat(),
        },
    }


def calculate_case_severity(frame_results):
    if not frame_results:
        raise ValueError("At least one frame result is required")

    highest_frame = max(
        frame_results,
        key=lambda frame: (
            frame["effective_severity_score"],
            -frame["timestamp"],
        ),
    )

    return {
        "case_id": highest_frame["case_id"],
        "severity_score": highest_frame[
            "effective_severity_score"
        ],
        "severity_tier": highest_frame["severity_tier"],
        "highest_frame": highest_frame["frame_num"],
    }
