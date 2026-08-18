# Optional local API

The FastAPI service provides educational camping endpoints, invite-email delivery, AI planning and commit, and optional voice transcription.

It reads the ignored root `.env`. Trip reads and AI-authored writes use the caller's Supabase access token, so Postgres RLS remains authoritative. `SUPABASE_SECRET_KEY` is optional and used only for managed Auth invite-email delivery.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --require-hashes -r requirements.lock
fastapi dev app/main.py
```

Run tests:

```bash
python -m pytest -q
```

The frontend demo does not require this service or any provider key.
