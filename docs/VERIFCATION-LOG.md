# Verification Log

This document records the verification history of our infrastructure.

## Backend Connection  
### 28th August 2026  

**Tester:** Dev 2 Aiden Brundell  
**Tested endpoint:** https://ibm-rcs-backend.2e2pxih6g5a9.ca-tor.codeengine.appdomain.cloud/health  

Test | Expected Result | Result | Pass/Fail
- Backend Health Endpoint | HTTP 200 with service status | HTTP 200 with {"status":"ok","service":"ibm-rcs-backend"} | Passed

### 29th August 2026  

**Tester:** Dev 2 Aiden Brundell  
**Tested endpoint:** http://127.0.0.1:8000/storage-check

Test | Expected Result | Result | Pass/Fail
- (Local) Backend COS object write | Backend uploads a testing object | Testing object uploaded | Passed
- (Local) Backend COS object read | Backend reads a testing object | Testing object read | Passed
- (Local) Backend COS object remove | Backend deletes a testing object | Testing object deleted | Passed

## Watson STT
### 31st August 2026
**Tester:** Dev 2 Aiden Brundell  
**Tested file(s):** backend/app/speech_to_text.py, using backend/scripts/stt_test.wav

Test | Expected Result | Result | Pass/Fail
- Audio file transcription | Uploads audio file to Watson STT and receives transcription | stt_test.wav successfully uploaded and transcribed | Passed
- Transcription accuracy | Transcription retains the meaning of "This is a recording to test the watson speech to text service" | Transcription largely retained meaning | Passed

Snippet of connection log:
```
{
  "model": "en-AU",
  "transcript": "this is a recording to test the watson's speech to text service",
  "results": [
    {
      "final": true,
      "alternatives": [
        {
          "transcript": "this is a recording to test the watson's speech to text service ",
          "confidence": 0.91,
          "timestamps": [
            [
              "this",
              1.08,
              1.28
            ],
            [
              "is",
              1.28,
              1.46
            ],
```

## Watsonx AI
### 1st September 2026

**Tester:** Dev 2 Aiden Brundell  
**Tested file(s):** backend/app/watsonx_image.py, using backend/scripts/watsonx_image_test.jpg

Test | Expected Result | Result | Pass/Fail
- Image file reasoning | Uploads image file to watsonx and receives output | watsonx_image_test.jpg successfully uploaded and received output | Passed
- Reasoning accuracy | Model reasoning clearly understands there is a blue circle, green triangle and yellow square as a benign test image | Model reasoning largely accurate to the image | Passed
- Correct model | The model supplied in the environment file is used | LLama 4 Maverick used | Passed

Snippet of connection log:

