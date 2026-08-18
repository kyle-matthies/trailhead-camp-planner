"""Per-request, user-scoped Supabase client. PostgREST calls carry the USER's JWT,
so every read/write the agent performs is constrained by exactly the same RLS as
the human user. An elevated server key is intentionally NEVER used here."""
import os

from supabase import Client, create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")


def make_user_client(token: str) -> Client:
    if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not configured")
    client = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    # Route all PostgREST requests through the user's JWT -> RLS applies.
    client.postgrest.auth(token)
    return client
