"""Durable JSON storage for frame-level watsonx analysis artefacts."""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path, PurePosixPath
from typing import Any, Protocol

from app.storage import create_cos_client


class AnalysisOutputStorageError(RuntimeError):
    """Raised when an analysis artefact cannot be stored durably."""


class AnalysisOutputStore(Protocol):
    @property
    def reference(self) -> str:
        """Return the case-level analysis-output storage reference."""

    def write_json(self, filename: str, payload: Any) -> str:
        """Persist one JSON document and return its storage reference."""


def _json_default(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if hasattr(value, "to_dict"):
        return value.to_dict()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _json_bytes(payload: Any) -> bytes:
    return (
        json.dumps(
            payload,
            indent=2,
            sort_keys=True,
            ensure_ascii=False,
            default=_json_default,
        )
        + "\n"
    ).encode("utf-8")


def _validate_filename(filename: str) -> str:
    if not filename or PurePosixPath(filename).name != filename:
        raise ValueError("Analysis output filename must be a plain filename")
    if not filename.endswith(".json"):
        raise ValueError("Analysis output filename must end in .json")
    return filename


@dataclass(frozen=True)
class LocalAnalysisOutputStore:
    directory: Path

    @property
    def reference(self) -> str:
        return str(self.directory)

    def write_json(self, filename: str, payload: Any) -> str:
        filename = _validate_filename(filename)
        self.directory.mkdir(parents=True, exist_ok=True)
        destination = self.directory / filename
        temporary_path: Path | None = None

        try:
            with tempfile.NamedTemporaryFile(
                mode="wb",
                dir=self.directory,
                prefix=f".{filename}.",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                temporary_file.write(_json_bytes(payload))
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            temporary_path.replace(destination)
        except Exception as error:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            raise AnalysisOutputStorageError(
                f"Could not store analysis output {filename}"
            ) from error

        return str(destination)


@dataclass(frozen=True)
class CosAnalysisOutputStore:
    bucket: str
    prefix: str
    client: Any

    @property
    def reference(self) -> str:
        return f"cos://{self.bucket}/{self.prefix}"

    def write_json(self, filename: str, payload: Any) -> str:
        filename = _validate_filename(filename)
        object_key = f"{self.prefix}/{filename}"
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=object_key,
                Body=_json_bytes(payload),
                ContentType="application/json",
            )
        except Exception as error:
            raise AnalysisOutputStorageError(
                f"Could not store analysis output {filename}"
            ) from error
        return f"cos://{self.bucket}/{object_key}"


def create_analysis_output_store(
    storage_reference: str,
    case_id: str,
    *,
    local_root: str | Path | None = None,
    cos_client: Any | None = None,
) -> AnalysisOutputStore:
    """Create a store beside the source video for local or COS storage.

    COS artefacts use ``cases/{case_id}/analysis-output``. Local uploads use
    the source case directory; a directly supplied test video uses
    ``<video parent>/analysis-output/{case_id}`` unless an explicit root or
    ``ANALYSIS_OUTPUT_DIRECTORY`` is configured.
    """

    allowed_case_id_characters = (
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    )
    if not case_id or any(
        character not in allowed_case_id_characters
        for character in case_id
    ):
        raise ValueError("case_id contains unsupported characters")

    if storage_reference.startswith("cos://"):
        without_scheme = storage_reference.removeprefix("cos://")
        bucket, separator, _ = without_scheme.partition("/")
        if not separator or not bucket:
            raise ValueError("Invalid COS storage reference")
        return CosAnalysisOutputStore(
            bucket=bucket,
            prefix=f"cases/{case_id}/analysis-output",
            client=cos_client or create_cos_client(),
        )

    source_path = Path(storage_reference).expanduser().resolve()
    configured_root = local_root or os.getenv("ANALYSIS_OUTPUT_DIRECTORY")
    if configured_root:
        directory = Path(configured_root).expanduser().resolve() / case_id
    elif source_path.parent.name == case_id:
        directory = source_path.parent / "analysis-output"
    else:
        directory = source_path.parent / "analysis-output" / case_id
    return LocalAnalysisOutputStore(directory=directory)
