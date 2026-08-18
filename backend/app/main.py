import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app.routers import chat, gear, invites, learn
from app.ai.router import router as ai_router

app = FastAPI(title="Trailhead Camp Planner API", version="1.0.0")

# Lock CORS to the SPA origins (comma-separated in FRONTEND_ORIGINS).
_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public catalog + educational chat (unchanged use case)
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(gear.router, prefix="/api/gear", tags=["gear"])
app.include_router(learn.router, prefix="/api/learn", tags=["learn"])
app.include_router(invites.router, prefix="/api/invites", tags=["invites"])

# Read/write planning agent (social camping)
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
