"""Gemini orchestration for the read/write planning agent (google-genai SDK). Builds
a tool-enabled, low-temperature request with the refusal-first AI_AGENT_SYSTEM prompt
and returns a (reply, changes) preview — it never writes; the commit endpoint applies
approved changes."""
import os
from typing import Any, Optional

from google import genai
from google.genai import types

from app.ai.tools import GEMINI_TOOLS, build_changes
from app.data.ai_prompts import AI_AGENT_SYSTEM

_client: Optional[genai.Client] = None

# Tool declarations as google-genai Tool objects (coerced from the dict schema).
_TOOLS = [types.Tool(function_declarations=GEMINI_TOOLS[0]["function_declarations"])]

_STEP_META = [
    (
        "sites",
        {"campsites", "site_camper_assignments", "tents", "vehicles"},
        "Plan campsite setup",
    ),
    ("shopping", {"shopping_items"}, "Update shared shopping"),
    ("gear", {"trip_shared_gear"}, "Update shared gear"),
    ("expenses", {"expenses"}, "Record trip costs"),
    ("packing", {"trip_packing_items"}, "Update personal packing"),
    ("board", {"board_posts"}, "Post to the board"),
]


def is_configured() -> bool:
    return bool(os.getenv("GOOGLE_GEMINI_API_KEY", ""))


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        key = os.getenv("GOOGLE_GEMINI_API_KEY", "")
        if not key:
            raise RuntimeError("GOOGLE_GEMINI_API_KEY is not set.")
        _client = genai.Client(api_key=key)
    return _client


def _format_context(ctx: dict[str, Any]) -> str:
    existing = ", ".join(ctx.get("shopping", [])) or "none"
    members = "; ".join(
        (
            f"{m.get('display_name') or m.get('name') or m.get('email') or 'Camper'} "
            f"(member_id={m.get('id')}, email={m.get('email') or 'unknown'})"
        )
        for m in ctx.get("members", [])
    ) or "none"
    campsites = "; ".join(
        (
            f"site {s.get('site_number')} (campsite_id={s.get('id')}, "
            f"campers={s.get('assigned_campers', 0)}, "
            f"tents={s.get('tent_count', 0)}/"
            f"{s.get('max_tents') if s.get('max_tents') is not None else 'unknown'}, "
            f"vehicles={s.get('vehicle_count', 0)}/"
            f"{s.get('max_vehicles') if s.get('max_vehicles') is not None else 'unknown'}"
            + (f", notes={s.get('notes')}" if s.get("notes") else "")
            + ")"
        )
        for s in ctx.get("campsites", [])
    ) or "none"
    return (
        "CONTEXT\n"
        f"- Trip: {ctx.get('name')}, {ctx.get('nights')} nights "
        f"({ctx.get('start_date')} to {ctx.get('end_date')}), type {ctx.get('camping_type')}\n"
        f"- Campers: {ctx.get('camper_count')}\n"
        f"- Members: {members}\n"
        f"- Campsites: {campsites}\n"
        f"- Existing shopping items: {existing}\n"
    )


def _extract(resp) -> tuple[str, list[tuple[str, dict[str, Any]]]]:
    reply_parts: list[str] = []
    calls: list[tuple[str, dict[str, Any]]] = []
    cands = getattr(resp, "candidates", None) or []
    if cands:
        content = getattr(cands[0], "content", None)
        parts = getattr(content, "parts", None) or [] if content else []
        for part in parts:
            fc = getattr(part, "function_call", None)
            if fc and getattr(fc, "name", ""):
                calls.append((fc.name, dict(getattr(fc, "args", None) or {})))
            txt = getattr(part, "text", None)
            if txt:
                reply_parts.append(txt)
    return "".join(reply_parts).strip(), calls


def _step_key(table: str) -> tuple[str, str]:
    for key, tables, title in _STEP_META:
        if table in tables:
            return key, title
    return table, f"Update {table.replace('_', ' ')}"


def build_plan_steps(changes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    steps: list[dict[str, Any]] = []
    groups: dict[str, dict[str, Any]] = {}
    for change in changes:
        key, title = _step_key(str(change.get("table") or ""))
        if key not in groups:
            groups[key] = {"title": title, "changes": []}
            steps.append(groups[key])
        groups[key]["changes"].append(change)

    out: list[dict[str, Any]] = []
    for index, step in enumerate(steps, start=1):
        step_changes = step["changes"]
        labels = [str(c.get("label") or c.get("table") or "Change") for c in step_changes]
        detail = "; ".join(labels[:2])
        if len(labels) > 2:
            detail += f"; +{len(labels) - 2} more"
        out.append(
            {
                "id": f"step-{index}",
                "title": step["title"],
                "detail": detail,
                "change_ids": [c.get("id") for c in step_changes if c.get("id")],
            }
        )
    return out


def run_act(
    utterance: str,
    ctx: dict[str, Any],
) -> tuple[str, list[dict[str, Any]], list[dict[str, Any]]]:
    client = _get_client()
    prompt = _format_context(ctx) + "\nUSER REQUEST: " + utterance
    resp = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=AI_AGENT_SYSTEM,
            temperature=0.2,
            tools=_TOOLS,
        ),
    )
    reply, calls = _extract(resp)

    changes: list[dict[str, Any]] = []
    for name, args in calls:
        changes.extend(build_changes(name, args, ctx))

    if not reply:
        reply = (
            f"Here are {len(changes)} proposed change(s) — review and confirm."
            if changes
            else "I can only help update your camping trip plan."
        )
    return reply, changes, build_plan_steps(changes)
