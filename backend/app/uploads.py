"""Server-side supported-format and basic container-integrity validation."""

from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO


SUPPORTED_VIDEO_TYPES = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
}
MINIMUM_VIDEO_BYTES = 12
HEADER_INSPECTION_BYTES = 64 * 1024


@dataclass(frozen=True)
class ValidatedVideo:
    extension: str
    media_type: str
    size_bytes: int


class InvalidVideoError(ValueError):
    pass


def _file_size(stream: BinaryIO) -> int:
    stream.seek(0, 2)
    size = stream.tell()
    stream.seek(0)
    return size


def _validate_iso_base_media(header: bytes, file_size: int, extension: str) -> None:
    if len(header) < 12 or header[4:8] != b"ftyp":
        raise InvalidVideoError(
            f"File contents do not match a valid {extension[1:].upper()} video"
        )
    first_box_size = int.from_bytes(header[0:4], "big")
    if first_box_size < 8 or first_box_size > file_size:
        raise InvalidVideoError("Video container appears truncated or corrupt")


def _validate_webm(header: bytes) -> None:
    if not header.startswith(bytes.fromhex("1A45DFA3")):
        raise InvalidVideoError("File contents do not match a valid WEBM video")


def _validate_avi(header: bytes, file_size: int) -> None:
    if header[0:4] != b"RIFF" or header[8:12] != b"AVI ":
        raise InvalidVideoError("File contents do not match a valid AVI video")
    declared_size = int.from_bytes(header[4:8], "little") + 8
    if declared_size > file_size:
        raise InvalidVideoError("Video container appears truncated or corrupt")


def validate_video(filename: str | None, stream: BinaryIO) -> ValidatedVideo:
    """Validate the claimed extension and basic container structure.

    The stream is rewound before returning so durable storage can consume it
    only after validation has succeeded.
    """
    safe_filename = filename or ""
    extension = Path(safe_filename).suffix.lower()
    if extension not in SUPPORTED_VIDEO_TYPES:
        raise InvalidVideoError(
            "Unsupported video format. Accepted formats: MP4, MOV, WEBM, AVI."
        )

    try:
        size = _file_size(stream)
        if size < MINIMUM_VIDEO_BYTES:
            raise InvalidVideoError("File is too small to be a valid video")
        header = stream.read(HEADER_INSPECTION_BYTES)

        if extension in {".mp4", ".mov"}:
            _validate_iso_base_media(header, size, extension)
        elif extension == ".webm":
            _validate_webm(header)
        else:
            _validate_avi(header, size)

        return ValidatedVideo(
            extension=extension,
            media_type=SUPPORTED_VIDEO_TYPES[extension],
            size_bytes=size,
        )
    finally:
        stream.seek(0)
