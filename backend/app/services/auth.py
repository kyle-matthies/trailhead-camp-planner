"""Authentication against Supabase. The slim API service no longer issues its own
JWTs — it verifies the Supabase access token the SPA already holds, and identifies
the caller. All database writes happen through a user-scoped client (see
app.ai.supabase_client) so RLS — not this service — is the authorization gate."""
import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")

security = HTTPBearer()


@dataclass
class AuthUser:
    id: str
    email: str
    token: str


def _anon_client():
    if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not configured")
    return create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)


def verify_user(token: str) -> AuthUser:
    """Ask Supabase Auth to validate the token and return the user identity."""
    client = _anon_client()
    resp = client.auth.get_user(token)
    user = getattr(resp, "user", None)
    if user is None:
        raise ValueError("Token did not resolve to a user")
    return AuthUser(id=str(user.id), email=user.email or "", token=token)


def get_supabase_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    """FastAPI dependency: 401 unless a valid Supabase access token is presented."""
    try:
        return verify_user(credentials.credentials)
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001 - any verification failure is a 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from e
