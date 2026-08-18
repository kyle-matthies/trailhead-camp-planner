-- Trailhead Camp Planner — 0009 optional settlement payment handles
-- Handles are optional metadata used by the UI to build settle-up shortcuts.
-- Existing profile/party RLS policies control who can read or update them.

alter table public.profiles
  add column venmo_handle text,
  add column paypal_me text;

alter table public.trip_parties
  add column venmo_handle text,
  add column paypal_me text;
