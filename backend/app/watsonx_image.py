import base64
import os
from io import BytesIO

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


def encode_image(image_file):
    image_data = image_file.read()

    if not image_data:
        raise ValueError("The image file is empty")

    return base64.b64encode(image_data).decode("utf-8")


def validate_image(image_data, content_type):
    if content_type not in SUPPORTED_IMAGE_SIGNATURES:
        raise ValueError("Only PNG and JPEG images are supported")

    expected_signature = SUPPORTED_IMAGE_SIGNATURES[content_type]

    if not image_data.startswith(expected_signature):
        raise ValueError(
            f"The file contents do not match {content_type}"
        )