```
"model": "meta-llama/llama-4-maverick-17b-128e-instruct-fp8",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "```json\n{\n  \"summary\": \"A simple graphic with three shapes: a blue circle, a yellow square, and a green triangle.\",\n  \"visible_objects\": [\"blue circle\", \"yellow square\", \"green triangle\"],\n  \"visible_text\": [\"BENIGN TEST IMAGE\", \"blue circle - yellow square - green triangle\"],\n  \"risk_indicators\": [],\n  \"requires_human_review\": false\n}\n```"
        },
        "finish_reason": "stop"
      }
    ],
    "created": 1788193263,
    "model_version": "4.0.0",
    "created_at": "2026-08-31T16:21:04.728Z",
    "usage": {
      "completion_tokens": 87,
      "prompt_tokens": 858,
      "total_tokens": 945
```

## Watsonx Frame-Level Video Pipeline

### 24th September 2026 — Is watsonx code reusable for live integration?

**Tester:** Aiden Brundell

**Command:** `PYTHONPATH=backend .venv/bin/python -m pytest -q backend/tests`

**Result:** `26 passed, 4 subtests passed`

| Test | Expected result | Observed result | Result |
| --- | --- | --- | --- |
| Per-frame response | Timestamped OpenCV frames produce model-owned tags/raw score and backend-owned effective score/tier | Three frames at 0s/5s/10s returned and persisted normalized tags/scores | Passed |
| Raw JSON persistence | Exact provider response is stored before parsing | `frame-xxxxx.raw.json` contained the provider object; normalized data was stored separately | Passed |
| Malformed model JSON | Provider JSON remains auditable even when its content cannot be normalized | Raw response remained stored and the run entered `response_validation` fallback | Passed |
| Timeline aggregation | Consecutive tagged samples form timestamped ranges | 5s and 10s detections formed a 5s–10s range | Passed |
| Case/database integration | Completed output moves the case to review and writes the derived fields/audit event | Case became `READY_FOR_REVIEW` with real aggregate fields and `AI_ANALYSIS_COMPLETED` | Passed |
| Simulated model outage | No crash or false success; protected fallback is persisted | Failed manifest plus `READY_FOR_REVIEW`, `ai_failure=vision`, null AI scores, and `AI_ANALYSIS_FAILED` audit event | Passed |
| Auditor API fallback contract | Protected frontend receives an explicit failure rather than false output | Owned case detail returned `ai_failure=vision` with null AI score/tier | Passed |
| Varying durations (`UR-VU-09`) | Five-second cadence is stable across timelines | 7s → 2 frames; 23s → 5 frames; 600s → 120 frames | Passed |
| Target duration floor (`UR-VU-07`) | A generated approximately 10-minute video completes the pipeline seam | 600-second generated AVI completed 120 deterministic frame analyses | Passed (automated seam) |
| COS output path | Raw JSON uses case-specific `analysis-output` path | Fake COS adapter received `cases/{case}/analysis-output/frame-00000.raw.json` | Passed |
| COS source streaming | A stored video is materialized without retaining the full object in application memory | Fake COS body streamed to a temporary file and produced 0s/2s/4s frames | Passed |

### Live 10–15 minute client video — pending

```bash
.venv/bin/python backend/scripts/WATSONX_VIDEO_TEST.py \
  --video-file /absolute/path/to/client-video.mp4 \
  --test-case-id SPRINT2-LIVE-001 \
  --output-directory /absolute/path/to/test-output
```

{
  "case_id": "SPRINT2-LIVE-001",
  "status": "completed",
  "output_reference": "/tmp/ibm-rcs-analysis/SPRINT2-LIVE-001",
  "video_duration_seconds": 848.014,
  "frames_attempted": 170,
  "frames_completed": 170,
  "elapsed_seconds": 476.352,
  "case_analysis": {
    "case_id": "SPRINT2-LIVE-001",
    "watson_severity_score": 85,
    "effective_severity_score": 85,
    "severity_tier": "S4",
    "narrative_summary": "The image shows two individuals in a fighting stance within a fenced area, likely an MMA or UFC match. One individual is airborne, executing a kick, while the other appears to be falling or being struck. There is visible blood on the ground, indicating injury.",
    "incident_timeline": [
      {
        "start": 10.01,
        "end": 20.02,
        "severity_tier": "S1",
        "tag": "multi_person_conflict"
      },
      {
        "start": 35.035,
        "end": 40.04,
        "severity_tier": "S2",
        "tag": "multi_person_conflict"
      },
      {
        "start": 40.04,
        "end": 50.05,
        "severity_tier": "S2",
        "tag": "physical_violence"
      },
      {
        "start": 45.045,
        "end": 45.045,
        "severity_tier": "S2",
        "tag": "visible_injury"
      },
      {
        "start": 50.05,
        "end": 50.05,
        "severity_tier": "S2",
        "tag": "multi_person_conflict"
      },
      {
        "start": 60.06,
        "end": 105.105,
        "severity_tier": "S3",
        "tag": "multi_person_conflict"
      },
      {
        "start": 60.06,
        "end": 75.075,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 60.06,
        "end": 65.065,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 75.075,
        "end": 75.075,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 85.085,
        "end": 100.1,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 85.085,
        "end": 95.095,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 110.11,
        "end": 110.11,
        "severity_tier": "S2",
        "tag": "physical_violence"
      },
      {
        "start": 110.11,
        "end": 110.11,
        "severity_tier": "S2",
        "tag": "visible_injury"
      },
      {
        "start": 115.115,
        "end": 315.315,
        "severity_tier": "S4",
        "tag": "multi_person_conflict"
      },
      {
        "start": 120.12,
        "end": 140.14,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 120.12,
        "end": 135.135,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 155.155,
        "end": 195.195,
        "severity_tier": "S4",
        "tag": "physical_violence"
      },
      {
        "start": 165.165,
        "end": 180.18,
        "severity_tier": "S4",
        "tag": "visible_injury"
      },
      {
        "start": 195.195,
        "end": 225.225,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 205.205,
        "end": 220.22,
        "severity_tier": "S2",
        "tag": "physical_violence"
      },
      {
        "start": 230.23,
        "end": 245.245,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 240.24,
        "end": 250.25,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 260.26,
        "end": 340.34,
        "severity_tier": "S4",
        "tag": "physical_violence"
      },
      {
        "start": 280.28,
        "end": 285.285,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 295.295,
        "end": 295.295,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 305.305,
        "end": 310.31,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 320.32,
        "end": 340.34,
        "severity_tier": "S4",
        "tag": "visible_injury"
      },
      {
        "start": 325.325,
        "end": 340.34,
        "severity_tier": "S4",
        "tag": "multi_person_conflict"
      },
      {
        "start": 350.35,
        "end": 365.365,
        "severity_tier": "S3",
        "tag": "multi_person_conflict"
      },
      {
        "start": 350.35,
        "end": 645.645,
        "severity_tier": "S4",
        "tag": "physical_violence"
      },
      {
        "start": 360.36,
        "end": 470.47,
        "severity_tier": "S4",
        "tag": "visible_injury"
      },
      {
        "start": 375.375,
        "end": 645.645,
        "severity_tier": "S4",
        "tag": "multi_person_conflict"
      },
      {
        "start": 490.49,
        "end": 595.595,
        "severity_tier": "S4",
        "tag": "visible_injury"
      },
      {
        "start": 605.605,
        "end": 610.61,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 620.62,
        "end": 620.62,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 640.64,
        "end": 640.64,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 660.66,
        "end": 660.66,
        "severity_tier": "S3",
        "tag": "multi_person_conflict"
      },
      {
        "start": 660.66,
        "end": 660.66,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 660.66,
        "end": 660.66,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 670.67,
        "end": 675.675,
        "severity_tier": "S2",
        "tag": "multi_person_conflict"
      },
      {
        "start": 670.67,
        "end": 675.675,
        "severity_tier": "S2",
        "tag": "visible_injury"
      },
      {
        "start": 685.685,
        "end": 705.705,
        "severity_tier": "S3",
        "tag": "multi_person_conflict"
      },
      {
        "start": 685.685,
        "end": 685.685,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 685.685,
        "end": 700.7,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 715.715,
        "end": 725.725,
        "severity_tier": "S3",
        "tag": "multi_person_conflict"
      },
      {
        "start": 715.715,
        "end": 720.72,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 715.715,
        "end": 725.725,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 735.735,
        "end": 735.735,
        "severity_tier": "S1",
        "tag": "multi_person_conflict"
      },
      {
        "start": 755.755,
        "end": 795.795,
        "severity_tier": "S3",
        "tag": "multi_person_conflict"
      },
      {
        "start": 755.755,
        "end": 795.795,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 755.755,
        "end": 755.755,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 785.785,
        "end": 805.805,
        "severity_tier": "S3",
        "tag": "visible_injury"
      },
      {
        "start": 805.805,
        "end": 805.805,
        "severity_tier": "S3",
        "tag": "physical_violence"
      },
      {
        "start": 815.815,
        "end": 815.815,
        "severity_tier": "S1",
        "tag": "visible_injury"
      },
      {
        "start": 830.83,
        "end": 845.845,
        "severity_tier": "S1",
        "tag": "multi_person_conflict"
      }
    ],
    "highest_frame": "frame-00035"
  },
  "failure_stage": null,
  "failed_frame": null,
  "error_type": null,
  "error_message": null
}