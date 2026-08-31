# Watson Speech to Text

https://cloud.ibm.com/docs/speech-to-text?topic=speech-to-text-service-features#features-languages

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

### Scalability

The current implementation uses synchronous speech recognition. This is suitable for the initial implementation because it is simple and allows the backend to immediately receive and return the completed transcript. However, the request remains open while Watson processes the audio, which becomes less suitable as the number or length of submitted videos increases.

For improved scalability, Watson Speech to Text also provides an asynchronous recognition interface. Instead of waiting for transcription to finish, the backend can create a recognition job using `create_job()` and receive a job ID. The result can then be retrieved by polling the job with `check_job()`, or Watson can send a notification to a registered callback URL when processing is complete.

This approach is more suitable for processing multiple or longer videos because backend requests do not need to remain blocked while speech recognition is taking place. The synchronous implementation can remain appropriate for testing, and can largely be reused for asynchronous infrastructure.

### Model Selection

The Speech to Text model is configured through `SPEECH_TO_TEXT_MODEL`, allowing the model to be changed without modifying the transcription code.

The current configuration uses `en-AU`, which selects Watson's Australian English Large Speech Model. This is an appropriate default for Australian English content. Other locale models, such as `en-US`, can be selected when the expected source audio uses a different English dialect.

For video content, the next-generation Multimedia models should also be evaluated. For example:

```dotenv
SPEECH_TO_TEXT_MODEL=en-AU_Multimedia
```

The Multimedia models are designed for higher-sampling-rate audio such as audio extracted from video, making them particularly relevant to our project.

The Large Speech Model and Multimedia model should be compared later in development using labelled video samples. The final model should be selected based on transcription accuracy for the project's actual content rather than assuming that one model will perform better for every recording.

## Testing

`backend/scripts/watson_stt_test.py` is a manual integration test that sends an audio file to the real Watson service and prints the returned JSON. From the `backend` directory, run:

```bash
python scripts/WATSON_STT_TEST.py <audio.file>
```

Note: backend/scripts/stt_test.wav is included for testing purposes only.
The test requires watson environment variables, network access and a supported audio file. A successful result prints the selected model, the combined transcript and Watson's original result.
