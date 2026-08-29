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

