from fastapi import APIRouter, HTTPException

from app.data.learn import get_all_topics, get_topic

router = APIRouter()


@router.get("")
async def list_topics():
    """Get a summary list of all learning topics."""
    return {"topics": get_all_topics()}


@router.get("/{topic_id}")
async def get_topic_detail(topic_id: str):
    """Get full details for a specific learning topic."""
    topic = get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found")
    return {"topic": topic}
