# Sprint 2 Frame Extraction Integration

## Purpose

This task integrates the Sprint 1 OpenCV frame-extraction prototype with the real backend video-storage flow.

The implementation lives in:

`backend/app/frame_extraction.py`

## Flow

The integrated flow is:

1. A video is uploaded to the backend.
2. The backend stores the video using `store_video()`.
3. The resulting storage reference is passed to `extract_frames_from_storage()`.
4. The extractor materialises the video locally when required.
5. OpenCV samples one frame every 5 seconds by default.
6. Each frame is encoded as JPEG bytes.
7. Each output includes:
   - frame number
   - timestamp in seconds
   - JPEG bytes
   - `image/jpeg` content type
8. The returned frame can be exposed as a file-like object using `as_file()`, matching the input expected by the existing watsonx image-analysis layer.

## Supported storage

The extractor supports both backend storage modes:

- Local filesystem paths
- IBM Cloud Object Storage references in the form:

`cos://bucket/object-key`

For COS objects, the video is downloaded to a temporary file for OpenCV processing and the temporary file is deleted after extraction.

## Error handling

Frame extraction raises `FrameExtractionError` when:

- the stored video cannot be found
- the COS object cannot be retrieved
- the video cannot be opened
- the video has an invalid frame rate
- a frame cannot be JPEG encoded
- no usable frames can be extracted

This allows the surrounding pipeline to handle extraction failures without crashing the backend process.

## Validation

Automated tests are provided in:

`backend/tests/test_frame_extraction.py`

The tests verify:

- timestamped frames are extracted from real synthetic video footage
- corrupt video produces a handled extraction error
- missing video produces a handled extraction error
- a video written through the real backend `store_video()` flow can subsequently be consumed by frame extraction

Regression result:

- 15 backend tests passed
- 4 parameterised/subtests passed
- 4 frame-extraction tests passed

## Sprint boundary

This task provides the storage-to-frame-extraction integration seam.

Full watsonx vision analysis, aggregation and governance processing is validated separately by the real AI-pipeline integration/cross-test tasks.