"""
 Ensure your watson STT environment variables are configured before testing.
 This test requires a supported audio file path.
 scripts/stt_test.wav

 The above audio file official transcript is as follows:
  "This is a recording to test the watson speech to text service"
"""

import argparse
import json
from pathlib import Path

from ibm_watson import ApiException

from app.speech_to_text import transcribe


CONTENT_TYPES = {
    ".flac": "audio/flac",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".webm": "audio/webm"
}


def get_content_type(audio_path):
    content_type = CONTENT_TYPES.get(audio_path.suffix.lower())

    if not content_type:
        raise ValueError(
            f"Unsupported audio extension: {audio_path.suffix}"
        )

    return content_type


def test_stt():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_file")
    arguments = parser.parse_args()

    audio_path = Path(arguments.audio_file)

    if not audio_path.is_file():
        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )

    content_type = get_content_type(audio_path)

    try:
        with audio_path.open("rb") as audio_file:
            result = transcribe(audio_file, content_type)
    except ApiException as error:
        print(
            f"Speech to Text failed with status "
            f"{error.code}: {error.message}"
        )
        raise SystemExit(1) from error

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    test_stt()