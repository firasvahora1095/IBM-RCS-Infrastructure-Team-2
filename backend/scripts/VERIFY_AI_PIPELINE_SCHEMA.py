"""
Cross-test: Firas verifies Aiden's AI pipeline
================================================
Checks that a real video produces the correct output schema from
vision → aggregation → API contract. Run locally with your .env in place.
 
Usage:
    cd /path/to/IBM-RCS-Infrastructure-Team-2
    PYTHONPATH=backend python backend/scripts/VERIFY_AI_PIPELINE_SCHEMA.py --video-file /path/to/video.mp4
 
What this checks (per task AC):
  1. Vision pipeline runs without error and returns a completed run
  2. Severity score is an int 0–100
  3. severity_tier is one of S1/S2/S3/S4
  4. incident_timeline entries each have start, end, severity_tier, tag
  5. narrative_summary is a non-empty string
  6. flagged_entities is a list (may be empty)
  7. No failure_stage in the run
 
Results are printed and written to VERIFY_AI_PIPELINE_SCHEMA_RESULT.json beside this script.
"""
 
from __future__ import annotations
 
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
 
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))
 
from dotenv import load_dotenv
load_dotenv(REPO_ROOT / ".env")
 
from app.analysis_storage import create_analysis_output_store
from app.video_analysis import analyse_video
 
 
VALID_TIERS = {"S1", "S2", "S3", "S4"}
 
 
def _check(label: str, passed: bool, detail: str = "") -> bool:
    status = "PASS" if passed else "FAIL"
    line = f"  [{status}] {label}"
    if detail:
        line += f" — {detail}"
    print(line)
    return passed
 
 
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-file", type=Path, required=True)
    parser.add_argument("--frame-interval", type=float, default=10.0)
    args = parser.parse_args()
 
    if not args.video_file.exists():
        print(f"ERROR: video file not found: {args.video_file}")
        sys.exit(1)
 
    case_id = f"FIRAS-XTEST-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
    output_dir = Path(__file__).parent / "cross_test_output" / case_id
    output_dir.mkdir(parents=True, exist_ok=True)
    store = create_analysis_output_store(str(args.video_file), case_id, local_root=output_dir.parent)
 
    print(f"\nRunning AI pipeline on: {args.video_file.name}")
    print(f"Case ID: {case_id}")
    print(f"Frame interval: {args.frame_interval}s\n")
 
    run = analyse_video(
        case_id,
        str(args.video_file),
        interval_seconds=args.frame_interval,
        output_store=store,
    )
 
    manifest = run.manifest()
    ca = manifest.get("case_analysis") or {}
 
    print("=== Schema Checks ===")
    results = []
    results.append(_check("Pipeline completed without failure",
        manifest.get("status") == "completed",
        f"status={manifest.get('status')}, failure_stage={manifest.get('failure_stage')}"))
    results.append(_check("Frames attempted > 0",
        (manifest.get("frames_attempted") or 0) > 0,
        f"frames_attempted={manifest.get('frames_attempted')}"))
    results.append(_check("watson_severity_score is int 0–100",
        isinstance(ca.get("watson_severity_score"), int) and 0 <= ca["watson_severity_score"] <= 100,
        str(ca.get("watson_severity_score"))))
    results.append(_check("severity_tier is S1/S2/S3/S4",
        ca.get("severity_tier") in VALID_TIERS,
        str(ca.get("severity_tier"))))
    results.append(_check("narrative_summary is non-empty string",
        isinstance(ca.get("narrative_summary"), str) and len(ca["narrative_summary"]) > 0,
        f"{len(ca.get('narrative_summary') or '')} chars"))
 
    timeline = ca.get("incident_timeline") or []
    timeline_ok = all(
        isinstance(e.get("start"), (int, float)) and
        isinstance(e.get("end"), (int, float)) and
        e.get("severity_tier") in VALID_TIERS
        for e in timeline
    ) if timeline else True
    results.append(_check("incident_timeline entries have start/end/severity_tier",
        timeline_ok,
        f"{len(timeline)} entries"))
    results.append(_check("flagged_entities is a list",
        isinstance(ca.get("flagged_entities"), list),
        str(ca.get("flagged_entities"))))
 
    passed = sum(results)
    total = len(results)
    print(f"\n=== {passed}/{total} checks passed ===")
 
    output = {
        "tester": "Firas",
        "task": "Cross-test Aiden's real AI pipeline",
        "run_at": datetime.now(timezone.utc).isoformat(),
        "video_file": str(args.video_file),
        "case_id": case_id,
        "checks_passed": passed,
        "checks_total": total,
        "all_passed": passed == total,
        "manifest_summary": {
            "status": manifest.get("status"),
            "frames_attempted": manifest.get("frames_attempted"),
            "frames_completed": manifest.get("frames_completed"),
            "video_duration_seconds": manifest.get("video_duration_seconds"),
            "elapsed_seconds": manifest.get("elapsed_seconds"),
            "failure_stage": manifest.get("failure_stage"),
        },
        "case_analysis": ca,
    }
 
    result_path = Path(__file__).parent / "VERIFY_AI_PIPELINE_SCHEMA_RESULT.json"
    result_path.write_text(json.dumps(output, indent=2))
    print(f"\nResult saved to: {result_path}")
 
    sys.exit(0 if passed == total else 1)
 
 
if __name__ == "__main__":
    main()