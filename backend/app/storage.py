import os
import shutil
import tempfile
from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

import ibm_boto3
from dotenv import load_dotenv
from ibm_botocore.client import Config


project_root = Path(__file__).resolve().parents[2]
load_dotenv(project_root / ".env")


def get_environment_variable(variable_name):
    value = os.getenv(variable_name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {variable_name}"
        )

    return value


def create_cos_client():
    return ibm_boto3.client(
        "s3",
        ibm_api_key_id=get_environment_variable(
            "IBM_CLOUD_API_KEY"
        ),
        ibm_service_instance_id=get_environment_variable(
            "COS_INSTANCE_CRN"
        ),
        config=Config(signature_version="oauth"),
        endpoint_url=get_environment_variable(
            "COS_ENDPOINT"
        )
    )


def verify_storage_connection():
    cos_client = create_cos_client()
    bucket_name = get_environment_variable("COS_BUCKET_NAME")

    test_key = f"verification/storage-check-{uuid4().hex}.txt"
    expected_content = b"IBM RCS backend storage connection test"

    uploaded = False

    try:
        cos_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=expected_content,
            ContentType="text/plain"
        )
        uploaded = True

        response = cos_client.get_object(
            Bucket=bucket_name,
            Key=test_key
        )
        downloaded_content = response["Body"].read()

        if downloaded_content != expected_content:
            raise RuntimeError(
                "Downloaded content did not match uploaded content"
            )
    finally:
        if uploaded:
            cos_client.delete_object(
                Bucket=bucket_name,
                Key=test_key
            )

    return {
        "status": "ok",
        "service": "cloud-object-storage",
        "bucket": bucket_name
    }


def _local_upload_root() -> Path:
    configured = os.getenv("VIDEO_STORAGE_DIRECTORY")
    if configured:
        return Path(configured).expanduser().resolve()
    return Path(tempfile.gettempdir()) / "ibm-rcs-uploads"


def store_video(
    case_id: str,
    extension: str,
    stream: BinaryIO,
    media_type: str,
) -> str:
    """Store a video after validation and return its durable storage reference.

    Local storage is the Week 1 default. Set VIDEO_STORAGE_BACKEND=cos for an
    environment with the existing IBM Cloud Object Storage credentials.
    """
    backend = os.getenv("VIDEO_STORAGE_BACKEND", "local").lower()
    stream.seek(0)

    if backend == "cos":
        bucket_name = get_environment_variable("COS_BUCKET_NAME")
        object_key = f"cases/{case_id}/source{extension}"
        create_cos_client().put_object(
            Bucket=bucket_name,
            Key=object_key,
            Body=stream,
            ContentType=media_type,
        )
        return f"cos://{bucket_name}/{object_key}"

    if backend != "local":
        raise RuntimeError("Unsupported VIDEO_STORAGE_BACKEND")

    case_directory = _local_upload_root() / case_id
    case_directory.mkdir(parents=True, exist_ok=False)
    destination = case_directory / f"source{extension}"

    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=case_directory,
            prefix="upload-",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            shutil.copyfileobj(stream, temporary_file)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        temporary_path.replace(destination)
    except Exception:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        try:
            case_directory.rmdir()
        except OSError:
            pass
        raise

    return str(destination)


def stream_video_from_storage(storage_reference: str, byte_range: str | None = None):
    """Yield raw video bytes from COS or local storage for proxy streaming.

    byte_range: optional HTTP Range header value e.g. "bytes=0-1023"
    Returns (body, media_type, content_length, is_partial, content_range)
    """
    if storage_reference.startswith("cos://"):
        bucket_and_key = storage_reference.removeprefix("cos://")
        bucket_name, object_key = bucket_and_key.split("/", 1)
        kwargs: dict = {"Bucket": bucket_name, "Key": object_key}
        if byte_range:
            kwargs["Range"] = byte_range
        response = create_cos_client().get_object(**kwargs)
        is_partial = response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 206
        return (
            response["Body"],
            response.get("ContentType", "video/mp4"),
            response.get("ContentLength"),
            is_partial,
            response.get("ContentRange"),
        )
    import mimetypes
    path = Path(storage_reference)
    media_type = mimetypes.guess_type(str(path))[0] or "video/mp4"
    total_size = path.stat().st_size if path.exists() else None
    if byte_range and total_size:
        range_val = byte_range.strip().removeprefix("bytes=")
        start_str, _, end_str = range_val.partition("-")
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else total_size - 1
        end = min(end, total_size - 1)
        chunk_size = end - start + 1
        f = open(path, "rb")
        f.seek(start)
        return f, media_type, chunk_size, True, f"bytes {start}-{end}/{total_size}"
    return open(path, "rb"), media_type, total_size, False, None


def download_video_bytes(storage_reference: str) -> tuple[bytes, str]:
    """Download the full video as bytes for processing (e.g. STT).

    Returns (raw_bytes, media_type).
    """
    if storage_reference.startswith("cos://"):
        bucket_and_key = storage_reference.removeprefix("cos://")
        bucket_name, object_key = bucket_and_key.split("/", 1)
        response = create_cos_client().get_object(Bucket=bucket_name, Key=object_key)
        return response["Body"].read(), response.get("ContentType", "video/mp4")

    import mimetypes
    path = Path(storage_reference)
    media_type = mimetypes.guess_type(str(path))[0] or "video/mp4"
    return path.read_bytes(), media_type


def delete_stored_video(storage_reference: str) -> None:
    """Best-effort cleanup when database persistence fails after storage."""
    if storage_reference.startswith("cos://"):
        bucket_and_key = storage_reference.removeprefix("cos://")
        bucket_name, object_key = bucket_and_key.split("/", 1)
        create_cos_client().delete_object(Bucket=bucket_name, Key=object_key)
        return

    path = Path(storage_reference)
    path.unlink(missing_ok=True)
    try:
        path.parent.rmdir()
    except OSError:
        pass
