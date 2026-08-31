import os

from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from dotenv import load_dotenv
from ibm_watson import SpeechToTextV1


load_dotenv()


def get_environment_variable(variable_name):
    value = os.getenv(variable_name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {variable_name}"
        )

    return value

def create_stt_client():
    stt_api_key = get_environment_variable(
        "SPEECH_TO_TEXT_API_KEY"
    )
    stt_service_url = get_environment_variable(
        "SPEECH_TO_TEXT_URL"
    )

    client = SpeechToTextV1(authenticator=IAMAuthenticator(stt_api_key))
    client.set_service_url(stt_service_url)

    return client