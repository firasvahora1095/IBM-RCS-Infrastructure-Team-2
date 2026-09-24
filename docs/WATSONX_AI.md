# Watsonx.ai Frame-Level Video Analysis

## Implemented flow

The vision integration processes a stored video as follows:

1. `app.frame_extraction.iter_frames_from_storage()` streams timestamped JPEG
   frames from local storage or IBM Cloud Object Storage (COS), one frame every
   five seconds by default.
2. `app.video_analysis.analyse_video()` reuses one authenticated watsonx
   `ModelInference` client and sends every frame through
   `app.watsonx_image.analyse_image()`.
3. The versioned prompt asks for visual-only JSON fields: `tags`,
   `watson_severity_score`, `reasoning`, and `entities`. It includes the BA
   neutral-language and uncertainty requirements.
4. The complete provider response is stored before its model content is
   parsed. Markdown-fenced JSON is accepted, but prose, missing fields,
   unknown tags, invalid scores, and schema violations fail the run.
5. Python computes `effective_severity_score` and `severity_tier`, validates
   the normalized frame record, and stores it separately.
6. The maximum effective frame score becomes the case score and determines its
   severity tier (worst-tier-wins). Adjacent detections of the same tag become
   timeline ranges; isolated detections remain point markers.
7. A fixed, neutral template generates the case narrative from that tier and
   the corresponding timeline range. The model's `reasoning` remains in each
   frame record and is not copied into the case narrative.
8. `app.analysis_service.process_case_analysis()` writes the completed case
   output to the database and moves the case to `READY_FOR_REVIEW`.

The public upload request is not held open for 120–180 remote model calls.
The current Sprint 2 execution boundary is the worker-compatible CLI/service
below. A production queue may call the same `process_case_analysis()` service
after upload without changing analysis behavior.

## Configuration

Configure these values in the repository-root `.env`:

```dotenv
WATSONX_API_KEY=
WATSONX_URL=
WATSONX_VISION_MODEL_ID=
WATSONX_PROJECT_ID=

# Optional for direct-file runs. Stored local cases write beside source video.
ANALYSIS_OUTPUT_DIRECTORY=
```

The tested model is selected only through `WATSONX_VISION_MODEL_ID`; do not
hard-code credentials or a model ID in source.

## Analysis-output layout

COS cases use:

```text
cos://{bucket}/cases/{case_id}/analysis-output/
├── frame-00000.raw.json       complete watsonx provider response
├── frame-00000.analysis.json  normalized, schema-validated frame result
├── ...
├── case-analysis.json         case score, narrative and incident timeline
└── manifest.json              run status, timing, counts and file references
```

Local stored cases use the same `analysis-output` directory beside
`source.<extension>`. For a directly supplied file, the default is
`<video-directory>/analysis-output/{case_id}`. Set
`ANALYSIS_OUTPUT_DIRECTORY` or pass `--output-directory` to isolate test
artefacts elsewhere.

`*.raw.json` is the raw response object returned by watsonx, not an envelope or
reconstructed subset. `*.analysis.json` follows
`backend/schemas/frame-analysis.schema.json`.

## Aggregation v1

The case score is the highest `effective_severity_score` among its analyzed
frames, with the earliest timestamp breaking a tie. Its tier is the tier of
that frame. The timeline groups consecutive samples of each visual tag and
retains the highest tier reached within each group. A tag that appears in only
one sample has a point marker with equal start and end times.

The placeholder case narrative names the winning tier and the timeline range
containing its highest-scoring frame, for example: “AI flagged an S3 visual
indicator between 5s and 10s.” If that frame has no listed tag, the template
reports its tier and timestamp without inventing an incident. This sentence is
stored in `cases.narrative_summary` and `case-analysis.json` alongside the
severity and timeline. Frame-level model `reasoning` is retained separately.
The wording is deliberately limited pending later refinement under Jana's
neutral, evidence-based narrative guidelines.

## Run against a provided video

From the repository root:

```bash
.venv/bin/python backend/scripts/WATSONX_VIDEO_TEST.py \
  --video-file /absolute/path/to/video.mp4 \
  --test-case-id VIDEO-TEST-001 \
  --output-directory /tmp/ibm-rcs-analysis
```

The command prints a compact summary containing duration, attempted/completed
frame counts, elapsed time, case output, output path, and any handled failure.
Progress is written after every persisted frame. It exits `0` on completion
and `1` on a handled failed run.

To process a case already uploaded through the API and persist its database
state:

```bash
.venv/bin/python backend/scripts/WATSONX_VIDEO_TEST.py \
  --case-id THE_CASE_ID
```

This mode requires `DATABASE_URL` as well as the watsonx and selected storage
credentials.

The five-second cadence means approximately:

| Video duration | Model calls |
| --- | ---: |
| 1 minute | 12 |
| 10 minutes | 120 |
| 15 minutes | 180 |

Use `--frame-interval` only for an explicit test; changing it changes incident
timeline resolution and call volume.

## Failure behavior (`AR-AI-10`)

An extraction, model-call, JSON-validation, schema-validation, or storage
failure is represented by a failed `VideoAnalysisRun`; it does not escape as
an unhandled model exception. When processing a database case:

- the manifest records the failure stage, exception type, failed frame and
  number of completed frames;
- partial frame outputs already written remain available for internal audit;
- no partial or invented AI severity is put on the case;
- the case becomes `READY_FOR_REVIEW` with `ai_failure = "vision"`; and
- the existing frontend requires explicit consent and maximum-protection
  viewer settings before raw content can be shown.

If analysis-output storage itself is unavailable, the database fallback is
still applied and the storage problem is logged. Provider error text remains
internal and is not returned from the Auditor or public status APIs.

## Automated validation

Run:

```bash
PYTHONPATH=backend .venv/bin/python -m pytest -q backend/tests
```

`backend/tests/test_video_analysis.py` covers:

- real OpenCV video frames passed through the frame-level analysis seam;
- returned tags/scores and exact raw-response persistence;
- normalized JSON/schema output, multiple-tag timeline aggregation,
  worst-tier-wins severity, and the persisted template summary;
- a simulated watsonx outage producing the database fallback state;
- COS analysis-output keys; and
- 7-second, 23-second, and 600-second (10-minute) synthetic videos, verifying
  2, 5, and 120 calls respectively at the default cadence.

These tests use a deterministic fake model at the network seam, so they do not
spend service quota. The verification log records a completed long-video run
from before aggregation v1; repeat a live run to verify the new case-summary
wording with watsonx output.

## Single-image diagnostic

`backend/scripts/WATSONX_IMAGE_TEST.py` remains a small live connectivity test
for one JPEG/PNG. It does not exercise extraction, per-frame persistence,
aggregation, database state, duration, or failure fallback; use the video
runner for this deliverable.
