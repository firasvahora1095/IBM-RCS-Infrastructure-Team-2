import os

from dotenv import load_dotenv


load_dotenv()


def get_environment_variable(variable_name):
    value = os.getenv(variable_name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {variable_name}"
        )

    return value

def create_stt_client():
    