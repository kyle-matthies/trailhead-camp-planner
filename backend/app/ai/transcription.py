"""Server-side speech-to-text for the trip assistant.

The frontend still uses browser speech recognition when available. This module is the
server fallback for browsers without that API: it accepts a short audio clip and sends
it to OpenAI Whisper.
"""
import os
from typing import Any

from openai import OpenAI

SUPPORTED_EXTENSIONS = {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"}
SUPPORTED_CONTENT_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/mpga",
    "audio/m4a",
    "audio/wav",
    "audio/webm",
    "video/mp4",
    "video/webm",
}
MAX_AUDIO_BYTES = 25 * 1024 * 1024

_client: OpenAI | None = None


def is_configured() -> bool:
    return bool(os.getenv("OPENAI_API_KEY", ""))


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        if not is_configured():
            raise RuntimeError("OPENAI_API_KEY is not set.")
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


def _extension(filename: str | None) -> str:
    value = (filename or "").rsplit(".", 1)
    return value[1].lower() if len(value) == 2 else ""


def _safe_filename(filename: str | None, content_type: str | None) -> str:
    ext = _extension(filename)
    if ext in SUPPORTED_EXTENSIONS:
        return filename or f"voice.{ext}"
    if content_type == "audio/wav":
        return "voice.wav"
    if content_type == "audio/mpeg":
        return "voice.mp3"
    return "voice.webm"


def _validate_audio(data: bytes, filename: str | None, content_type: str | None) -> None:
    if not data:
        raise ValueError("Audio upload was empty.")
    if len(data) > MAX_AUDIO_BYTES:
        raise ValueError("Audio uploads must be 25 MB or smaller.")
    ext = _extension(filename)
    if ext and ext not in SUPPORTED_EXTENSIONS:
        raise ValueError("Unsupported audio file type.")
    if not ext and content_type and content_type not in SUPPORTED_CONTENT_TYPES:
        raise ValueError("Unsupported audio content type.")


def transcribe_audio(
    data: bytes,
    *,
    filename: str | None = None,
    content_type: str | None = None,
    client: Any | None = None,
) -> str:
    _validate_audio(data, filename, content_type)
    openai_client = client or _get_client()
    model = os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1")
    safe_filename = _safe_filename(filename, content_type)
    response = openai_client.audio.transcriptions.create(
        model=model,
        file=(safe_filename, data, content_type or "audio/webm"),
        temperature=0,
    )
    text = getattr(response, "text", response)
    return str(text or "").strip()
