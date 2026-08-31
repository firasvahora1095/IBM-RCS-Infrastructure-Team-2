import os

from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference


SUPPORTED_IMAGE_SIGNATURES = {
    "image/jpeg": bytes.fromhex("FF D8 FF"),
    "image/png": bytes.fromhex("89 50 4E 47 0D 0A 1A 0A"),
}


def get_environment_variable(variable_name):
    value = os.getenv(variable_name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {variable_name}"
        )

    return value


def create_watsonx_image_client():
    watsonx_credentials = Credentials(
        api_key=get_environment_variable("WATSONX_API_KEY"),
        url=get_environment_variable("WATSONX_URL"),
    )

    return ModelInference(
        model_id=get_environment_variable("WATSONX_VISION_MODEL_ID"),
        credentials=watsonx_credentials,
        project_id=get_environment_variable("WATSONX_PROJECT_ID"),
    )