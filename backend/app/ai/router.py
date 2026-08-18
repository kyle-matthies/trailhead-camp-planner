"""AI read/write agent endpoints.

POST /api/ai/act     -> Gemini PLANS changes from the utterance (no writes). Returns a
                        step-by-step preview the user reviews.
POST /api/ai/commit  -> applies the user-approved changes through the user-scoped
                        Supabase client (RLS-enforced), logs to ai_actions.
POST /api/ai/transcribe -> transcribes an uploaded audio clip for voice input.
"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.ai import agent
from app.ai.context import load_trip_context
from app.ai.supabase_client import make_user_client
from app.ai.transcription import is_configured as transcription_is_configured
from app.ai.transcription import transcribe_audio
from app.ai.tools import execute_change, undo_result
from app.services.auth import AuthUser, get_supabase_user

router = APIRouter()


class ActRequest(BaseModel):
    trip_id: str
    utterance: str


class CommitChange(BaseModel):
    id: str | None = None
    table: str
    op: str = "insert"
    label: str | None = None
    fields: dict[str, Any] = {}


class CommitRequest(BaseModel):
    trip_id: str
    plan_id: str | None = None
    changes: list[CommitChange]


class UndoRequest(BaseModel):
    trip_id: str
    action_id: str | None = None


class TranscribeResponse(BaseModel):
    text: str


@router.post("/act")
def ai_act(req: ActRequest, user: AuthUser = Depends(get_supabase_user)):
    if not agent.is_configured():
        raise HTTPException(503, "AI service is not configured. Set GOOGLE_GEMINI_API_KEY.")
    if not req.utterance.strip():
        raise HTTPException(400, "Tell me what you'd like to add.")

    client = make_user_client(user.token)
    ctx = load_trip_context(client, req.trip_id, user.id)
    # A member always sees >= 1 member; 0 means the user can't access this trip.
    if ctx.get("camper_count", 0) == 0:
        raise HTTPException(403, "You don't have access to this trip.")

    try:
        reply, changes, steps = agent.run_act(req.utterance, ctx)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"Assistant error: {e}")

    return {"plan_id": uuid.uuid4().hex, "reply": reply, "steps": steps, "changes": changes}


@router.post("/commit")
def ai_commit(req: CommitRequest, user: AuthUser = Depends(get_supabase_user)):
    client = make_user_client(user.token)
    ctx = load_trip_context(client, req.trip_id, user.id)
    if ctx.get("camper_count", 0) == 0:
        raise HTTPException(403, "You don't have access to this trip.")
    results = [
        execute_change(client, ch.model_dump(), trip_id=req.trip_id, user_id=user.id, context=ctx)
        for ch in req.changes
    ]
    ok = all(r.get("status") == "applied" for r in results)

    # Best-effort audit log (own row; RLS permits user_id = auth.uid()).
    action_id = None
    try:
        audit = client.table("ai_actions").insert(
            {
                "trip_id": req.trip_id,
                "user_id": user.id,
                "tool_calls": [c.model_dump() for c in req.changes],
                "committed": True,
                "result": results,
            }
        ).execute()
        data = getattr(audit, "data", None) or []
        action_id = data[0].get("id") if data else None
    except Exception:
        pass

    return {"ok": ok, "action_id": action_id, "results": results}


@router.post("/undo")
def ai_undo(req: UndoRequest, user: AuthUser = Depends(get_supabase_user)):
    client = make_user_client(user.token)
    query = (
        client.table("ai_actions")
        .select("*")
        .eq("trip_id", req.trip_id)
        .eq("user_id", user.id)
        .eq("committed", True)
    )
    if req.action_id:
        query = query.eq("id", req.action_id)
    else:
        query = query.order("created_at", desc=True).limit(1)

    try:
        data = getattr(query.execute(), "data", None) or []
    except Exception as e:  # noqa: BLE001
        raise HTTPException(403, f"Could not read AI action: {e}")
    if not data:
        raise HTTPException(404, "No AI action found to undo.")

    action = data[0]
    prior_results = action.get("result") or []
    undo_results = [
        undo_result(client, r, trip_id=req.trip_id)
        for r in prior_results
        if isinstance(r, dict)
    ]
    ok = all(r.get("status") in {"undone", "skipped"} for r in undo_results)

    try:
        client.table("ai_actions").insert(
            {
                "trip_id": req.trip_id,
                "user_id": user.id,
                "tool_calls": [{"undo_of": action.get("id")}],
                "committed": False,
                "result": undo_results,
            }
        ).execute()
    except Exception:
        pass

    return {"ok": ok, "action_id": action.get("id"), "results": undo_results}


@router.post("/transcribe", response_model=TranscribeResponse)
async def ai_transcribe(
    audio: UploadFile = File(...),
    _user: AuthUser = Depends(get_supabase_user),
):
    if not transcription_is_configured():
        raise HTTPException(503, "Voice transcription is not configured. Set OPENAI_API_KEY.")
    try:
        data = await audio.read()
        text = transcribe_audio(data, filename=audio.filename, content_type=audio.content_type)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except RuntimeError as e:
        raise HTTPException(503, str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"Transcription failed: {e}") from e
    finally:
        await audio.close()

    if not text:
        raise HTTPException(422, "No speech was detected.")
    return TranscribeResponse(text=text)
