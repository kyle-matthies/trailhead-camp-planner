import os
from typing import Optional

from google import genai
from google.genai import types

from app.data.prompts import CORE_SYSTEM_PROMPT

_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GOOGLE_GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GOOGLE_GEMINI_API_KEY is not set. Please provide a valid Gemini API key."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def is_configured() -> bool:
    return bool(os.getenv("GOOGLE_GEMINI_API_KEY", ""))


async def generate_response(
    message: str,
    conversation_history: list[dict[str, str]] | None = None,
) -> str:
    """Generate a camping assistant response using Gemini (google-genai SDK)."""
    client = _get_client()

    contents: list[types.Content] = []
    if conversation_history:
        for msg in conversation_history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=CORE_SYSTEM_PROMPT,
            temperature=0.7,
            top_p=0.9,
            max_output_tokens=2048,
        ),
    )
    return response.text or ""
