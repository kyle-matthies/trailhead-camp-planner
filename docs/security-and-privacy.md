# Security and privacy

## Release boundary

This repository is an independent open-source project with fresh Git history. It contains no production project reference, deployment URL, account identifier, credential, user record, trip history, personal location, photo, storage object, analytics configuration, or deployment provider attachment.

The default demo is fictional and in-memory. Connected mode requires the operator to create and configure a separate Supabase project.

## Threat model

The design assumes:

- a signed-in user may try to read or modify a trip they do not belong to;
- a lower-privileged trip member may try to escalate their role or edit coordinator-only content;
- IDs from one trip may be submitted in rows belonging to another trip;
- an AI provider may return malformed, over-broad, or unexpected tool arguments;
- an uploaded object path may claim another user's or trip's namespace;
- a public repository may be scanned for secrets long after publication.

It does not claim to protect against a compromised provider account, operator machine, browser extension, or Supabase organization administrator.

## Controls

### Database access

- `anon` receives no application-table grants.
- `authenticated` receives explicit table privileges, followed by row- and operation-specific RLS.
- Every application table enables RLS.
- Trip-scoped foreign keys pair the referenced ID with `trip_id` when cross-trip substitution would be dangerous.
- Update policies include both `USING` and `WITH CHECK`.
- Views exposed to the Data API use `security_invoker`.

### Privileged functions

- Internal security-definer helpers live in a non-exposed `private` schema with an explicit `search_path`.
- Public invite acceptance verifies the authenticated email claim against the pending invite.
- Public settlement verifies trip membership before reading cost data.
- Function execution grants are explicit and restricted.

### AI boundary

- The planning endpoint cannot write.
- Tool names, tables, and fields are allow-listed server-side.
- The server derives `trip_id` and author/owner fields instead of trusting model output.
- The commit endpoint uses the member's JWT and therefore remains subject to RLS.
- The UI shows proposed changes with per-item selection and requires explicit confirmation.
- Applied actions are recorded so the latest assistant-authored inserts can be undone.

### Photos and Realtime

- The photo bucket is private.
- Storage paths encode trip and uploader IDs; insert policies validate both membership and uploader ownership.
- Photo metadata is trip-scoped and RLS-protected.
- Presence channels are private and authorize membership from a validated trip topic.

## Secret handling

Browser variables are public by construction. Only a Supabase project URL and publishable key belong in `VITE_` variables. These do not replace RLS.

Provider keys and the optional Supabase secret key stay in the ignored root `.env` and are read by the backend only. Never commit `.env`, link this repository to an existing production project, or put a secret/service-role key in frontend code.

Before publishing a fork:

1. Inspect tracked, untracked, and ignored files.
2. Run a dedicated secret scanner over the worktree and Git history.
3. Search for project IDs, hosted service URLs, personal names, emails, UUIDs, and media.
4. Inspect `git remote -v` and local Git configuration.
5. Verify the demo with network access disabled.

## Operator checklist for a new project

- Review every migration before `supabase db push`.
- Keep automatic Data API exposure off; the migrations grant only intended access.
- Run the RLS harness locally and fix every failure.
- Configure Auth redirect URLs for only intended origins.
- Set provider and secret keys only in a server-side secret store.
- Decide photo retention, deletion, backup, and abuse-reporting policy before enabling uploads.
- Add dependency, secret, and database-advisor checks to the deployment pipeline.
- Do not treat a successful build as a production security review.
