"""Run the real frame-level watsonx pipeline for a case or local video."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPOSITORY_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))
load_dotenv(REPOSITORY_ROOT / ".env")

from app.analysis_storage import LocalAnalysisOutputStore  # noqa: E402
from app.video_analysis import analyse_video  # noqa: E402


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Send each sampled video frame to the configured watsonx vision "
            "model and persist raw/normalized JSON outputs."
        )
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--case-id",
        help="Process an existing database case and update its review state.",
    )
    source.add_argument(
        "--video-file",
        type=Path,
        help="Process a local video without requiring a database case.",
    )
    parser.add_argument(
        "--test-case-id",
        help="Artefact case ID for --video-file (a timestamped ID is the default).",
    )
    parser.add_argument(
        "--output-directory",
        type=Path,
        help="Root for --video-file JSON output (default: beside the video).",
    )
    parser.add_argument(
        "--frame-interval",
        type=float,
        default=5.0,
        help="Seconds between analysed frames (default: 5).",
    )
    return parser.parse_args()


def _summary(run) -> dict[str, object]:
    return {
        "case_id": run.case_id,
        "status": run.status,
        "output_reference": run.output_reference,
        "video_duration_seconds": run.video_duration_seconds,
        "frames_attempted": run.frames_attempted,
        "frames_completed": run.frames_completed,
        "elapsed_seconds": run.elapsed_seconds,
        "case_analysis": run.case_analysis,
        "failure_stage": run.failure_stage,
        "failed_frame": run.failed_frame,
        "error_type": run.error_type,
        "error_message": run.error_message,
    }


def _report_progress(frame_id: str, timestamp: float, completed: int) -> None:
    print(
        f"analysed {frame_id} at {timestamp:.3f}s ({completed} completed)",
        file=sys.stderr,
        flush=True,
    )


def main() -> int:
    arguments = _arguments()

    if arguments.case_id:
        if arguments.test_case_id or arguments.output_directory:
            raise SystemExit(
                "--test-case-id and --output-directory apply only to --video-file"
            )
        # Importing the database layer requires DATABASE_URL, so keep it out of
        # direct-file mode where a tester may only have watsonx credentials.
        from app.analysis_service import process_case_analysis
        from app.db import database_session

        with database_session() as db:
            run = process_case_analysis(
                db,
                arguments.case_id.upper(),
                interval_seconds=arguments.frame_interval,
                progress=_report_progress,
            )
    else:
        video_path = arguments.video_file.expanduser().resolve()
        if not video_path.is_file():
            raise SystemExit(f"Video file not found: {video_path}")
        case_id = arguments.test_case_id or datetime.now(timezone.utc).strftime(
            "VIDEO-TEST-%Y%m%d-%H%M%S"
        )
        output_store = None
        if arguments.output_directory:
            output_store = LocalAnalysisOutputStore(
                arguments.output_directory.expanduser().resolve() / case_id
            )
        run = analyse_video(
            case_id,
            str(video_path),
            interval_seconds=arguments.frame_interval,
            output_store=output_store,
            progress=_report_progress,
        )

    print(json.dumps(_summary(run), indent=2))
    return 0 if run.status == "completed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
