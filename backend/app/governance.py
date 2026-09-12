import json
import os

from dotenv import load_dotenv
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_watson_openscale import APIClient
from ibm_watson_openscale.supporting_classes.payload_record import (
    PayloadRecord,
)


load_dotenv()


def get_environment_variable(variable_name):
    value = os.getenv(variable_name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {variable_name}"
        )

    return value


def create_governance_client():
    authenticator = IAMAuthenticator(
        apikey=get_environment_variable("IBM_CLOUD_API_KEY")
    )

    return APIClient(
        authenticator=authenticator,
        service_url=get_environment_variable(
            "WATSONX_GOVERNANCE_URL"
        ),
        service_instance_id=get_environment_variable(
            "WATSONX_GOVERNANCE_SERVICE_INSTANCE_ID"
        )
    )


def log_analysis_result(analysis_result, client=None):
    if client is None:
        client = create_governance_client()

    audit = analysis_result["audit"]

    record = PayloadRecord(
        request={
            "fields": ["case_id", "frame_num", "timestamp"],
            "values": [[
                analysis_result["case_id"],
                analysis_result["frame_num"],
                analysis_result["timestamp"],
            ]],
        },
        response={
            "fields": [
                "tags",
                "watson_severity_score",
                "effective_severity_score",
                "severity_tier",
                "reasoning",
                "entities",
                "model_id",
                "model_version",
                "prompt_version",
                "decision_timestamp",
            ],
            "values": [[
                json.dumps(analysis_result["tags"]),
                analysis_result["watson_severity_score"],
                analysis_result["effective_severity_score"],
                analysis_result["severity_tier"],
                analysis_result["reasoning"],
                json.dumps(analysis_result["entities"]),
                audit["model_id"],
                audit.get("model_version"),
                audit["prompt_version"],
                audit["decision_timestamp"],
            ]],
        },
        asset_revision=audit.get("model_version"),
    )

    client.data_sets.store_records(
        data_set_id=get_environment_variable(
            "WATSONX_GOVERNANCE_DATA_SET_ID"
        ),
        request_body=[record],
        background_mode=False,
    )

    return {
        "status": "logged",
        "service": "watsonx-governance",
        "case_id": analysis_result["case_id"],
        "frame_num": analysis_result["frame_num"],
    }
