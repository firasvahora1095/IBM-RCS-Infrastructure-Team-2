import io
import os

from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from dotenv import load_dotenv
from ibm_watson import SpeechToTextV1


load_dotenv()


def extract_audio_wav(video_bytes: bytes) -> bytes:
    """Extract audio track from video bytes and return as WAV bytes using PyAV."""
    import av as pyav

    input_buf = io.BytesIO(video_bytes)
    output_buf = io.BytesIO()

    with pyav.open(input_buf) as in_container:
        audio_stream = next(
            (s for s in in_container.streams if s.type == "audio"), None
        )
        if audio_stream is None:
            raise RuntimeError("No audio track found in video")

        with pyav.open(output_buf, mode="w", format="wav") as out_container:
            out_stream = out_container.add_stream("pcm_s16le", rate=16000)
            out_stream.layout = "mono"

            resampler = pyav.AudioResampler(
                format="s16",
                layout="mono",
                rate=16000,
            )

            for frame in in_container.decode(audio_stream):
                for resampled in resampler.resample(frame):
                    resampled.pts = None
                    out_container.mux(out_stream.encode(resampled))

            for packet in out_stream.encode(None):
                out_container.mux(packet)

    output_buf.seek(0)
    return output_buf.read()


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
        speaker_labels=True,
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
        "results": response.get("results", []),
        "speaker_labels": response.get("speaker_labels", []),
    }


def parse_transcript_lines(stt_results: list, speaker_labels: list | None = None) -> list[dict]:
    """Convert raw STT results into [{time, text}] lines split by speaker change.

    When speaker_labels are present, a new line starts each time the speaker
    changes. Otherwise falls back to one line per STT result segment.
    """
    if not stt_results:
        return []

    # Build word→speaker map from speaker_labels list
    # Each entry: {from, to, speaker, confidence, final}
    speaker_map: dict[float, int] = {}
    for label in (speaker_labels or []):
        speaker_map[float(label["from"])] = int(label["speaker"])

    lines = []
    for result in stt_results:
        alternatives = result.get("alternatives", [])
        if not alternatives:
            continue
        alt = alternatives[0]
        timestamps = alt.get("timestamps", [])  # [[word, start, end], ...]
        if not timestamps:
            text = alt.get("transcript", "").strip()
            if text:
                lines.append({"time": 0.0, "text": text})
            continue

        # Group words by speaker; start a new group when speaker changes
        current_speaker = None
        current_words: list[str] = []
        current_time = 0.0

        for word, start, _end in timestamps:
            speaker = speaker_map.get(float(start), current_speaker)
            if speaker != current_speaker and current_words:
                lines.append({"time": current_time, "text": " ".join(current_words)})
                current_words = []
                current_time = float(start)
            if not current_words:
                current_time = float(start)
            current_speaker = speaker
            current_words.append(word)

        if current_words:
            lines.append({"time": current_time, "text": " ".join(current_words)})

    return lines


def extract_audio_intensity(wav_bytes: bytes, num_buckets: int = 20) -> list[float]:
    """Compute RMS amplitude per time bucket from raw WAV bytes.

    Returns a list of num_buckets floats normalised to [0, 1].
    """
    import struct
    import wave

    try:
        with wave.open(io.BytesIO(wav_bytes)) as wf:
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            n_frames = wf.getnframes()
            raw = wf.readframes(n_frames)
    except Exception:
        return []

    if sampwidth == 2:
        fmt = f"{len(raw) // 2}h"
        samples = list(struct.unpack(fmt, raw))
        max_val = 32768.0
    elif sampwidth == 1:
        fmt = f"{len(raw)}B"
        samples = [s - 128 for s in struct.unpack(fmt, raw)]
        max_val = 128.0
    else:
        return []

    # Mix down to mono if stereo
    if n_channels > 1:
        samples = [
            sum(samples[i : i + n_channels]) / n_channels
            for i in range(0, len(samples), n_channels)
        ]

    if not samples:
        return []

    bucket_size = max(1, len(samples) // num_buckets)
    result = []
    for i in range(num_buckets):
        chunk = samples[i * bucket_size : (i + 1) * bucket_size]
        if not chunk:
            result.append(0.0)
        else:
            rms = (sum(s * s for s in chunk) / len(chunk)) ** 0.5
            result.append(min(1.0, rms / max_val))

    return result