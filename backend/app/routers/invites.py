"""Trip invite email delivery.

The invite row is created through a user-scoped Supabase client, so RLS still
decides whether the caller can invite campers. The optional server secret key is
used only for Auth email delivery after that RLS-gated insert succeeds.
"""
import os
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client

from app.ai.supabase_client import make_user_client
from app.services.auth import AuthUser, get_supabase_user

router = APIRouter()

InviteRole = Literal["counselor", "cit", "camper"]
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SendInviteRequest(BaseModel):
    trip_id: str
    email: str
    role: InviteRole = "cit"


class SendInviteResponse(BaseModel):
    invite_id: str
    token: str
    email: str
    role: InviteRole
    invite_url: str
    email_sent: bool
    delivery_error: str | None = None


def _normalize_email(email: str) -> str:
    value = email.strip().lower()
    if not EMAIL_RE.match(value):
        raise HTTPException(400, "Enter a valid camper email address.")
    return value


def _app_base_url() -> str:
    explicit = os.getenv("PUBLIC_APP_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    first_origin = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")[0].strip()
    return (first_origin or "http://localhost:5173").rstrip("/")


def _service_client():
    url = os.getenv("SUPABASE_URL", "")
    secret_key = os.getenv("SUPABASE_SECRET_KEY", "")
    if not url or not secret_key:
        return None
    return create_client(url, secret_key)


@router.post("/send", response_model=SendInviteResponse)
def send_invite(req: SendInviteRequest, user: AuthUser = Depends(get_supabase_user)):
    email = _normalize_email(req.email)
    user_client = make_user_client(user.token)

    try:
        created = (
            user_client.table("trip_invites")
            .insert(
                {
                    "trip_id": req.trip_id,
                    "email": email,
                    "role": req.role,
                    "invited_by": user.id,
                }
            )
            .execute()
        )
    except Exception as e:  # noqa: BLE001 - PostgREST errors vary by client version
        raise HTTPException(403, f"Could not create invite: {e}") from e

    rows = getattr(created, "data", None) or []
    if not rows:
        raise HTTPException(500, "Invite was not created.")

    invite = rows[0]
    token = str(invite.get("token") or "")
    invite_id = str(invite.get("id") or "")
    invite_url = f"{_app_base_url()}/invite/{token}"

    admin_client = _service_client()
    if admin_client is None:
        return SendInviteResponse(
            invite_id=invite_id,
            token=token,
            email=email,
            role=req.role,
            invite_url=invite_url,
            email_sent=False,
            delivery_error="Email delivery is not configured on the backend.",
        )

    try:
        admin_client.auth.admin.invite_user_by_email(
            email,
            {
                "redirect_to": invite_url,
                "data": {
                    "trip_id": req.trip_id,
                    "trip_invite_id": invite_id,
                    "trip_role": req.role,
                },
            },
        )
    except Exception as e:  # noqa: BLE001 - keep the RLS-created invite usable via copy link
        return SendInviteResponse(
            invite_id=invite_id,
            token=token,
            email=email,
            role=req.role,
            invite_url=invite_url,
            email_sent=False,
            delivery_error=f"Invite link created, but Supabase Auth email failed: {e}",
        )

    return SendInviteResponse(
        invite_id=invite_id,
        token=token,
        email=email,
        role=req.role,
        invite_url=invite_url,
        email_sent=True,
    )
