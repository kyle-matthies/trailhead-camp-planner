from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services.auth import AuthUser, get_supabase_user
from app.services.gemini import generate_response, is_configured

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[ChatMessage] | None = None


class ChatResponse(BaseModel):
    response: str
    ai_configured: bool = True


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: AuthUser = Depends(get_supabase_user),
) -> ChatResponse:
    """Send a message to the camping assistant and get a response."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set GOOGLE_GEMINI_API_KEY.",
        )

    try:
        history = None
        if request.conversation_history:
            history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]

        response_text = await generate_response(request.message, history)
        return ChatResponse(response=response_text)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {e}")


@router.get("/status")
async def chat_status():
    """Check if the chat service is configured and ready."""
    return {"configured": is_configured()}
