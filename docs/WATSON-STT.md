# Watson Speech to Text

## Overview

`backend/app/speech_to_text.py` provides the reusable connection between the backend and IBM Watson Speech to Text.  
It:
- reads the Speech to Text credentials and model from environment variables;
- creates an authenticated `SpeechToTextV1` client;
- sends an audio stream to Watson with its content type;
- combines the highest-ranked transcript from each result segment; and
- returns the combined transcript

The script does not permanently save the transcript. It returns a Python dictionary that another part of the backend can use, however the project will eventually store the transcript in `cases/{caseId}/analysis/transcript.json` in IBM Cloud Object Storage.

## Configuration

The following variables must be configured in `.env`:

```dotenv
SPEECH_TO_TEXT_API_KEY=
SPEECH_TO_TEXT_URL=
SPEECH_TO_TEXT_MODEL=en-AU
```

## Reuse

Import `transcribe` wherever the backend needs to transcribe an audio stream:

```python
from app.speech_to_text import transcribe

with open("test.wav", "rb") as audio_file:
    result = transcribe(audio_file, "audio/wav")

transcript = result["transcript"]
```

The function accepts an open audio stream and its content type, so it can be reused with local or uploaded files.

## Testing

`backend/scripts/watson_stt_test.py` is a manual integration test that sends an audio file to the real Watson service and prints the returned JSON. From the `backend` directory, run:

```bash
python scripts/WATSON_STT_TEST.py <audio.file>
```

Note: backend/scripts/stt_test.wav is included for testing purposes only.
The test requires watson environment variables, network access and a supported audio file. A successful result prints the selected model, the combined transcript and Watson's original result.
