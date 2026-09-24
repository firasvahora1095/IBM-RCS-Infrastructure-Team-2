"""Frame extraction for videos stored by the RCS backend.

The extractor works with both supported video-storage backends:

- local filesystem paths
- IBM Cloud Object Storage references: cos://bucket/object-key

Frames are sampled at a fixed interval and encoded as JPEG bytes so they can
be passed directly to the watsonx image-analysis layer.
"""

from __future__ import annotations

import shutil
import tempfile
from contextlib import closing, contextmanager
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Iterator

import cv2

from app.storage import create_cos_client


DEFAULT_FRAME_INTERVAL_SECONDS = 5.0


class FrameExtractionError(RuntimeError):
    """Raised when a stored video cannot be decoded into usable frames."""


@dataclass(frozen=True)
class ExtractedFrame:
    """One timestamped frame ready for downstream image analysis."""

    frame_num: int
    timestamp: float
    image_bytes: bytes
    content_type: str = "image/jpeg"
    source_duration_seconds: float | None = None

    def as_file(self) -> BytesIO:
        """Return a file-like object accepted by watsonx_image.analyse_image."""
        return BytesIO(self.image_bytes)


def _split_cos_reference(storage_reference: str) -> tuple[str, str]:
    """Split cos://bucket/key into bucket and object key."""
    without_scheme = storage_reference.removeprefix("cos://")
    bucket, separator, object_key = without_scheme.partition("/")

    if not separator or not bucket or not object_key:
        raise FrameExtractionError("Invalid COS storage reference")

    return bucket, object_key


@contextmanager
def _materialize_video(storage_reference: str) -> Iterator[Path]:
    """Make a stored video available as a local file for OpenCV."""

    if not storage_reference:
        raise FrameExtractionError("Video storage reference is empty")

    if not storage_reference.startswith("cos://"):
        path = Path(storage_reference)

        if not path.is_file():
            raise FrameExtractionError("Stored video could not be found")

        yield path
        return

    bucket, object_key = _split_cos_reference(storage_reference)

    suffix = Path(object_key).suffix or ".mp4"
    temporary_path: Path | None = None

    try:
        cos_client = create_cos_client()

        response = cos_client.get_object(
            Bucket=bucket,
            Key=object_key,
        )

        with tempfile.NamedTemporaryFile(
            mode="wb",
            suffix=suffix,
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            # Avoid holding an entire 10--15 minute COS object in memory.
            with closing(response["Body"]) as response_body:
                shutil.copyfileobj(
                    response_body,
                    temporary_file,
                    length=1024 * 1024,
                )
            if temporary_file.tell() == 0:
                raise FrameExtractionError("Stored video is empty")

        yield temporary_path

    except FrameExtractionError:
        raise

    except Exception as error:
        raise FrameExtractionError(
            "Unable to retrieve stored video for frame extraction"
        ) from error

    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def iter_frames_from_storage(
    storage_reference: str,
    *,
    interval_seconds: float = DEFAULT_FRAME_INTERVAL_SECONDS,
) -> Iterator[ExtractedFrame]:
    """Yield timestamped JPEG frames from a stored video.

    The default sampling interval is one frame every five seconds, matching
    the Sprint 1 prototype. Frames are yielded as they are encoded so a
    10--15 minute source does not have to keep every JPEG in memory while
    watsonx calls are in progress.

    Returned JPEG bytes can be passed directly to:
        watsonx_image.analyse_image(
            frame.as_file(),
            frame.content_type,
            prompt,
        )
    """

    if interval_seconds <= 0:
        raise ValueError("Frame interval must be greater than zero")

    with _materialize_video(storage_reference) as video_path:
        video = cv2.VideoCapture(str(video_path))

        if not video.isOpened():
            video.release()
            raise FrameExtractionError("Video could not be opened for extraction")

        try:
            fps = float(video.get(cv2.CAP_PROP_FPS))

            if fps <= 0:
                raise FrameExtractionError("Video has an invalid frame rate")

            frame_interval = max(1, round(fps * interval_seconds))

            source_frame_count = float(video.get(cv2.CAP_PROP_FRAME_COUNT))
            source_duration = (
                source_frame_count / fps
                if source_frame_count > 0
                else None
            )
            frame_index = 0
            extracted_count = 0

            while True:
                success, frame = video.read()

                if not success:
                    break

                if frame_index % frame_interval == 0:
                    encoded, jpeg = cv2.imencode(".jpg", frame)

                    if not encoded:
                        raise FrameExtractionError(
                            f"Frame {frame_index} could not be encoded"
                        )

                    timestamp = frame_index / fps

                    yield ExtractedFrame(
                        frame_num=extracted_count,
                        timestamp=round(timestamp, 3),
                        image_bytes=jpeg.tobytes(),
                        source_duration_seconds=(
                            round(source_duration, 3)
                            if source_duration is not None
                            else None
                        ),
                    )
                    extracted_count += 1

                frame_index += 1

            if extracted_count == 0:
                raise FrameExtractionError(
                    "Video did not produce any extractable frames"
                )

        except FrameExtractionError:
            raise

        except Exception as error:
            raise FrameExtractionError(
                "Frame extraction failed"
            ) from error

        finally:
            video.release()


def extract_frames_from_storage(
    storage_reference: str,
    *,
    interval_seconds: float = DEFAULT_FRAME_INTERVAL_SECONDS,
) -> list[ExtractedFrame]:
    """Return all extracted frames for callers that need the legacy list API."""

    return list(
        iter_frames_from_storage(
            storage_reference,
            interval_seconds=interval_seconds,
        )
    )
