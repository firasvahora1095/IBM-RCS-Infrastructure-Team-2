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

def transcribe(file, file_type):
    client = create_stt_client()
    speech_model = get_environment_variable("SPEECH_TO_TEXT_MODEL")

    response = client.recognize(
        audio=file,
        content_type=file_type,
        model=speech_model,
        smart_formatting=True,
        word_confidence=True,
        timestamps=True,
        profanity_filter=False
    ).get_result()

    transcript_parts = []

    for result in response.get("results", []):
        alternatives = result.get("alternatives", [])

        if alternatives:
            transcript_parts.append(
                # alternative 0 is the most confident version
                alternatives[0].get("transcript", "").strip()
            )

    return {
        "model": speech_model,
        "transcript": " ".join(transcript_parts),
        "results": response.get("results", []) 
    }