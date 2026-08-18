import os

import pytest

from app.ai import transcription


class _FakeTranscriptions:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return type("Transcript", (), {"text": "add hot dogs"})()


class _FakeClient:
    def __init__(self):
        self.audio = type("Audio", (), {"transcriptions": _FakeTranscriptions()})()


def test_transcribe_audio_calls_whisper_with_safe_file_tuple(monkeypatch):
    fake = _FakeClient()
    monkeypatch.setenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1")

    text = transcription.transcribe_audio(
        b"webm-bytes",
        filename="clip.webm",
        content_type="audio/webm",
        client=fake,
    )

    assert text == "add hot dogs"
    call = fake.audio.transcriptions.calls[0]
    assert call["model"] == "whisper-1"
    assert call["temperature"] == 0
    assert call["file"] == ("clip.webm", b"webm-bytes", "audio/webm")


def test_transcribe_audio_rejects_empty_oversized_and_unsupported_uploads(monkeypatch):
    monkeypatch.setattr(transcription, "MAX_AUDIO_BYTES", 4)
    fake = _FakeClient()

    with pytest.raises(ValueError, match="empty"):
        transcription.transcribe_audio(b"", filename="clip.webm", client=fake)
    with pytest.raises(ValueError, match="25 MB"):
        transcription.transcribe_audio(b"too-large", filename="clip.webm", client=fake)
    with pytest.raises(ValueError, match="Unsupported"):
        transcription.transcribe_audio(b"ok", filename="clip.txt", client=fake)
    with pytest.raises(ValueError, match="Unsupported"):
        transcription.transcribe_audio(b"ok", content_type="application/octet-stream", client=fake)


def test_transcription_configuration_uses_openai_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert transcription.is_configured() is False
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    assert transcription.is_configured() is True


def test_transcribe_model_env_defaults_to_whisper(monkeypatch):
    fake = _FakeClient()
    monkeypatch.delenv("OPENAI_TRANSCRIBE_MODEL", raising=False)

    transcription.transcribe_audio(b"wav-bytes", filename="clip.wav", client=fake)

    assert fake.audio.transcriptions.calls[0]["model"] == "whisper-1"
    assert os.getenv("OPENAI_TRANSCRIBE_MODEL") is None
