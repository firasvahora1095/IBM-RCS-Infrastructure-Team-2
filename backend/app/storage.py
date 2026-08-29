import os
from pathlib import Path
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