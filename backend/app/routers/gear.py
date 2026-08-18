from fastapi import APIRouter, HTTPException

from app.data.gear import GEAR_CATEGORIES

router = APIRouter()


@router.get("")
async def get_gear_categories():
    """Get all gear categories with their items and tier recommendations."""
    return {"categories": GEAR_CATEGORIES}


@router.get("/{category_id}")
async def get_gear_category(category_id: str):
    """Get a specific gear category by ID."""
    for category in GEAR_CATEGORIES:
        if category["id"] == category_id:
            return {"category": category}
    raise HTTPException(status_code=404, detail=f"Gear category '{category_id}' not found")
