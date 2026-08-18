# Architecture

## System shape

Trailhead Camp Planner has two intentionally separate evaluation paths.

### Fictional demo

The default `/demo` route uses React component state and bundled fictional fixtures. It does not initialize an authenticated session, call Supabase, send email, upload media, or contact an AI provider. Refreshing the page resets it.

### Connected mode

The connected application is a React and TypeScript single-page app backed by Supabase Auth, Postgres, Realtime, and Storage. An optional FastAPI service supports camping guidance, AI-authored proposals, invite email delivery, and transcription.

```mermaid
sequenceDiagram
    participant U as Member
    participant SPA as React SPA
    participant API as Optional API
    participant AI as AI provider
    participant DB as Supabase Data API

    U->>SPA: Ask for planning help
    SPA->>API: POST /api/ai/act with member JWT
    API->>DB: Read trip context with member JWT
    DB-->>API: RLS-filtered context
    API->>AI: Context plus allow-listed tools
    AI-->>API: Proposed tool calls
    API-->>SPA: Structured preview; no writes
    SPA-->>U: Show selectable changes
    U->>SPA: Confirm selected changes
    SPA->>API: POST /api/ai/commit
    API->>DB: Write with member JWT
    DB-->>API: RLS-enforced result
    API-->>SPA: Applied rows and action ID
```

## Data model

The schema groups data into five areas:

- **Identity and access:** profiles, trips, members, roles, and invites
- **Place and capacity:** campgrounds, campsites, tents, vehicles, and assignments
- **Readiness:** shared gear, shopping items, personal gear, and packing items
- **Money:** expenses, purchased shopping items, cost splits, payment handles, and settlement RPC
- **Collaboration:** board posts, replies, private presence, photo metadata, and AI action records

Most collaborative child tables denormalize `trip_id`. Composite foreign keys pair child references with that `trip_id`, preventing a row from pointing to a parent in another trip.

## Authorization

The browser-safe Supabase publishable key identifies the application, not the user. Supabase Auth supplies member identity. Explicit Postgres grants make selected tables reachable through the Data API, then RLS determines which rows and operations are allowed.

Internal membership helpers are placed in a non-exposed `private` schema. Public security-definer RPCs are limited to invite acceptance and settlement; each authorizes the caller before accessing trip data.

The optional API constructs a Supabase client with the publishable key and the caller's access token. AI changes therefore cannot bypass RLS. The optional server secret key is used only for managed Auth invite-email delivery and never for trip CRUD.

## Realtime and photos

Collaborative tables can participate in the Supabase Realtime publication. Board presence uses a private channel whose topic contains a trip UUID; a parser and RLS policy verify membership.

Photo metadata lives in `board_photos`. Binary objects live in a private `trip-photos` bucket using this path shape:

```text
trips/<trip_id>/board/<uploader_user_id>/<photo_id>/original.<ext>
trips/<trip_id>/board/<uploader_user_id>/<photo_id>/thumb.webp
```

Storage policies require trip membership to read, collaborator rights plus a matching uploader path to insert, and uploader or coordinator rights to delete. The repository includes no photo files or object metadata.

## Configuration boundaries

- Root `.env` is ignored and is the only documented local secret file.
- `VITE_` variables are browser-visible and may contain only the project URL, publishable key, demo flag, and API base URL.
- Provider keys and the optional Supabase secret key are backend-only.
- `supabase/config.toml` contains local ports and a generic local project ID; it is not linked to a hosted project.
- No deployment provider configuration is included.
