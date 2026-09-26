"""Unit tests for STT parsing helpers — no Watson API calls required."""

import unittest

from app.speech_to_text import extract_audio_intensity, parse_transcript_lines


def _make_result(transcript: str, timestamps: list, word_confidence: list | None = None) -> dict:
    alt: dict = {"transcript": transcript, "timestamps": timestamps}
    if word_confidence is not None:
        alt["word_confidence"] = word_confidence
    return {"alternatives": [alt]}


class TestParseTranscriptLines(unittest.TestCase):
    def test_single_result_no_speaker_labels(self) -> None:
        results = [_make_result("hello world", [["hello", 0.0, 0.5], ["world", 0.5, 1.0]])]
        lines = parse_transcript_lines(results)
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["text"], "hello world")
        self.assertAlmostEqual(lines[0]["time"], 0.0)

    def test_speaker_change_splits_into_separate_lines(self) -> None:
        results = [
            _make_result(
                "stop right there",
                [["stop", 0.0, 0.3], ["right", 0.3, 0.6], ["there", 0.6, 1.0]],
            )
        ]
        speaker_labels = [
            {"from": 0.0, "to": 0.3, "speaker": 0},
            {"from": 0.3, "to": 0.6, "speaker": 1},
            {"from": 0.6, "to": 1.0, "speaker": 1},
        ]
        lines = parse_transcript_lines(results, speaker_labels)
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0]["text"], "stop")
        self.assertEqual(lines[1]["text"], "right there")

    def test_same_speaker_throughout_stays_one_line(self) -> None:
        results = [
            _make_result("one two three", [["one", 0.0, 0.5], ["two", 0.5, 1.0], ["three", 1.0, 1.5]])
        ]
        speaker_labels = [
            {"from": 0.0, "to": 0.5, "speaker": 0},
            {"from": 0.5, "to": 1.0, "speaker": 0},
            {"from": 1.0, "to": 1.5, "speaker": 0},
        ]
        lines = parse_transcript_lines(results, speaker_labels)
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["text"], "one two three")

    def test_empty_results_returns_empty_list(self) -> None:
        self.assertEqual(parse_transcript_lines([]), [])

    def test_result_with_no_timestamps_falls_back_to_full_text(self) -> None:
        results = [{"alternatives": [{"transcript": "hello"}]}]
        lines = parse_transcript_lines(results)
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0]["text"], "hello")
        self.assertEqual(lines[0]["time"], 0.0)


def _make_wav(num_frames: int = 1600, amplitude: int = 16000) -> bytes:
    """Generate a minimal mono 16-bit PCM WAV for testing."""
    import struct, wave, io
    buf = io.BytesIO()
    with wave.open(buf, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        # alternating +amplitude / -amplitude to get non-zero RMS
        samples = [amplitude if i % 2 == 0 else -amplitude for i in range(num_frames)]
        wf.writeframes(struct.pack(f"{num_frames}h", *samples))
    return buf.getvalue()


class TestExtractAudioIntensity(unittest.TestCase):
    def test_returns_empty_list_for_invalid_bytes(self) -> None:
        self.assertEqual(extract_audio_intensity(b"not a wav"), [])

    def test_bucket_count_matches_num_buckets(self) -> None:
        wav = _make_wav(num_frames=3200)
        buckets = extract_audio_intensity(wav, num_buckets=4)
        self.assertEqual(len(buckets), 4)

    def test_bucket_values_are_between_0_and_1(self) -> None:
        wav = _make_wav(num_frames=3200)
        buckets = extract_audio_intensity(wav, num_buckets=4)
        for v in buckets:
            self.assertGreaterEqual(v, 0.0)
            self.assertLessEqual(v, 1.0)

    def test_nonzero_amplitude_produces_nonzero_intensity(self) -> None:
        wav = _make_wav(num_frames=3200, amplitude=16000)
        buckets = extract_audio_intensity(wav, num_buckets=4)
        self.assertTrue(any(v > 0 for v in buckets))


if __name__ == "__main__":
    unittest.main()
