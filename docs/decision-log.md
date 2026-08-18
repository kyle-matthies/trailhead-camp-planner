# Decision log

## 1. Model collaboration as roles, not a single editor flag

**Decision:** Use a four-level ladder: director, counselor, CIT, and camper.

**Why:** Group trips have both governance work and bounded contribution work. A binary viewer/editor split either grants too much power to helpers or forces every small change through the organizer. The ladder makes responsibility legible while keeping member and role management director-only.

**Consequence:** The interface must explain the role names, and RLS policies must remain the authoritative implementation.

## 2. Keep one structured trip workspace plus a bulletin

**Decision:** Store the current plan in purpose-built tables and reserve the bulletin for updates and discussion.

**Why:** Chat is chronological; trip coordination is stateful. Campsite capacity, claimed shopping, and expense settlement should not depend on finding the newest message.

**Consequence:** Realtime updates help the structured views feel collaborative without turning messages into the system of record.

## 3. Treat shared costs as allocation, not only arithmetic

**Decision:** Combine expenses and purchased shopping items in settlement. Default to equal shares across the active unit, while allowing explicit custom splits by party or member.

**Why:** Equal splitting is fast and explainable, but some costs benefit only part of the group. A stored allocation preserves the reasoning instead of forcing people to reconstruct it later.

**Consequence:** Deferred database constraints require custom allocations to add up to the source cost.

## 4. Separate AI planning from execution

**Decision:** `/act` produces an allow-listed structured proposal; `/commit` receives only the user-approved subset.

**Why:** Natural-language intent is ambiguous and trip plans affect other people. Review-before-write creates a visible decision point, supports partial approval, and provides a useful undo/audit boundary.

**Consequence:** The assistant cannot offer the illusion of fully autonomous planning. That friction is intentional.

## 5. Use member-scoped credentials for AI writes

**Decision:** The API forwards the member JWT for all trip reads and writes.

**Why:** A privileged server client would create a second authorization system and expand the blast radius of bugs. Reusing RLS keeps human and assistant actions inside the same permission model.

**Consequence:** The API must handle ordinary RLS rejections and may not "fix" them with an elevated key.

## 6. Ship a network-free demo as the default

**Decision:** The public repository starts in fictional demo mode when configuration is absent.

**Why:** Portfolio reviewers should be able to evaluate product thinking immediately, and an open-source copy must never fall back to a private service.

**Consequence:** The demo is intentionally resettable and does not claim persistence, email, media upload, or live AI.

## 7. Retain private photo sharing, but only as generic infrastructure

**Decision:** Keep the generic UI, metadata model, and private bucket policies; publish no photo assets or stored metadata.

**Why:** Trip photos are a natural extension of the bulletin and demonstrate storage authorization. They are safe to retain only when detached from every real object and identity.

**Consequence:** Photo behavior belongs to connected mode, and operators remain responsible for retention, deletion, and provider configuration.
