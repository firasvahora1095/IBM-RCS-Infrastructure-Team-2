from io import BytesIO
from pathlib import Path

import pytest

import app.storage as storage
from app.storage import stream_video_from_storage


def test_local_storage_full_file_with_no_range(tmp_path: Path) -> None:
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"0123456789")

    body, media_type, content_length, is_partial, content_range = stream_video_from_storage(
        str(video)
    )

    assert body.read() == b"0123456789"
    assert media_type == "video/mp4"
    assert content_length == 10
    assert is_partial is False
    assert content_range is None


def test_local_storage_start_anchored_range(tmp_path: Path) -> None:
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"0123456789")

    body, _media_type, content_length, is_partial, content_range = stream_video_from_storage(
        str(video), byte_range="bytes=2-5"
    )

    assert body.read() == b"2345"
    assert content_length == 4
    assert is_partial is True
    assert content_range == "bytes 2-5/10"


def test_local_storage_suffix_range_returns_the_tail(tmp_path: Path) -> None:
    """A suffix range ("bytes=-N") means the LAST N bytes, not the first N —
    this is what a browser's <video> element sends first when probing an MP4
    whose moov atom sits at the end of the file."""
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"0123456789")

    body, _media_type, content_length, is_partial, content_range = stream_video_from_storage(
        str(video), byte_range="bytes=-4"
    )

    assert body.read() == b"6789"
    assert content_length == 4
    assert is_partial is True
    assert content_range == "bytes 6-9/10"


def test_cos_storage_suffix_range_is_converted_before_reaching_cos(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """COS doesn't come back with a clean, catchable error for the suffix
    form some clients send - the connection dies mid-response instead, after
    headers are already on the wire, so a try/except around get_object()
    can't recover it. The proxy must never send that form to COS at all."""
    calls: list[dict] = []

    class FakeCosClient:
        def head_object(self, *, Bucket, Key):
            assert Bucket == "evidence-bucket"
            assert Key == "cases/CASE-1/source.mp4"
            return {"ContentLength": 100_000}

        def get_object(self, **kwargs):
            calls.append(kwargs)
            assert kwargs.get("Range") != "bytes=-65536", "suffix range must never reach COS"
            return {
                "Body": BytesIO(b"tail-bytes"),
                "ContentType": "video/mp4",
                "ContentLength": 65536,
                "ResponseMetadata": {"HTTPStatusCode": 206},
                "ContentRange": "bytes 34464-99999/100000",
            }

    monkeypatch.setattr(storage, "create_cos_client", lambda: FakeCosClient())

    body, media_type, content_length, is_partial, content_range = stream_video_from_storage(
        "cos://evidence-bucket/cases/CASE-1/source.mp4", byte_range="bytes=-65536"
    )

    assert body.read() == b"tail-bytes"
    assert media_type == "video/mp4"
    assert content_length == 65536
    assert is_partial is True
    assert content_range == "bytes 34464-99999/100000"
    assert len(calls) == 1
    assert calls[0]["Range"] == "bytes=34464-99999"


def test_cos_storage_normal_range_is_not_retried(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[dict] = []

    class FakeCosClient:
        def get_object(self, **kwargs):
            calls.append(kwargs)
            return {
                "Body": BytesIO(b"abcd"),
                "ContentType": "video/mp4",
                "ContentLength": 4,
                "ResponseMetadata": {"HTTPStatusCode": 206},
                "ContentRange": "bytes 0-3/100",
            }

    monkeypatch.setattr(storage, "create_cos_client", lambda: FakeCosClient())

    body, _media_type, _content_length, is_partial, content_range = stream_video_from_storage(
        "cos://evidence-bucket/cases/CASE-1/source.mp4", byte_range="bytes=0-3"
    )

    assert body.read() == b"abcd"
    assert is_partial is True
    assert content_range == "bytes 0-3/100"
    assert len(calls) == 1
