from io import BytesIO

from app.storage import store_video

from pathlib import Path

import cv2
import numpy as np
import pytest

from app.frame_extraction import (
    FrameExtractionError,
    extract_frames_from_storage,
)


def create_synthetic_video(path: Path) -> None:
    """Create harmless synthetic footage for frame-extraction testing."""

    fps = 2.0
    width = 64
    height = 48

    writer = cv2.VideoWriter(
        str(path),
        cv2.VideoWriter_fourcc(*"MJPG"),
        fps,
        (width, height),
    )

    assert writer.isOpened()

    try:
        # Six seconds of harmless generated frames.
        for frame_number in range(12):
            value = min(frame_number * 20, 255)

            frame = np.full(
                (height, width, 3),
                value,
                dtype=np.uint8,
            )

            writer.write(frame)

    finally:
        writer.release()


def test_extracts_timestamped_frames_from_real_video(tmp_path: Path) -> None:
    video_path = tmp_path / "test-video.avi"
    create_synthetic_video(video_path)

    frames = extract_frames_from_storage(
        str(video_path),
        interval_seconds=2,
    )

    assert len(frames) == 3

    assert frames[0].frame_num == 0
    assert frames[0].timestamp == pytest.approx(0.0)

    assert frames[1].frame_num == 1
    assert frames[1].timestamp == pytest.approx(2.0)

    assert frames[2].frame_num == 2
    assert frames[2].timestamp == pytest.approx(4.0)

    for frame in frames:
        assert frame.content_type == "image/jpeg"

        # JPEG signature.
        assert frame.image_bytes.startswith(b"\xff\xd8")

        # Proves the downstream Watsonx image layer can receive a file-like
        # object rather than requiring a filesystem path.
        image_file = frame.as_file()
        assert image_file.read(2) == b"\xff\xd8"


def test_bad_video_is_a_handled_extraction_error(tmp_path: Path) -> None:
    bad_video = tmp_path / "broken.mp4"
    bad_video.write_bytes(b"this is not a real video")

    with pytest.raises(
        FrameExtractionError,
        match="Video could not be opened",
    ):
        extract_frames_from_storage(str(bad_video))


def test_missing_video_is_a_handled_extraction_error(tmp_path: Path) -> None:
    missing_video = tmp_path / "does-not-exist.mp4"

    with pytest.raises(
        FrameExtractionError,
        match="Stored video could not be found",
    ):
        extract_frames_from_storage(str(missing_video))


def test_real_storage_flow_produces_timestamped_frames(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A video stored by the real backend can be consumed by frame extraction."""

    source_video = tmp_path / "upload.avi"
    create_synthetic_video(source_video)

    storage_directory = tmp_path / "stored-videos"

    monkeypatch.setenv("VIDEO_STORAGE_BACKEND", "local")
    monkeypatch.setenv(
        "VIDEO_STORAGE_DIRECTORY",
        str(storage_directory),
    )

    with source_video.open("rb") as source:
        storage_reference = store_video(
            "FRAME-INTEGRATION-001",
            ".avi",
            source,
            "video/x-msvideo",
        )

    frames = extract_frames_from_storage(
        storage_reference,
        interval_seconds=2,
    )

    assert len(frames) == 3

    assert [frame.frame_num for frame in frames] == [0, 1, 2]

    assert [frame.timestamp for frame in frames] == pytest.approx(
        [0.0, 2.0, 4.0]
    )

    for frame in frames:
        assert frame.content_type == "image/jpeg"
        assert frame.image_bytes.startswith(b"\xff\xd8")
        assert frame.as_file().read(2) == b"\xff\xd8"